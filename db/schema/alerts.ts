import { pgTable, uuid, varchar, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'warning', 'critical'])

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 100 }).notNull(),
  severity: alertSeverityEnum('severity').notNull().default('warning'),
  message: varchar('message', { length: 500 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  resolved: boolean('resolved').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Alert = typeof alerts.$inferSelect
export type NewAlert = typeof alerts.$inferInsert
