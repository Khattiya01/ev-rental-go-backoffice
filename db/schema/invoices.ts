import { pgTable, uuid, varchar, real, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { customers } from './customers'
import { contracts } from './contracts'

export const invoiceStatusEnum = pgEnum('invoice_status', ['paid', 'pending', 'overdue'])

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').references(() => contracts.id),
  customerId: uuid('customer_id').references(() => customers.id),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  amount: real('amount').notNull(),
  dueDate: varchar('due_date', { length: 50 }).notNull(),
  status: invoiceStatusEnum('status').notNull().default('pending'),
  daysOverdue: integer('days_overdue').default(0),
  lastContacted: varchar('last_contacted', { length: 50 }),
  slipUrl: varchar('slip_url', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
