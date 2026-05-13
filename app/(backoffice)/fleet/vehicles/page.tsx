'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Search, Eye, Pencil, Trash2, Zap, Gauge, ChevronLeft, ChevronRight } from 'lucide-react'
import Badge from '@/components/ui/badge'
import CircularProgress from '@/components/ui/circular-progress'
import Modal from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import type { Vehicle } from '@/lib/types'

const PAGE_SIZE = 20

const STATUS_DOT: Record<string, string> = {
  available: 'bg-green-400',
  rented: 'bg-blue-400',
  charging: 'bg-cyan-400',
  under_repair: 'bg-amber-400',
  offline: 'bg-slate-400',
}

export default function VehiclesPage() {
  const t = useTranslations('vehicles')
  const router = useRouter()
  const { success, error: toastError } = useToast()

  const statusOptions = [
    { label: t('filterAll'), value: '' },
    { label: t('filterAvailable'), value: 'available' },
    { label: t('filterRented'), value: 'rented' },
    { label: t('filterCharging'), value: 'charging' },
    { label: t('filterRepair'), value: 'under_repair' },
    { label: t('filterOffline'), value: 'offline' },
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

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-800 text-xl font-bold">{t('title')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {total > 0 ? t('subtitleCount', { count: total }) : t('subtitleDefault')}
          </p>
        </div>
        <Link
          href="/fleet/vehicles/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          {t('addVehicle')}
        </Link>
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
              placeholder={t('searchPlaceholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
            />
          </div>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opt.value && (
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_DOT[opt.value] ?? 'bg-slate-400'}`} />
                )}
                {opt.label}
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
                <td colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-1">
                      <Zap size={22} className="text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-500">{t('empty')}</p>
                    <p className="text-sm">{t('emptyHint')}</p>
                  </div>
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
                      <Link
                        href={`/fleet/vehicles/${v.id}`}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title={t('viewDetails')}
                      >
                        <Eye size={15} />
                      </Link>
                      <Link
                        href={`/fleet/vehicles/${v.id}/edit`}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title={t('edit')}
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => { setSelectedVehicle(v); setIsDeleteOpen(true) }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 size={15} />
                      </button>
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
              {t('showing', { count: vehicles.length, total })}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-sm text-slate-600 px-2 tabular-nums">
                {page} / {totalPages}
              </span>
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
