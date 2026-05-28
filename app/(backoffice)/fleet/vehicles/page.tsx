'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Eye, Pencil, Trash2, Zap, Gauge } from 'lucide-react'
import Badge from '@/components/ui/badge'
import CircularProgress from '@/components/ui/circular-progress'
import Modal from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useCanWrite, useCanDelete } from '@/lib/user-context'
import PageHeader from '@/components/ui/page-header'
import EmptyState from '@/components/ui/empty-state'
import PaginationFooter from '@/components/ui/pagination-footer'
import SearchFilterBar from '@/components/ui/search-filter-bar'
import ActionButton from '@/components/ui/action-button'
import type { Vehicle } from '@/lib/types'

const PAGE_SIZE = 20

export default function VehiclesPage() {
  const t = useTranslations('vehicles')
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const canWrite  = useCanWrite('vehicles')
  const canDelete = useCanDelete('vehicles')

  const filterOptions = [
    { value: '', label: t('filterAll') },
    { value: 'available', label: t('filterAvailable'), dotColor: 'bg-green-400' },
    { value: 'rented', label: t('filterRented'), dotColor: 'bg-blue-400' },
    { value: 'charging', label: t('filterCharging'), dotColor: 'bg-cyan-400' },
    { value: 'under_repair', label: t('filterRepair'), dotColor: 'bg-amber-400' },
    { value: 'offline', label: t('filterOffline'), dotColor: 'bg-slate-400' },
  ]

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const firstRender = useRef(true)

  async function doFetch(s: string, f: string, p: number) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (s) params.set('search', s)
      if (f) params.set('status', f)
      params.set('page', String(p))
      params.set('limit', String(PAGE_SIZE))
      const res = await fetch(`/api/vehicles?${params.toString()}`)
      if (!res.ok) { setError(t('fetchError')); return }
      setError(null)
      const json = await res.json() as { data: Vehicle[]; total: number }
      setVehicles(json.data)
      setTotal(json.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      void doFetch('', '', 1)
      return
    }
    const timer = setTimeout(() => void doFetch(search, statusFilter, page), 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, page])

  async function handleDelete() {
    if (!selectedVehicle) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/vehicles/${selectedVehicle.id}`, { method: 'DELETE' })
      if (res.ok) {
        setIsDeleteOpen(false)
        setSelectedVehicle(null)
        setDeleteError(null)
        success(t('toast.deleted', { plate: selectedVehicle.plate }))
        void doFetch(search, statusFilter, page)
      } else {
        const data = await res.json() as { error?: string }
        const msg = data.error ?? t('toast.deleteError')
        setDeleteError(msg)
        toastError(msg)
      }
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function handleFilterChange(value: string) {
    setStatusFilter(value)
    setPage(1)
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        subtitle={total > 0 ? t('subtitleCount', { count: total }) : t('subtitleDefault')}
      >
        {canWrite && (
          <Link
            href="/fleet/vehicles/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            {t('addVehicle')}
          </Link>
        )}
      </PageHeader>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <SearchFilterBar
        search={search}
        onSearchChange={handleSearchChange}
        placeholder={t('searchPlaceholder')}
        filterOptions={filterOptions}
        activeFilter={statusFilter}
        onFilterChange={handleFilterChange}
      />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200">
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.vehicle')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.plate')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.makeModel')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.status')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.battery')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.odometer')}</th>
              <th className="text-right text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4"><div className="w-14 h-9 bg-slate-100 rounded-lg animate-pulse" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-28" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-36" /></td>
                  <td className="px-5 py-4"><div className="h-5 bg-slate-100 rounded-full animate-pulse w-20" /></td>
                  <td className="px-5 py-4"><div className="h-8 w-8 bg-slate-100 rounded-full animate-pulse" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-16 ml-auto" /></td>
                </tr>
              ))
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center">
                  <EmptyState icon={Zap} title={t('empty')} subtitle={t('emptyHint')} />
                </td>
              </tr>
            ) : (
              vehicles.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="w-14 h-9 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                      {v.imageUrl ? (
                        <img
                          src={v.imageUrl}
                          alt={v.model}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <Zap size={16} className="text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-sm font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {v.plate}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{v.make} {v.model}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{v.year}{v.color ? ` · ${v.color}` : ''}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={v.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <CircularProgress value={v.socPercent} size={36} />
                      <span className="text-xs text-slate-500 font-medium tabular-nums">{v.socPercent}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Gauge size={14} className="text-slate-400" />
                      <span className="tabular-nums">{v.odometer.toLocaleString()}</span>
                      <span className="text-slate-400 text-xs">km</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <ActionButton variant="view" href={`/fleet/vehicles/${v.id}`} icon={Eye} title={t('viewDetails')} />
                      {canWrite && (
                        <ActionButton variant="edit" href={`/fleet/vehicles/${v.id}/edit`} icon={Pencil} title={t('edit')} />
                      )}
                      {canDelete && (
                        <ActionButton
                          variant="delete"
                          onClick={() => { setSelectedVehicle(v); setIsDeleteOpen(true) }}
                          icon={Trash2}
                          title={t('delete')}
                        />
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
            label={t('showing', { count: vehicles.length, total })}
            onPageChange={setPage}
          />
        )}
      </div>

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setDeleteError(null) }}
        title={t('deleteModal.title')}
        footer={
          <>
            <button
              onClick={() => { setIsDeleteOpen(false); setDeleteError(null) }}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {t('deleteModal.cancel')}
            </button>
            <button
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? t('deleteModal.deleting') : t('deleteModal.confirm')}
            </button>
          </>
        }
      >
        <p className="text-slate-600 text-sm leading-relaxed">
          {t('deleteModal.message', { plate: selectedVehicle?.plate ?? '' })}
        </p>
        {deleteError && <p className="text-red-500 text-sm mt-3">{deleteError}</p>}
      </Modal>
    </div>
  )
}
