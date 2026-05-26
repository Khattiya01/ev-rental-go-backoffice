'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { Invoice } from '@/lib/types'
import PageHeader from '@/components/ui/page-header'
import EmptyState from '@/components/ui/empty-state'
import ErrorAlert from '@/components/ui/error-alert'
import Modal from '@/components/ui/modal'
import { AlertTriangle, Lock, Phone } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import SearchFilterBar from '@/components/ui/search-filter-bar'

export default function OverduePage() {
  const t = useTranslations('overdue')
  const toast = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [lockTarget, setLockTarget] = useState<Invoice | null>(null)
  const [password, setPassword] = useState('')
  const [lockLoading, setLockLoading] = useState(false)
  const [contactingId, setContactingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/invoices?status=overdue&limit=100')
        if (!res.ok) { setError(t('fetchError')); return }
        const json = await res.json() as { data: Invoice[] }
        setInvoices(json.data ?? [])
      } catch {
        setError(t('fetchErrorRetry'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices
    const q = search.toLowerCase()
    return invoices.filter(inv =>
      inv.customerName.toLowerCase().includes(q) ||
      inv.invoiceNo.toLowerCase().includes(q) ||
      (inv.vehiclePlate ?? '').toLowerCase().includes(q)
    )
  }, [invoices, search])

  const totalDebt = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const aging30Plus = invoices.filter(inv => (inv.daysOverdue ?? 0) > 30).length
  const avgDays = invoices.length
    ? Math.round(invoices.reduce((sum, inv) => sum + (inv.daysOverdue ?? 0), 0) / invoices.length)
    : 0

  const agingBuckets = useMemo(() => {
    const b = { d1_7: 0, d8_14: 0, d15_30: 0, d30plus: 0 }
    for (const inv of invoices) {
      const d = inv.daysOverdue ?? 0
      if (d <= 7) b.d1_7++
      else if (d <= 14) b.d8_14++
      else if (d <= 30) b.d15_30++
      else b.d30plus++
    }
    return b
  }, [invoices])

  const handleMarkContacted = async (invoice: Invoice) => {
    setContactingId(invoice.id)
    try {
      const today = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastContacted: today }),
      })
      if (!res.ok) { toast.error(t('toast.contactError')); return }
      setInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, lastContacted: today } : inv))
      toast.success(t('toast.contactSuccess', { invoiceNo: invoice.invoiceNo }))
    } catch {
      toast.error(t('toast.genericError'))
    } finally {
      setContactingId(null)
    }
  }

  const handleLockVehicle = async () => {
    const plate = lockTarget?.vehiclePlate
    if (!plate || !password.trim()) return
    setLockLoading(true)
    try {
      const vehiclesRes = await fetch(`/api/vehicles?search=${encodeURIComponent(plate)}&limit=10`)
      if (!vehiclesRes.ok) { toast.error(t('toast.vehicleSearchError')); return }
      const vehiclesJson = await vehiclesRes.json() as { data: Array<{ id: string; plate: string }> }
      const vehicle = vehiclesJson.data.find(v => v.plate === plate)
      if (!vehicle) { toast.error(t('toast.vehicleNotFound', { plate })); return }

      const remoteRes = await fetch(`/api/vehicles/${vehicle.id}/remote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cutoff', password }),
      })
      if (remoteRes.status === 401) {
        const data = await remoteRes.json() as { error: string }
        toast.error(data.error === 'Incorrect password' ? t('toast.wrongPassword') : t('toast.lockError'))
        return
      }
      if (!remoteRes.ok) { toast.error(t('toast.lockErrorRetry')); return }

      toast.success(t('toast.lockSuccess', { plate }))
      setLockTarget(null)
      setPassword('')
    } catch {
      toast.error(t('toast.genericError'))
    } finally {
      setLockLoading(false)
    }
  }

  const agingConfig = [
    { label: t('aging.bucket1_7'), count: agingBuckets.d1_7, barClass: 'bg-orange-400' },
    { label: t('aging.bucket8_14'), count: agingBuckets.d8_14, barClass: 'bg-amber-500' },
    { label: t('aging.bucket15_30'), count: agingBuckets.d15_30, barClass: 'bg-orange-600' },
    { label: t('aging.bucket30plus'), count: agingBuckets.d30plus, barClass: 'bg-red-600' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} />

      <ErrorAlert message={error} />

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <p className="text-slate-500 text-sm mb-1.5">{t('cards.totalDebt')}</p>
          {loading
            ? <div className="h-8 bg-red-500/10 rounded animate-pulse w-28" />
            : <p className="text-slate-800 text-2xl font-bold">฿{totalDebt.toLocaleString()}</p>
          }
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
          <p className="text-slate-500 text-sm mb-1.5">{t('cards.overdueAccounts')}</p>
          {loading
            ? <div className="h-8 bg-amber-500/10 rounded animate-pulse w-12" />
            : <p className="text-slate-800 text-2xl font-bold">{invoices.length}</p>
          }
        </div>
        <div className="bg-red-900/10 border border-red-800/30 rounded-xl p-5">
          <p className="text-slate-500 text-sm mb-1.5">{t('cards.thirtyPlusDays')}</p>
          {loading
            ? <div className="h-8 bg-slate-100 rounded animate-pulse w-12" />
            : <p className="text-red-700 text-2xl font-bold">{aging30Plus}</p>
          }
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <p className="text-slate-500 text-sm mb-1.5">{t('cards.avgDays')}</p>
          {loading
            ? <div className="h-8 bg-slate-100 rounded animate-pulse w-16" />
            : <p className="text-slate-800 text-2xl font-bold">{avgDays} <span className="text-sm font-normal text-slate-400">{t('cards.daysUnit')}</span></p>
          }
        </div>
      </div>

      {/* Debt aging breakdown */}
      {!loading && invoices.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-3">{t('aging.sectionTitle')}</p>
          <div className="grid grid-cols-4 gap-6">
            {agingConfig.map(bucket => {
              const pct = invoices.length ? Math.round((bucket.count / invoices.length) * 100) : 0
              return (
                <div key={bucket.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">{bucket.label}</span>
                    <span className="text-slate-700 font-semibold">{t('aging.accounts', { count: bucket.count })}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full">
                    <div className={`h-1.5 rounded-full transition-all ${bucket.barClass}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <SearchFilterBar
        search={search}
        onSearchChange={v => setSearch(v)}
        placeholder={t('searchPlaceholder')}
      />

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200">
              {[t('columns.customer'), t('columns.invoiceNo'), t('columns.vehicle'), t('columns.amount'), t('columns.dueDate'), t('columns.overdue'), t('columns.lastContacted'), t('columns.actions')].map(h => (
                <th key={h} className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider first:pl-5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {[32, 20, 18, 16, 20, 12, 22, 18].map((w, j) => (
                    <td key={j} className="px-5 py-3.5">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${w * 4}px` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon={AlertTriangle}
                    title={search ? t('empty.noResults') : t('empty.noOverdue')}
                    subtitle={search ? t('empty.noResultsHint') : t('empty.noOverdueHint')}
                  />
                </td>
              </tr>
            ) : (
              filtered.map(invoice => {
                const days = invoice.daysOverdue ?? 0
                const badgeClass =
                  days > 30 ? 'bg-red-100 text-red-700' :
                  days > 14 ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700'

                return (
                  <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      {invoice.customerId ? (
                        <Link href={`/customers/${invoice.customerId}`} className="text-blue-500 hover:underline text-sm font-medium">
                          {invoice.customerName}
                        </Link>
                      ) : (
                        <span className="text-slate-700 text-sm font-medium">{invoice.customerName}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-sm font-mono">{invoice.invoiceNo}</td>
                    <td className="px-5 py-3.5 text-slate-700 text-sm font-medium">
                      {invoice.vehiclePlate ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-800 text-sm font-semibold">
                      ฿{invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-sm">{invoice.dueDate}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
                        {t('daysBadge', { days })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-sm">{invoice.lastContacted ?? t('neverContacted')}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void handleMarkContacted(invoice)}
                          disabled={contactingId === invoice.id}
                          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          <Phone size={11} />
                          {contactingId === invoice.id ? t('contacting') : t('contactButton')}
                        </button>
                        {invoice.vehiclePlate && (
                          <button
                            onClick={() => { setLockTarget(invoice); setPassword('') }}
                            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <Lock size={11} />
                            {t('lockButton')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Lock Vehicle Confirmation Modal */}
      <Modal
        isOpen={lockTarget !== null}
        onClose={() => { setLockTarget(null); setPassword('') }}
        title={t('lockModal.title')}
        footer={
          <>
            <button
              onClick={() => { setLockTarget(null); setPassword('') }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('lockModal.cancel')}
            </button>
            <button
              onClick={() => void handleLockVehicle()}
              disabled={!password.trim() || lockLoading}
              className={`flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors ${password.trim() && !lockLoading ? 'hover:bg-red-700' : 'opacity-50 cursor-not-allowed'}`}
            >
              {lockLoading ? t('lockModal.confirming') : `🔒 ${t('lockModal.confirm')}`}
            </button>
          </>
        }
      >
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🔒</div>
          <p className="text-slate-800 font-bold text-lg">{lockTarget?.vehiclePlate}</p>
          <p className="text-slate-500 text-sm mt-1">
            {t('lockModal.customerLabel')}: <span className="font-medium text-slate-700">{lockTarget?.customerName}</span>
          </p>
          <p className="text-slate-500 text-sm">
            {t('lockModal.outstandingLabel')}: <span className="text-red-500 font-semibold">฿{lockTarget?.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            {' '}(<span className="text-red-500">{t('lockModal.daysOverdue', { days: lockTarget?.daysOverdue ?? 0 })}</span>)
          </p>
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-left">
            <p className="text-amber-700 text-xs">⚠️ {t('lockModal.warningText')}</p>
          </div>
        </div>
        <label className="block text-slate-600 text-sm font-medium mb-1.5">{t('lockModal.passwordLabel')}</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && password.trim() && !lockLoading) void handleLockVehicle() }}
          placeholder={t('lockModal.passwordPlaceholder')}
          className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-red-400"
        />
      </Modal>
    </div>
  )
}
