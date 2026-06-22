import { DollarSign, KeyRound, CircleCheck, UserCheck } from 'lucide-react'
import { count, eq, sum, and, gte, desc, sql } from 'drizzle-orm'
import { getTranslations } from 'next-intl/server'
import { db } from '@/db'
import { vehicles, customers, invoices, alerts as alertsTable } from '@/db/schema'
import SummaryCard from '@/components/dashboard/summary-card'
import FleetHealthBar from '@/components/dashboard/fleet-health-bar'
import RevenueChart from '@/components/charts/revenue-chart'
import FleetDonutChart from '@/components/charts/fleet-donut-chart'
import DashboardMapClient from '@/components/maps/DashboardMapClient'
import PageHeader from '@/components/ui/page-header'
import type { Alert, RevenueDataPoint, Vehicle } from '@/lib/types'

async function getDashboardData() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const [
    vehicleCounts,
    [{ pendingKYC }],
    [{ todayRevenue }],
    allVehicles,
    revenueRows,
    overdueInvoicesList,
    reminderAlerts,
    geofenceAlerts,
    batteryAlerts,
  ] = await Promise.all([
    db.select({ status: vehicles.status, count: count() }).from(vehicles).groupBy(vehicles.status),
    db.select({ pendingKYC: count() }).from(customers).where(eq(customers.status, 'pending_kyc')),
    db.select({ todayRevenue: sum(invoices.amount) }).from(invoices).where(
      and(eq(invoices.status, 'paid'), gte(invoices.createdAt, todayStart))
    ),
    db.select().from(vehicles),
    db.select({
      day: sql<string>`TO_CHAR(DATE_TRUNC('day', ${invoices.createdAt}), 'Dy')`,
      dateKey: sql<string>`DATE_TRUNC('day', ${invoices.createdAt})::text`,
      revenue: sql<number>`COALESCE(SUM(${invoices.amount}), 0)`,
    })
      .from(invoices)
      .where(and(eq(invoices.status, 'paid'), gte(invoices.createdAt, sevenDaysAgo)))
      .groupBy(sql`DATE_TRUNC('day', ${invoices.createdAt})`)
      .orderBy(sql`DATE_TRUNC('day', ${invoices.createdAt})`),
    db.select({ id: invoices.id, customerName: invoices.customerName, daysOverdue: invoices.daysOverdue })
      .from(invoices)
      .where(eq(invoices.status, 'overdue'))
      .orderBy(desc(invoices.daysOverdue))
      .limit(5),
    db.select({ id: alertsTable.id, message: alertsTable.message, entityId: alertsTable.entityId, createdAt: alertsTable.createdAt })
      .from(alertsTable)
      .where(and(eq(alertsTable.type, 'payment_reminder'), eq(alertsTable.resolved, false)))
      .orderBy(desc(alertsTable.createdAt))
      .limit(10),
    db.select({ id: alertsTable.id, message: alertsTable.message, entityId: alertsTable.entityId, createdAt: alertsTable.createdAt })
      .from(alertsTable)
      .where(and(eq(alertsTable.type, 'geofence_breach'), eq(alertsTable.resolved, false)))
      .orderBy(desc(alertsTable.createdAt))
      .limit(5),
    db.select({ id: alertsTable.id, message: alertsTable.message, severity: alertsTable.severity, entityId: alertsTable.entityId, createdAt: alertsTable.createdAt })
      .from(alertsTable)
      .where(and(eq(alertsTable.type, 'battery_low'), eq(alertsTable.resolved, false)))
      .orderBy(desc(alertsTable.createdAt))
      .limit(10),
  ])

  const statusMap = Object.fromEntries(vehicleCounts.map(r => [r.status, Number(r.count)]))

  // Fill in zeros for days with no paid invoices
  const revenueMap = new Map(revenueRows.map(r => [r.dateKey.slice(0, 10), { day: r.day, revenue: Number(r.revenue) }]))
  const revenueData: RevenueDataPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const key = d.toISOString().slice(0, 10)
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
    revenueData.push(revenueMap.get(key) ?? { day: dayName, revenue: 0 })
  }

  const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 }

  const staticAlerts: Alert[] = [
    ...batteryAlerts.map(a => ({
      id: a.id,
      type: 'battery_low' as const,
      message: a.message,
      severity: a.severity,
      createdAt: new Date(a.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      href: `/fleet/vehicles/${a.entityId}`,
    })),
    ...overdueInvoicesList.map(inv => ({
      id: `overdue-${inv.id}`,
      type: 'payment_overdue' as const,
      message: `Payment Overdue — ${inv.customerName}${inv.daysOverdue ? ` (${inv.daysOverdue}d)` : ''}`,
      severity: 'warning' as const,
      createdAt: 'Just now',
      href: `/billing/invoices/${inv.id}`,
    })),
    ...reminderAlerts.map(a => ({
      id: a.id,
      type: 'payment_reminder' as const,
      message: a.message,
      severity: 'warning' as const,
      createdAt: new Date(a.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      href: `/billing/invoices/${a.entityId}`,
    })),
    ...geofenceAlerts.map(a => ({
      id: a.id,
      type: 'geofence_breach' as const,
      message: a.message,
      severity: 'critical' as const,
      createdAt: new Date(a.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      href: `/fleet/vehicles/${a.entityId}`,
    })),
  ].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  // Map to lib/types Vehicle (coerce nullable fields)
  const mapVehicles: Vehicle[] = allVehicles.map(v => ({
    ...v,
    images: v.images ?? [],
    geofenceZoneId: v.geofenceZoneId ?? null,
    geofenceZoneName: null,  // not needed for map display
  }))

  return {
    totalVehicles: vehicleCounts.reduce((acc, r) => acc + Number(r.count), 0),
    rented: statusMap['rented'] ?? 0,
    available: statusMap['available'] ?? 0,
    charging: statusMap['charging'] ?? 0,
    underRepair: statusMap['under_repair'] ?? 0,
    offline: statusMap['offline'] ?? 0,
    pendingKYC: Number(pendingKYC),
    todayRevenue: Number(todayRevenue ?? 0),
    mapVehicles,
    revenueData,
    staticAlerts,
  }
}

export default async function DashboardPage() {
  const [t, {
    totalVehicles,
    rented,
    available,
    charging,
    underRepair,
    offline,
    pendingKYC,
    todayRevenue,
    mapVehicles,
    revenueData,
    staticAlerts,
  }] = await Promise.all([getTranslations('dashboard'), getDashboardData()])

  return (
    <div className="space-y-4">
      <PageHeader title={t('title')} />

      {/* Row 1 — Primary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard title={t('revenueToday')} value={`฿${todayRevenue.toLocaleString()}`} icon={DollarSign} iconColor="text-emerald-600" color="bg-emerald-500/15" sparklineData={revenueData.map(d => d.revenue)} sparklineColor="#10b981" trend={t('paidInvoices')} />
        <SummaryCard title={t('activeRentals')} value={rented} icon={KeyRound} iconColor="text-blue-600" color="bg-blue-500/15" sparklineData={[30, 50, 40, 65, 55, 70, rented]} sparklineColor="#3b82f6" trend={t('currentlyRented')} />
        <SummaryCard title={t('available')} value={available} icon={CircleCheck} iconColor="text-green-600" color="bg-green-500/15" sparklineData={[70, 60, 75, 65, 80, 72, available]} sparklineColor="#22c55e" trend={t('readyToRent')} />
        <SummaryCard title={t('pendingKYC')} value={pendingKYC} icon={UserCheck} iconColor="text-purple-600" color="bg-purple-500/15" sparklineData={[5, 8, 6, 10, 7, 9, pendingKYC]} sparklineColor="#a855f7" trend={t('awaitingReview')} />
      </div>

      {/* Row 2 — Fleet Health Pills */}
      <FleetHealthBar total={totalVehicles} charging={charging} underRepair={underRepair} offline={offline} />

      {/* Row 3 — Live Map + Alert Feed (real-time via WebSocket) */}
      <DashboardMapClient initialVehicles={mapVehicles} staticAlerts={staticAlerts} />

      {/* Row 4 — Revenue Chart + Fleet Distribution */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-slate-700 font-semibold text-sm">{t('revenueTrend')}</h2>
            <div className="flex items-center gap-3">
              <span className="text-emerald-600 text-sm font-semibold">
                {t('todayPrefix')}: ฿{todayRevenue.toLocaleString()}
              </span>
              <span className="text-slate-400 text-xs">
                {t('thisWeekPrefix')}: ฿{revenueData.reduce((s, d) => s + d.revenue, 0).toLocaleString()}
              </span>
            </div>
          </div>
          <RevenueChart data={revenueData} />
        </div>

        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-slate-700 font-semibold text-sm mb-4">{t('fleetDistribution')}</h2>
          <FleetDonutChart
            available={available}
            rented={rented}
            charging={charging}
            underRepair={underRepair}
            offline={offline}
          />
        </div>
      </div>
    </div>
  )
}
