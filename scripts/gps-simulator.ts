import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import Redis from 'ioredis'
import { vehicles } from '../db/schema'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client, { schema: { vehicles } })
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
redis.on('error', (err) => console.error('[GPS-SIM] Redis error:', err))

interface Position {
  lat: number
  lng: number
  soc: number
  speed: number
  status: string
}

async function main() {
  const rows = await db
    .select({
      id: vehicles.id,
      status: vehicles.status,
      lat: vehicles.lat,
      lng: vehicles.lng,
      socPercent: vehicles.socPercent,
    })
    .from(vehicles)

  const positions = new Map<string, Position>()

  for (const v of rows) {
    // Offline vehicles have a non-responding IoT device — they publish no GPS.
    // Their Redis key is left to expire so readers fall back to the last known
    // DB position and render the marker greyed out.
    if (v.status === 'offline') continue
    positions.set(v.id, {
      lat: v.lat,
      lng: v.lng,
      soc: v.socPercent,
      speed: 0,
      status: v.status,
    })
  }

  const offlineCount = rows.length - positions.size
  console.log(`[GPS-SIM] Started — simulating ${positions.size} vehicles (${offlineCount} offline, no GPS). Press Ctrl+C to stop.`)

  if (positions.size === 0) {
    console.warn('[GPS-SIM] No vehicles in DB. Run `pnpm db:seed` first.')
    await redis.quit()
    await client.end()
    process.exit(0)
  }

  const interval = setInterval(() => {
    for (const [vehicleId, pos] of positions) {
      // Random walk
      pos.lat += (Math.random() - 0.5) * 0.002
      pos.lng += (Math.random() - 0.5) * 0.002

      // Clamp to Bangkok area bounds
      pos.lat = Math.max(13.65, Math.min(13.95, pos.lat))
      pos.lng = Math.max(100.40, Math.min(100.75, pos.lng))

      // Speed based on status
      if (pos.status === 'rented') {
        pos.speed = Math.floor(Math.random() * 80)
      } else {
        pos.speed = 0
      }

      // Battery drift (±2 per tick, clamped to 10–100)
      pos.soc += Math.round((Math.random() - 0.5) * 4)
      pos.soc = Math.max(10, Math.min(100, pos.soc))

      const payload = {
        lat: pos.lat,
        lng: pos.lng,
        soc: pos.soc,
        speed: pos.speed,
        status: pos.status,
        updated_at: new Date().toISOString(),
      }

      redis.set(`vehicle:pos:${vehicleId}`, JSON.stringify(payload), 'EX', 30)
    }

    console.log(`[GPS-SIM] ${new Date().toLocaleTimeString()} — updated ${positions.size} vehicles`)
  }, 5000)

  process.on('SIGINT', async () => {
    console.log('\n[GPS-SIM] Stopping...')
    clearInterval(interval)
    await redis.quit()
    await client.end()
    console.log('[GPS-SIM] Stopped.')
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('[GPS-SIM] Fatal error:', err)
  process.exit(1)
})
