'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { FileText, AlertCircle, CheckCircle2, Clock, Eye, Pencil, Plus } from 'lucide-react'
import Badge from '@/components/ui/badge'
import type { Contract, ContractStatus } from '@/lib/types'
import { useCanWrite } from '@/lib/user-context'
import PageHeader from '@/components/ui/page-header'
import EmptyState from '@/components/ui/empty-state'
import PaginationFooter from '@/components/ui/pagination-footer'
import SearchFilterBar from '@/components/ui/search-filter-bar'
import ActionButton from '@/components/ui/action-button'

const PAGE_SIZE = 20

const FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'active', label: 'Active', dotColor: 'bg-green-400' },
  { value: 'overdue', label: 'เกินกำหนด', dotColor: 'bg-red-400' },
  { value: 'completed', label: 'เสร็จสิ้น', dotColor: 'bg-slate-400' },
]

type FilterTab = 'all' | ContractStatus

export default function ContractsPage() {
  const canWrite = useCanWrite('contracts')
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

  function handleFilterChange(value: string) {
    setActiveFilter(value as FilterTab)
    setPage(1)
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="สัญญาเช่า"
        subtitle={total > 0 ? `${total} สัญญาทั้งหมด` : 'จัดการสัญญาเช่ารถทั้งหมด'}
      >
        {canWrite && (
          <Link
            href="/contracts/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            สร้างสัญญา
          </Link>
        )}
      </PageHeader>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <SearchFilterBar
        search={search}
        onSearchChange={handleSearchChange}
        placeholder="ค้นหาเลขสัญญา, ลูกค้า, ทะเบียน..."
        filterOptions={FILTER_OPTIONS}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

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
                <td colSpan={8} className="text-center">
                  <EmptyState icon={FileText} title="ไม่พบสัญญา" subtitle="ลองเปลี่ยนตัวกรองหรือคำค้นหา" />
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
                    <div className="flex items-center justify-end gap-1">
                      <ActionButton variant="view" href={`/contracts/${contract.id}`} icon={Eye} title="ดูรายละเอียด" />
                      {canWrite && (
                        <ActionButton variant="edit" href={`/contracts/${contract.id}/edit`} icon={Pencil} title="แก้ไข" />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && (
          <PaginationFooter
            page={page}
            totalPages={totalPages}
            label={`แสดง ${contracts.length} จาก ${total} รายการ`}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  )
}
