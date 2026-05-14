'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  UserPlus, Search, Users, UserCircle,
  ChevronLeft, ChevronRight, Eye, Pencil,
  Clock, CheckCircle2, Ban, ClipboardCheck, Link2, XCircle,
} from 'lucide-react'
import type { Customer, CustomerStatus } from '@/lib/types'
import Badge from '@/components/ui/badge'
import RegistrationLinkModal from '@/components/ui/registration-link-modal'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/toast'

const PAGE_SIZE = 20

const STATUS_DOT: Record<string, string> = {
  pending_kyc: 'bg-amber-400',
  rejected: 'bg-rose-400',
  active: 'bg-green-400',
  blacklisted: 'bg-red-400',
}

type FilterTab = 'all' | CustomerStatus

export default function CustomersPage() {
  const t = useTranslations('customers')
  const { error: toastError } = useToast()

  const FILTER_OPTIONS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'pending_kyc', label: t('filterPendingKyc') },
    { key: 'rejected', label: t('filterRejected') },
    { key: 'active', label: t('filterActive') },
    { key: 'blacklisted', label: t('filterBlacklisted') },
  ]

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState({ pending_kyc: 0, rejected: 0, active: 0, blacklisted: 0 })
  const [linkModalOpen, setLinkModalOpen] = useState(false)

  const firstRender = useRef(true)

  async function doFetch(s: string, f: FilterTab, p: number) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (s) params.set('search', s)
      if (f !== 'all') params.set('status', f)
      params.set('page', String(p))
      params.set('limit', String(PAGE_SIZE))
      const res = await fetch(`/api/customers?${params.toString()}`)
      if (!res.ok) { const msg = t('fetchError'); setError(msg); toastError(msg); return }
      setError(null)
      const json = await res.json() as { data: Customer[]; total: number }
      setCustomers(json.data ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }

  // Fetch status counts once on mount
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [r1, r2, r3, r4] = await Promise.all([
          fetch('/api/customers?status=pending_kyc&limit=1'),
          fetch('/api/customers?status=rejected&limit=1'),
          fetch('/api/customers?status=active&limit=1'),
          fetch('/api/customers?status=blacklisted&limit=1'),
        ])
        const [j1, j2, j3, j4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()])
        setCounts({
          pending_kyc: j1.total ?? 0,
          rejected: j2.total ?? 0,
          active: j3.total ?? 0,
          blacklisted: j4.total ?? 0,
        })
      } catch { /* silent */ }
    }
    fetchCounts()
  }, [])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      void doFetch('', 'all', 1)
      return
    }
    const timer = setTimeout(() => void doFetch(search, activeFilter, page), 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeFilter, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function handleCardClick(key: FilterTab) {
    setSearch('')
    setActiveFilter(key)
    setPage(1)
  }

  const statusCards = [
    {
      key: 'pending_kyc' as FilterTab,
      label: t('filterPendingKyc'),
      count: counts.pending_kyc,
      Icon: Clock,
      activeClass: 'bg-amber-50 border-amber-400',
      idleClass: 'bg-white border-slate-200 hover:border-amber-300',
      iconClass: 'text-amber-500 bg-amber-500/10',
      countClass: 'text-amber-700',
    },
    {
      key: 'rejected' as FilterTab,
      label: t('filterRejected'),
      count: counts.rejected,
      Icon: XCircle,
      activeClass: 'bg-rose-50 border-rose-400',
      idleClass: 'bg-white border-slate-200 hover:border-rose-300',
      iconClass: 'text-rose-500 bg-rose-500/10',
      countClass: 'text-rose-700',
    },
    {
      key: 'active' as FilterTab,
      label: t('filterActive'),
      count: counts.active,
      Icon: CheckCircle2,
      activeClass: 'bg-green-50 border-green-400',
      idleClass: 'bg-white border-slate-200 hover:border-green-300',
      iconClass: 'text-green-500 bg-green-500/10',
      countClass: 'text-green-700',
    },
    {
      key: 'blacklisted' as FilterTab,
      label: t('filterBlacklisted'),
      count: counts.blacklisted,
      Icon: Ban,
      activeClass: 'bg-red-50 border-red-400',
      idleClass: 'bg-white border-slate-200 hover:border-red-300',
      iconClass: 'text-red-500 bg-red-500/10',
      countClass: 'text-red-700',
    },
  ]

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLinkModalOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Link2 size={16} />
            สร้างลิ้งลงทะเบียน
          </button>
          <Link
            href="/customers/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <UserPlus size={16} />
            {t('addCustomer')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {/* Status Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statusCards.map(({ key, label, count, Icon, activeClass, idleClass, iconClass, countClass }) => {
          const isActive = activeFilter === key
          return (
            <button
              key={key}
              onClick={() => handleCardClick(key)}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                isActive ? activeClass : idleClass
              }`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${iconClass}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-slate-500 text-xs">{label}</p>
                <p className={`text-2xl font-bold tabular-nums ${isActive ? countClass : 'text-slate-800'}`}>
                  {count}
                </p>
              </div>
            </button>
          )
        })}
      </div>

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
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_DOT[f.key] ?? 'bg-slate-400'}`} />
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
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.customer')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.phone')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.driverType')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.status')}</th>
              <th className="text-right text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-32" />
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-32" /></td>
                  <td className="px-5 py-3.5"><div className="h-5 bg-slate-100 rounded-full animate-pulse w-16" /></td>
                  <td className="px-5 py-3.5"><div className="h-5 bg-slate-100 rounded-full animate-pulse w-20" /></td>
                  <td className="px-5 py-3.5"><div className="h-7 bg-slate-100 rounded-lg animate-pulse w-32 ml-auto" /></td>
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-1">
                      <Users size={22} className="text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-500">{t('empty')}</p>
                    <p className="text-sm">{t('emptyHint')}</p>
                  </div>
                </td>
              </tr>
            ) : (
              customers.map(customer => (
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
                          <UserCircle size={20} className="text-slate-300" />
                        )}
                      </div>
                      <span className="text-slate-700 text-sm font-medium">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-sm">{customer.phone}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                      {customer.driverType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                      variant={
                        customer.status === 'pending_kyc' ? 'pending_kyc'
                          : customer.status === 'rejected' ? 'rejected'
                          : customer.status === 'active' ? 'active'
                          : customer.status === 'suspended' ? 'suspended'
                          : 'blacklisted'
                      }
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {customer.status === 'pending_kyc' && (
                        <Link
                          href={`/customers/kyc?id=${customer.id}`}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 hover:border-amber-300 rounded-lg text-xs font-medium transition-colors"
                        >
                          <ClipboardCheck size={13} />
                          {t('reviewKyc')}
                        </Link>
                      )}
                      <Link
                        href={`/customers/${customer.id}`}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title={t('columns.actions')}
                      >
                        <Eye size={15} />
                      </Link>
                      <Link
                        href={`/customers/${customer.id}/edit`}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title={t('detail.edit')}
                      >
                        <Pencil size={15} />
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
              {t('showing', { count: customers.length, total })}
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
      {linkModalOpen && (
        <RegistrationLinkModal onClose={() => setLinkModalOpen(false)} />
      )}
    </div>
  )
}
