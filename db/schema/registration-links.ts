import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core'

export const registrationLinks = pgTable('registration_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  note: varchar('note', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type RegistrationLink = typeof registrationLinks.$inferSelect
export type NewRegistrationLink = typeof registrationLinks.$inferInsert
