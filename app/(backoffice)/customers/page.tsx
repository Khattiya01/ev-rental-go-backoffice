'use client'

import { useState } from 'react'
import Link from 'next/link'
import { mockCustomers } from '@/lib/mock-data'
import type { CustomerStatus } from '@/lib/types'
import Badge from '@/components/ui/badge'

type FilterTab = 'all' | CustomerStatus

export default function CustomersPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  const filtered = mockCustomers.filter(c => {
    const matchFilter = activeFilter === 'all' || c.status === activeFilter
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    return matchFilter && matchSearch
  })

  const filters: { key: FilterTab; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: 'bg-slate-600 text-slate-200' },
    {
      key: 'pending_kyc',
      label: 'Pending',
      color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    },
    {
      key: 'active',
      label: 'Active',
      color: 'bg-green-500/20 text-green-400 border border-green-500/30',
    },
    {
      key: 'blacklisted',
      label: 'Blacklisted',
      color: 'bg-red-500/20 text-red-400 border border-red-500/30',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Customer List Management Overview</h1>
      </div>

      {/* Filter tabs + search */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              🔍
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
          <div className="flex gap-2">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === f.key ? f.color : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Avatar/Name
              </th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Phone Number
              </th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Driver Type
              </th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Account Status
              </th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(customer => (
              <tr
                key={customer.id}
                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
              >
                <td className="px-5 py-3">
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
                <td className="px-5 py-3 text-slate-400 text-sm">{customer.phone}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1.5">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                      {customer.driverType}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <Badge
                    variant={
                      customer.status === 'pending_kyc'
                        ? 'pending_kyc'
                        : customer.status === 'active'
                          ? 'active'
                          : 'blacklisted'
                    }
                  />
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-500">No customers found</div>
        )}
      </div>
    </div>
  )
}
