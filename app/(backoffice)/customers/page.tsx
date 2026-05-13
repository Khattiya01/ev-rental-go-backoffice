'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { UserPlus, Search, Users, UserCircle, ChevronLeft, ChevronRight, Eye, Pencil } from 'lucide-react'
import type { Customer, CustomerStatus } from '@/lib/types'
import Badge from '@/components/ui/badge'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/toast'

const PAGE_SIZE = 20

const STATUS_DOT: Record<string, string> = {
  pending_kyc: 'bg-amber-400',
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
          href="/customers/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <UserPlus size={16} />
          {t('addCustomer')}
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
                  <td className="px-5 py-3.5"><div className="h-7 bg-slate-100 rounded-lg animate-pulse w-20 ml-auto" /></td>
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
                        customer.status === 'pending_kyc'
                          ? 'pending_kyc'
                          : customer.status === 'active'
                            ? 'active'
                            : 'blacklisted'
                      }
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
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
    </div>
  )
}
