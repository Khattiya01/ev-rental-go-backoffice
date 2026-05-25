import { NextResponse } from 'next/server'
import { lt, eq, desc } from 'drizzle-orm'
import { db } from '@/db'
import { vehicles, invoices } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import type { Alert } from '@/lib/types'

export async function GET(): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [lowBatteryVehicles, overdueInvoices] = await Promise.all([
    db
      .select({ id: vehicles.id, plate: vehicles.plate, socPercent: vehicles.socPercent })
      .from(vehicles)
      .where(lt(vehicles.socPercent, 15))
      .orderBy(vehicles.socPercent)
      .limit(5),
    db
      .select({ id: invoices.id, customerName: invoices.customerName, daysOverdue: invoices.daysOverdue })
      .from(invoices)
      .where(eq(invoices.status, 'overdue'))
      .orderBy(desc(invoices.daysOverdue))
      .limit(5),
  ])

  const alerts: Alert[] = [
    ...lowBatteryVehicles.map(v => ({
      id: `battery-${v.id}`,
      type: 'battery_low' as const,
      message: `Battery Low (${v.socPercent}%) — ${v.plate}`,
      severity: 'critical' as const,
      createdAt: 'Just now',
    })),
    ...overdueInvoices.map(inv => ({
      id: `overdue-${inv.id}`,
      type: 'payment_overdue' as const,
      message: `Payment Overdue — ${inv.customerName}${inv.daysOverdue ? ` (${inv.daysOverdue}d)` : ''}`,
      severity: 'warning' as const,
      createdAt: 'Just now',
    })),
  ]

  return NextResponse.json({ data: alerts })
}
