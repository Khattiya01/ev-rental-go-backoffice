import { pgTable, uuid, varchar, real, integer, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { customers } from './customers'
import { contracts } from './contracts'

export const invoiceStatusEnum = pgEnum('invoice_status', ['paid', 'pending', 'overdue'])
export const billingTypeEnum = pgEnum('billing_type', ['daily', 'monthly', 'one_time'])

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceNo: varchar('invoice_no', { length: 20 }).notNull().unique(),
  contractId: uuid('contract_id').references(() => contracts.id),
  customerId: uuid('customer_id').references(() => customers.id),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  vehiclePlate: varchar('vehicle_plate', { length: 20 }),
  billingType: billingTypeEnum('billing_type').notNull().default('monthly'),
  description: varchar('description', { length: 500 }),
  amount: real('amount').notNull(),
  dueDate: varchar('due_date', { length: 50 }).notNull(),
  status: invoiceStatusEnum('status').notNull().default('pending'),
  paidAt: varchar('paid_at', { length: 50 }),
  daysOverdue: integer('days_overdue').default(0),
  lastContacted: varchar('last_contacted', { length: 50 }),
  slipUrl: varchar('slip_url', { length: 500 }),
  periodYear: integer('period_year'),
  periodMonth: integer('period_month'),
  periodDay: integer('period_day'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  // Cron-generated invoices are deduped by period so a concurrent / repeated
  // generate-invoices run can't create duplicates (paired with onConflictDoNothing).
  // Both indexes are partial on `periodYear IS NOT NULL`, which is only set by the
  // cron — manual / one-time invoices leave the period columns NULL and are excluded,
  // so they can still repeat freely for the same contract.
  //   Monthly: one per (contract, year, month) when periodDay IS NULL
  uniqueIndex('uq_invoice_contract_month')
    .on(t.contractId, t.periodYear, t.periodMonth)
    .where(sql`${t.periodDay} is null and ${t.periodYear} is not null`),
  //   Daily: one per (contract, year, month, day) when periodDay IS NOT NULL
  uniqueIndex('uq_invoice_contract_day')
    .on(t.contractId, t.periodYear, t.periodMonth, t.periodDay)
    .where(sql`${t.periodDay} is not null`),
])

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
