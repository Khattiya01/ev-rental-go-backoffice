import 'server-only'
import Stripe from 'stripe'

const globalForStripe = globalThis as unknown as {
  _stripeClient: Stripe | undefined
}

function createStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-06-24.dahlia',
  })
}

const stripe = globalForStripe._stripeClient ?? createStripeClient()

if (process.env.NODE_ENV !== 'production') {
  globalForStripe._stripeClient = stripe
}

export function getStripeClient(): Stripe {
  return stripe
}
