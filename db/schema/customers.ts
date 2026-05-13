import { pgTable, uuid, varchar, real, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const customerStatusEnum = pgEnum('customer_status', ['pending_kyc', 'active', 'suspended', 'blacklisted'])

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  address: varchar('address', { length: 500 }),
  status: customerStatusEnum('status').notNull().default('pending_kyc'),
  driverType: varchar('driver_type', { length: 20 }).default('Grab'),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  idCardNumber: varchar('id_card_number', { length: 20 }),
  dateOfBirth: varchar('date_of_birth', { length: 20 }),
  idCardFrontUrl: varchar('id_card_front_url', { length: 500 }),
  idCardBackUrl: varchar('id_card_back_url', { length: 500 }),
  driverLicenseUrl: varchar('driver_license_url', { length: 500 }),
  grabBoltScreenshotUrl: varchar('grab_bolt_screenshot_url', { length: 500 }),
  notes: varchar('notes', { length: 2000 }),
  creditScore: real('credit_score').default(0),
  rating: real('rating').default(0),
  bannedDate: varchar('banned_date', { length: 50 }),
  bannedReason: varchar('banned_reason', { length: 255 }),
  bannedBy: varchar('banned_by', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
