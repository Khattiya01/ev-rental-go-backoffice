import { NextResponse } from 'next/server'
import { eq, ilike, or, and, count } from 'drizzle-orm'
import { db } from '@/db'
import { vehicles } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import type { VehicleStatus } from '@/lib/types'

const VALID_STATUSES: VehicleStatus[] = ['available', 'rented', 'charging', 'under_repair', 'offline']

export async function GET(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? undefined
  const statusParam = searchParams.get('status') ?? undefined
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

  const status = statusParam && (VALID_STATUSES as string[]).includes(statusParam)
    ? (statusParam as VehicleStatus)
    : undefined

  const conditions = []
  if (search) {
    conditions.push(or(ilike(vehicles.plate, `%${search}%`), ilike(vehicles.model, `%${search}%`)))
  }
  if (status) {
    conditions.push(eq(vehicles.status, status))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [{ total }] = await db.select({ total: count() }).from(vehicles).where(where)

  const data = await db
    .select()
    .from(vehicles)
    .where(where)
    .offset((page - 1) * limit)
    .limit(limit)

  return NextResponse.json({ data, total, page, limit })
}

export async function POST(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  let body: {
    plate?: unknown
    make?: unknown
    model?: unknown
    year?: unknown
    status?: unknown
    color?: unknown
    vin?: unknown
    imageUrl?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { year, status } = body
  const plate = body.plate?.toString().trim()
  const make = body.make?.toString().trim()
  const model = body.model?.toString().trim()
  const color = body.color?.toString().trim()
  const vin = body.vin?.toString().trim()
  const imageUrl = body.imageUrl?.toString().trim()

  if (!plate || !make || !model || year === undefined || year === null || !status) {
    return NextResponse.json(
      { error: 'plate, make, model, year, and status are required' },
      { status: 400 },
    )
  }

  if (typeof plate !== 'string' || typeof make !== 'string' || typeof model !== 'string') {
    return NextResponse.json({ error: 'Invalid field types' }, { status: 400 })
  }

  const yearInt =
    typeof year === 'number' ? Math.trunc(year) : parseInt(String(year), 10)
  if (!Number.isInteger(yearInt) || yearInt < 1900 || yearInt > 2100) {
    return NextResponse.json(
      { error: 'year must be an integer between 1900 and 2100' },
      { status: 400 },
    )
  }

  if (typeof status !== 'string' || !(VALID_STATUSES as string[]).includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 },
    )
  }

  if (color !== undefined && color !== null && typeof color !== 'string') {
    return NextResponse.json({ error: 'color must be a string or null' }, { status: 400 })
  }
  if (vin !== undefined && vin !== null && typeof vin !== 'string') {
    return NextResponse.json({ error: 'vin must be a string or null' }, { status: 400 })
  }
  if (imageUrl !== undefined && imageUrl !== null && typeof imageUrl !== 'string') {
    return NextResponse.json({ error: 'imageUrl must be a string or null' }, { status: 400 })
  }

  try {
    const [inserted] = await db
      .insert(vehicles)
      .values({
        plate,
        make,
        model,
        year: yearInt,
        status: status as VehicleStatus,
        color: (color as string | null | undefined) ?? null,
        vin: (vin as string | null | undefined) ?? null,
        imageUrl: (imageUrl as string | null | undefined) ?? null,
      })
      .returning()

    return NextResponse.json(inserted, { status: 201 })
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === '23505'
    ) {
      return NextResponse.json({ error: 'Plate number already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
