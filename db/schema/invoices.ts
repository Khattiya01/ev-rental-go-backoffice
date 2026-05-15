import { pgTable, uuid, varchar, real, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
