'use client'

import { useState } from 'react'
import Link from 'next/link'
import { mockVehicles } from '@/lib/mock-data'
import Badge from '@/components/ui/badge'
import CircularProgress from '@/components/ui/circular-progress'

const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Available', value: 'available' },
  { label: 'Rented', value: 'rented' },
  { label: 'Charging', value: 'charging' },
  { label: 'Under Repair', value: 'under_repair' },
  { label: 'Offline', value: 'offline' },
]

export default function VehiclesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = mockVehicles.filter(v => {
    const matchSearch = v.plate.toLowerCase().includes(search.toLowerCase()) || v.model.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || v.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Fleet Vehicle List</h1>
        <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add New Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by plate or model..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Vehicle</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">License Plate</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Model</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Year</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Status</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Battery (SoC)</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Odometer</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(vehicle => (
              <tr key={vehicle.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="px-5 py-3">
                  <img src={vehicle.imageUrl} alt={vehicle.model} className="w-16 h-10 object-cover rounded-lg" />
                </td>
                <td className="px-5 py-3 text-slate-200 font-mono text-sm">{vehicle.plate}</td>
                <td className="px-5 py-3 text-slate-300 text-sm">{vehicle.make} {vehicle.model}</td>
                <td className="px-5 py-3 text-slate-400 text-sm">{vehicle.year}</td>
                <td className="px-5 py-3">
                  <Badge variant={vehicle.status} />
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <CircularProgress value={vehicle.socPercent} size={38} />
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-300 text-sm">{vehicle.odometer.toLocaleString()} km</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/fleet/vehicles/${vehicle.id}`} className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                      View Details
                    </Link>
                    <button className="text-slate-500 hover:text-slate-300 transition-colors text-lg">⋯</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">No vehicles found</div>
        )}
      </div>
    </div>
  )
}
