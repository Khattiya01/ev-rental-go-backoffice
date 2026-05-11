'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { mockGeofences } from '@/lib/mock-data'

const GeofenceMap = dynamic(() => import('@/components/maps/GeofenceMap'), { ssr: false })

export default function GeofencingPage() {
  const [zones, setZones] = useState(mockGeofences)
  const [activeTool, setActiveTool] = useState<string>('polygon')

  const toggleZone = (id: string) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, active: !z.active } : z))
  }

  return (
    <div className="space-y-4">
      <h1 className="text-slate-800 text-xl font-bold">Fleet Geofencing Setup</h1>
      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 relative">
          <div className="absolute top-3 left-3 z-10 bg-white/90 border border-slate-200 rounded-lg px-3 py-2 backdrop-blur-sm">
            <p className="text-slate-800 font-semibold text-sm">Geofenced Zones</p>
          </div>
          <GeofenceMap zones={zones.filter(z => z.active)} />
        </div>

        {/* Right panel */}
        <div className="w-80 flex flex-col gap-4">
          {/* Drawing Tools */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-slate-800 font-semibold text-sm mb-3">Drawing Tools</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'polygon', icon: '⬡', label: 'Polygon' },
                { key: 'circle', icon: '○', label: 'Circle' },
                { key: 'rectangle', icon: '▭', label: 'Rectangle' },
              ].map(tool => (
                <button
                  key={tool.key}
                  onClick={() => setActiveTool(tool.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm transition-colors ${
                    activeTool === tool.key
                      ? 'bg-blue-500/10 border-blue-500/50 text-blue-500'
                      : 'bg-slate-100 border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl">{tool.icon}</span>
                  <span className="text-xs">{tool.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Zone Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-slate-800 font-semibold text-sm mb-3">Zone Details</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-slate-500 text-xs mb-1">Zone Name</label>
                <input placeholder="Zone Name" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-slate-500 text-xs mb-1">Notification Recipients on Exit</label>
                <select className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400">
                  <option>e.g., Admin, Fleet Manager, Driver</option>
                  <option>Admin only</option>
                  <option>Admin + Fleet Manager</option>
                  <option>All</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Geofences */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1">
            <h2 className="text-slate-800 font-semibold text-sm mb-3">Active Geofences</h2>
            <div className="space-y-2">
              {zones.map(zone => (
                <div key={zone.id} className="flex items-center justify-between">
                  <span className="text-slate-600 text-sm">{zone.name}</span>
                  <button
                    onClick={() => toggleZone(zone.id)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${zone.active ? 'bg-blue-500' : 'bg-slate-200'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${zone.active ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
