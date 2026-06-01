'use client'

import { useEffect, useState, useCallback } from 'react'
import { ClipboardList, Loader2, X } from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import PaginationFooter from '@/components/ui/pagination-footer'
import EmptyState from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { useTranslations, useLocale } from 'next-intl'

// ─── Types ────────────────────────────────────────────────────────────────────
type AuditLogRow = {
  id: string
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown> | null
  createdAt: string
  adminId: string
  adminName: string | null
  adminEmail: string | null
}

type ApiResponse = {
  data: AuditLogRow[]
  total: number
  page: number
  limit: number
}

type AdminOption = { id: string; name: string; email: string }

const LIMIT = 50

const ACTION_COLORS: Record<string, string> = {
  remote_cutoff:         'bg-red-100 text-red-700',
  remote_reset:          'bg-orange-100 text-orange-700',
  blacklist_customer:    'bg-red-100 text-red-700',
  unblacklist_customer:  'bg-emerald-100 text-emerald-700',
  update_vehicle_status: 'bg-blue-100 text-blue-700',
  create_contract:       'bg-violet-100 text-violet-700',
  update_contract:       'bg-violet-100 text-violet-700',
  create_customer:       'bg-teal-100 text-teal-700',
  update_customer:       'bg-teal-100 text-teal-700',
  delete_customer:       'bg-red-100 text-red-700',
  update_permissions:    'bg-amber-100 text-amber-700',
  update_pricing:        'bg-amber-100 text-amber-700',
  create_user:           'bg-slate-100 text-slate-700',
  update_user:           'bg-slate-100 text-slate-700',
  delete_user:           'bg-red-100 text-red-700',
}

const ACTION_KEYS = Object.keys(ACTION_COLORS)

function ActionBadge({ action }: { action: string }) {
  const t = useTranslations('auditLog')
  const label = ACTION_KEYS.includes(action) ? t(`actions.${action}` as Parameters<typeof t>[0]) : action
  const color = ACTION_COLORS[action] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

function MetadataCell({ metadata }: { metadata: Record<string, unknown> | null }) {
  const t = useTranslations('auditLog')
  if (!metadata || Object.keys(metadata).length === 0) return <span className="text-slate-300">—</span>
  const entries = Object.entries(metadata).slice(0, 3)
  const extraCount = Object.keys(metadata).length - 3
  return (
    <div className="flex flex-col gap-0.5">
      {entries.map(([k, v]) => (
        <span key={k} className="text-xs text-slate-500">
          <span className="text-slate-400">{k}:</span>{' '}
          <span className="font-mono">{String(v)}</span>
        </span>
      ))}
      {extraCount > 0 && (
        <span className="text-xs text-slate-400">{t('metadata.more', { count: extraCount })}</span>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AuditLogPage() {
  const t = useTranslations('auditLog')
  const locale = useLocale()
  const { error: toastError } = useToast()

  const [rows, setRows]           = useState<AuditLogRow[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [admins, setAdmins]       = useState<AdminOption[]>([])

  // filters
  const [filterAction,  setFilterAction]  = useState('')
  const [filterAdminId, setFilterAdminId] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo,   setFilterDateTo]   = useState('')

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (filterAction)   params.set('action',   filterAction)
      if (filterAdminId)  params.set('adminId',  filterAdminId)
      if (filterDateFrom) params.set('dateFrom', filterDateFrom)
      if (filterDateTo)   params.set('dateTo',   filterDateTo)

      const res = await fetch(`/api/audit-logs?${params}`)
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        toastError(err.error ?? t('toast.loadError'))
        return
      }
      const json = await res.json() as ApiResponse
      setRows(json.data)
      setTotal(json.total)
    } catch {
      toastError(t('toast.genericError'))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction, filterAdminId, filterDateFrom, filterDateTo])

  // Load admin list for filter dropdown (from audit log unique admins via /api/users)
  useEffect(() => {
    fetch('/api/users')
      .then(r => r.ok ? r.json() : null)
      .then((json: { data?: AdminOption[] } | null) => {
        if (json?.data) setAdmins(json.data)
      })
      .catch(() => {/* non-critical */})
  }, [])

  useEffect(() => {
    setPage(1)
    void load(1)
  }, [load])

  function handlePageChange(p: number) {
    setPage(p)
    void load(p)
  }

  function clearFilters() {
    setFilterAction('')
    setFilterAdminId('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const hasFilters = filterAction || filterAdminId || filterDateFrom || filterDateTo

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Action filter */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500">{t('filters.actionType')}</label>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">{t('filters.all')}</option>
              {ACTION_KEYS.map(key => (
                <option key={key} value={key}>{t(`actions.${key}` as Parameters<typeof t>[0])}</option>
              ))}
            </select>
          </div>

          {/* Admin filter */}
          {admins.length > 0 && (
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-slate-500">{t('filters.performer')}</label>
              <select
                value={filterAdminId}
                onChange={e => setFilterAdminId(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="">{t('filters.all')}</option>
                {admins.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">{t('filters.dateFrom')}</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">{t('filters.dateTo')}</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-2 transition-colors"
            >
              <X size={14} />
              {t('filters.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t('empty.title')}
            subtitle={hasFilters ? t('empty.subtitleFiltered') : t('empty.subtitle')}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-slate-500 font-medium whitespace-nowrap">{t('table.time')}</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium whitespace-nowrap">{t('table.performer')}</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium whitespace-nowrap">{t('table.action')}</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium whitespace-nowrap">{t('table.entity')}</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">{t('table.details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                        {new Date(row.createdAt).toLocaleString(locale, {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-700 text-sm">{row.adminName ?? '—'}</div>
                        <div className="text-xs text-slate-400">{row.adminEmail ?? row.adminId}</div>
                      </td>
                      <td className="px-5 py-3">
                        <ActionBadge action={row.action} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-600 text-xs font-mono">{row.entityType}</div>
                        <div className="text-slate-400 text-xs font-mono truncate max-w-[120px]" title={row.entityId}>
                          {row.entityId}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <MetadataCell metadata={row.metadata} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              page={page}
              totalPages={totalPages}
              label={t('pagination.label', { total: total.toLocaleString() })}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  )
}
