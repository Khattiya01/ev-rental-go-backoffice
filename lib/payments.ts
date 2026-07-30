import 'server-only'
import type Stripe from 'stripe'
import { eq, and, ne } from 'drizzle-orm'
import { db } from '@/db'
import { payments, invoices, alerts } from '@/db/schema'
import { getStripeClient } from '@/lib/stripe'
import { formatThaiDate } from '@/lib/date'
import { generateReceiptSlipPng } from '@/lib/receipt-slip'
import { uploadFile } from '@/lib/storage'

/**
 * Handles a verified `payment_intent.succeeded` webhook event.
 *
 * Looks up the matching `payments` row by `stripePaymentIntentId` (never trusts
 * `paymentIntent.metadata.invoiceId` for the join — the row created in Day 3 is
 * the source of truth). No-ops (with a warning log) if there's no matching row,
 * or if the row is already `succeeded` (idempotency guard against duplicate/retried
 * webhook deliveries) — both cases return before touching Stripe or the DB further.
 *
 * The final write is additionally conditioned on `status <> 'succeeded'` (checked via
 * `.returning()`) to close the TOCTOU window between the initial SELECT above and this
 * UPDATE — two overlapping deliveries of the same event could otherwise both pass the
 * early guard and both write.
 *
 * Best-effort receipt lookup: failures to resolve `receiptUrl` are logged and
 * swallowed, since a receipt link is not required to mark a payment as paid.
 *
 * After a successful write, also best-effort renders a branded receipt PNG
 * (lib/receipt-slip.ts), uploads it, and overwrites `invoices.slipUrl`. Only
 * the delivery that actually performed the `payments` update does this — see
 * the `updatedPayment` gate below — so a losing concurrent/duplicate webhook
 * delivery never redundantly regenerates or re-uploads it.
 */
export async function markPaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const [existing] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, paymentIntent.id))
    .limit(1)

  if (!existing) {
    console.warn('[lib/payments] no payments row for paymentIntent', paymentIntent.id)
    return
  }

  if (existing.status === 'succeeded') {
    console.warn('[lib/payments] paymentIntent already succeeded, skipping', paymentIntent.id)
    return
  }

  const chargeId = typeof paymentIntent.latest_charge === 'string'
    ? paymentIntent.latest_charge
    : paymentIntent.latest_charge?.id

  let receiptUrl: string | null = null
  if (chargeId) {
    try {
      const stripe = getStripeClient()
      const charge = await stripe.charges.retrieve(chargeId)
      receiptUrl = charge.receipt_url
    } catch (err) {
      console.warn('[lib/payments] failed to retrieve charge for receipt_url', chargeId, err)
    }
  } else {
    console.warn('[lib/payments] paymentIntent has no latest_charge, skipping receipt lookup', paymentIntent.id)
  }

  // Display-string label for invoices.paidAt — distinct from the real `Date` value
  // written to payments.paidAt a few lines below, hence the different name.
  const invoicePaidAtLabel = formatThaiDate(new Date())

  // Returns the updated `payments` row, or `null` if a concurrent/duplicate
  // delivery had already flipped it to `succeeded` first — used below to gate
  // receipt slip generation so a losing delivery doesn't redundantly redo it.
  const updatedPayment = await db.transaction(async tx => {
    const [updated] = await tx
      .update(payments)
      .set({ status: 'succeeded', receiptUrl, stripeChargeId: chargeId ?? null, paidAt: new Date() })
      .where(and(eq(payments.id, existing.id), ne(payments.status, 'succeeded')))
      .returning()

    if (!updated) {
      console.warn(
        '[lib/payments] payments row was already succeeded by a concurrent delivery, skipping invoice update',
        paymentIntent.id
      )
      return null
    }

    await tx
      .update(invoices)
      .set({ status: 'paid', paidAt: invoicePaidAtLabel })
      .where(eq(invoices.id, existing.invoiceId))

    return updated
  })

  if (!updatedPayment) return

  // Best-effort branded receipt slip: render, upload, and overwrite
  // `invoices.slipUrl` (Stripe payment success is authoritative — always
  // overwrites even a previously manually-uploaded slip). Any failure here is
  // logged and swallowed rather than thrown: the invoice is already correctly
  // marked paid above, and the Stripe-hosted `receiptUrl` set on the payments
  // row remains a working fallback. This must never throw — the caller
  // (app/api/webhooks/stripe/route.ts) wraps the whole event-handling switch
  // in one catch-all that returns HTTP 500 on any thrown error to trigger a
  // Stripe retry, which is correct for genuine DB failures but wrong for
  // "PNG generation failed" (would cause endless pointless retries).
  try {
    const [invoice] = await db
      .select({ invoiceNo: invoices.invoiceNo })
      .from(invoices)
      .where(eq(invoices.id, existing.invoiceId))
      .limit(1)

    const slipPng = await generateReceiptSlipPng({
      invoiceNo: invoice?.invoiceNo ?? existing.invoiceId,
      amount: updatedPayment.amount,
      paidAtLabel: invoicePaidAtLabel,
      paymentIntentId: paymentIntent.id,
    })

    const slipFile = new File([new Uint8Array(slipPng)], `receipt-${existing.invoiceId}.png`, { type: 'image/png' })
    const { url: slipUrl } = await uploadFile(slipFile, 'invoices')

    await db.update(invoices).set({ slipUrl }).where(eq(invoices.id, existing.invoiceId))
  } catch (err) {
    console.error('[lib/payments] failed to generate/upload receipt slip, keeping Stripe-hosted receiptUrl as fallback', paymentIntent.id, err)
  }
}

