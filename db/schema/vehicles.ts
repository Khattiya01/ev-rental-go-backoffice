import { pgTable, uuid, varchar, integer, doublePrecision, timestamp, pgEnum, json, boolean } from 'drizzle-orm/pg-core'
import { geofenceZones } from './geofence_zones'

export const vehicleStatusEnum = pgEnum('vehicle_status', ['available', 'rented', 'charging', 'under_repair', 'offline'])

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  plate: varchar('plate', { length: 20 }).notNull().unique(),
  make: varchar('make', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  year: integer('year').notNull(),
  color: varchar('color', { length: 50 }),
  vin: varchar('vin', { length: 50 }),
  status: vehicleStatusEnum('status').notNull().default('available'),
  socPercent: integer('soc_percent').notNull().default(100),
  odometer: integer('odometer').notNull().default(0),
  mileage: integer('mileage').notNull().default(0),
  lat: doublePrecision('lat').notNull().default(13.756),
  lng: doublePrecision('lng').notNull().default(100.502),
  imageUrl: varchar('image_url', { length: 500 }),
  images: json('images').$type<string[]>().default([]),
  condition: varchar('condition', { length: 50 }).default('Good'),
  location: varchar('location', { length: 255 }),
  nextServiceDate: varchar('next_service_date', { length: 50 }),
  motorCutoffActive: boolean('motor_cutoff_active').notNull().default(false),
  geofenceZoneId: uuid('geofence_zone_id').references(() => geofenceZones.id, { onDelete: 'set null' }),
  // Optimistic-lock counter — bumped by PATCH. Clients may send `expectedVersion`
  // to be rejected with 409 when another admin edited the row in the meantime.
  version: integer('version').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Vehicle = typeof vehicles.$inferSelect
export type NewVehicle = typeof vehicles.$inferInsert
