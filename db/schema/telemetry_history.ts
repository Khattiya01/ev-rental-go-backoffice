import { pgTable, uuid, integer, doublePrecision, timestamp, primaryKey, index } from 'drizzle-orm/pg-core'
import { vehicles } from './vehicles'

export const telemetryHistory = pgTable('telemetry_history', {
  id: uuid('id').notNull().defaultRandom(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  socPercent: integer('soc_percent').notNull(),
  temperature: doublePrecision('temperature'),
  chargeCycles: integer('charge_cycles'),
  deepDischargeCount: integer('deep_discharge_count'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
}, t => [
  // TimescaleDB requires the partitioning column (recorded_at) in any unique/primary key
  primaryKey({ columns: [t.id, t.recordedAt] }),
  index('idx_telemetry_vehicle_recorded').on(t.vehicleId, t.recordedAt),
])

export type TelemetryRecord = typeof telemetryHistory.$inferSelect
export type NewTelemetryRecord = typeof telemetryHistory.$inferInsert
