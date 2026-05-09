import { mockCustomers } from '@/lib/mock-data'

const blacklisted = mockCustomers.filter(c => c.status === 'blacklisted')

const reasonColor: Record<string, string> = {
  'Vehicle Theft': 'text-red-400',
  'Long Overdue Payment': 'text-amber-400',
  'Multiple Traffic Violations': 'text-orange-400',
}

export default function BlacklistPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-white text-xl font-bold">Blacklist Management</h1>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Customer Name
              </th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Date Banned
              </th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Reason
              </th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Admin
              </th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {blacklisted.map(customer => (
              <tr
                key={customer.id}
                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={customer.avatarUrl}
                      alt={customer.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <span className="text-slate-200 text-sm font-medium">{customer.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-400 text-sm">{customer.bannedDate}</td>
                <td className="px-5 py-4">
                  <span
                    className={`text-sm font-medium ${reasonColor[customer.bannedReason ?? ''] ?? 'text-slate-400'}`}
                  >
                    {customer.bannedReason}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-400 text-sm">{customer.bannedBy}</td>
                <td className="px-5 py-4">
                  <button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors">
                    Unban
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {blacklisted.length === 0 && (
          <div className="text-center py-10 text-slate-500">No blacklisted customers</div>
        )}
      </div>
    </div>
  )
}
