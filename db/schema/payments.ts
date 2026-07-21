import { pgTable, uuid, varchar, real, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { invoices } from './invoices'

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', 'succeeded', 'failed', 'canceled', 'expired',
])

export const paymentProviderEnum = pgEnum('payment_provider', ['stripe'])
export const paymentMethodEnum = pgEnum('payment_method', ['promptpay'])

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  provider: paymentProviderEnum('provider').notNull().default('stripe'),
  method: paymentMethodEnum('method').notNull().default('promptpay'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 100 }).notNull().unique(),
  stripeChargeId: varchar('stripe_charge_id', { length: 100 }),
  // Whole baht (decimal currency units) — NOT Stripe's integer minor-unit (satang)
  // representation. Conversion (×100) happens only when calling the Stripe API,
  // never in this column.
  amount: real('amount').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('thb'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  receiptUrl: varchar('receipt_url', { length: 500 }),
  failureReason: varchar('failure_reason', { length: 255 }),
  // Unlike most timestamp columns in this schema (plain `timestamp()`, app-controlled),
  // these track externally-driven Stripe webhook events, so they use `withTimezone: true`
  // — same reasoning as `telemetry_history.recordedAt` for IoT-originated timestamps.
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
