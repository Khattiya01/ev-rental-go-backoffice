import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

function loadTestDatabaseUrl(): string {
  const envPath = path.join(__dirname, '../../.env.test')
  const content = fs.readFileSync(envPath, 'utf-8')
  const match = content.match(/^DATABASE_URL=(.+)$/m)
  if (!match) throw new Error('DATABASE_URL not found in .env.test')
  return match[1].trim()
}

let sql: postgres.Sql | null = null
function client(): postgres.Sql {
  if (!sql) sql = postgres(loadTestDatabaseUrl(), { prepare: false, max: 1 })
  return sql
}

export async function closeGatewayDb(): Promise<void> {
  if (sql) {
    await sql.end()
    sql = null
  }
}

// The gateway's vehicle-validator only lets telemetry through for a vehicle_id
// that already exists in the `vehicles` table, so @gateway specs must seed a row
// with the *exact* id the MQTT credential was provisioned for (see
// mosquitto/passwd — these two ids have matching publish-only test credentials).
export type GatewayFixtureVehicle = 'vehicle-a' | 'vehicle-b'

export const GATEWAY_FIXTURE_VEHICLE_IDS: Record<GatewayFixtureVehicle, string> = {
  'vehicle-a': 'ad91dce9-4dea-442e-b470-d48e8a5b1377',
  'vehicle-b': 'e860b971-e7bf-47a5-b7a9-86f28f35b5d7',
}

export interface SeedGatewayVehicleInput {
  fixture: GatewayFixtureVehicle
  plate: string
  status?: 'available' | 'rented' | 'charging' | 'under_repair' | 'offline'
}

export async function seedGatewayVehicle(input: SeedGatewayVehicleInput): Promise<string> {
  const db = client()
  const id = GATEWAY_FIXTURE_VEHICLE_IDS[input.fixture]
  await db`
    insert into vehicles (id, plate, make, model, year, status)
    values (${id}, ${input.plate}, 'Test', 'Fixture', 2024, ${input.status ?? 'available'})
  `
  return id
}

export async function getVehicleStatus(vehicleId: string): Promise<string | null> {
  const db = client()
  const [row] = await db<{ status: string }[]>`select status from vehicles where id = ${vehicleId}`
  return row?.status ?? null
}

export async function getUnresolvedAlerts(entityId: string, type: string): Promise<Array<{ id: string; severity: string; resolved: boolean }>> {
  const db = client()
  return db<{ id: string; severity: string; resolved: boolean }[]>`
    select id, severity, resolved from alerts
    where entity_id = ${entityId} and type = ${type} and resolved = false
    order by created_at desc
  `
}

// telemetry_history has ON DELETE CASCADE on vehicle_id, so deleting the vehicle
// row cleans that up automatically — only alerts (keyed by the loosely-typed
// entity_id varchar, no FK) need an explicit delete.
export async function deleteGatewayVehicles(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = client()
  await db`delete from alerts where entity_id in ${db(ids)}`
  await db`delete from vehicles where id in ${db(ids)}`
}
