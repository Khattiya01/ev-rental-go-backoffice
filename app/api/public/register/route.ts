import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { registrationLinks, customers } from '@/db/schema'
import type { DriverType } from '@/lib/types'

const VALID_DRIVER_TYPES: DriverType[] = ['Grab', 'Bolt', 'Private']

const PORTAL_ORIGIN = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.ev-rental.com'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': PORTAL_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

async function getValidLink(token: string) {
  const [link] = await db
    .select()
    .from(registrationLinks)
    .where(eq(registrationLinks.token, token))
    .limit(1)

  if (!link || link.usedAt || link.expiresAt < new Date()) return null
  return link
}

type ExistingCustomer = typeof customers.$inferSelect

// Returns a blocking response if the existing customer cannot re-register,
// or null if they CAN re-register (status === 'rejected').
function blockingResponse(
  existing: ExistingCustomer,
  cors: Record<string, string>,
  matchedBy: 'phone' | 'idCard',
): NextResponse | null {
  const label = matchedBy === 'phone' ? 'เบอร์โทรนี้' : 'เลขบัตรประชาชนนี้'

  switch (existing.status) {
    case 'pending_kyc':
      return NextResponse.json(
        { code: 'PENDING_KYC', error: `${label}กำลังรอการตรวจสอบเอกสารอยู่ กรุณารอทีมงานติดต่อกลับ` },
        { status: 409, headers: cors },
      )
    case 'active':
      return NextResponse.json(
        { code: 'ACTIVE', error: `${label}เป็นสมาชิกอยู่แล้ว กรุณาติดต่อทีมงาน` },
        { status: 409, headers: cors },
      )
    case 'blacklisted':
      return NextResponse.json(
        { code: 'BLACKLISTED', error: 'ไม่สามารถสมัครสมาชิกได้ กรุณาติดต่อทีมงาน' },
        { status: 403, headers: cors },
      )
    case 'suspended':
      return NextResponse.json(
        { code: 'SUSPENDED', error: 'บัญชีถูกระงับชั่วคราว กรุณาติดต่อทีมงาน' },
        { status: 409, headers: cors },
      )
    case 'rejected':
      return null // allow re-registration
    default:
      return null
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400, headers: corsHeaders() })

  const link = await getValidLink(token)
  if (!link) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404, headers: corsHeaders() })

  return NextResponse.json({ valid: true, expiresAt: link.expiresAt }, { headers: corsHeaders() })
}

export async function POST(request: Request): Promise<NextResponse> {
  const cors = corsHeaders()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: cors })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: cors })
  }

  const raw = body as Record<string, unknown>

  const token = typeof raw.token === 'string' ? raw.token.trim() : ''
  const link = await getValidLink(token)
  if (!link) return NextResponse.json({ error: 'ลิ้งนี้หมดอายุหรือถูกใช้งานแล้ว' }, { status: 400, headers: cors })

  const optStr = (val: unknown): string | null => {
    if (typeof val !== 'string') return null
    const trimmed = val.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  const name = optStr(raw.name)
  if (!name) return NextResponse.json({ error: 'กรุณากรอกชื่อ-นามสกุล' }, { status: 400, headers: cors })

  const phone = optStr(raw.phone)
  if (!phone) return NextResponse.json({ error: 'กรุณากรอกเบอร์โทรศัพท์' }, { status: 400, headers: cors })

  const driverType = typeof raw.driverType === 'string' ? raw.driverType : ''
  if (!(VALID_DRIVER_TYPES as string[]).includes(driverType)) {
    return NextResponse.json({ error: 'ประเภทคนขับไม่ถูกต้อง' }, { status: 400, headers: cors })
  }

  const idCardNumber = optStr(raw.idCardNumber)

  const newData = {
    name,
    phone,
    driverType,
    status: 'pending_kyc' as const,
    ...(optStr(raw.email) !== null && { email: optStr(raw.email)! }),
    ...(optStr(raw.address) !== null && { address: optStr(raw.address)! }),
    ...(optStr(raw.dateOfBirth) !== null && { dateOfBirth: optStr(raw.dateOfBirth)! }),
    ...(idCardNumber !== null && { idCardNumber }),
    ...(optStr(raw.avatarUrl) !== null && { avatarUrl: optStr(raw.avatarUrl)! }),
    ...(optStr(raw.idCardFrontUrl) !== null && { idCardFrontUrl: optStr(raw.idCardFrontUrl)! }),
    ...(optStr(raw.idCardBackUrl) !== null && { idCardBackUrl: optStr(raw.idCardBackUrl)! }),
    ...(optStr(raw.driverLicenseUrl) !== null && { driverLicenseUrl: optStr(raw.driverLicenseUrl)! }),
    ...(optStr(raw.grabBoltScreenshotUrl) !== null && { grabBoltScreenshotUrl: optStr(raw.grabBoltScreenshotUrl)! }),
  }

  // --- 1. Check by phone ---
  const [byPhone] = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1)
  if (byPhone) {
    const blocked = blockingResponse(byPhone, cors, 'phone')
    if (blocked) return blocked

    // rejected → re-register: update existing record
    const [updated] = await db.update(customers).set(newData).where(eq(customers.id, byPhone.id)).returning()
    await db.update(registrationLinks).set({ usedAt: new Date() }).where(eq(registrationLinks.id, link.id))
    return NextResponse.json({ id: updated.id, name: updated.name, resubmitted: true }, { status: 200, headers: cors })
  }

  // --- 2. Check by ID card number (if customer filled it in) ---
  if (idCardNumber) {
    const [byId] = await db.select().from(customers).where(eq(customers.idCardNumber, idCardNumber)).limit(1)
    if (byId) {
      const blocked = blockingResponse(byId, cors, 'idCard')
      if (blocked) return blocked

      // rejected → re-register: update existing record
      const [updated] = await db.update(customers).set(newData).where(eq(customers.id, byId.id)).returning()
      await db.update(registrationLinks).set({ usedAt: new Date() }).where(eq(registrationLinks.id, link.id))
      return NextResponse.json({ id: updated.id, name: updated.name, resubmitted: true }, { status: 200, headers: cors })
    }
  }

  // --- 3. New customer ---
  const [created] = await db.insert(customers).values(newData).returning()
  await db.update(registrationLinks).set({ usedAt: new Date() }).where(eq(registrationLinks.id, link.id))
  return NextResponse.json({ id: created.id, name: created.name }, { status: 201, headers: cors })
}
