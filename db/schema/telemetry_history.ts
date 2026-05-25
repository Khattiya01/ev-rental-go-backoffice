import { pgTable, uuid, integer, doublePrecision, timestamp } from 'drizzle-orm/pg-core'
import { vehicles } from './vehicles'

export const telemetryHistory = pgTable('telemetry_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
  socPercent: integer('soc_percent').notNull(),
  temperature: doublePrecision('temperature'),
  chargeCycles: integer('charge_cycles'),
  deepDischargeCount: integer('deep_discharge_count'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
})

export type TelemetryRecord = typeof telemetryHistory.$inferSelect
export type NewTelemetryRecord = typeof telemetryHistory.$inferInsert
