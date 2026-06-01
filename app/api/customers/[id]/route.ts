import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { customers, auditLogs } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'
import type { CustomerStatus, DriverType } from '@/lib/types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_CUSTOMER_STATUSES: CustomerStatus[] = ['pending_kyc', 'rejected', 'active', 'suspended', 'blacklisted']
const VALID_DRIVER_TYPES: DriverType[] = ['Grab', 'Bolt', 'Private']
const optStr = (val: unknown): string | null | undefined => {
  if (val === undefined) return undefined
  if (typeof val !== 'string') return null
  const t = val.trim(); return t.length > 0 ? t : null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'customers', 'canRead')
  if (denied) return denied

  const { id } = await params

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 })
  }

  let rows: (typeof customers.$inferSelect)[]
  try {
    rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const customer = rows[0]
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  return NextResponse.json(customer)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'customers', 'canWrite')
  if (denied) return denied

  const { id } = await params

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const fields: {
    status?: CustomerStatus
    bannedReason?: string | null
    bannedDate?: string | null
    bannedBy?: string | null
    name?: string
    phone?: string
    email?: string | null
    address?: string | null
    dateOfBirth?: string | null
    idCardNumber?: string | null
    driverType?: DriverType
    avatarUrl?: string | null
    idCardFrontUrl?: string | null
    idCardBackUrl?: string | null
    driverLicenseUrl?: string | null
    grabBoltScreenshotUrl?: string | null
    rating?: number
    notes?: string | null
    kycNotes?: string | null
  } = {}

  // --- Editable profile fields ---
  if (body.name !== undefined) {
    const v = typeof body.name === 'string' ? body.name.trim() : ''
    if (!v || v.length > 255) return NextResponse.json({ error: 'name must be 1–255 characters' }, { status: 400 })
    fields.name = v
  }
  if (body.phone !== undefined) {
    const v = typeof body.phone === 'string' ? body.phone.trim() : ''
    if (!v || v.length > 20) return NextResponse.json({ error: 'phone must be 1–20 characters' }, { status: 400 })
    fields.phone = v
  }
  if (body.email !== undefined) fields.email = optStr(body.email) ?? null
  if (body.address !== undefined) fields.address = optStr(body.address) ?? null
  if (body.dateOfBirth !== undefined) fields.dateOfBirth = optStr(body.dateOfBirth) ?? null
  if (body.idCardNumber !== undefined) fields.idCardNumber = optStr(body.idCardNumber) ?? null
  if (body.avatarUrl !== undefined) fields.avatarUrl = optStr(body.avatarUrl) ?? null
  if (body.idCardFrontUrl !== undefined) fields.idCardFrontUrl = optStr(body.idCardFrontUrl) ?? null
  if (body.idCardBackUrl !== undefined) fields.idCardBackUrl = optStr(body.idCardBackUrl) ?? null
  if (body.driverLicenseUrl !== undefined) fields.driverLicenseUrl = optStr(body.driverLicenseUrl) ?? null
  if (body.grabBoltScreenshotUrl !== undefined) fields.grabBoltScreenshotUrl = optStr(body.grabBoltScreenshotUrl) ?? null
  if (body.notes !== undefined) fields.notes = optStr(body.notes) ?? null
  if (body.kycNotes !== undefined) fields.kycNotes = optStr(body.kycNotes) ?? null
  if (body.driverType !== undefined) {
    if (!(VALID_DRIVER_TYPES as string[]).includes(body.driverType as string)) {
      return NextResponse.json({ error: `driverType must be one of: ${VALID_DRIVER_TYPES.join(', ')}` }, { status: 400 })
    }
    fields.driverType = body.driverType as DriverType
  }
  if (body.rating !== undefined) {
    const r = Number(body.rating)
    if (!Number.isFinite(r) || r < 0 || r > 5) return NextResponse.json({ error: 'rating must be between 0 and 5' }, { status: 400 })
    fields.rating = Math.round(r * 10) / 10
  }

  // --- Status transitions ---

  // --- Status transitions ---
  if (body.status !== undefined) {
    if (
      typeof body.status !== 'string' ||
      !(VALID_CUSTOMER_STATUSES as string[]).includes(body.status)
    ) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_CUSTOMER_STATUSES.join(', ')}` },
        { status: 400 },
      )
    }

    const newStatus = body.status as CustomerStatus
    fields.status = newStatus

    if (newStatus === 'blacklisted') {
      fields.bannedBy = currentUser.name
      fields.bannedDate = new Date().toISOString().slice(0, 10)
      if (typeof body.bannedReason !== 'string' || body.bannedReason.trim() === '') {
        return NextResponse.json(
          { error: 'bannedReason is required when blacklisting a customer' },
          { status: 400 },
        )
      }
      if (body.bannedReason.trim().length > 1000) {
        return NextResponse.json(
          { error: 'bannedReason must be 1–1000 characters' },
          { status: 400 },
        )
      }
      fields.bannedReason = body.bannedReason.trim()
    } else if (newStatus === 'rejected') {
      const reason = typeof body.kycRejectReason === 'string' ? body.kycRejectReason.trim() : ''
      if (!reason) {
        return NextResponse.json({ error: 'kycRejectReason is required when rejecting KYC' }, { status: 400 })
      }
      const [existing] = await db.select({ kycNotes: customers.kycNotes }).from(customers).where(eq(customers.id, id)).limit(1)
      const dateStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
      const entry = `[${dateStr} · ${currentUser.name}] ${reason}`
      fields.kycNotes = existing?.kycNotes ? `${entry}\n${existing.kycNotes}` : entry
    } else if (newStatus === 'active') {
      fields.bannedDate = null
      fields.bannedReason = null
      fields.bannedBy = null
    }
    // suspended / pending_kyc: no extra fields needed
  } else if (body.bannedReason !== undefined) {
    if (typeof body.bannedReason !== 'string' || body.bannedReason.trim() === '') {
      return NextResponse.json({ error: 'bannedReason must be a non-empty string' }, { status: 400 })
    }
    fields.bannedReason = body.bannedReason.trim()
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  let updatedCustomer: typeof customers.$inferSelect | undefined
  try {
    const rows = await db
      .update(customers)
      .set(fields)
      .where(eq(customers.id, id))
      .returning()

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    updatedCustomer = rows[0]
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Audit log for blacklist / unban actions
  if (fields.status === 'blacklisted' || (fields.status === 'active' && fields.bannedDate === null)) {
    const isBlacklist = fields.status === 'blacklisted'
    await db.insert(auditLogs).values({
      adminId: currentUser.id,
      action: isBlacklist ? 'customer.blacklist' : 'customer.unban',
      entityType: 'customer',
      entityId: id,
      metadata: isBlacklist
        ? { reason: fields.bannedReason, bannedBy: currentUser.name }
        : { unbannedBy: currentUser.name },
    }).catch(() => { /* non-blocking — audit failure should not break the response */ })
  }

  return NextResponse.json(updatedCustomer)
}
