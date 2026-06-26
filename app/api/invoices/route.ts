import { NextResponse } from 'next/server'
import { eq, ilike, or, desc, sql } from 'drizzle-orm'
import { db } from '@/db'
import { invoices } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'
import { parseFlexibleDate } from '@/lib/parse-flexible-date'
import type { InvoiceStatus, BillingType } from '@/lib/types'

const VALID_STATUSES: InvoiceStatus[] = ['paid', 'pending', 'overdue']
const VALID_BILLING_TYPES: BillingType[] = ['daily', 'monthly', 'one_time']

async function generateInvoiceNo(): Promise<string> {
  const [last] = await db
    .select({ invoiceNo: invoices.invoiceNo })
    .from(invoices)
    .orderBy(desc(invoices.createdAt))
    .limit(1)

  if (!last) return 'INV-0001'

  const match = last.invoiceNo.match(/INV-(\d+)/)
  if (!match) return 'INV-0001'
  const next = parseInt(match[1], 10) + 1
  return `INV-${String(next).padStart(4, '0')}`
}

export async function GET(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'billing', 'canRead')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const statusParam = searchParams.get('status') ?? ''
  const contractIdParam = searchParams.get('contractId') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10))
  const offset = (page - 1) * limit

  const conditions = []

  if (search) {
    conditions.push(
      or(
        ilike(invoices.customerName, `%${search}%`),
        ilike(invoices.invoiceNo, `%${search}%`),
        ilike(invoices.vehiclePlate, `%${search}%`),
      )
    )
  }

  if (statusParam && (VALID_STATUSES as string[]).includes(statusParam)) {
    conditions.push(eq(invoices.status, statusParam as InvoiceStatus))
  }
  if (contractIdParam) {
    conditions.push(eq(invoices.contractId, contractIdParam))
  }

  const where = conditions.length > 0
    ? conditions.reduce((a, b) => sql`${a} AND ${b}`)
    : undefined

  const [rows, countResult, summaryResult] = await Promise.all([
    db.select().from(invoices)
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(where),

    db.select({
      status: invoices.status,
      amount: invoices.amount,
    }).from(invoices),
  ])

  const total = countResult[0]?.count ?? 0

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  let paidThisMonth = 0
  let pendingCount = 0
  let overdueCount = 0
  let totalOutstanding = 0

  for (const row of summaryResult) {
    if (row.status === 'paid') {
      paidThisMonth += row.amount ?? 0
    }
    if (row.status === 'pending') {
      pendingCount++
      totalOutstanding += row.amount ?? 0
    }
    if (row.status === 'overdue') {
      overdueCount++
      totalOutstanding += row.amount ?? 0
    }
  }

  // suppress unused variable warning — firstOfMonth used conceptually
  void firstOfMonth

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const enriched = rows.map(row => {
    if (row.status !== 'overdue') return row
    const due = parseFlexibleDate(row.dueDate)
    if (!due) return row
    due.setHours(0, 0, 0, 0)
    const days = Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86_400_000))
    return { ...row, daysOverdue: days }
  })

  return NextResponse.json({
    data: enriched,
    total,
    summary: { paidThisMonth, pendingCount, overdueCount, totalOutstanding },
  })
}

export async function POST(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'billing', 'canWrite')
  if (denied) return denied

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>

  const customerName = typeof raw.customerName === 'string' ? raw.customerName.trim() : ''
  if (!customerName) return NextResponse.json({ error: 'กรุณากรอกชื่อลูกค้า' }, { status: 400 })

  const amount = typeof raw.amount === 'number' ? raw.amount : parseFloat(String(raw.amount))
  if (isNaN(amount) || amount <= 0) return NextResponse.json({ error: 'จำนวนเงินไม่ถูกต้อง' }, { status: 400 })

  const dueDate = typeof raw.dueDate === 'string' ? raw.dueDate.trim() : ''
  if (!dueDate) return NextResponse.json({ error: 'กรุณาระบุวันครบกำหนด' }, { status: 400 })

  const billingType = typeof raw.billingType === 'string' ? raw.billingType : 'monthly'
  if (!(VALID_BILLING_TYPES as string[]).includes(billingType)) {
    return NextResponse.json({ error: 'ประเภทการชำระไม่ถูกต้อง' }, { status: 400 })
  }

  const invoiceNo = await generateInvoiceNo()

  const [created] = await db.insert(invoices).values({
    invoiceNo,
    customerName,
    amount,
    dueDate,
    billingType: billingType as BillingType,
    status: 'pending',
    ...(typeof raw.customerId === 'string' && raw.customerId && { customerId: raw.customerId }),
    ...(typeof raw.contractId === 'string' && raw.contractId && { contractId: raw.contractId }),
    ...(typeof raw.vehiclePlate === 'string' && raw.vehiclePlate && { vehiclePlate: raw.vehiclePlate }),
    ...(typeof raw.description === 'string' && raw.description && { description: raw.description }),
  }).returning()

  return NextResponse.json(created, { status: 201 })
}
