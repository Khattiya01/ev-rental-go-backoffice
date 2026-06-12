import { NextResponse } from 'next/server'
import { eq, ilike, or, desc, sql } from 'drizzle-orm'
import { db } from '@/db'
import { contracts, customers, vehicles } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'
import type { ContractStatus } from '@/lib/types'

const VALID_STATUSES: ContractStatus[] = ['active', 'completed', 'overdue']

async function generateContractNo(): Promise<string> {
  const [last] = await db
    .select({ contractNo: contracts.contractNo })
    .from(contracts)
    .orderBy(desc(contracts.createdAt))
    .limit(1)

  if (!last) return 'CT-0001'
  const match = last.contractNo.match(/CT-(\d+)/)
  if (!match) return 'CT-0001'
  return `CT-${String(parseInt(match[1], 10) + 1).padStart(4, '0')}`
}

export async function GET(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'contracts', 'canRead')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const statusParam = searchParams.get('status') ?? ''
  const customerIdParam = searchParams.get('customerId') ?? ''
  const vehicleIdParam = searchParams.get('vehicleId') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10))
  const offset = (page - 1) * limit

  const conditions = []

  if (search) {
    conditions.push(
      or(
        ilike(contracts.customerName, `%${search}%`),
        ilike(contracts.contractNo, `%${search}%`),
        ilike(contracts.vehiclePlate, `%${search}%`),
      )
    )
  }

  if (statusParam && (VALID_STATUSES as string[]).includes(statusParam)) {
    conditions.push(eq(contracts.status, statusParam as ContractStatus))
  }

  if (customerIdParam) {
    conditions.push(eq(contracts.customerId, customerIdParam))
  }

  if (vehicleIdParam) {
    conditions.push(eq(contracts.vehicleId, vehicleIdParam))
  }

  const where = conditions.length > 0
    ? conditions.reduce((a, b) => sql`${a} AND ${b}`)
    : undefined

  const [rows, countResult] = await Promise.all([
    db.select().from(contracts)
      .where(where)
      .orderBy(desc(contracts.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ count: sql<number>`count(*)::int` })
      .from(contracts)
      .where(where),
  ])

  const total = countResult[0]?.count ?? 0

  return NextResponse.json({ data: rows, total, page, limit })
}

export async function POST(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'contracts', 'canWrite')
  if (denied) return denied

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>

  const customerId = typeof raw.customerId === 'string' ? raw.customerId.trim() : ''
  if (!customerId) return NextResponse.json({ error: 'กรุณาเลือกลูกค้า' }, { status: 400 })

  const vehicleId = typeof raw.vehicleId === 'string' ? raw.vehicleId.trim() : ''
  if (!vehicleId) return NextResponse.json({ error: 'กรุณาเลือกรถ' }, { status: 400 })

  const startDate = typeof raw.startDate === 'string' ? raw.startDate.trim() : ''
  if (!startDate) return NextResponse.json({ error: 'กรุณาระบุวันเริ่มสัญญา' }, { status: 400 })

  const dueDate = typeof raw.dueDate === 'string' ? raw.dueDate.trim() : ''
  if (!dueDate) return NextResponse.json({ error: 'กรุณาระบุวันสิ้นสุดสัญญา' }, { status: 400 })

  const dailyRate = typeof raw.dailyRate === 'number' ? raw.dailyRate : parseFloat(String(raw.dailyRate))
  if (isNaN(dailyRate) || dailyRate < 0) return NextResponse.json({ error: 'ค่าเช่ารายวันไม่ถูกต้อง' }, { status: 400 })

  const monthlyRate = typeof raw.monthlyRate === 'number' ? raw.monthlyRate : parseFloat(String(raw.monthlyRate))
  if (isNaN(monthlyRate) || monthlyRate < 0) return NextResponse.json({ error: 'ค่าเช่ารายเดือนไม่ถูกต้อง' }, { status: 400 })

  const depositAmount = typeof raw.depositAmount === 'number' ? raw.depositAmount : parseFloat(String(raw.depositAmount))
  if (isNaN(depositAmount) || depositAmount < 0) return NextResponse.json({ error: 'เงินมัดจำไม่ถูกต้อง' }, { status: 400 })

  const [customer] = await db
    .select({ id: customers.id, name: customers.name, status: customers.status })
    .from(customers).where(eq(customers.id, customerId)).limit(1)
  if (!customer) return NextResponse.json({ error: 'ไม่พบลูกค้า' }, { status: 404 })
  if (customer.status === 'blacklisted') return NextResponse.json({ error: 'ไม่สามารถสร้างสัญญาได้ บัญชีลูกค้าถูก Blacklist' }, { status: 409 })
  if (customer.status === 'suspended') return NextResponse.json({ error: 'ไม่สามารถสร้างสัญญาได้ บัญชีลูกค้าถูกระงับชั่วคราว' }, { status: 409 })
  if (customer.status !== 'active') return NextResponse.json({ error: 'ลูกค้าต้องผ่าน KYC และได้รับการอนุมัติก่อนทำสัญญา' }, { status: 409 })

  const [vehicle] = await db
    .select({ id: vehicles.id, plate: vehicles.plate, status: vehicles.status })
    .from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1)
  if (!vehicle) return NextResponse.json({ error: 'ไม่พบรถ' }, { status: 404 })
  if (vehicle.status !== 'available') return NextResponse.json({ error: 'รถไม่พร้อมให้เช่า (สถานะต้องเป็น available)' }, { status: 409 })

  const contractNo = await generateContractNo()

  const created = await db.transaction(async (tx) => {
    const [newContract] = await tx.insert(contracts).values({
      contractNo,
      customerId,
      vehicleId,
      customerName: customer.name,
      vehiclePlate: vehicle.plate,
      startDate,
      dueDate,
      billingType: (raw.billingType === 'daily' ? 'daily' : 'monthly') as string,
      dailyRate,
      monthlyRate,
      depositAmount,
      status: 'active',
      ...(typeof raw.documentUrl === 'string' && raw.documentUrl ? { documentUrl: raw.documentUrl } : {}),
    }).returning()

    await tx.update(vehicles).set({ status: 'rented', version: sql`${vehicles.version} + 1` }).where(eq(vehicles.id, vehicleId))

    return newContract
  })

  return NextResponse.json(created, { status: 201 })
}
