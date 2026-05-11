import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import bcrypt from 'bcryptjs'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client, { schema })

async function seed() {
  console.log('🌱 Seeding database...')

  // Seed admin users
  const passwordHash = await bcrypt.hash('admin1234', 12)
  await db.insert(schema.users).values([
    { name: 'Super Admin', email: 'admin@evrentalgo.com', passwordHash, role: 'super_admin' },
    { name: 'Fleet Manager', email: 'fleet@evrentalgo.com', passwordHash, role: 'admin' },
    { name: 'Viewer', email: 'viewer@evrentalgo.com', passwordHash, role: 'viewer' },
  ]).onConflictDoNothing()

  // Seed vehicles
  await db.insert(schema.vehicles).values([
    { plate: 'กข-1234', make: 'Tesla', model: 'Model 3', year: 2023, color: 'White', status: 'available', socPercent: 85, odometer: 12500, mileage: 12500, lat: 13.756, lng: 100.502, condition: 'Excellent', location: 'Bangkok HQ' },
    { plate: 'คง-5678', make: 'Tesla', model: 'Model Y', year: 2023, color: 'Black', status: 'rented', socPercent: 62, odometer: 8900, mileage: 8900, lat: 13.760, lng: 100.510, condition: 'Good', location: 'On Road' },
    { plate: 'ชซ-3456', make: 'Hyundai', model: 'Ioniq 5', year: 2022, color: 'Silver', status: 'charging', socPercent: 34, odometer: 22100, mileage: 22100, lat: 13.750, lng: 100.495, condition: 'Good', location: 'Charging Station A' },
    { plate: 'ดต-7890', make: 'BYD', model: 'Atto 3', year: 2023, color: 'Blue', status: 'under_repair', socPercent: 91, odometer: 5200, mileage: 5200, lat: 13.748, lng: 100.520, condition: 'Fair', location: 'Workshop' },
    { plate: 'ถท-2345', make: 'MG', model: 'MG4', year: 2024, color: 'Red', status: 'offline', socPercent: 10, odometer: 31000, mileage: 31000, lat: 13.762, lng: 100.498, condition: 'Good', location: 'Unknown' },
  ]).onConflictDoNothing()

  // Seed customers
  await db.insert(schema.customers).values([
    { name: 'Somchai Jaidee', phone: '089-123-4567', email: 'somchai@email.com', address: '123 Sukhumvit Rd, Bangkok', status: 'active', driverType: 'Grab', creditScore: 820, rating: 4.8 },
    { name: 'Malee Suwan', phone: '081-234-5678', email: 'malee@email.com', address: '456 Rama 9, Bangkok', status: 'pending_kyc', driverType: 'Bolt', creditScore: 0, rating: 0 },
    { name: 'Narong Chai', phone: '090-345-6789', email: 'narong@email.com', address: '789 Lat Phrao, Bangkok', status: 'blacklisted', driverType: 'Grab', creditScore: 350, rating: 3.2, bannedDate: '01/03/2024', bannedReason: 'Long Overdue Payment', bannedBy: 'Super Admin' },
  ]).onConflictDoNothing()

  console.log('✅ Seed complete')
  await client.end()
}

seed().catch(e => { console.error(e); process.exit(1) })
