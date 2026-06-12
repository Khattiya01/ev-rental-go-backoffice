import { NextResponse } from 'next/server'
import { eq, and, sql } from 'drizzle-orm'
import { getTableColumns } from 'drizzle-orm'
import { db } from '@/db'
import { contracts, vehicles, geofenceZones } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'
import { isDuplicateKeyError } from '@/lib/db-errors'
import type { VehicleStatus } from '@/lib/types'

const VALID_STATUSES: VehicleStatus[] = ['available', 'rented', 'charging', 'under_repair', 'offline']

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'vehicles', 'canRead')
  if (denied) return denied

  const { id } = await params

  let rows: { vehicle: typeof vehicles.$inferSelect; geofenceZoneName: string | null }[]
  try {
    rows = await db
      .select({
        vehicle: getTableColumns(vehicles),
        geofenceZoneName: geofenceZones.name,
      })
      .from(vehicles)
      .leftJoin(geofenceZones, eq(vehicles.geofenceZoneId, geofenceZones.id))
      .where(eq(vehicles.id, id))
      .limit(1)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const row = rows[0]
  if (!row) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }

  return NextResponse.json({ ...row.vehicle, geofenceZoneName: row.geofenceZoneName ?? null })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'vehicles', 'canWrite')
  if (denied) return denied

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const fields: {
    plate?: string
    make?: string
    model?: string
    year?: number
    color?: string | null
    vin?: string | null
    status?: VehicleStatus
    imageUrl?: string | null
    images?: string[]
    odometer?: number
    location?: string | null
    condition?: string | null
    nextServiceDate?: string | null
    geofenceZoneId?: string | null
  } = {}

  if (body.plate !== undefined) {
    if (typeof body.plate !== 'string' || body.plate.trim() === '') {
      return NextResponse.json({ error: 'plate must be a non-empty string' }, { status: 400 })
    }
    fields.plate = body.plate.trim()
  }

  if (body.make !== undefined) {
    if (typeof body.make !== 'string' || body.make.trim() === '') {
      return NextResponse.json({ error: 'make must be a non-empty string' }, { status: 400 })
    }
    fields.make = body.make.trim()
  }

  if (body.model !== undefined) {
    if (typeof body.model !== 'string' || body.model.trim() === '') {
      return NextResponse.json({ error: 'model must be a non-empty string' }, { status: 400 })
    }
    fields.model = body.model.trim()
  }

  if (body.year !== undefined) {
    const yearInt =
      typeof body.year === 'number' ? Math.trunc(body.year) : parseInt(String(body.year), 10)
    if (!Number.isInteger(yearInt) || yearInt < 1900 || yearInt > 2100) {
      return NextResponse.json(
        { error: 'year must be an integer between 1900 and 2100' },
        { status: 400 },
      )
    }
    fields.year = yearInt
  }

  if (body.odometer !== undefined) {
    const odometerInt =
      typeof body.odometer === 'number' ? Math.trunc(body.odometer) : parseInt(String(body.odometer), 10)
    if (!Number.isInteger(odometerInt) || odometerInt < 0) {
      return NextResponse.json(
        { error: 'odometer must be a non-negative integer' },
        { status: 400 },
      )
    }
    fields.odometer = odometerInt
  }

  if (body.status !== undefined) {
    if (
      typeof body.status !== 'string' ||
      !(VALID_STATUSES as string[]).includes(body.status)
    ) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      )
    }
    fields.status = body.status as VehicleStatus
  }

  for (const field of [
    'color',
    'vin',
    'imageUrl',
    'location',
    'condition',
    'nextServiceDate',
  ] as const) {
    if (body[field] !== undefined) {
      const val = body[field]
      if (val !== null && typeof val !== 'string') {
        return NextResponse.json(
          { error: `${field} must be a string or null` },
          { status: 400 },
        )
      }
      fields[field] = val as string | null
    }
  }

  if (body.geofenceZoneId !== undefined) {
    if (body.geofenceZoneId !== null && typeof body.geofenceZoneId !== 'string') {
      return NextResponse.json({ error: 'geofenceZoneId must be a UUID string or null' }, { status: 400 })
    }
    fields.geofenceZoneId = body.geofenceZoneId as string | null
  }

  if (body.images !== undefined) {
    if (
      !Array.isArray(body.images) ||
      (body.images as unknown[]).some(v => typeof v !== 'string')
    ) {
      return NextResponse.json({ error: 'images must be an array of strings' }, { status: 400 })
    }
    const imgs = body.images as string[]
    fields.images = imgs
    fields.imageUrl = imgs[0] ?? null
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Optional optimistic-lock guard — clients may send the `version` they last read.
  const expectedVersion = typeof body.expectedVersion === 'number' ? body.expectedVersion : undefined
  const whereClause = expectedVersion !== undefined
    ? and(eq(vehicles.id, id), eq(vehicles.version, expectedVersion))
    : eq(vehicles.id, id)

  try {
    const rows = await db
      .update(vehicles)
      .set({ ...fields, version: sql`${vehicles.version} + 1` })
      .where(whereClause)
      .returning()

    if (rows.length === 0) {
      // No row matched. With a version guard, that's either a stale write (row
      // exists but version moved) or a missing row — distinguish the two.
      if (expectedVersion !== undefined) {
        const [exists] = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.id, id)).limit(1)
        if (exists) {
          return NextResponse.json(
            { error: 'รถคันนี้ถูกแก้ไขโดยผู้ใช้อื่น กรุณาโหลดข้อมูลใหม่แล้วลองอีกครั้ง', code: 'version_conflict' },
            { status: 409 },
          )
        }
      }
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: 'Plate number already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'vehicles', 'canDelete')
  if (denied) return denied

  const { id } = await params

  let linkedContracts: { id: string; contractNo: string; status: string }[]
  try {
    linkedContracts = await db
      .select({ id: contracts.id, contractNo: contracts.contractNo, status: contracts.status })
      .from(contracts)
      .where(eq(contracts.vehicleId, id))
      .limit(1)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (linkedContracts.length > 0) {
    const c = linkedContracts[0]
    const isActive = c.status === 'active' || c.status === 'overdue'
    const msg = isActive
      ? `ไม่สามารถลบรถได้ เนื่องจากมีสัญญาเช่าที่ยังไม่สิ้นสุด (${c.contractNo}) กรุณาปิดสัญญาก่อน`
      : `ไม่สามารถลบรถได้ เนื่องจากรถนี้มีประวัติสัญญาเช่า (${c.contractNo})`
    return NextResponse.json({ error: msg }, { status: 409 })
  }

  let rows: { id: string }[]
  try {
    rows = await db
      .delete(vehicles)
      .where(eq(vehicles.id, id))
      .returning({ id: vehicles.id })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
