'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import type { Vehicle, VehicleStatus, GeofenceZone } from '@/lib/types'
import { pointInPolygon } from '@/lib/geofence-checker'
import { useFleetSocket, type FleetSocketMessage } from '@/lib/use-fleet-socket'

const FleetMap = dynamic(() => import('@/components/maps/FleetMap'), { ssr: false })

interface WsPosition {
  vehicleId: string
  lat: number
  lng: number
  soc: number
  speed: number | null
  status: string
  updatedAt: string | null
}

const statusDotColor: Record<string, string> = {
  available:    'bg-green-500',
  rented:       'bg-blue-500',
  charging:     'bg-cyan-500',
  under_repair: 'bg-amber-500',
  offline:      'bg-slate-500',
}

export default function FleetMapPage() {
  const t = useTranslations('fleetMap')
  const tStatus = useTranslations('vehicles.status')

  const [vehicles,     setVehicles]     = useState<Vehicle[]>([])
  const [zones,        setZones]        = useState<GeofenceZone[]>([])
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [batteryFilter,setBatteryFilter]= useState('')

  // Load the full fleet (map shows every vehicle, not a paginated slice)
  useEffect(() => {
    fetch('/api/vehicles?all=1')
      .then(r => r.json())
      .then(({ data }: { data: Vehicle[] }) => setVehicles(data ?? []))
      .catch(console.error)
  }, [])

  // Load active geofence zones (for client-side breach computation)
  useEffect(() => {
    fetch('/api/geofences?limit=200')
      .then(r => r.json())
      .then(({ data }: { data: GeofenceZone[] }) => setZones((data ?? []).filter(z => z.active)))
      .catch(console.error)
  }, [])

  // WebSocket — real-time position updates (auto-reconnects on drop)
  const handleMessage = useCallback((msg: FleetSocketMessage) => {
    if (msg.type === 'positions') {
      const positions = msg.data as WsPosition[]
      setVehicles(prev => {
        const updates = new Map(positions.map(p => [p.vehicleId, p]))
        return prev.map(v => {
          const pos = updates.get(v.id)
          if (!pos) return v
          return { ...v, lat: pos.lat, lng: pos.lng, socPercent: pos.soc, status: pos.status as VehicleStatus }
        })
      })
    }
  }, [])

  const { connected: wsConnected } = useFleetSocket(handleMessage)

  // Compute which vehicles are outside their assigned zone
  const breachSet = useMemo<Set<string>>(() => {
    if (zones.length === 0) return new Set()
    const zoneMap = new Map(zones.map(z => [z.id, z]))
    const breached = new Set<string>()
    for (const v of vehicles) {
      if (!v.geofenceZoneId) continue
      const zone = zoneMap.get(v.geofenceZoneId)
      if (!zone) continue
      if (!pointInPolygon(v.lat, v.lng, zone.coordinates)) {
        breached.add(v.id)
      }
    }
    return breached
  }, [vehicles, zones])

  const filtered = vehicles.filter(v => {
    const matchSearch =
      !search ||
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || v.status === statusFilter
    const matchBattery =
      !batteryFilter ||
      (batteryFilter === 'low'    && v.socPercent < 20) ||
      (batteryFilter === 'medium' && v.socPercent >= 20 && v.socPercent < 60) ||
      (batteryFilter === 'high'   && v.socPercent >= 60)
    return matchSearch && matchStatus && matchBattery
  })

  const breachCount = vehicles.filter(v => breachSet.has(v.id)).length

  return (
    <div className="flex gap-0 h-[calc(100vh-8rem)] -m-6">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-800 font-semibold text-sm">{t('liveFleet')}</h2>
            <div className="flex items-center gap-2">
              {breachCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse">
                  ⚠ {breachCount}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-xs text-slate-500">{wsConnected ? t('live') : t('offlineConnection')}</span>
              </div>
            </div>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 mb-2"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none mb-2"
          >
            <option value="">{t('statusFilterAll')}</option>
            <option value="available">{tStatus('available')}</option>
            <option value="rented">{tStatus('rented')}</option>
            <option value="charging">{tStatus('charging')}</option>
            <option value="under_repair">{tStatus('under_repair')}</option>
            <option value="offline">{tStatus('offline')}</option>
          </select>
          <select
            value={batteryFilter}
            onChange={e => setBatteryFilter(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none"
          >
            <option value="">{t('batteryFilterAll')}</option>
            <option value="low">{t('batteryLow')}</option>
            <option value="medium">{t('batteryMedium')}</option>
            <option value="high">{t('batteryHigh')}</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {vehicles.length === 0 ? (
            <p className="text-xs text-slate-400 text-center mt-6">{t('loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-slate-400 text-center mt-6">{t('empty')}</p>
          ) : (
            filtered.map(vehicle => {
              const isBreached = breachSet.has(vehicle.id)
              return (
                <div
                  key={vehicle.id}
                  className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${isBreached ? 'bg-red-50 border border-red-100' : ''}`}
                >
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusDotColor[vehicle.status] ?? 'bg-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 text-sm font-medium truncate">
                      {vehicle.make} {vehicle.model} ({vehicle.plate})
                    </p>
                    <p className="text-slate-400 text-xs">
                      {t('socLabel')}: {vehicle.socPercent}%
                      {isBreached && (
                        <span className="ml-2 text-red-500 font-semibold">⚠ {t('outsideZone')}</span>
                      )}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="p-3 border-t border-slate-200">
          <p className="text-xs text-slate-400 text-center">
            {t('footerCount', { filtered: filtered.length, total: vehicles.length })}
            {breachCount > 0 && (
              <span className="ml-2 text-red-500 font-medium">· {t('footerBreach', { count: breachCount })}</span>
            )}
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <FleetMap vehicles={filtered} breachSet={breachSet} />
      </div>
    </div>
  )
}
