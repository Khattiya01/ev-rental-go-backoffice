import { mockInvoices } from '@/lib/mock-data'

const overdueInvoices = mockInvoices.filter(i => i.status === 'overdue')
const totalDebt = overdueInvoices.reduce((sum, i) => sum + i.amount, 0)

export default function OverduePage() {
  return (
    <div className="space-y-5">
      <h1 className="text-slate-800 text-xl font-bold">Overdue &amp; Debt Collection Tracker</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-red-400">💲</span>
                <p className="text-slate-500 text-sm">Total Debt</p>
              </div>
              <p className="text-slate-800 text-3xl font-bold">${totalDebt.toLocaleString()}</p>
              <p className="text-red-400 text-sm mt-1">▲ Increasing</p>
            </div>
            <div className="w-24 h-12 flex items-center">
              <div className="w-full h-6 flex items-end gap-0.5">
                {[30, 45, 35, 55, 65, 50, 70, 85].map((h, i) => (
                  <div key={i} className="flex-1 bg-red-500/50 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-400">⚠️</span>
            <p className="text-slate-500 text-sm">Overdue Accounts</p>
          </div>
          <p className="text-slate-800 text-3xl font-bold">{overdueInvoices.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Customer Name</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Total Debt</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Days Overdue</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Last Contacted</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            {overdueInvoices.map(invoice => {
              const days = invoice.daysOverdue ?? 0
              const urgencyColor =
                days > 20
                  ? 'text-red-400'
                  : days > 14
                    ? 'text-amber-400'
                    : 'text-orange-400'
              return (
                <tr key={invoice.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-700 text-sm font-medium">{invoice.customerName}</td>
                  <td className="px-5 py-3 text-slate-700 text-sm font-semibold">${invoice.amount.toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-sm font-medium ${urgencyColor}`}>{invoice.daysOverdue} Days</span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-sm">{invoice.lastContacted ?? 'Never'}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap">
                        Send SMS
                      </button>
                      <button className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap">
                        Send LINE
                      </button>
                      <button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1">
                        🔒 Lock Vehicle
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
