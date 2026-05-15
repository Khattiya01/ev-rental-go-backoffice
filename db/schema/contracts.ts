import { pgTable, uuid, varchar, real, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { customers } from './customers'
import { vehicles } from './vehicles'

export const contractStatusEnum = pgEnum('contract_status', ['active', 'overdue', 'completed'])

export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractNo: varchar('contract_no', { length: 50 }).notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  vehiclePlate: varchar('vehicle_plate', { length: 20 }).notNull(),
  startDate: varchar('start_date', { length: 50 }).notNull(),
  dueDate: varchar('due_date', { length: 50 }).notNull(),
  status: contractStatusEnum('status').notNull().default('active'),
  dailyRate: real('daily_rate').notNull(),
  monthlyRate: real('monthly_rate').notNull(),
  depositAmount: real('deposit_amount').notNull(),
  documentUrl: varchar('document_url', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Contract = typeof contracts.$inferSelect
export type NewContract = typeof contracts.$inferInsert
