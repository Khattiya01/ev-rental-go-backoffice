import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { geofenceZones } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'

export async function GET(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'vehicles', 'canRead')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'

  const rows = includeInactive
    ? await db.select().from(geofenceZones).orderBy(geofenceZones.createdAt)
    : await db.select().from(geofenceZones).where(eq(geofenceZones.active, true)).orderBy(geofenceZones.createdAt)

  return NextResponse.json({ data: rows })
}

export async function POST(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'vehicles', 'canWrite')
  if (denied) return denied

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  if (!Array.isArray(body.coordinates) || body.coordinates.length < 3) {
    return NextResponse.json({ error: 'coordinates must be an array of at least 3 [lat, lng] pairs' }, { status: 400 })
  }
  const coordinates = body.coordinates as [number, number][]
  for (const pt of coordinates) {
    if (!Array.isArray(pt) || pt.length !== 2 || typeof pt[0] !== 'number' || typeof pt[1] !== 'number') {
      return NextResponse.json({ error: 'Each coordinate must be [lat: number, lng: number]' }, { status: 400 })
    }
  }

  const alertRecipients: string[] = Array.isArray(body.alertRecipients) &&
    (body.alertRecipients as unknown[]).every(x => typeof x === 'string')
    ? (body.alertRecipients as string[])
    : []

  try {
    const [inserted] = await db
      .insert(geofenceZones)
      .values({ name, coordinates, alertRecipients, createdBy: currentUser.id })
      .returning()

    return NextResponse.json(inserted, { status: 201 })
  } catch (err) {
    const message = process.env.NODE_ENV === 'development' && err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
