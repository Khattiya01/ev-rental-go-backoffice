'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Vehicle, Contract } from '@/lib/types'
import Badge from '@/components/ui/badge'
import Modal from '@/components/ui/modal'
import { FileText, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useCanWrite } from '@/lib/user-context'
import PageHeader from '@/components/ui/page-header'
import SectionCard from '@/components/ui/section-card'
import { useToast } from '@/components/ui/toast'
import PaginationFooter from '@/components/ui/pagination-footer'
import EmptyState from '@/components/ui/empty-state'

type Tab = 'general' | 'telematics' | 'history' | 'remote'

const HISTORY_PAGE_SIZE = 10

interface TelematicsData {
  vehicleId: string
  socPercent: number
  temperature: number | null
  chargeCycles: number | null
  deepDischargeCount: number | null
  recordedAt: string | null
}

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const t = useTranslations('vehicleDetail')
  const canWrite = useCanWrite('vehicles')
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [contracts, setContracts] = useState<Contract[]>([])
  const [contractsLoading, setContractsLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [telematics, setTelematics] = useState<TelematicsData | null>(null)
  const [telematicsLoading, setTelematicsLoading] = useState(false)
  const [cutoffModalOpen, setCutoffModalOpen] = useState(false)
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const toast = useToast()

  useEffect(() => {
    async function load() {
      const { id } = await params
      setLoading(true)
      setNotFound(false)
      try {
        const res = await fetch(`/api/vehicles/${id}`)
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (!res.ok) return
        const data = await res.json() as Vehicle
        setVehicle(data)
      } finally {
        setLoading(false)
      }
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  useEffect(() => {
    if (!vehicle?.id) return
    setContractsLoading(true)
    fetch(`/api/contracts?vehicleId=${vehicle.id}&limit=100`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then((json: { data: Contract[] }) => { setContracts(json.data ?? []); setHistoryPage(1) })
      .catch(() => setContracts([]))
      .finally(() => setContractsLoading(false))
  }, [vehicle?.id])

  useEffect(() => {
    if (!vehicle?.id || activeTab !== 'telematics') return
    setTelematicsLoading(true)
    fetch(`/api/vehicles/${vehicle.id}/telematics`)
      .then(r => r.ok ? r.json() : null)
      .then((json: TelematicsData | null) => setTelematics(json))
      .catch(() => setTelematics(null))
      .finally(() => setTelematicsLoading(false))
  }, [vehicle?.id, activeTab])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (notFound || !vehicle) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">{t('notFound')}</p>
        <button
          onClick={() => router.back()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {t('goBack')}
        </button>
      </div>
    )
  }

  const hasImage = Boolean(vehicle.imageUrl)
  const allImages = vehicle.images?.length ? vehicle.images : (vehicle.imageUrl ? [vehicle.imageUrl] : [])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: t('tabs.info') },
    { key: 'telematics', label: t('tabs.telematics') },
    { key: 'history', label: t('tabs.history') },
    ...(canWrite ? [{ key: 'remote' as Tab, label: t('tabs.remote') }] : []),
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        onBack={() => router.back()}
        title={<>{vehicle.make} {vehicle.model} <Badge variant={vehicle.status} /></>}
      >
        {canWrite && (
          <button
            onClick={() => router.push(`/fleet/vehicles/${vehicle.id}/edit`)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Pencil size={14} />
            {t('edit')}
          </button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.key
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: General Info */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-2 gap-5">
          {/* Photo Gallery */}
          <SectionCard title={t('info.photos')}>
            {allImages.length > 0 ? (
              <>
                <img
                  src={allImages[selectedImage] ?? '/images/placeholder.png'}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-52 object-cover rounded-xl mb-3"
                  onError={e => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }}
                />
                {allImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {allImages.map((img, i) => (
                      <button
                        key={img}
                        onClick={() => setSelectedImage(i)}
                        className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === i ? 'border-blue-500' : 'border-slate-200'
                          }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-52 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center">
                  <span className="text-2xl">🚗</span>
                </div>
                <p className="text-slate-400 text-sm">{t('info.noPhoto')}</p>
              </div>
            )}
          </SectionCard>

          {/* Registration Details */}
          <div className="space-y-4">
            <SectionCard title={t('info.registrationDetails')}>
              <dl className="space-y-2.5">
                {([
                  ['VIN', vehicle.vin ?? '-'],
                  [t('info.make') + ' / ' + t('info.model'), `${vehicle.make} ${vehicle.model}`],
                  [t('info.plateNumber'), vehicle.plate],
                  [t('info.year'), vehicle.year.toString()],
                  [t('info.color'), vehicle.color ?? '-'],
                ] as [string, string][]).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <dt className="text-slate-500 text-sm">{key}</dt>
                    <dd className="text-slate-700 text-sm font-medium">{val}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
            <SectionCard title={t('info.currentStatus')}>
              <dl className="space-y-2.5">
                {([
                  [t('info.odometer'), `${vehicle.odometer.toLocaleString()} km`],
                  [t('info.condition'), vehicle.condition ?? '-'],
                  [t('info.location'), vehicle.location ?? '-'],
                  [t('info.nextService'), vehicle.nextServiceDate ?? '-'],
                ] as [string, string][]).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <dt className="text-slate-500 text-sm">{key}</dt>
                    <dd className="text-slate-700 text-sm font-medium">{val}</dd>
                  </div>
                ))}
                <div className="flex justify-between">
                  <dt className="text-slate-400 text-sm">{t('info.status')}</dt>
                  <dd><Badge variant={vehicle.status} /></dd>
                </div>
              </dl>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Tab: Telematics & Battery */}
      {activeTab === 'telematics' && (
        telematicsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            <SectionCard title={t('telematics.socTitle')}>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-bold text-blue-500">{telematics?.socPercent ?? vehicle.socPercent}%</div>
                  <div className="text-slate-500 text-sm mt-2">{t('telematics.currentChargeLevel')}</div>
                  <div className="mt-4 w-full bg-slate-200 rounded-full h-3 max-w-xs">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all"
                      style={{ width: `${telematics?.socPercent ?? vehicle.socPercent}%` }}
                    />
                  </div>
                  {telematics?.recordedAt && (
                    <div className="text-slate-400 text-xs mt-3">
                      {t('telematics.lastUpdated')}: {new Date(telematics.recordedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
            <SectionCard title={t('telematics.sohTitle')}>
              <div className="space-y-4">
                {[
                  { label: t('telematics.temperature'), value: telematics?.temperature != null ? `${telematics.temperature}\u00b0C` : 'N/A' },
                  { label: t('telematics.chargeCycles'), value: telematics?.chargeCycles != null ? String(telematics.chargeCycles) : 'N/A' },
                  { label: t('telematics.deepDischarge'), value: telematics?.deepDischargeCount != null ? String(telematics.deepDischargeCount) : 'N/A' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">{item.label}</span>
                      <span className={`font-medium ${item.value === 'N/A' ? 'text-slate-400' : 'text-slate-700'}`}>{item.value}</span>
                    </div>
                  </div>
                ))}
                {!telematics?.recordedAt && (
                  <p className="text-slate-400 text-xs mt-2">{t('telematics.noData')}</p>
                )}
              </div>
            </SectionCard>
          </div>
        )
      )}

      {/* Tab: Rental History */}
      {activeTab === 'history' && (() => {
        const historyTotalPages = Math.max(1, Math.ceil(contracts.length / HISTORY_PAGE_SIZE))
        const pagedContracts = contracts.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE)
        return (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200">
                  <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('history.contractNo')}</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('history.customer')}</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('history.startDate')}</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('history.dueDate')}</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('history.dailyRate')}</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('history.monthlyRate')}</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('history.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-28" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-32" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                      <td className="px-5 py-4"><div className="h-5 bg-slate-100 rounded-full animate-pulse w-16" /></td>
                    </tr>
                  ))
                ) : contracts.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState icon={FileText} title={t('history.noHistory')} />
                    </td>
                  </tr>
                ) : (
                  pagedContracts.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/contracts/${c.id}`}
                          className="flex items-center gap-1.5 text-blue-500 text-sm font-medium hover:underline"
                        >
                          <FileText size={13} />
                          {c.contractNo}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 text-sm">{c.customerName}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-sm">{c.startDate}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-sm">{c.dueDate}</td>
                      <td className="px-5 py-3.5 text-slate-700 text-sm">฿{c.dailyRate.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-slate-700 text-sm">฿{c.monthlyRate.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={c.status === 'active' ? 'active' : c.status === 'overdue' ? 'overdue' : 'completed'}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!contractsLoading && contracts.length > 0 && (
              <PaginationFooter
                page={historyPage}
                totalPages={historyTotalPages}
                label={t('history.showing', { count: pagedContracts.length, total: contracts.length })}
                onPageChange={setHistoryPage}
              />
            )}
          </div>
        )
      })()}

      {/* Tab: Remote Control */}
      {activeTab === 'remote' && (
        <div className="max-w-2xl space-y-4">
          {/* Context bar: current vehicle status */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-5 py-3.5">
            <span className="text-slate-500 text-sm">{t('remote.currentStatus')}</span>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm">SoC: <span className="font-semibold text-slate-700">{vehicle.socPercent}%</span></span>
              <Badge variant={vehicle.status} />
            </div>
          </div>

          {/* Motor cutoff active warning banner */}
          {vehicle.motorCutoffActive && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-red-700 font-semibold text-sm">{t('remote.cutoffActiveBanner')}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            {/* Motor Cutoff / Restore card — toggles based on state */}
            {vehicle.motorCutoffActive ? (
              <div className="bg-white rounded-xl border border-green-500/30 p-6 text-center">
                <div className="text-5xl mb-4">🟢</div>
                <h3 className="text-slate-800 font-bold text-lg mb-2">{t('remote.motorRestore')}</h3>
                <p className="text-slate-500 text-sm mb-5">{t('remote.motorRestoreDesc')}</p>
                <button
                  onClick={() => setRestoreModalOpen(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  🔓 {t('remote.restoreButton')}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-red-500/30 p-6 text-center">
                <div className="text-5xl mb-4">🔴</div>
                <h3 className="text-slate-800 font-bold text-lg mb-2">{t('remote.motorCutoff')}</h3>
                <p className="text-slate-400 text-sm mb-5">{t('remote.motorCutoffDesc')}</p>
                <button
                  onClick={() => setCutoffModalOpen(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  🔒 {t('remote.cutoffButton')}
                </button>
              </div>
            )}

            {/* IoT Reset card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <div className="text-5xl mb-4">🔄</div>
              <h3 className="text-slate-800 font-bold text-lg mb-2">{t('remote.iotReset')}</h3>
              <p className="text-slate-500 text-sm mb-5">{t('remote.iotResetDesc')}</p>
              <button
                onClick={() => setResetModalOpen(true)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
              >
                🔁 {t('remote.resetButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Motor Cutoff Modal */}
      <Modal
        isOpen={cutoffModalOpen}
        onClose={() => { setCutoffModalOpen(false); setPassword('') }}
        title={t('remote.cutoffModal.title')}
        footer={
          <>
            <button onClick={() => { setCutoffModalOpen(false); setPassword('') }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors">{t('remote.cutoffModal.cancel')}</button>
            <button
              onClick={async () => {
                if (!vehicle) return
                setRemoteLoading(true)
                try {
                  const res = await fetch(`/api/vehicles/${vehicle.id}/remote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'cutoff', password }),
                  })
                  if (res.status === 401) {
                    const data = await res.json() as { error: string }
                    toast.error(data.error === 'Incorrect password' ? t('remote.toast.wrongPassword') : t('remote.toast.cutoffError'))
                    return
                  }
                  if (!res.ok) {
                    toast.error(t('remote.toast.cutoffError'))
                    return
                  }
                  setCutoffModalOpen(false)
                  setPassword('')
                  setVehicle(prev => prev ? { ...prev, motorCutoffActive: true } : prev)
                  toast.success(t('remote.toast.cutoffSuccess'))
                } catch {
                  toast.error(t('remote.toast.cutoffError'))
                } finally {
                  setRemoteLoading(false)
                }
              }}
              disabled={!password.trim() || remoteLoading}
              className={`flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors ${password.trim() && !remoteLoading ? 'hover:bg-red-700' : 'opacity-50 cursor-not-allowed'}`}
            >
              {remoteLoading ? t('remote.toast.loading') : t('remote.cutoffModal.confirm')}
            </button>
          </>
        }
      >
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🔒</div>
          <p className="text-slate-500 text-sm">{t('remote.cutoffModal.warning')}</p>
        </div>
        <label className="block text-slate-500 text-sm mb-2">{t('remote.passwordLabel')}</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={t('remote.passwordPlaceholder')}
          className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-red-500"
        />
      </Modal>

      {/* Restore Motor Modal */}
      <Modal
        isOpen={restoreModalOpen}
        onClose={() => { setRestoreModalOpen(false); setPassword('') }}
        title={t('remote.restoreModal.title')}
        footer={
          <>
            <button onClick={() => { setRestoreModalOpen(false); setPassword('') }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors">{t('remote.restoreModal.cancel')}</button>
            <button
              onClick={async () => {
                if (!vehicle) return
                setRemoteLoading(true)
                try {
                  const res = await fetch(`/api/vehicles/${vehicle.id}/remote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'restore', password }),
                  })
                  if (res.status === 401) {
                    const data = await res.json() as { error: string }
                    toast.error(data.error === 'Incorrect password' ? t('remote.toast.wrongPassword') : t('remote.toast.restoreError'))
                    return
                  }
                  if (!res.ok) {
                    toast.error(t('remote.toast.restoreError'))
                    return
                  }
                  setRestoreModalOpen(false)
                  setPassword('')
                  setVehicle(prev => prev ? { ...prev, motorCutoffActive: false } : prev)
                  toast.success(t('remote.toast.restoreSuccess'))
                } catch {
                  toast.error(t('remote.toast.restoreError'))
                } finally {
                  setRemoteLoading(false)
                }
              }}
              disabled={!password.trim() || remoteLoading}
              className={`flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors ${password.trim() && !remoteLoading ? 'hover:bg-green-700' : 'opacity-50 cursor-not-allowed'}`}
            >
              {remoteLoading ? t('remote.toast.loading') : t('remote.restoreModal.confirm')}
            </button>
          </>
        }
      >
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🔓</div>
          <p className="text-slate-500 text-sm">{t('remote.restoreModal.warning')}</p>
        </div>
        <label className="block text-slate-500 text-sm mb-2">{t('remote.passwordLabel')}</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={t('remote.passwordPlaceholder')}
          className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-green-500"
        />
      </Modal>

      {/* IoT Reset Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={t('remote.resetModal.title')}
        footer={
          <>
            <button onClick={() => setResetModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors">{t('remote.resetModal.cancel')}</button>
            <button
              onClick={async () => {
                if (!vehicle) return
                setRemoteLoading(true)
                try {
                  const res = await fetch(`/api/vehicles/${vehicle.id}/remote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'reset' }),
                  })
                  if (!res.ok) {
                    toast.error(t('remote.toast.resetError'))
                    return
                  }
                  setResetModalOpen(false)
                  toast.success(t('remote.toast.resetSuccess'))
                } catch {
                  toast.error(t('remote.toast.resetError'))
                } finally {
                  setRemoteLoading(false)
                }
              }}
              disabled={remoteLoading}
              className={`flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors ${!remoteLoading ? 'hover:bg-blue-700' : 'opacity-50 cursor-not-allowed'}`}
            >
              {remoteLoading ? t('remote.toast.loading') : t('remote.resetModal.confirm')}
            </button>
          </>
        }
      >
        <p className="text-slate-500 text-sm">{t('remote.resetModal.message', { plate: vehicle.plate })}</p>
      </Modal>
    </div>
  )
}