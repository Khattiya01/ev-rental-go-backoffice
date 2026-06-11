import Redis from 'ioredis'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import { vehicles, geofenceZones, alerts as alertsSchema } from '@/db/schema'
import { pointInPolygon } from '@/lib/geofence-checker'
import type { WebSocket } from 'ws'

// ─── Interfaces ───────────────────────────────────────────────────────────────

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

interface VehicleZoneData {
  zoneId: string
  zoneName: string
  coordinates: [number, number][]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const BROADCAST_INTERVAL_MS  = 5_000
const ZONE_REFRESH_INTERVAL_MS = 60_000
const BREACH_COOLDOWN_MS     = 5 * 60 * 1000   // 5 min between alerts per vehicle

// ─── Module state ─────────────────────────────────────────────────────────────

const clients       = new Set<WebSocket>()
const lastPositions = new Map<string, VehiclePosition>()
const lastCompare   = new Map<string, string>()

// Geofence cache — refreshed every 60 s
const vehicleZoneCache  = new Map<string, VehicleZoneData>()  // vehicleId → zone
const vehiclePlateCache = new Map<string, string>()            // vehicleId → plate

// Breach cooldown — prevents alert spam
const lastBreachAlert = new Map<string, number>()  // vehicleId → epoch ms

let broadcastTimer:    ReturnType<typeof setInterval> | null = null
let zoneRefreshTimer:  ReturnType<typeof setInterval> | null = null

let _redis: Redis | null = null
let _db: ReturnType<typeof drizzle> | null = null

// ─── Singletons ───────────────────────────────────────────────────────────────

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
    const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 3 })
    _db = drizzle(client, { schema: { vehicles, geofenceZones, alertsSchema } })
  }
  return _db
}

// ─── GPS positions ────────────────────────────────────────────────────────────

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

// ─── Geofence data refresh ────────────────────────────────────────────────────

async function refreshGeofenceData(): Promise<void> {
  try {
    const db = getDb()

    // Vehicles that have an active zone assigned
    const zoneRows = await db
      .select({
        vehicleId: vehicles.id,
        plate:     vehicles.plate,
        zoneId:    geofenceZones.id,
        zoneName:  geofenceZones.name,
        coords:    geofenceZones.coordinates,
      })
      .from(vehicles)
      .innerJoin(geofenceZones, eq(vehicles.geofenceZoneId, geofenceZones.id))
      .where(eq(geofenceZones.active, true))

    // All vehicle plates (for alert messages)
    const plateRows = await db
      .select({ id: vehicles.id, plate: vehicles.plate })
      .from(vehicles)

    vehicleZoneCache.clear()
    vehiclePlateCache.clear()

    for (const row of zoneRows) {
      vehicleZoneCache.set(row.vehicleId, {
        zoneId: row.zoneId,
        zoneName: row.zoneName,
        coordinates: row.coords,
      })
    }
    for (const row of plateRows) {
      vehiclePlateCache.set(row.id, row.plate)
    }
  } catch (err) {
    console.error('[WS Broadcaster] refreshGeofenceData error:', err)
  }
}

// ─── Breach detection ─────────────────────────────────────────────────────────

async function checkBreaches(updates: VehiclePosition[]): Promise<void> {
  if (vehicleZoneCache.size === 0) return

  const db = getDb()
  const now = Date.now()

  for (const pos of updates) {
    const zone = vehicleZoneCache.get(pos.vehicleId)
    if (!zone) continue

    const inZone = pointInPolygon(pos.lat, pos.lng, zone.coordinates)
    if (inZone) continue

    // Outside zone — check cooldown
    const lastBreach = lastBreachAlert.get(pos.vehicleId) ?? 0
    if (now - lastBreach < BREACH_COOLDOWN_MS) continue

    lastBreachAlert.set(pos.vehicleId, now)
    const plate = vehiclePlateCache.get(pos.vehicleId) ?? pos.vehicleId

    try {
      const [alert] = await db
        .insert(alertsSchema)
        .values({
          type:     'geofence_breach',
          severity: 'warning',
          message:  `Vehicle ${plate} exited geofence zone "${zone.zoneName}"`,
          entityId: pos.vehicleId,
        })
        .returning()

      broadcast({
        type: 'alert',
        data: {
          id:        alert.id,
          type:      'geofence_breach',
          severity:  'warning',
          message:   alert.message,
          vehicleId: pos.vehicleId,
          plate,
          zoneName:  zone.zoneName,
          createdAt: alert.createdAt.toISOString(),
          href:      `/fleet/vehicles/${pos.vehicleId}`,
        },
      })

      console.log(`[WS Broadcaster] Breach: ${plate} left "${zone.zoneName}"`)
    } catch (err) {
      console.error('[WS Broadcaster] breach alert insert error:', err)
    }
  }
}

// ─── Broadcast helpers ────────────────────────────────────────────────────────

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

// ─── Main tick ────────────────────────────────────────────────────────────────

async function tick() {
  // Always run — breach detection must not depend on WS clients being connected.
  // Only skip the broadcast step when nobody is listening.
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
    if (clients.size > 0) broadcast({ type: 'positions', data: updates })
    await checkBreaches(updates)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function addClient(ws: WebSocket): void {
  clients.add(ws)
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

  // Initial data load
  tick().catch((err) => console.error('[WS Broadcaster] initial tick error:', err))
  refreshGeofenceData().catch((err) => console.error('[WS Broadcaster] initial zone refresh error:', err))

  broadcastTimer = setInterval(() => {
    tick().catch((err) => console.error('[WS Broadcaster] tick error:', err))
  }, BROADCAST_INTERVAL_MS)

  zoneRefreshTimer = setInterval(() => {
    refreshGeofenceData().catch((err) => console.error('[WS Broadcaster] zone refresh error:', err))
  }, ZONE_REFRESH_INTERVAL_MS)

  console.log('[WS Broadcaster] Started — broadcasting every', BROADCAST_INTERVAL_MS / 1000, 's, zone refresh every', ZONE_REFRESH_INTERVAL_MS / 1000, 's')
}
