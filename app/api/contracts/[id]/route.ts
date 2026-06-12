import { NextResponse } from 'next/server'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/db'
import { contracts, vehicles } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'
import type { ContractStatus } from '@/lib/types'

const VALID_STATUSES: ContractStatus[] = ['active', 'completed', 'overdue']

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'contracts', 'canRead')
  if (denied) return denied

  const { id } = await params

  const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1)
  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

  return NextResponse.json(contract)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'contracts', 'canWrite')
  if (denied) return denied

  const { id } = await params

  const [existing] = await db
    .select({ id: contracts.id, status: contracts.status, vehicleId: contracts.vehicleId })
    .from(contracts).where(eq(contracts.id, id)).limit(1)
  if (!existing) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const fields: Record<string, unknown> = {}

  if (typeof raw.startDate === 'string' && raw.startDate.trim()) {
    fields.startDate = raw.startDate.trim()
  }
  if (typeof raw.dueDate === 'string' && raw.dueDate.trim()) {
    fields.dueDate = raw.dueDate.trim()
  }
  if (typeof raw.dailyRate === 'number' && raw.dailyRate >= 0) {
    fields.dailyRate = raw.dailyRate
  }
  if (typeof raw.monthlyRate === 'number' && raw.monthlyRate >= 0) {
    fields.monthlyRate = raw.monthlyRate
  }
  if (typeof raw.depositAmount === 'number' && raw.depositAmount >= 0) {
    fields.depositAmount = raw.depositAmount
  }
  if (typeof raw.documentUrl === 'string') {
    fields.documentUrl = raw.documentUrl || null
  }
  if (raw.billingType === 'monthly' || raw.billingType === 'daily') {
    fields.billingType = raw.billingType
  }
  if (typeof raw.autoReminder === 'boolean') {
    fields.autoReminder = raw.autoReminder
  }

  if (typeof raw.status === 'string' && (VALID_STATUSES as string[]).includes(raw.status)) {
    const newStatus = raw.status as ContractStatus
    if (existing.status === 'completed') {
      return NextResponse.json({ error: 'สัญญาที่ปิดแล้วไม่สามารถแก้ไขสถานะได้' }, { status: 409 })
    }
    fields.status = newStatus
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // Optional optimistic-lock guard — clients may send the `version` they last read.
  const expectedVersion = typeof raw.expectedVersion === 'number' ? raw.expectedVersion : undefined
  const whereClause = expectedVersion !== undefined
    ? and(eq(contracts.id, id), eq(contracts.version, expectedVersion))
    : eq(contracts.id, id)

  const updated = await db.transaction(async (tx) => {
    const [updatedContract] = await tx
      .update(contracts)
      .set({ ...fields, version: sql`${contracts.version} + 1` })
      .where(whereClause)
      .returning()

    // No row matched despite `existing` being present above → version conflict.
    if (!updatedContract) return null

    // When completing a contract, free the vehicle back to available
    if (fields.status === 'completed' && existing.vehicleId) {
      await tx.update(vehicles)
        .set({ status: 'available', version: sql`${vehicles.version} + 1` })
        .where(eq(vehicles.id, existing.vehicleId))
    }

    return updatedContract
  })

  if (!updated) {
    return NextResponse.json(
      { error: 'สัญญานี้ถูกแก้ไขโดยผู้ใช้อื่น กรุณาโหลดข้อมูลใหม่แล้วลองอีกครั้ง', code: 'version_conflict' },
      { status: 409 },
    )
  }

  return NextResponse.json(updated)
}
