import { NextResponse } from 'next/server'
import { count, eq, sum, and, gte } from 'drizzle-orm'
import { db } from '@/db'
import { vehicles, customers, invoices } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'

export async function GET(): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'reports', 'canRead')
  if (denied) return denied

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [vehicleCounts, [{ pendingKYC }], [{ todayRevenue }]] = await Promise.all([
    db.select({ status: vehicles.status, count: count() }).from(vehicles).groupBy(vehicles.status),
    db.select({ pendingKYC: count() }).from(customers).where(eq(customers.status, 'pending_kyc')),
    db.select({ todayRevenue: sum(invoices.amount) }).from(invoices).where(
      and(eq(invoices.status, 'paid'), gte(invoices.createdAt, todayStart))
    ),
  ])

  const statusMap = Object.fromEntries(vehicleCounts.map(r => [r.status, Number(r.count)]))

  return NextResponse.json({
    totalVehicles: vehicleCounts.reduce((acc, r) => acc + Number(r.count), 0),
    available: statusMap['available'] ?? 0,
    rented: statusMap['rented'] ?? 0,
    charging: statusMap['charging'] ?? 0,
    underRepair: statusMap['under_repair'] ?? 0,
    offline: statusMap['offline'] ?? 0,
    pendingKYC: Number(pendingKYC),
    todayRevenue: Number(todayRevenue ?? 0),
  })
}
