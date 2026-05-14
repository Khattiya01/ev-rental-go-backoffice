'use client'

import { useState, useEffect } from 'react'
import type { Customer } from '@/lib/types'
import { useToast } from '@/components/ui/toast'

const reasonColor: Record<string, string> = {
  'Vehicle Theft': 'text-red-400',
  'Long Overdue Payment': 'text-amber-400',
  'Multiple Traffic Violations': 'text-orange-400',
}

export default function BlacklistPage() {
  const { success, error: toastError } = useToast()
  const [blacklisted, setBlacklisted] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBlacklisted = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/customers?status=blacklisted&limit=100')
        if (res.ok) {
          const json = await res.json()
          setBlacklisted(json.data ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchBlacklisted()
  }, [])

  const handleUnban = async (customer: Customer) => {
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    if (res.ok) {
      setBlacklisted(prev => prev.filter(c => c.id !== customer.id))
      success(`ยกเลิก Blacklist ${customer.name} เรียบร้อย`)
    } else {
      toastError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-slate-800 text-xl font-bold">Blacklist Management</h1>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Customer Name
              </th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Date Banned
              </th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Reason
              </th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Admin
              </th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : (
              blacklisted.map(customer => (
              <tr
                key={customer.id}
                className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={customer.avatarUrl}
                      alt={customer.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <span className="text-slate-700 text-sm font-medium">{customer.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-500 text-sm">{customer.bannedDate}</td>
                <td className="px-5 py-4">
                  <span
                    className={`text-sm font-medium ${reasonColor[customer.bannedReason ?? ''] ?? 'text-slate-400'}`}
                  >
                    {customer.bannedReason}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-500 text-sm">{customer.bannedBy}</td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => handleUnban(customer)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  >
                    Unban
                  </button>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && blacklisted.length === 0 && (
          <div className="text-center py-10 text-slate-400">No blacklisted customers</div>
        )}
      </div>
    </div>
  )
}
