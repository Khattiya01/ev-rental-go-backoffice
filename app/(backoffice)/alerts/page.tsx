'use client'

import { useState, useEffect, useRef } from 'react'
import {
  BellRing, BatteryWarning, MapPinned, Receipt, WifiOff,
  CheckCircle2, AlertCircle, AlertTriangle, Info,
  Eye,
} from 'lucide-react'
import type { AlertRecord, AlertSeverity } from '@/lib/types'
import Badge from '@/components/ui/badge'
import ActionButton from '@/components/ui/action-button'
import ResolveAlertButton from '@/components/ui/resolve-alert-button'
import PageHeader from '@/components/ui/page-header'
import EmptyState from '@/components/ui/empty-state'
import PaginationFooter from '@/components/ui/pagination-footer'
import SearchFilterBar from '@/components/ui/search-filter-bar'
import { useTranslations } from 'next-intl'

const PAGE_SIZE = 20

type ResolvedFilter = 'all' | 'unresolved' | 'resolved'
type TypeFilter = 'all' | AlertRecord['type']

const severityIcon: Record<AlertSeverity, { icon: typeof AlertCircle; className: string }> = {
  critical: { icon: AlertCircle, className: 'text-red-500' },
  warning: { icon: AlertTriangle, className: 'text-amber-500' },
  info: { icon: Info, className: 'text-blue-500' },
}

