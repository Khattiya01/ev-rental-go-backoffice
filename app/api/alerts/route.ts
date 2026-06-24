import { NextResponse } from 'next/server'
import { eq, ilike, and, count, desc } from 'drizzle-orm'
import { db } from '@/db'
import { alerts } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'
import type { AlertRecord, AlertSeverity } from '@/lib/types'

const VALID_TYPES: AlertRecord['type'][] = ['battery_low', 'geofence_breach', 'payment_reminder', 'vehicle_offline']
const VALID_SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical']

function hrefFor(type: AlertRecord['type'], entityId: string): string {
  return type === 'payment_reminder' ? `/billing/invoices/${entityId}` : `/fleet/vehicles/${entityId}`
}

export async function GET(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'reports', 'canRead')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? undefined
  const typeParam = searchParams.get('type') ?? undefined
  const severityParam = searchParams.get('severity') ?? undefined
  const resolvedParam = searchParams.get('resolved') ?? undefined
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

  const type = typeParam && (VALID_TYPES as string[]).includes(typeParam) ? (typeParam as AlertRecord['type']) : undefined
  const severity = severityParam && (VALID_SEVERITIES as string[]).includes(severityParam) ? (severityParam as AlertSeverity) : undefined

  const conditions = []
  if (search) conditions.push(ilike(alerts.message, `%${search}%`))
  if (type) conditions.push(eq(alerts.type, type))
  if (severity) conditions.push(eq(alerts.severity, severity))
  if (resolvedParam === 'true') conditions.push(eq(alerts.resolved, true))
  if (resolvedParam === 'false') conditions.push(eq(alerts.resolved, false))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [{ total }] = await db.select({ total: count() }).from(alerts).where(where)

  const rows = await db
    .select()
    .from(alerts)
    .where(where)
    .orderBy(desc(alerts.createdAt))
    .offset((page - 1) * limit)
    .limit(limit)

  const data: AlertRecord[] = rows.map(a => ({
    id: a.id,
    type: a.type as AlertRecord['type'],
    message: a.message,
    severity: a.severity,
    entityId: a.entityId,
    resolved: a.resolved,
    createdAt: a.createdAt.toISOString(),
    href: hrefFor(a.type as AlertRecord['type'], a.entityId),
  }))

  return NextResponse.json({ data, total, page, limit })
}
