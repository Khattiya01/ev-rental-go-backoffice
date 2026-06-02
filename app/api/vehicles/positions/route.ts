import { NextResponse } from 'next/server'
import { db } from '@/db'
import { vehicles } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'
import { getRedisClient } from '@/lib/redis'

interface VehiclePosition {
  vehicleId: string
  lat: number
  lng: number
  soc: number
  speed: number | null
  status: string
  updatedAt: string | null
  source: 'redis' | 'db'
}

interface RedisPositionPayload {
  lat: number
  lng: number
  soc: number
  speed: number
  status: string
  updated_at: string
}

export async function GET(): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'vehicles', 'canRead')
  if (denied) return denied

  const rows = await db
    .select({
      id: vehicles.id,
      status: vehicles.status,
      lat: vehicles.lat,
      lng: vehicles.lng,
      socPercent: vehicles.socPercent,
    })
    .from(vehicles)

  const positions: VehiclePosition[] = []

  try {
    const redis = getRedisClient()
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
              speed: parsed.speed,
              status: parsed.status,
              updatedAt: parsed.updated_at,
              source: 'redis',
            })
            usedRedis = true
          }
        } catch {
          // Invalid JSON — fall through to DB fallback
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
          source: 'db',
        })
      }
    }
  } catch {
    // Redis completely unavailable — fall back to all DB data
    for (const vehicle of rows) {
      positions.push({
        vehicleId: vehicle.id,
        lat: vehicle.lat,
        lng: vehicle.lng,
        soc: vehicle.socPercent,
        speed: null,
        status: vehicle.status,
        updatedAt: null,
        source: 'db',
      })
    }
  }

  return NextResponse.json({ data: positions })
}
