'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { mockVehicles, mockContracts } from '@/lib/mock-data'
import type { ContractStatus } from '@/lib/types'
import Badge from '@/components/ui/badge'
import Modal from '@/components/ui/modal'

type Tab = 'general' | 'telematics' | 'history' | 'remote'

function contractStatusToVariant(status: ContractStatus): 'active' | 'overdue' | 'paid' {
  if (status === 'active') return 'active'
  if (status === 'overdue') return 'overdue'
  return 'paid'
}

export default function VehicleDetailPage() {
  const params = useParams()
  const vehicle = mockVehicles.find(v => v.id === params.id) ?? mockVehicles[0]
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [cutoffModalOpen, setCutoffModalOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)

  const vehicleContracts = mockContracts.filter(c => c.vehicleId === vehicle.id)
  const allImages = [vehicle.imageUrl, vehicle.imageUrl, vehicle.imageUrl, vehicle.imageUrl]

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: 'General Info' },
    { key: 'telematics', label: 'Telematics & Battery' },
    { key: 'history', label: 'Rental History' },
    { key: 'remote', label: 'Remote Control' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-white text-xl font-bold">{vehicle.make} {vehicle.model}</h1>
          <Badge variant={vehicle.status} />
        </div>
        <div className="text-slate-400 text-sm">
          Dashboard / <span className="text-slate-300">Vehicles</span> / <span className="text-slate-200">{vehicle.plate}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
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
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-white font-semibold mb-4">Gallery</h2>
            <img src={allImages[selectedImage]} alt="Vehicle" className="w-full h-52 object-cover rounded-xl mb-3" />
            <div className="flex gap-2">
              {allImages.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)} className={`flex-1 h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === i ? 'border-teal-500' : 'border-slate-700'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Registration Details */}
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h2 className="text-white font-semibold mb-4">Registration Details</h2>
              <dl className="space-y-2.5">
                {([
                  ['VIN', vehicle.vin],
                  ['Make / Model', `${vehicle.make} ${vehicle.model}`],
                  ['License Plate', vehicle.plate],
                  ['Year', vehicle.year.toString()],
                  ['Color', vehicle.color],
                ] as [string, string][]).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <dt className="text-slate-400 text-sm">{key}</dt>
                    <dd className="text-slate-200 text-sm font-medium">{val}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h2 className="text-white font-semibold mb-4">Current Status</h2>
              <dl className="space-y-2.5">
                {([
                  ['Mileage', `${vehicle.mileage.toLocaleString()} mi`],
                  ['Condition', vehicle.condition],
                  ['Location', vehicle.location],
                  ['Next Service', vehicle.nextServiceDate],
                ] as [string, string][]).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <dt className="text-slate-400 text-sm">{key}</dt>
                    <dd className="text-slate-200 text-sm font-medium">{val}</dd>
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
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-white font-semibold mb-4">Battery State of Charge (SoC)</h2>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-teal-400">{vehicle.socPercent}%</div>
                <div className="text-slate-400 text-sm mt-2">Current Charge Level</div>
                <div className="mt-4 w-full bg-slate-700 rounded-full h-3 max-w-xs">
                  <div className="bg-teal-500 h-3 rounded-full transition-all" style={{ width: `${vehicle.socPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-white font-semibold mb-4">Battery Health (SoH)</h2>
            <div className="space-y-4">
              {[
                { label: 'State of Health', value: '94%' },
                { label: 'Temperature', value: '28°C' },
                { label: 'Charge Cycles (Full)', value: '142' },
                { label: 'Deep Discharge Count', value: '3' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="text-slate-200 font-medium">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Rental History */}
      {activeTab === 'history' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase">Contract</th>
                <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase">Customer</th>
                <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase">Period</th>
                <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicleContracts.length > 0 ? vehicleContracts.map(c => (
                <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="px-5 py-3 text-teal-400 text-sm font-mono">{c.contractNo}</td>
                  <td className="px-5 py-3 text-slate-300 text-sm">{c.customerName}</td>
                  <td className="px-5 py-3 text-slate-400 text-sm">{c.startDate} → {c.dueDate}</td>
                  <td className="px-5 py-3">
                    <Badge variant={contractStatusToVariant(c.status)} label={c.status} />
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500">No rental history for this vehicle</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Remote Control */}
      {activeTab === 'remote' && (
        <div className="grid grid-cols-2 gap-5 max-w-2xl">
          <div className="bg-slate-800 rounded-xl border border-red-500/30 p-6 text-center">
            <div className="text-5xl mb-4">🔴</div>
            <h3 className="text-white font-bold text-lg mb-2">Emergency Motor Cut-off</h3>
            <p className="text-slate-400 text-sm mb-5">This action will immediately disable the vehicle motor. Only use in emergencies.</p>
            <button
              onClick={() => setCutoffModalOpen(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              🔒 Cut Motor Power
            </button>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
            <div className="text-5xl mb-4">🔄</div>
            <h3 className="text-white font-bold text-lg mb-2">IoT Device Reset</h3>
            <p className="text-slate-400 text-sm mb-5">Restart the vehicle&apos;s IoT device to re-establish connectivity.</p>
            <button
              onClick={() => setResetModalOpen(true)}
              className="w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              🔁 Reset IoT Device
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
            <button onClick={() => { setCutoffModalOpen(false); setPassword('') }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl text-sm font-medium transition-colors">Cancel</button>
            <button onClick={() => { console.log('Motor cutoff executed'); setCutoffModalOpen(false); setPassword('') }} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Confirm &amp; Cut Power</button>
          </>
        }
      >
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🔒</div>
          <p className="text-slate-400 text-sm">This action will immediately disable the vehicle motor. Only use in emergencies.</p>
        </div>
        <label className="block text-slate-400 text-sm mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter Admin Password"
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-red-500"
        />
      </Modal>

      {/* IoT Reset Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset IoT Device"
        footer={
          <>
            <button onClick={() => setResetModalOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl text-sm font-medium transition-colors">Cancel</button>
            <button onClick={() => { console.log('IoT reset executed'); setResetModalOpen(false) }} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Confirm Reset</button>
          </>
        }
      >
        <p className="text-slate-400 text-sm">Are you sure you want to reset the IoT device for vehicle <strong className="text-slate-200">{vehicle.plate}</strong>? The device will be offline for 1-2 minutes during restart.</p>
      </Modal>
    </div>
  )
}
