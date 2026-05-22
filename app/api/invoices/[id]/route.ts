import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { invoices } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import type { InvoiceStatus } from '@/lib/types'

const VALID_STATUSES: InvoiceStatus[] = ['paid', 'pending', 'overdue']

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  return NextResponse.json(invoice)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { id } = await params

  const [existing] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
  if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const fields: Record<string, unknown> = {}

  if (typeof raw.customerName === 'string' && raw.customerName.trim()) {
    fields.customerName = raw.customerName.trim()
  }
  if (typeof raw.vehiclePlate === 'string') {
    fields.vehiclePlate = raw.vehiclePlate.trim() || null
  }
  if (typeof raw.description === 'string') {
    fields.description = raw.description.trim() || null
  }
  if (typeof raw.amount === 'number' && raw.amount > 0) {
    fields.amount = raw.amount
  }
  if (typeof raw.dueDate === 'string' && raw.dueDate.trim()) {
    fields.dueDate = raw.dueDate.trim()
  }
  if (typeof raw.billingType === 'string') {
    fields.billingType = raw.billingType
  }

  // Status change
  if (typeof raw.status === 'string' && (VALID_STATUSES as string[]).includes(raw.status)) {
    fields.status = raw.status as InvoiceStatus

    if (raw.status === 'paid') {
      fields.paidAt = new Date().toLocaleDateString('th-TH', {
        day: 'numeric', month: 'short', year: '2-digit',
      })
      if (typeof raw.slipUrl === 'string' && raw.slipUrl) {
        fields.slipUrl = raw.slipUrl
      }
    }
  }

  // Slip upload without status change
  if (typeof raw.slipUrl === 'string' && raw.slipUrl && !fields.status) {
    fields.slipUrl = raw.slipUrl
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const [updated] = await db
    .update(invoices)
    .set(fields)
    .where(eq(invoices.id, id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { id } = await params

  const [existing] = await db.select({ id: invoices.id, status: invoices.status })
    .from(invoices).where(eq(invoices.id, id)).limit(1)
  if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  if (existing.status === 'paid') {
    return NextResponse.json({ error: 'ไม่สามารถลบ Invoice ที่ชำระแล้วได้' }, { status: 409 })
  }

  await db.delete(invoices).where(eq(invoices.id, id))
  return new NextResponse(null, { status: 204 })
}
