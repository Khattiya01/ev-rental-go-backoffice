import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripeClient } from '@/lib/stripe'
import { markPaymentSucceeded, markPaymentFailed, markPaymentCanceled } from '@/lib/payments'

// ─── Local dev verification ────────────────────────────────────────────────────
//
// Forward Stripe events to this route with the Stripe CLI:
//
//   stripe listen --forward-to localhost:3000/api/webhooks/stripe
//
// The CLI prints a `whsec_...` value on startup — put it in `.env.local` as
// STRIPE_WEBHOOK_SECRET if testing against a fresh CLI session (it changes each run).
//
// Fire a test event once `stripe listen` is running:
//
//   stripe trigger payment_intent.succeeded
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  // ── Config guard ─────────────────────────────────────────────────────────
  // Checked before touching the request body so a misconfigured deploy fails fast
  // without an unnecessary body read.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[POST /api/webhooks/stripe] STRIPE_WEBHOOK_SECRET env var is not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[POST /api/webhooks/stripe] STRIPE_SECRET_KEY env var is not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const signatureHeader = request.headers.get('stripe-signature')
  if (!signatureHeader) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Defense-in-depth: reject obviously-oversized payloads before buffering them
  // into memory. This only catches requests that send an honest content-length —
  // a real cap needs to live at the reverse-proxy/edge level (out of scope here).
  const MAX_BODY_BYTES = 1_000_000
  const contentLength = request.headers.get('content-length')
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  // Must be the only body-consuming call in this handler — Stripe's signature
  // verification needs the exact raw bytes, so never call `.json()` here.
  const rawBody = await request.text()

  const stripe = getStripeClient()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret)
  } catch (err) {
    console.error(
      '[POST /api/webhooks/stripe] signature verification failed:',
      err instanceof Error ? err.message : String(err)
    )
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Business logic lives in lib/payments.ts, not here — the helpers already handle
  // the "expected no-op" cases (no matching payments row, already-terminal status)
  // by returning normally, so those paths fall through to the 200 below. Anything
  // that reaches the catch is a genuinely unexpected failure (DB error, etc.) and
  // gets a 500 so Stripe's retry mechanism kicks in.
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`[POST /api/webhooks/stripe] ${event.type} — event=${event.id} paymentIntent=${paymentIntent.id}`)
        await markPaymentSucceeded(paymentIntent)
        break
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`[POST /api/webhooks/stripe] ${event.type} — event=${event.id} paymentIntent=${paymentIntent.id}`)
        await markPaymentFailed(paymentIntent)
        break
      }
      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`[POST /api/webhooks/stripe] ${event.type} — event=${event.id} paymentIntent=${paymentIntent.id}`)
        await markPaymentCanceled(paymentIntent)
        break
      }
      default:
        // Verified event of a type this app doesn't act on yet — still acknowledge with
        // 200 below so Stripe doesn't retry-storm it.
        console.log(`[POST /api/webhooks/stripe] unhandled event type — event=${event.id} type=${event.type}`)
    }
  } catch (err) {
    console.error(
      `[POST /api/webhooks/stripe] handler error for event=${event.id} type=${event.type}:`,
      err
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