export default function AlertsPage() {
  const t = useTranslations('alerts')

  const [resolvedFilter, setResolvedFilter] = useState<ResolvedFilter>('unresolved')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState({ battery_low: 0, geofence_breach: 0, payment_reminder: 0, vehicle_offline: 0, resolved: 0 })

  const firstRender = useRef(true)

  async function doFetch(s: string, type: TypeFilter, resolved: ResolvedFilter, p: number) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (s) params.set('search', s)
      if (type !== 'all') params.set('type', type)
      if (resolved !== 'all') params.set('resolved', resolved === 'resolved' ? 'true' : 'false')
      params.set('page', String(p))
      params.set('limit', String(PAGE_SIZE))
      const res = await fetch(`/api/alerts?${params.toString()}`)
      if (!res.ok) { setError(t('fetchError')); return }
      setError(null)
      const json = await res.json() as { data: AlertRecord[]; total: number }
      setAlerts(json.data ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCounts() {
    try {
      const [r1, r2, r3, r4, r5] = await Promise.all([
        fetch('/api/alerts?type=battery_low&resolved=false&limit=1'),
        fetch('/api/alerts?type=geofence_breach&resolved=false&limit=1'),
        fetch('/api/alerts?type=payment_reminder&resolved=false&limit=1'),
        fetch('/api/alerts?type=vehicle_offline&resolved=false&limit=1'),
        fetch('/api/alerts?resolved=true&limit=1'),
      ])
      const [j1, j2, j3, j4, j5] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json(), r5.json()])
      setCounts({
        battery_low: j1.total ?? 0,
        geofence_breach: j2.total ?? 0,
        payment_reminder: j3.total ?? 0,
        vehicle_offline: j4.total ?? 0,
        resolved: j5.total ?? 0,
      })
    } catch { /* silent */ }
  }

  useEffect(() => {
    const load = async () => { await fetchCounts() }
    load()
  }, [])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      void doFetch('', 'all', 'unresolved', 1)
      return
    }
    const timer = setTimeout(() => void doFetch(search, typeFilter, resolvedFilter, page), 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, resolvedFilter, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function handleCardClick(type: TypeFilter, resolved: ResolvedFilter) {
    setSearch('')
    setTypeFilter(type)
    setResolvedFilter(resolved)
    setPage(1)
  }

  function handleFilterChange(value: string) {
    setResolvedFilter(value as ResolvedFilter)
    setPage(1)
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleResolved(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a).filter(a => resolvedFilter !== 'unresolved' || !a.resolved))
    void fetchCounts()
  }

  const summaryCards = [
    {
      key: 'battery_low' as const, label: t('typeBatteryLow'), count: counts.battery_low, Icon: BatteryWarning,
      activeClass: 'bg-red-50 border-red-400', idleClass: 'bg-white border-slate-200 hover:border-red-300',
      iconClass: 'text-red-500 bg-red-500/10', countClass: 'text-red-700',
    },
    {
      key: 'geofence_breach' as const, label: t('typeGeofenceBreach'), count: counts.geofence_breach, Icon: MapPinned,
      activeClass: 'bg-orange-50 border-orange-400', idleClass: 'bg-white border-slate-200 hover:border-orange-300',
      iconClass: 'text-orange-500 bg-orange-500/10', countClass: 'text-orange-700',
    },
    {
      key: 'payment_reminder' as const, label: t('typePaymentReminder'), count: counts.payment_reminder, Icon: Receipt,
      activeClass: 'bg-amber-50 border-amber-400', idleClass: 'bg-white border-slate-200 hover:border-amber-300',
      iconClass: 'text-amber-500 bg-amber-500/10', countClass: 'text-amber-700',
    },
    {
      key: 'vehicle_offline' as const, label: t('typeVehicleOffline'), count: counts.vehicle_offline, Icon: WifiOff,
      activeClass: 'bg-slate-100 border-slate-400', idleClass: 'bg-white border-slate-200 hover:border-slate-300',
      iconClass: 'text-slate-500 bg-slate-500/10', countClass: 'text-slate-700',
    },
  ]

  const filterOptions = [
    { value: 'all', label: t('filterAll') },
    { value: 'unresolved', label: t('filterUnresolved') },
    { value: 'resolved', label: t('filterResolved') },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        subtitle={total > 0 ? t('subtitleCount', { count: total }) : t('subtitleDefault')}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {/* Type Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {summaryCards.map(({ key, label, count, Icon, activeClass, idleClass, iconClass, countClass }) => {
          const isActive = typeFilter === key && resolvedFilter === 'unresolved'
          return (
            <button
              key={key}
              onClick={() => handleCardClick(key, 'unresolved')}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${isActive ? activeClass : idleClass}`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${iconClass}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-slate-500 text-xs">{label}</p>
                <p className={`text-2xl font-bold tabular-nums ${isActive ? countClass : 'text-slate-800'}`}>{count}</p>
              </div>
            </button>
          )
        })}
        <button
          onClick={() => handleCardClick('all', 'resolved')}
          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
            resolvedFilter === 'resolved' && typeFilter === 'all' ? 'bg-green-50 border-green-400' : 'bg-white border-slate-200 hover:border-green-300'
          }`}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 text-green-500 bg-green-500/10">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-slate-500 text-xs">{t('filterResolved')}</p>
            <p className={`text-2xl font-bold tabular-nums ${resolvedFilter === 'resolved' && typeFilter === 'all' ? 'text-green-700' : 'text-slate-800'}`}>
              {counts.resolved}
            </p>
          </div>
        </button>
      </div>

      <SearchFilterBar
        search={search}
        onSearchChange={handleSearchChange}
        placeholder={t('searchPlaceholder')}
        filterOptions={filterOptions}
        activeFilter={resolvedFilter}
        onFilterChange={handleFilterChange}
      />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200">
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.severity')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.type')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.message')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.createdAt')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.status')}</th>
              <th className="text-right text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-3.5"><div className="w-5 h-5 rounded-full bg-slate-100 animate-pulse" /></td>
                  <td className="px-5 py-3.5"><div className="h-5 bg-slate-100 rounded-full animate-pulse w-24" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-56" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                  <td className="px-5 py-3.5"><div className="h-5 bg-slate-100 rounded-full animate-pulse w-20" /></td>
                  <td className="px-5 py-3.5"><div className="h-7 bg-slate-100 rounded-lg animate-pulse w-16 ml-auto" /></td>
                </tr>
              ))
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">
                  <EmptyState icon={BellRing} title={t('empty')} subtitle={t('emptyHint')} />
                </td>
              </tr>
            ) : (
              alerts.map(alert => {
                const Sev = severityIcon[alert.severity]
                return (
                  <tr key={alert.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <Sev.icon className={`w-4 h-4 ${Sev.className}`} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={alert.type} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 text-sm">{alert.message}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-sm whitespace-nowrap">
                      {new Date(alert.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={alert.resolved ? 'completed' : 'pending'} label={alert.resolved ? t('resolved') : t('unresolved')} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {!alert.resolved && (
                          <ResolveAlertButton
                            alertId={alert.id}
                            onResolved={handleResolved}
                            dim={false}
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50"
                          />
                        )}
                        <ActionButton variant="view" href={alert.href} icon={Eye} title={t('columns.actions')} />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {!loading && (
          <PaginationFooter
            page={page}
            totalPages={totalPages}
            label={t('showing', { count: alerts.length, total })}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  )
}
