import SummaryCard from '@/components/dashboard/summary-card'
import AlertFeed from '@/components/dashboard/alert-feed'
import RevenueChart from '@/components/charts/revenue-chart'
import DashboardMapClient from '@/components/maps/DashboardMapClient'
import { mockVehicles, mockAlerts, mockCustomers, revenueData } from '@/lib/mock-data'

const sparkBase = [40, 55, 35, 60, 45, 70, 65, 80]

export default function DashboardPage() {
  const totalVehicles = mockVehicles.length
  const activeRentals = mockVehicles.filter(v => v.status === 'rented').length
  const available = mockVehicles.filter(v => v.status === 'available').length
  const maintenance = mockVehicles.filter(v => v.status === 'under_repair').length
  const pendingKYC = mockCustomers.filter(c => c.status === 'pending_kyc').length

  return (
    <div className="space-y-6">
      <h1 className="text-slate-800 text-xl font-bold">Dashboard Overview</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <SummaryCard title="Total Vehicles" value={totalVehicles} icon="🚗" color="bg-blue-500/20" sparklineData={sparkBase} />
        <SummaryCard title="Active Rentals" value={activeRentals} icon="🕐" color="bg-teal-500/20" sparklineData={[30, 50, 40, 65, 55, 70, 68]} />
        <SummaryCard title="Available" value={available} icon="✅" color="bg-green-500/20" sparklineData={[70, 60, 75, 65, 80, 72, 78]} />
        <SummaryCard title="Maintenance" value={maintenance} icon="🔧" color="bg-amber-500/20" sparklineData={[10, 15, 12, 18, 14, 16, 13]} />
        <SummaryCard title="Pending e-KYC" value={pendingKYC} icon="👤" color="bg-purple-500/20" sparklineData={[5, 8, 6, 10, 7, 9, 8]} />
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
            <DashboardMapClient vehicles={mockVehicles} />
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-slate-700 font-semibold text-sm mb-3">Alerts Feed</h2>
          <AlertFeed alerts={mockAlerts} />
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-slate-700 font-semibold text-sm">Revenue Trend</h2>
          <span className="text-blue-500 text-sm font-semibold">
            This Week: ${revenueData.at(-1)?.revenue.toLocaleString()}
            <span className="text-green-500 text-xs ml-2">+8.5% vs last week</span>
          </span>
        </div>
        <RevenueChart data={revenueData} />
      </div>
    </div>
  )
}
