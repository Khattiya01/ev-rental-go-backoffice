import { pgTable, uuid, varchar, real, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const customerStatusEnum = pgEnum('customer_status', ['pending_kyc', 'active', 'blacklisted'])

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  address: varchar('address', { length: 500 }),
  status: customerStatusEnum('status').notNull().default('pending_kyc'),
  driverType: varchar('driver_type', { length: 20 }).default('Grab'),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  creditScore: real('credit_score').default(0),
  rating: real('rating').default(0),
  bannedDate: varchar('banned_date', { length: 50 }),
  bannedReason: varchar('banned_reason', { length: 255 }),
  bannedBy: varchar('banned_by', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
