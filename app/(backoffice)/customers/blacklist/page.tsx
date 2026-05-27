'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Ban } from 'lucide-react'
import type { Customer } from '@/lib/types'
import { useToast } from '@/components/ui/toast'
import { useCanWrite } from '@/lib/user-context'
import PageHeader from '@/components/ui/page-header'
import EmptyState from '@/components/ui/empty-state'
import Modal from '@/components/ui/modal'
import SearchFilterBar from '@/components/ui/search-filter-bar'
import PaginationFooter from '@/components/ui/pagination-footer'
import { useTranslations } from 'next-intl'

const PAGE_SIZE = 20

export default function BlacklistPage() {
  const t = useTranslations('customers.blacklist')
  const { success, error: toastError } = useToast()
  const canWrite = useCanWrite()
  const [blacklisted, setBlacklisted] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [unbanTarget, setUnbanTarget] = useState<Customer | null>(null)
  const [unbanLoading, setUnbanLoading] = useState(false)

  useEffect(() => {
    const fetchBlacklisted = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ status: 'blacklisted', limit: '500' })
        const res = await fetch(`/api/customers?${params}`)
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

  const handleUnbanConfirm = async () => {
    if (!unbanTarget) return
    setUnbanLoading(true)
    try {
      const res = await fetch(`/api/customers/${unbanTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (res.ok) {
        setBlacklisted(prev => prev.filter(c => c.id !== unbanTarget.id))
        success(t('toast.unbanSuccess', { name: unbanTarget.name }))
        setUnbanTarget(null)
      } else {
        toastError(t('toast.unbanError'))
      }
    } finally {
      setUnbanLoading(false)
    }
  }

  const filtered = useMemo(() => {
    setPage(1)
    if (!search.trim()) return blacklisted
    const q = search.toLowerCase()
    return blacklisted.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(search) ||
      (c.bannedReason ?? '').toLowerCase().includes(q)
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blacklisted, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        subtitle={blacklisted.length > 0 ? t('subtitleCount', { count: blacklisted.length }) : t('subtitleDefault')}
      />

      <SearchFilterBar
        search={search}
        onSearchChange={v => setSearch(v)}
        placeholder={t('searchPlaceholder')}
      />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200">
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.customer')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.phone')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.bannedDate')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.reason')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.bannedBy')}</th>
              <th className="px-5 py-3.5" />
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
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-40" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                  <td className="px-5 py-3.5"><div className="h-7 bg-slate-100 rounded-lg animate-pulse w-16 ml-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">
                  <EmptyState
                    icon={Ban}
                    title={search ? t('emptySearch') : t('empty')}
                    subtitle={search ? t('emptySearchHint') : t('emptyHint')}
                  />
                </td>
              </tr>
            ) : (
              paginated.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/customers/${customer.id}`} className="flex items-center gap-3 group">
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
                      <span className="text-slate-700 text-sm font-medium group-hover:text-blue-600 transition-colors">
                        {customer.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-sm">{customer.phone}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-sm">{customer.bannedDate ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-red-500 font-medium">{customer.bannedReason ?? '—'}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-sm">{customer.bannedBy ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      {canWrite && (
                        <button
                          onClick={() => setUnbanTarget(customer)}
                          className="bg-green-500/10 hover:bg-green-500/20 text-green-600 border border-green-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        >
                          {t('unban')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && filtered.length > 0 && (
          <PaginationFooter
            page={page}
            totalPages={totalPages}
            label={t('showing', { count: paginated.length, total: filtered.length })}
            onPageChange={setPage}
          />
        )}
      </div>

      <Modal
        isOpen={!!unbanTarget}
        onClose={() => setUnbanTarget(null)}
        title={t('unbanModal.title')}
        footer={
          <>
            <button
              onClick={() => setUnbanTarget(null)}
              disabled={unbanLoading}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {t('unbanModal.cancel')}
            </button>
            <button
              onClick={handleUnbanConfirm}
              disabled={unbanLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {unbanLoading ? t('unbanModal.confirming') : t('unbanModal.confirm')}
            </button>
          </>
        }
      >
        <p className="text-slate-500 text-sm">
          {t('unbanModal.message', { name: unbanTarget?.name ?? '' })}
          <br /><br />
          {t('unbanModal.note')}
        </p>
      </Modal>
    </div>
  )
}
