import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { desc, count } from 'drizzle-orm'
import { db } from '@/db'
import { registrationLinks } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.ev-rental.com'
const DEFAULT_EXPIRY_DAYS = 7

export async function GET(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '5', 10)))

  const [{ total }] = await db.select({ total: count() }).from(registrationLinks)

  const links = await db
    .select()
    .from(registrationLinks)
    .orderBy(desc(registrationLinks.createdAt))
    .offset((page - 1) * limit)
    .limit(limit)

  const now = new Date()
  const result = links.map(link => ({
    ...link,
    url: `${PORTAL_URL}/register?token=${link.token}`,
    status: link.usedAt
      ? 'used'
      : link.expiresAt < now
        ? 'expired'
        : 'active',
  }))

  return NextResponse.json({ data: result, total, page, limit })
}

export async function POST(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let note: string | null = null
  let expiresInDays = DEFAULT_EXPIRY_DAYS
  try {
    const body = await request.json() as { note?: string; expiresInDays?: number }
    note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
    if (typeof body.expiresInDays === 'number' && body.expiresInDays > 0 && body.expiresInDays <= 30) {
      expiresInDays = body.expiresInDays
    }
  } catch { /* body is optional */ }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const [created] = await db
    .insert(registrationLinks)
    .values({
      token,
      expiresAt,
      createdBy: currentUser.name,
      ...(note !== null && { note }),
    })
    .returning()

  return NextResponse.json({
    ...created,
    url: `${PORTAL_URL}/register?token=${token}`,
    status: 'active',
  }, { status: 201 })
}
