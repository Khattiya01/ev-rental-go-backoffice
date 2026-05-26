import { pgTable, uuid, varchar, real, integer, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core'
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
  // Monthly dedup: one invoice per (contract, year, month) when periodDay is NULL.
  // Daily dedup:   one invoice per (contract, year, month, day) when periodDay is set.
  // PostgreSQL does not enforce uniqueness across NULL values, so both cases are
  // independently protected. Manual / one-time invoices (all NULLs) are unaffected.
  uniqueIndex('uq_invoice_contract_period').on(t.contractId, t.periodYear, t.periodMonth, t.periodDay),
])

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
