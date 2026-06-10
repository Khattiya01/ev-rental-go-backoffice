import { pgTable, uuid, varchar, boolean, json, timestamp } from 'drizzle-orm/pg-core'

export const geofenceZones = pgTable('geofence_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  // Stored as [[lat, lng], ...] pairs — same format as lib/types GeofenceZone
  coordinates: json('coordinates').$type<[number, number][]>().notNull(),
  active: boolean('active').notNull().default(true),
  // Simple role-based recipient list: 'admin_only' | 'admin_fleet' | 'all'
  alertRecipients: varchar('alert_recipients', { length: 50 }).notNull().default('admin_only'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type GeofenceZoneRow = typeof geofenceZones.$inferSelect
export type NewGeofenceZone = typeof geofenceZones.$inferInsert
