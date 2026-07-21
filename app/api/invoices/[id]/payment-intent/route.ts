import { NextResponse } from 'next/server'
import { and, desc, eq, gt } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '@/db'
import { customers, invoices, payments } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'
import { getStripeClient } from '@/lib/stripe'
import { isDuplicateKeyError } from '@/lib/db-errors'

// Stripe's published minimum charge amount for THB (~10 THB). Re-verify against
// https://stripe.com/docs/currencies#minimum-and-maximum-charge-amounts if this ever
// needs to change — Stripe does not expose this as an API-queryable value.
const MIN_PROMPTPAY_AMOUNT_THB = 10

// App-enforced UI convention only — Stripe's PromptPay `next_action` payload has no
// expiry field of its own (verified against the installed `stripe` SDK types). This is
// what backs the "generate new QR" flow on the invoice detail page.
const PROMPTPAY_QR_EXPIRY_MINUTES = 20

interface PaymentIntentResponse {
  paymentIntentId: string
  qrData: string
  qrImagePng: string
  expiresAt: string
  amount: number
}

/**
 * Build the success response from a Stripe PaymentIntent + the `expiresAt`/`amount`
 * we track ourselves, and wrap it in a NextResponse. If Stripe didn't attach the
 * PromptPay QR payload we expect (which would violate the API contract for a
 * `confirm: true` PromptPay PaymentIntent), returns a 502 NextResponse instead —
 * callers don't need to null-check, they can just `return` the result directly.
 */
