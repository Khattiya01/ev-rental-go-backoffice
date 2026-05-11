'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { mockVehicles } from '@/lib/mock-data'

const FleetMap = dynamic(() => import('@/components/maps/FleetMap'), { ssr: false })

const statusDotColor: Record<string, string> = {
  available: 'bg-green-500',
  rented: 'bg-blue-500',
  charging: 'bg-cyan-500',
  under_repair: 'bg-amber-500',
  offline: 'bg-slate-500',
}

export default function FleetMapPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [batteryFilter, setBatteryFilter] = useState('')

  const filtered = mockVehicles.filter(v => {
    const matchSearch = !search || v.plate.toLowerCase().includes(search.toLowerCase()) || v.model.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || v.status === statusFilter
    const matchBattery = !batteryFilter ||
      (batteryFilter === 'low' && v.socPercent < 20) ||
      (batteryFilter === 'medium' && v.socPercent >= 20 && v.socPercent < 60) ||
      (batteryFilter === 'high' && v.socPercent >= 60)
    return matchSearch && matchStatus && matchBattery
  })

  return (
    <div className="flex gap-0 h-[calc(100vh-8rem)] -m-6">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-800 font-semibold text-sm">Live Fleet Filter &amp; List</h2>
            <button className="text-slate-500 hover:text-slate-700 text-lg">▲</button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 mb-2"
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none mb-2">
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="rented">Rented</option>
            <option value="charging">Charging</option>
            <option value="under_repair">Under Repair</option>
            <option value="offline">Offline</option>
          </select>
          <select value={batteryFilter} onChange={e => setBatteryFilter(e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none">
            <option value="">All Battery Level</option>
            <option value="low">Low (&lt;20%)</option>
            <option value="medium">Medium (20-60%)</option>
            <option value="high">High (&gt;60%)</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map(vehicle => (
            <div key={vehicle.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusDotColor[vehicle.status]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-slate-700 text-sm font-medium truncate">{vehicle.make} {vehicle.model} ({vehicle.plate})</p>
                <p className="text-slate-400 text-xs">SoC: {vehicle.socPercent}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div className="absolute top-4 right-4 z-10">
          <input placeholder="Search..." className="bg-white/90 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none w-48 backdrop-blur-sm" />
        </div>
        <FleetMap vehicles={filtered} />
      </div>
    </div>
  )
}
