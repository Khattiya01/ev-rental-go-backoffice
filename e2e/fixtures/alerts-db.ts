import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

// The Playwright test runner's own Node process never gets `.env.test` (that's
// only passed to the spawned `pnpm dev:test` webServer via `--env-file`), so
// DATABASE_URL has to be read from the file directly here.
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

export type SeedAlertType = 'battery_low' | 'geofence_breach' | 'payment_reminder' | 'vehicle_offline'
export type SeedAlertSeverity = 'info' | 'warning' | 'critical'

export interface SeedAlertInput {
  type: SeedAlertType
  severity: SeedAlertSeverity
  message: string
  entityId: string
  resolved?: boolean
}

// Inserts a row straight into the `alerts` table — the API has no public POST
// endpoint (alerts are only ever created by the cron jobs / IoT gateway), so a
// direct DB fixture is the only way to drive the UI from a known alert state.
// Mirrors the "Redis fixture writes the key directly" pattern used for live-map
// specs (TESTING_PLAN.md §3.1.4).
export async function seedAlert(input: SeedAlertInput): Promise<string> {
  const db = client()
  const [row] = await db<{ id: string }[]>`
    insert into alerts (type, severity, message, entity_id, resolved)
    values (${input.type}, ${input.severity}, ${input.message}, ${input.entityId}, ${input.resolved ?? false})
    returning id
  `
  return row.id
}

export async function deleteAlerts(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = client()
  await db`delete from alerts where id in ${db(ids)}`
}

export async function closeAlertsDb(): Promise<void> {
  if (sql) {
    await sql.end()
    sql = null
  }
}