/**
 * Handles a verified `payment_intent.payment_failed` webhook event.
 *
 * Same lookup-by-`stripePaymentIntentId` rule as `markPaymentSucceeded`. No-ops
 * if there's no matching row, or if the row is already `succeeded` — a late or
 * out-of-order `payment_failed` event must never clobber an already-paid payment.
 * The `payments` write is conditioned on `status <> 'succeeded'` (checked via
 * `.returning()`) for the same TOCTOU reason as `markPaymentSucceeded`.
 *
 * Alert insert is deduped: Stripe delivers webhooks at-least-once, so a redelivered
 * `payment_failed` event for the same PaymentIntent must not create a second alert.
 * Mirrors the "already alerted" pattern in `app/api/cron/mark-overdue/route.ts` —
 * skip the insert if an unresolved `payment_failed` alert already exists for this
 * invoice. The `payments.status` write itself still happens on every delivery (it's
 * a safe idempotent overwrite).
 *
 * Does not touch `invoices` — `invoice_status` has no `failed` member.
 */
export async function markPaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const [existing] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, paymentIntent.id))
    .limit(1)

  if (!existing) {
    console.warn('[lib/payments] no payments row for paymentIntent', paymentIntent.id)
    return
  }

  if (existing.status === 'succeeded') {
    console.warn('[lib/payments] paymentIntent already succeeded, ignoring payment_failed', paymentIntent.id)
    return
  }

  const failureReason = (paymentIntent.last_payment_error?.message ?? 'Unknown failure').slice(0, 255)

  const [invoice] = await db
    .select({ invoiceNo: invoices.invoiceNo })
    .from(invoices)
    .where(eq(invoices.id, existing.invoiceId))
    .limit(1)
  const invoiceLabel = invoice?.invoiceNo ?? existing.invoiceId

  await db.transaction(async tx => {
    const [updated] = await tx
      .update(payments)
      .set({ status: 'failed', failureReason })
      .where(and(eq(payments.id, existing.id), ne(payments.status, 'succeeded')))
      .returning()

    if (!updated) {
      console.warn(
        '[lib/payments] payments row was already succeeded by a concurrent delivery, ignoring payment_failed',
        paymentIntent.id
      )
      return
    }

    // Dedup guard: Stripe delivers webhooks at-least-once, so a redelivered
    // payment_failed event for this same PaymentIntent must not create a second
    // alert. Mirrors the "already alerted" check in mark-overdue/route.ts.
    const [existingAlert] = await tx
      .select({ id: alerts.id })
      .from(alerts)
      .where(and(
        eq(alerts.entityId, existing.invoiceId),
        eq(alerts.type, 'payment_failed'),
        eq(alerts.resolved, false)
      ))
      .limit(1)

    if (existingAlert) {
      console.warn(
        '[lib/payments] unresolved payment_failed alert already exists for invoice, skipping duplicate insert',
        existing.invoiceId
      )
      return
    }

    await tx.insert(alerts).values({
      type: 'payment_failed',
      severity: 'warning',
      message: `การชำระเงินไม่สำเร็จสำหรับ Invoice ${invoiceLabel}: ${failureReason}`,
      entityId: existing.invoiceId,
    })
  })
}

/**
 * Handles a verified `payment_intent.canceled` webhook event.
 *
 * Same lookup + anti-clobber rules as `markPaymentFailed`, including the
 * `status <> 'succeeded'` condition on the write to close the same TOCTOU window.
 * No alert is created — cancellation is an expected, non-actionable outcome
 * (e.g. QR expiry). Does not touch `invoices`.
 */
export async function markPaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const [existing] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, paymentIntent.id))
    .limit(1)

  if (!existing) {
    console.warn('[lib/payments] no payments row for paymentIntent', paymentIntent.id)
    return
  }

  if (existing.status === 'succeeded') {
    console.warn('[lib/payments] paymentIntent already succeeded, ignoring cancellation', paymentIntent.id)
    return
  }

  const [updated] = await db
    .update(payments)
    .set({ status: 'canceled' })
    .where(and(eq(payments.id, existing.id), ne(payments.status, 'succeeded')))
    .returning()

  if (!updated) {
    console.warn(
      '[lib/payments] payments row was already succeeded by a concurrent delivery, ignoring cancellation',
      paymentIntent.id
    )
  }
}
