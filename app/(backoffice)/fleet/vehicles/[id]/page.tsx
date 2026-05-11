'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Vehicle } from '@/lib/types'
import Badge from '@/components/ui/badge'
import Modal from '@/components/ui/modal'

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

  const allImages = [vehicle.imageUrl, vehicle.imageUrl, vehicle.imageUrl, vehicle.imageUrl]

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
        <div className="flex items-center gap-3">
          <h1 className="text-slate-800 text-xl font-bold">{vehicle.make} {vehicle.model}</h1>
          <Badge variant={vehicle.status} />
        </div>
        <div className="text-slate-500 text-sm">
          Dashboard / <span className="text-slate-600">Vehicles</span> / <span className="text-slate-700">{vehicle.plate}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
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
          {/* Gallery */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-slate-800 font-semibold mb-4">Gallery</h2>
            <img src={allImages[selectedImage] ?? '/images/placeholder.png'} alt="Vehicle" className="w-full h-52 object-cover rounded-xl mb-3" />
            <div className="flex gap-2">
              {allImages.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)} className={`flex-1 h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === i ? 'border-blue-500' : 'border-slate-200'}`}>
                  <img src={img ?? '/images/placeholder.png'} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Registration Details */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-slate-800 font-semibold mb-4">Registration Details</h2>
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
              <h2 className="text-slate-800 font-semibold mb-4">Current Status</h2>
              <dl className="space-y-2.5">
                {([
                  [t('info.odometer'), `${vehicle.mileage.toLocaleString()} mi`],
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
                  <dt className="text-slate-400 text-sm">Status</dt>
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
                <div className="text-slate-500 text-sm mt-2">Current Charge Level</div>
                <div className="mt-4 w-full bg-slate-200 rounded-full h-3 max-w-xs">
                  <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${vehicle.socPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-slate-800 font-semibold mb-4">Battery Health (SoH)</h2>
            <div className="space-y-4">
              {[
                { label: 'State of Health', value: '94%' },
                { label: 'Temperature', value: '28°C' },
                { label: 'Charge Cycles (Full)', value: '142' },
                { label: 'Deep Discharge Count', value: '3' },
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
        title="Confirm Motor Power Cut-off"
        footer={
          <>
            <button onClick={() => { setCutoffModalOpen(false); setPassword('') }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors">Cancel</button>
            <button onClick={() => { console.log('Motor cutoff executed'); setCutoffModalOpen(false); setPassword('') }} disabled={!password.trim()} className={`flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors ${password.trim() ? 'hover:bg-red-700' : 'opacity-50 cursor-not-allowed'}`}>Confirm &amp; Cut Power</button>
          </>
        }
      >
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🔒</div>
          <p className="text-slate-500 text-sm">This action will immediately disable the vehicle motor. Only use in emergencies.</p>
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
        title="Reset IoT Device"
        footer={
          <>
            <button onClick={() => setResetModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors">Cancel</button>
            <button onClick={() => { console.log('IoT reset executed'); setResetModalOpen(false) }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Confirm Reset</button>
          </>
        }
      >
        <p className="text-slate-500 text-sm">Are you sure you want to reset the IoT device for vehicle <strong className="text-slate-700">{vehicle.plate}</strong>? The device will be offline for 1-2 minutes during restart.</p>
      </Modal>
    </div>
  )
}