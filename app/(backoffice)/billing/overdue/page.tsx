'use client'

import { useState, useEffect } from 'react'
import type { Invoice } from '@/lib/types'
import PageHeader from '@/components/ui/page-header'
import EmptyState from '@/components/ui/empty-state'
import ErrorAlert from '@/components/ui/error-alert'
import { AlertTriangle } from 'lucide-react'

export default function OverduePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/invoices?status=overdue&limit=100')
        if (!res.ok) { setError('โหลดข้อมูลไม่สำเร็จ'); return }
        const json = await res.json() as { data: Invoice[] }
        setInvoices(json.data ?? [])
      } catch {
        setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      } finally {
        setLoading(false)
      }
    }
    void fetch_()
  }, [])

  const totalDebt = invoices.reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="space-y-5">
      <PageHeader title="Overdue & Debt Collection Tracker" />

      <ErrorAlert message={error} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-red-400">💲</span>
                <p className="text-slate-500 text-sm">Total Debt</p>
              </div>
              {loading ? (
                <div className="h-9 bg-red-500/10 rounded animate-pulse w-28" />
              ) : (
                <p className="text-slate-800 text-3xl font-bold">฿{totalDebt.toLocaleString()}</p>
              )}
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
          {loading ? (
            <div className="h-9 bg-amber-500/10 rounded animate-pulse w-12 mt-1" />
          ) : (
            <p className="text-slate-800 text-3xl font-bold">{invoices.length}</p>
          )}
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
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-32" /></td>
                  <td className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                  <td className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-16" /></td>
                  <td className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                  <td className="px-5 py-3"><div className="h-7 bg-slate-100 rounded-lg animate-pulse w-48" /></td>
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center">
                  <EmptyState icon={AlertTriangle} title="ไม่มีรายการค้างชำระ" subtitle="ลูกค้าที่ค้างชำระเกินกำหนดจะปรากฎที่นี่" />
                </td>
              </tr>
            ) : (
              invoices.map(invoice => {
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
                    <td className="px-5 py-3 text-slate-700 text-sm font-semibold">฿{invoice.amount.toFixed(2)}</td>
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
