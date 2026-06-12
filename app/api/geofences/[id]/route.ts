import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { geofenceZones, vehicles } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'vehicles', 'canRead')
  if (denied) return denied

  const { id } = await params
  const [zone] = await db.select().from(geofenceZones).where(eq(geofenceZones.id, id)).limit(1)
  if (!zone) return NextResponse.json({ error: 'Zone not found' }, { status: 404 })

  return NextResponse.json(zone)
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
    name?: string
    coordinates?: [number, number][]
    active?: boolean
    alertRecipients?: string[]
    updatedAt?: Date
  } = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
    }
    fields.name = body.name.trim()
  }

  if (body.coordinates !== undefined) {
    if (!Array.isArray(body.coordinates) || body.coordinates.length < 3) {
      return NextResponse.json({ error: 'coordinates must be an array of at least 3 [lat, lng] pairs' }, { status: 400 })
    }
    fields.coordinates = body.coordinates as [number, number][]
  }

  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'active must be a boolean' }, { status: 400 })
    }
    fields.active = body.active
  }

  if (body.alertRecipients !== undefined) {
    if (!Array.isArray(body.alertRecipients) || (body.alertRecipients as unknown[]).some(x => typeof x !== 'string')) {
      return NextResponse.json({ error: 'alertRecipients must be an array of user ID strings' }, { status: 400 })
    }
    fields.alertRecipients = body.alertRecipients as string[]
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  fields.updatedAt = new Date()

  const rows = await db
    .update(geofenceZones)
    .set(fields)
    .where(eq(geofenceZones.id, id))
    .returning()

  if (rows.length === 0) return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'vehicles', 'canWrite')
  if (denied) return denied

  const { id } = await params

  // Clear FK on any vehicles assigned to this zone first (bump version so
  // edit-form optimistic locks see the change).
  await db
    .update(vehicles)
    .set({ geofenceZoneId: null, version: sql`${vehicles.version} + 1` })
    .where(eq(vehicles.geofenceZoneId, id))

  const rows = await db
    .delete(geofenceZones)
    .where(eq(geofenceZones.id, id))
    .returning({ id: geofenceZones.id })

  if (rows.length === 0) return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
