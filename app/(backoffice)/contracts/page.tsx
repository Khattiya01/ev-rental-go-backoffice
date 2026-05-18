'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Search, FileText, AlertCircle, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, Eye, Plus,
} from 'lucide-react'
import Badge from '@/components/ui/badge'
import type { Contract, ContractStatus } from '@/lib/types'
import { useCanWrite } from '@/lib/user-context'

const PAGE_SIZE = 20

const STATUS_DOT: Record<ContractStatus, string> = {
  active: 'bg-green-400',
  overdue: 'bg-red-400',
  completed: 'bg-slate-400',
}

type FilterTab = 'all' | ContractStatus
const FILTER_OPTIONS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'active', label: 'Active' },
  { key: 'overdue', label: 'เกินกำหนด' },
  { key: 'completed', label: 'เสร็จสิ้น' },
]

export default function ContractsPage() {
  const canWrite = useCanWrite()
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const firstRender = useRef(true)

  const doFetch = useCallback(async (s: string, f: FilterTab, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (s) params.set('search', s)
      if (f !== 'all') params.set('status', f)
      params.set('page', String(p))
      params.set('limit', String(PAGE_SIZE))
      const res = await fetch(`/api/contracts?${params}`)
      if (!res.ok) { setError('โหลดข้อมูลไม่สำเร็จ'); return }
      setError(null)
      const json = await res.json() as { data: Contract[]; total: number }
      setContracts(json.data ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      void doFetch('', 'all', 1)
      return
    }
    const t = setTimeout(() => void doFetch(search, activeFilter, page), 300)
    return () => clearTimeout(t)
  }, [search, activeFilter, page, doFetch])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const badgeVariant = (s: ContractStatus) =>
    s === 'active' ? 'active' as const : s === 'overdue' ? 'overdue' as const : 'paid' as const

  const statusIcon = (s: ContractStatus) => {
    if (s === 'active') return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
    if (s === 'overdue') return <AlertCircle className="w-3.5 h-3.5 text-red-500" />
    return <Clock className="w-3.5 h-3.5 text-slate-400" />
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-800 text-xl font-bold">สัญญาเช่า</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {total > 0 ? `${total} สัญญาทั้งหมด` : 'จัดการสัญญาเช่ารถทั้งหมด'}
          </p>
        </div>
        {canWrite && (
          <Link
            href="/contracts/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            สร้างสัญญา
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="ค้นหาเลขสัญญา, ลูกค้า, ทะเบียน..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
            />
          </div>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {FILTER_OPTIONS.map(f => (
              <button
                key={f.key}
                onClick={() => { setActiveFilter(f.key); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeFilter === f.key
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f.key !== 'all' && (
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_DOT[f.key]}`} />
                )}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200">
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">เลขสัญญา</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">ลูกค้า</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">ทะเบียน</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">วันเริ่ม</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">วันครบกำหนด</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">ค่าเช่า/วัน</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">สถานะ</th>
              <th className="text-right text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-28" />
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-16" /></td>
                  <td className="px-5 py-3.5"><div className="h-5 bg-slate-100 rounded-full animate-pulse w-16" /></td>
                  <td className="px-5 py-3.5"><div className="h-7 bg-slate-100 rounded-lg animate-pulse w-8 ml-auto" /></td>
                </tr>
              ))
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-1">
                      <FileText size={22} className="text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-500">ไม่พบสัญญา</p>
                    <p className="text-sm">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
                  </div>
                </td>
              </tr>
            ) : (
              contracts.map(contract => (
                <tr key={contract.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-slate-700 text-sm font-mono font-medium">{contract.contractNo}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {contract.customerName.charAt(0)}
                      </div>
                      <span className="text-slate-700 text-sm font-medium">{contract.customerName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-sm font-mono">{contract.vehiclePlate}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-sm">{contract.startDate}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(contract.status)}
                      <span className={`text-sm ${contract.status === 'overdue' ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                        {contract.dueDate}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700 text-sm">฿{contract.dailyRate.toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={badgeVariant(contract.status)} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end">
                      <Link
                        href={`/contracts/${contract.id}`}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="ดูรายละเอียด"
                      >
                        <Eye size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && (
          <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-sm text-slate-500">
              แสดง {contracts.length} จาก {total} รายการ
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-sm text-slate-600 px-2 tabular-nums">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * PAGE_SIZE >= total}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
