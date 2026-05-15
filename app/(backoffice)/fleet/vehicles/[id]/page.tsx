'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Vehicle } from '@/lib/types'
import Badge from '@/components/ui/badge'
import Modal from '@/components/ui/modal'
import { ArrowLeft, Pencil } from 'lucide-react'
import Link from 'next/link'

type Tab = 'general' | 'telematics' | 'history' | 'remote'

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const t = useTranslations('vehicleDetail')
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [cutoffModalOpen, setCutoffModalOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
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
    { key: 'remote', label: t('tabs.remote') },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">

        <div className="flex items-center gap-4">

          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-3">
            <h1 className="text-slate-800 text-xl font-bold">{vehicle.make} {vehicle.model}</h1>
            <Badge variant={vehicle.status} />
          </div>

        </div>

        <button
          onClick={() => router.push(`/fleet/vehicles/${vehicle.id}/edit`)}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Pencil size={14} />
          {t('edit')}
        </button>
      </div>

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
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-slate-800 font-semibold mb-4">{t('info.photos')}</h2>
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
          </div>

          {/* Registration Details */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-slate-800 font-semibold mb-4">{t('info.registrationDetails')}</h2>
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
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-slate-800 font-semibold mb-4">{t('info.currentStatus')}</h2>
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
            </div>
          </div>
        </div>
      )}

      {/* Tab: Telematics & Battery */}
      {activeTab === 'telematics' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-slate-800 font-semibold mb-4">{t('telematics.socTitle')}</h2>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-blue-500">{vehicle.socPercent}%</div>
                <div className="text-slate-500 text-sm mt-2">{t('telematics.currentChargeLevel')}</div>
                <div className="mt-4 w-full bg-slate-200 rounded-full h-3 max-w-xs">
                  <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${vehicle.socPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-slate-800 font-semibold mb-4">{t('telematics.sohTitle')}</h2>
            <div className="space-y-4">
              {[
                { label: t('telematics.stateOfHealth'), value: '94%' },
                { label: t('telematics.temperature'), value: '28\u00b0C' },
                { label: t('telematics.chargeCycles'), value: '142' },
                { label: t('telematics.deepDischarge'), value: '3' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="text-slate-700 font-medium">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Rental History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="text-center py-12 text-slate-400">{t('history.noHistory')}</div>
        </div>
      )}

      {/* Tab: Remote Control */}
      {activeTab === 'remote' && (
        <div className="grid grid-cols-2 gap-5 max-w-2xl">
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
      )}

      {/* Motor Cutoff Modal */}
      <Modal
        isOpen={cutoffModalOpen}
        onClose={() => { setCutoffModalOpen(false); setPassword('') }}
        title={t('remote.cutoffModal.title')}
        footer={
          <>
            <button onClick={() => { setCutoffModalOpen(false); setPassword('') }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors">{t('remote.cutoffModal.cancel')}</button>
            <button onClick={() => { console.log('Motor cutoff executed'); setCutoffModalOpen(false); setPassword('') }} disabled={!password.trim()} className={`flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors ${password.trim() ? 'hover:bg-red-700' : 'opacity-50 cursor-not-allowed'}`}>{t('remote.cutoffModal.confirm')}</button>
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

      {/* IoT Reset Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={t('remote.resetModal.title')}
        footer={
          <>
            <button onClick={() => setResetModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors">{t('remote.resetModal.cancel')}</button>
            <button onClick={() => { console.log('IoT reset executed'); setResetModalOpen(false) }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">{t('remote.resetModal.confirm')}</button>
          </>
        }
      >
        <p className="text-slate-500 text-sm">{t('remote.resetModal.message', { plate: vehicle.plate })}</p>
      </Modal>
    </div>
  )
}