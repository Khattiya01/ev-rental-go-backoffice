import { NextResponse } from 'next/server'
import { and, eq, gte, lte, count, desc } from 'drizzle-orm'
import { db } from '@/db'
import { auditLogs, users } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'

const VALID_ACTIONS = [
  'remote_cutoff',
  'remote_reset',
  'blacklist_customer',
  'unblacklist_customer',
  'customer.blacklist',
  'customer.unban',
  'update_vehicle_status',
  'create_contract',
  'update_contract',
  'create_customer',
  'update_customer',
  'delete_customer',
  'update_permissions',
  'update_pricing',
  'create_user',
  'update_user',
  'delete_user',
] as const

export async function GET(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const actionParam  = searchParams.get('action')   ?? undefined
  const adminIdParam = searchParams.get('adminId')   ?? undefined
  const dateFrom     = searchParams.get('dateFrom')  ?? undefined
  const dateTo       = searchParams.get('dateTo')    ?? undefined
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))

  const action = actionParam && (VALID_ACTIONS as readonly string[]).includes(actionParam)
    ? actionParam
    : undefined

  const conditions = []

  if (action) {
    conditions.push(eq(auditLogs.action, action))
  }
  if (adminIdParam) {
    conditions.push(eq(auditLogs.adminId, adminIdParam))
  }
  if (dateFrom) {
    const d = new Date(dateFrom)
    if (!isNaN(d.getTime())) conditions.push(gte(auditLogs.createdAt, d))
  }
  if (dateTo) {
    const d = new Date(dateTo)
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999)
      conditions.push(lte(auditLogs.createdAt, d))
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [{ total }] = await db
    .select({ total: count() })
    .from(auditLogs)
    .where(where)

  const rows = await db
    .select({
      id:         auditLogs.id,
      action:     auditLogs.action,
      entityType: auditLogs.entityType,
      entityId:   auditLogs.entityId,
      metadata:   auditLogs.metadata,
      createdAt:  auditLogs.createdAt,
      adminId:    auditLogs.adminId,
      adminName:  users.name,
      adminEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.adminId, users.id))
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .offset((page - 1) * limit)
    .limit(limit)

  return NextResponse.json({ data: rows, total, page, limit })
}