function respondWithPaymentIntent(
  intent: Stripe.PaymentIntent,
  expiresAt: Date,
  amount: number
): NextResponse {
  const qr = intent.next_action?.promptpay_display_qr_code
  if (!qr) return NextResponse.json({ error: 'Payment provider error' }, { status: 502 })

  const payload: PaymentIntentResponse = {
    paymentIntentId: intent.id,
    qrData: qr.data,
    qrImagePng: qr.image_url_png,
    expiresAt: expiresAt.toISOString(),
    amount,
  }
  return NextResponse.json(payload)
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'billing', 'canWrite')
  if (denied) return denied

  const { id } = await params

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'Invoice already paid' }, { status: 409 })
  }
  if (invoice.amount < MIN_PROMPTPAY_AMOUNT_THB) {
    return NextResponse.json(
      { error: `Amount must be at least ${MIN_PROMPTPAY_AMOUNT_THB} THB for PromptPay` },
      { status: 400 }
    )
  }

  const stripe = getStripeClient()

  // Short-circuit: reuse an existing pending, not-yet-expired payment instead of
  // minting a new PaymentIntent. `expiresAt` here is our own app-enforced convention
  // (see PROMPTPAY_QR_EXPIRY_MINUTES above), not something Stripe guarantees — so this
  // is a best-effort freshness check, not a Stripe-guaranteed one.
  const [existing] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.invoiceId, id), eq(payments.status, 'pending'), gt(payments.expiresAt, new Date())))
    .orderBy(desc(payments.createdAt))
    .limit(1)

  // `existing.expiresAt` is nullable in the schema, but the `gt()` filter above only
  // matches rows where it's set and in the future — so a null here would indicate a
  // data inconsistency, not a normal case. Guard rather than cast.
  if (existing && existing.expiresAt) {
    try {
      const intent = await stripe.paymentIntents.retrieve(existing.stripePaymentIntentId)

      if (intent.status === 'succeeded') {
        // The customer already paid this PaymentIntent; the webhook just hasn't landed
        // yet to flip `invoices.status` to 'paid'. Don't mint a new PaymentIntent — that
        // would double-charge the customer. Report the same conflict shape used above.
        return NextResponse.json({ error: 'Invoice already paid' }, { status: 409 })
      }

      if (intent.status !== 'canceled') {
        // Still actionable (e.g. 'requires_action', 'processing') — the QR is still valid.
        return respondWithPaymentIntent(intent, existing.expiresAt, existing.amount)
      }

      // Stripe canceled the intent — the row is stale, not a provider error. Fall through
      // to mint a new PaymentIntent below instead of short-circuiting with a 502.
    } catch (err) {
      console.error(
        '[POST /api/invoices/[id]/payment-intent] failed to retrieve existing PaymentIntent:',
        err
      )
      return NextResponse.json({ error: 'Payment provider error' }, { status: 502 })
    }
  }

  // Stripe requires `billing_details.email` on PromptPay `payment_method_data` — verified
  // against a live Stripe test-mode call, which rejects `payment_method_data: { type:
  // 'promptpay' }` alone with a `parameter_missing` error. Resolve it from the linked
  // customer right before minting a new PaymentIntent (the reuse path above just re-reads
  // an already-created intent and doesn't need it, so this stays out of that path). Both
  // an unlinked invoice and a customer with no email on file are real, non-error states
  // per the schema — surface them as a normal 400 rather than a Stripe failure.
  let customerEmail: string | null = null
  if (invoice.customerId) {
    const [customer] = await db
      .select({ email: customers.email })
      .from(customers)
      .where(eq(customers.id, invoice.customerId))
      .limit(1)
    customerEmail = customer?.email ?? null
  }
  if (!customerEmail) {
    return NextResponse.json(
      { error: 'Customer email is required to create a PromptPay payment' },
      { status: 400 }
    )
  }

  // Create a new PaymentIntent. Convert to satang once and reuse it for both the Stripe
  // call and the baht amount we persist/return, so the two never drift apart.
  const amountInSatang = Math.round(invoice.amount * 100)
  const amount = amountInSatang / 100

  let intent: Stripe.PaymentIntent
  try {
    intent = await stripe.paymentIntents.create({
      amount: amountInSatang,
      currency: 'thb',
      payment_method_types: ['promptpay'],
      payment_method_data: { type: 'promptpay', billing_details: { email: customerEmail } },
      confirm: true,
      metadata: { invoiceId: invoice.id, invoiceNo: invoice.invoiceNo },
    })
  } catch (err) {
    console.error(
      '[POST /api/invoices/[id]/payment-intent] Stripe PaymentIntent creation failed:',
      err
    )
    return NextResponse.json({ error: 'Payment provider error' }, { status: 502 })
  }

  const expiresAt = new Date(Date.now() + PROMPTPAY_QR_EXPIRY_MINUTES * 60_000)

  let inserted: typeof payments.$inferSelect
  try {
    ;[inserted] = await db
      .insert(payments)
      .values({
        invoiceId: id,
        provider: 'stripe',
        method: 'promptpay',
        stripePaymentIntentId: intent.id,
        amount,
        status: 'pending',
        expiresAt,
      })
      .returning()
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      // Rare double-submit race on the unique stripePaymentIntentId constraint. This is
      // NOT deduping PaymentIntents — each create() call above already minted a distinct
      // Stripe PaymentIntent ID regardless — just avoid crashing on the write.
      console.error(
        '[POST /api/invoices/[id]/payment-intent] duplicate payment row on insert:',
        err
      )
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
    }
    throw err
  }

  const qr = intent.next_action?.promptpay_display_qr_code
  if (!qr) {
    // Stripe API contract violation: a `confirm: true` PromptPay PaymentIntent should
    // always carry this payload. The `payments` row above is already committed as
    // 'pending' with up to a 20-minute `expiresAt` — if we leave it that way, the next
    // call within that window hits the reuse path above, re-retrieves this same broken
    // intent, and gets stuck in the same failure again. Mark it 'failed' so the reuse
    // query (which filters on status = 'pending') skips it and the next call retries fresh.
    await db
      .update(payments)
      .set({ status: 'failed', failureReason: 'Stripe did not return a PromptPay QR payload' })
      .where(eq(payments.id, inserted.id))
    console.error(
      '[POST /api/invoices/[id]/payment-intent] Stripe response missing PromptPay QR payload for intent:',
      intent.id
    )
    return NextResponse.json({ error: 'Payment provider error' }, { status: 502 })
  }

  return respondWithPaymentIntent(intent, expiresAt, amount)
}
