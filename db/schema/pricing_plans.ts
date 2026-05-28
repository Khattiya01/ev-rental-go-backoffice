import { pgTable, uuid, varchar, real, boolean, timestamp } from 'drizzle-orm/pg-core'

export const pricingPlans = pgTable('pricing_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleModel: varchar('vehicle_model', { length: 255 }).notNull().unique(),
  dailyRate: real('daily_rate').notNull().default(0),
  monthlyRate: real('monthly_rate').notNull().default(0),
  deposit: real('deposit').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type PricingPlan = typeof pricingPlans.$inferSelect
export type NewPricingPlan = typeof pricingPlans.$inferInsert
