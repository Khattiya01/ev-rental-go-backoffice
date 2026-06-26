import fs from 'fs'
import path from 'path'
import Redis from 'ioredis'

function loadTestRedisUrl(): string {
  const envPath = path.join(__dirname, '../../.env.test')
  const content = fs.readFileSync(envPath, 'utf-8')
  const match = content.match(/^REDIS_URL=(.+)$/m)
  if (!match) throw new Error('REDIS_URL not found in .env.test')
  return match[1].trim()
}

let redis: Redis | null = null
function client(): Redis {
  if (!redis) redis = new Redis(loadTestRedisUrl())
  return redis
}

// Mirrors the gateway's redis-writer.ts key format exactly (`vehicle:pos:{id}`)
// so deleting it simulates "vehicle stopped reporting" without waiting out the
// real 300s TTL — this is what offline-detector's next cron tick scans for.
export async function deleteVehiclePosition(vehicleId: string): Promise<void> {
  await client().del(`vehicle:pos:${vehicleId}`)
}

// global-setup.ts only truncates/reseeds Postgres — Redis positions written
// during a test (TTL 300s) survive across runs since nothing else clears them.
// Specs that publish telemetry for the fixture vehicles must clean this up
// themselves in afterAll, or a leftover key can leak into the next run.
export async function deleteVehiclePositions(vehicleIds: string[]): Promise<void> {
  if (vehicleIds.length === 0) return
  await client().del(...vehicleIds.map(id => `vehicle:pos:${id}`))
}

export async function getVehiclePosition(vehicleId: string): Promise<string | null> {
  return client().get(`vehicle:pos:${vehicleId}`)
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    redis.disconnect()
    redis = null
  }
}
