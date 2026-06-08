import Redis from 'ioredis'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { vehicles } from '@/db/schema'
import type { WebSocket } from 'ws'

interface VehiclePosition {
  vehicleId: string
  lat: number
  lng: number
  soc: number
  speed: number | null
  status: string
  updatedAt: string | null
}

interface RedisPositionPayload {
  lat: number
  lng: number
  soc: number
  speed: number
  status: string
  updated_at: string
}

const BROADCAST_INTERVAL_MS = 5_000

const clients = new Set<WebSocket>()
const lastPositions = new Map<string, VehiclePosition>()
const lastCompare = new Map<string, string>()
let broadcastTimer: ReturnType<typeof setInterval> | null = null

let _redis: Redis | null = null
let _db: ReturnType<typeof drizzle> | null = null

function getRedis(): Redis {
  if (!_redis) {
    if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set')
    _redis = new Redis(process.env.REDIS_URL)
    _redis.on('error', (err) => console.error('[WS Broadcaster] Redis error:', err))
  }
  return _redis
}

function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 })
    _db = drizzle(client, { schema: { vehicles } })
  }
  return _db
}

async function fetchAllPositions(): Promise<VehiclePosition[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: vehicles.id,
      status: vehicles.status,
      lat: vehicles.lat,
      lng: vehicles.lng,
      socPercent: vehicles.socPercent,
    })
    .from(vehicles)

  if (rows.length === 0) return []

  const positions: VehiclePosition[] = []

  try {
    const redis = getRedis()
    const keys = rows.map((v) => `vehicle:pos:${v.id}`)
    const rawValues = await redis.mget(...keys)

    for (let i = 0; i < rows.length; i++) {
      const vehicle = rows[i]
      const raw = rawValues[i]
      let usedRedis = false

      if (raw) {
        try {
          const parsed = JSON.parse(raw) as RedisPositionPayload
          if (
            typeof parsed.lat === 'number' && isFinite(parsed.lat) &&
            typeof parsed.lng === 'number' && isFinite(parsed.lng)
          ) {
            positions.push({
              vehicleId: vehicle.id,
              lat: parsed.lat,
              lng: parsed.lng,
              soc: parsed.soc,
              speed: parsed.speed ?? null,
              status: parsed.status,
              updatedAt: parsed.updated_at,
            })
            usedRedis = true
          }
        } catch {
          // invalid JSON — fall through to DB
        }
      }

      if (!usedRedis) {
        positions.push({
          vehicleId: vehicle.id,
          lat: vehicle.lat,
          lng: vehicle.lng,
          soc: vehicle.socPercent,
          speed: null,
          status: vehicle.status,
          updatedAt: null,
        })
      }
    }
  } catch {
    // Redis unavailable — use DB only
    for (const vehicle of rows) {
      positions.push({
        vehicleId: vehicle.id,
        lat: vehicle.lat,
        lng: vehicle.lng,
        soc: vehicle.socPercent,
        speed: null,
        status: vehicle.status,
        updatedAt: null,
      })
    }
  }

  return positions
}

function compareKey(pos: VehiclePosition): string {
  return JSON.stringify({ lat: pos.lat, lng: pos.lng, soc: pos.soc, speed: pos.speed, status: pos.status })
}

function broadcast(payload: unknown) {
  const message = JSON.stringify(payload)
  for (const client of clients) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(message)
    }
  }
}

async function tick() {
  if (clients.size === 0) return

  let positions: VehiclePosition[]
  try {
    positions = await fetchAllPositions()
  } catch (err) {
    console.error('[WS Broadcaster] fetchAllPositions error:', err)
    return
  }

  const updates: VehiclePosition[] = []

  for (const pos of positions) {
    const key = compareKey(pos)
    lastPositions.set(pos.vehicleId, pos)
    if (lastCompare.get(pos.vehicleId) !== key) {
      updates.push(pos)
    }
    lastCompare.set(pos.vehicleId, key)
  }

  if (updates.length > 0) {
    broadcast({ type: 'positions', data: updates })
  }
}

export function addClient(ws: WebSocket): void {
  clients.add(ws)
  // Send current snapshot immediately so client doesn't wait up to 5 seconds
  if (lastPositions.size > 0) {
    const snapshot = Array.from(lastPositions.values())
    ws.send(JSON.stringify({ type: 'positions', data: snapshot }))
  }
}

export function removeClient(ws: WebSocket): void {
  clients.delete(ws)
}

export function startBroadcaster(): void {
  if (broadcastTimer !== null) return
  // Initial tick to populate snapshot before first client connects
  tick().catch((err) => console.error('[WS Broadcaster] initial tick error:', err))
  broadcastTimer = setInterval(() => {
    tick().catch((err) => console.error('[WS Broadcaster] tick error:', err))
  }, BROADCAST_INTERVAL_MS)
  console.log('[WS Broadcaster] Started — broadcasting every', BROADCAST_INTERVAL_MS / 1000, 's')
}
