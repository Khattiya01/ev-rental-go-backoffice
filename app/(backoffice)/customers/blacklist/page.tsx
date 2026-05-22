'use client'

import { useState, useEffect } from 'react'
import { Ban } from 'lucide-react'
import type { Customer } from '@/lib/types'
import { useToast } from '@/components/ui/toast'
import { useCanWrite } from '@/lib/user-context'
import PageHeader from '@/components/ui/page-header'
import EmptyState from '@/components/ui/empty-state'

export default function BlacklistPage() {
  const { success, error: toastError } = useToast()
  const canWrite = useCanWrite()
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
      <PageHeader
        title="Blacklist Management"
        subtitle={blacklisted.length > 0 ? `${blacklisted.length} ลูกค้าที่ถูก Blacklist` : 'จัดการรายชื่อลูกค้าที่ถูกแบน'}
      />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200">
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">Customer Name</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">Date Banned</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">Reason</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">Admin</th>
              <th className="text-right text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-32" />
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-40" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                  <td className="px-5 py-3.5"><div className="h-7 bg-slate-100 rounded-lg animate-pulse w-16 ml-auto" /></td>
                </tr>
              ))
            ) : blacklisted.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center">
                  <EmptyState icon={Ban} title="ไม่มีลูกค้าใน Blacklist" subtitle="ลูกค้าที่ถูกแบนจะปรากฎที่นี่" />
                </td>
              </tr>
            ) : (
              blacklisted.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        {customer.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={customer.avatarUrl}
                            alt={customer.name}
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <Ban size={16} className="text-slate-300" />
                        )}
                      </div>
                      <span className="text-slate-700 text-sm font-medium">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-sm">{customer.bannedDate ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium text-red-500">{customer.bannedReason ?? '—'}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-sm">{customer.bannedBy ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      {canWrite && (
                        <button
                          onClick={() => handleUnban(customer)}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        >
                          Unban
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
