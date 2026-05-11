'use client'

import { useState } from 'react'
import Link from 'next/link'
import { mockContracts } from '@/lib/mock-data'

export default function ContractsPage() {
  const [search, setSearch] = useState('')
  const [filterDueToday, setFilterDueToday] = useState(false)
  const [filterOverdue, setFilterOverdue] = useState(false)

  const filtered = mockContracts.filter(c => {
    const matchSearch =
      !search ||
      c.contractNo.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.vehiclePlate.includes(search)
    const matchDueToday = !filterDueToday || c.dueDate === 'Feb 14, 2024'
    const matchOverdue = !filterOverdue || c.status === 'overdue'
    return matchSearch && (!filterDueToday || matchDueToday) && (!filterOverdue || matchOverdue)
  })

  return (
    <div className="space-y-5">
      <h1 className="text-slate-800 text-xl font-bold">Active Rental Contracts Overview</h1>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-slate-100 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400"
          />
        </div>
        <button
          onClick={() => setFilterDueToday(!filterDueToday)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            filterDueToday
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300'
          }`}
        >
          📅 Due Today
        </button>
        <button
          onClick={() => setFilterOverdue(!filterOverdue)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            filterOverdue
              ? 'bg-red-500/20 text-red-400 border-red-500/30'
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300'
          }`}
        >
          🔴 Overdue
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Contract ID</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Tenant Name</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">License Plate</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Start Date</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(contract => (
              <tr key={contract.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3">
                  <Link
                    href={`/contracts/${contract.id}`}
                    className="text-blue-500 hover:text-blue-400 text-sm font-mono transition-colors"
                  >
                    {contract.contractNo}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {contract.customerName.charAt(0)}
                    </div>
                    <span className="text-slate-700 text-sm">{contract.customerName}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600 text-sm font-mono">{contract.vehiclePlate}</td>
                <td className="px-5 py-3 text-slate-500 text-sm">{contract.startDate}</td>
                <td className="px-5 py-3">
                  <span
                    className={`text-sm font-medium ${
                      contract.status === 'overdue'
                        ? 'text-red-400 bg-red-500/10 px-2 py-0.5 rounded'
                        : 'text-slate-600'
                    }`}
                  >
                    {contract.dueDate}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400">No contracts found</div>
        )}
      </div>
    </div>
  )
}
