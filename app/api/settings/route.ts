import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { appSettings } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'

const DEFAULTS: Record<string, string> = {
  'payment.promptpay_id': '0000000000',
  'payment.promptpay_name': 'ชื่อบัญชี',
}

export async function GET(): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await db.select().from(appSettings)
    const map: Record<string, string> = { ...DEFAULTS }
    for (const row of rows) { map[row.key] = row.value }

    return NextResponse.json({
      promptpayId: map['payment.promptpay_id'],
      promptpayName: map['payment.promptpay_name'],
    })
  } catch {
    // Table may not exist yet before db:push — return defaults
    return NextResponse.json({
      promptpayId: DEFAULTS['payment.promptpay_id'],
      promptpayName: DEFAULTS['payment.promptpay_name'],
    })
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const updates: { key: string; value: string }[] = []

  if (typeof raw.promptpayId === 'string' && raw.promptpayId.trim()) {
    updates.push({ key: 'payment.promptpay_id', value: raw.promptpayId.trim() })
  }
  if (typeof raw.promptpayName === 'string' && raw.promptpayName.trim()) {
    updates.push({ key: 'payment.promptpay_name', value: raw.promptpayName.trim() })
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  for (const { key, value } of updates) {
    await db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } })
  }

  return NextResponse.json({ ok: true })
}
