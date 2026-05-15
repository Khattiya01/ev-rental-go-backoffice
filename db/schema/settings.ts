import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core'

export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: varchar('value', { length: 1000 }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type AppSetting = typeof appSettings.$inferSelect
