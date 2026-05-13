import { NextResponse } from 'next/server'
import { eq, ilike, or, and, count } from 'drizzle-orm'
import { db } from '@/db'
import { customers } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import type { CustomerStatus, DriverType } from '@/lib/types'

const VALID_CUSTOMER_STATUSES: CustomerStatus[] = ['pending_kyc', 'active', 'suspended', 'blacklisted']
const VALID_DRIVER_TYPES: DriverType[] = ['Grab', 'Bolt', 'Private']

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

  const status = statusParam && (VALID_CUSTOMER_STATUSES as string[]).includes(statusParam)
    ? (statusParam as CustomerStatus)
    : undefined

  const conditions = []
  if (search) {
    conditions.push(or(ilike(customers.name, `%${search}%`), ilike(customers.phone, `%${search}%`)))
  }
  if (status) {
    conditions.push(eq(customers.status, status))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [{ total }] = await db.select({ total: count() }).from(customers).where(where)

  const data = await db
    .select()
    .from(customers)
    .where(where)
    .offset((page - 1) * limit)
    .limit(limit)

  return NextResponse.json({ data, total, page, limit })
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    return await handlePost(request)
  } catch (err) {
    console.error('[POST /api/customers] Unhandled error:', err)
    const message = process.env.NODE_ENV === 'development' && err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function handlePost(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>

  // --- Required fields ---
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name || name.length > 255) {
    return NextResponse.json({ error: 'name is required and must be at most 255 characters' }, { status: 400 })
  }

  const phone = typeof raw.phone === 'string' ? raw.phone.trim() : ''
  if (!phone || phone.length > 20) {
    return NextResponse.json({ error: 'phone is required and must be at most 20 characters' }, { status: 400 })
  }

  const driverType = typeof raw.driverType === 'string' ? raw.driverType : ''
  if (!(VALID_DRIVER_TYPES as string[]).includes(driverType)) {
    return NextResponse.json({ error: `driverType must be one of: ${VALID_DRIVER_TYPES.join(', ')}` }, { status: 400 })
  }

  // --- Optional string fields (trim, empty → null) ---
  const optStr = (val: unknown): string | null => {
    if (typeof val !== 'string') return null
    const trimmed = val.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  const email = optStr(raw.email)
  const address = optStr(raw.address)
  const dateOfBirth = optStr(raw.dateOfBirth)
  const idCardNumber = optStr(raw.idCardNumber)
  const avatarUrl = optStr(raw.avatarUrl)
  const idCardFrontUrl = optStr(raw.idCardFrontUrl)
  const idCardBackUrl = optStr(raw.idCardBackUrl)
  const driverLicenseUrl = optStr(raw.driverLicenseUrl)
  const grabBoltScreenshotUrl = optStr(raw.grabBoltScreenshotUrl)

  // --- verifiedAtCounter ---
  const verifiedAtCounter = typeof raw.verifiedAtCounter === 'boolean' ? raw.verifiedAtCounter : false
  const status: CustomerStatus = verifiedAtCounter ? 'active' : 'pending_kyc'

  const [created] = await db
    .insert(customers)
    .values({
      name,
      phone,
      driverType,
      status,
      ...(email !== null && { email }),
      ...(address !== null && { address }),
      ...(dateOfBirth !== null && { dateOfBirth }),
      ...(idCardNumber !== null && { idCardNumber }),
      ...(avatarUrl !== null && { avatarUrl }),
      ...(idCardFrontUrl !== null && { idCardFrontUrl }),
      ...(idCardBackUrl !== null && { idCardBackUrl }),
      ...(driverLicenseUrl !== null && { driverLicenseUrl }),
      ...(grabBoltScreenshotUrl !== null && { grabBoltScreenshotUrl }),
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
