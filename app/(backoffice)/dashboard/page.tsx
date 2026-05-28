import { Car, KeyRound, CircleCheck, Wrench, UserCheck } from 'lucide-react'
import { count, eq, lt, sum, and, gte, desc, sql } from 'drizzle-orm'
import { db } from '@/db'
import { vehicles, customers, invoices, alerts as alertsTable } from '@/db/schema'
import SummaryCard from '@/components/dashboard/summary-card'
import AlertFeed from '@/components/dashboard/alert-feed'
import RevenueChart from '@/components/charts/revenue-chart'
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
    lowBatteryVehicles,
    overdueInvoicesList,
    reminderAlerts,
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
    db.select({ id: vehicles.id, plate: vehicles.plate, socPercent: vehicles.socPercent })
      .from(vehicles)
      .where(lt(vehicles.socPercent, 15))
      .orderBy(vehicles.socPercent)
      .limit(5),
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

  const alerts: Alert[] = [
    ...lowBatteryVehicles.map(v => ({
      id: `battery-${v.id}`,
      type: 'battery_low' as const,
      message: `Battery Low (${v.socPercent}%) — ${v.plate}`,
      severity: 'critical' as const,
      createdAt: 'Just now',
      href: `/fleet/vehicles/${v.id}`,
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
  ].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  // Map to lib/types Vehicle (coerce nullable fields)
  const mapVehicles: Vehicle[] = allVehicles.map(v => ({
    ...v,
    images: v.images ?? [],
  }))

  return {
    totalVehicles: vehicleCounts.reduce((acc, r) => acc + Number(r.count), 0),
    rented: statusMap['rented'] ?? 0,
    available: statusMap['available'] ?? 0,
    underRepair: statusMap['under_repair'] ?? 0,
    pendingKYC: Number(pendingKYC),
    todayRevenue: Number(todayRevenue ?? 0),
    mapVehicles,
    revenueData,
    alerts,
  }
}

export default async function DashboardPage() {
  const {
    totalVehicles,
    rented,
    available,
    underRepair,
    pendingKYC,
    todayRevenue,
    mapVehicles,
    revenueData,
    alerts,
  } = await getDashboardData()

  const lastRevenue = revenueData.at(-1)?.revenue ?? 0

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Overview" />

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <SummaryCard title="Total Vehicles" value={totalVehicles} icon={Car} iconColor="text-blue-600" color="bg-blue-500/15" sparklineData={[40, 55, 35, 60, 45, 70, 65, totalVehicles]} sparklineColor="#3b82f6" trend="Fleet size" />
        <SummaryCard title="Active Rentals" value={rented} icon={KeyRound} iconColor="text-teal-600" color="bg-teal-500/15" sparklineData={[30, 50, 40, 65, 55, 70, rented]} sparklineColor="#14b8a6" trend="Currently rented" />
        <SummaryCard title="Available" value={available} icon={CircleCheck} iconColor="text-green-600" color="bg-green-500/15" sparklineData={[70, 60, 75, 65, 80, 72, available]} sparklineColor="#22c55e" trend="Ready to rent" />
        <SummaryCard title="Maintenance" value={underRepair} icon={Wrench} iconColor="text-amber-600" color="bg-amber-500/15" sparklineData={[10, 15, 12, 18, 14, 16, underRepair]} sparklineColor="#f59e0b" trend="Under repair" />
        <SummaryCard title="Pending e-KYC" value={pendingKYC} icon={UserCheck} iconColor="text-purple-600" color="bg-purple-500/15" sparklineData={[5, 8, 6, 10, 7, 9, pendingKYC]} sparklineColor="#a855f7" trend="Awaiting review" />
      </div>

      {/* Map + Alerts */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-700 font-semibold text-sm">Live Vehicle Locations</h2>
            <div className="relative">
              <input placeholder="Search..." className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 placeholder-slate-400 focus:outline-none w-36" />
            </div>
          </div>
          <div className="h-80 rounded-xl overflow-hidden">
            <DashboardMapClient vehicles={mapVehicles} />
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-slate-700 font-semibold text-sm">Alerts</h2>
              {alerts.length > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  alerts.some(a => a.severity === 'critical')
                    ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-600'
                }`}>
                  {alerts.length}
                </span>
              )}
            </div>
          </div>
          {alerts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">ไม่มี alert ที่ต้องดำเนินการ</p>
          ) : (
            <AlertFeed alerts={alerts} />
          )}
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-slate-700 font-semibold text-sm">Revenue Trend</h2>
          <span className="text-blue-500 text-sm font-semibold">
            Today: ฿{todayRevenue.toLocaleString()}
            {lastRevenue > 0 && (
              <span className="text-slate-400 text-xs ml-2 font-normal">
                This week: ฿{revenueData.reduce((s, d) => s + d.revenue, 0).toLocaleString()}
              </span>
            )}
          </span>
        </div>
        <RevenueChart data={revenueData} />
      </div>
    </div>
  )
}
