'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useMemo, useCallback } from 'react'
import AlertFeed from '@/components/dashboard/alert-feed'
import { useTranslations } from 'next-intl'
import type { Vehicle, VehicleStatus, Alert, GeofenceZone } from '@/lib/types'
import { pointInPolygon } from '@/lib/geofence-checker'
import { useFleetSocket, type FleetSocketMessage } from '@/lib/use-fleet-socket'

const DashboardMap = dynamic(() => import('@/components/maps/DashboardMap'), { ssr: false })

interface WsPosition {
  vehicleId: string
  lat: number
  lng: number
  soc: number
  speed: number | null
  status: string
  updatedAt: string | null
}

interface DashboardMapClientProps {
  initialVehicles: Vehicle[]
  staticAlerts: Alert[]
}

export default function DashboardMapClient({ initialVehicles, staticAlerts }: DashboardMapClientProps) {
  const t = useTranslations('dashboard')
  const [vehicles,    setVehicles]    = useState<Vehicle[]>(initialVehicles)
  const [zones,       setZones]       = useState<GeofenceZone[]>([])
  const [wsAlerts,    setWsAlerts]    = useState<Alert[]>([])
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())

  // Load active geofence zones for client-side breach computation
  useEffect(() => {
    fetch('/api/geofences?limit=200')
      .then(r => r.json())
      .then(({ data }: { data: GeofenceZone[] }) => setZones((data ?? []).filter(z => z.active)))
      .catch(() => {/* non-critical */})
  }, [])

  // WebSocket — real-time position + alert updates (auto-reconnects on drop)
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

    if (msg.type === 'alert') {
      const d = msg.data as { id: string; type: string; severity: string; message: string; createdAt: string; href?: string }
      const incoming: Alert = {
        id: d.id,
        type: d.type as Alert['type'],
        severity: d.severity as Alert['severity'],
        message: d.message,
        createdAt: new Date(d.createdAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        href: d.href,
      }
      setWsAlerts(prev => {
        // Deduplicate by id — alert may already be in staticAlerts if loaded on page refresh
        if (prev.some(a => a.id === incoming.id)) return prev
        return [incoming, ...prev].slice(0, 20)
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

  // Battery alerts come from the alerts table (written by the IoT Gateway with
  // proper warning/critical tiers + debounce) — same source as geofence/payment alerts below.
  const allAlerts: Alert[] = useMemo(() => {
    const SEV = { critical: 0, warning: 1, info: 2 } as const
    // wsAlerts deduplicated against staticAlerts by id
    const staticIds = new Set(staticAlerts.map(a => a.id))
    const freshWsAlerts = wsAlerts.filter(a => !staticIds.has(a.id))
    return [...freshWsAlerts, ...staticAlerts]
      .filter(a => !resolvedIds.has(a.id))
      .sort((a, b) => SEV[a.severity] - SEV[b.severity])
  }, [staticAlerts, wsAlerts, resolvedIds])

  const handleResolve = useCallback((id: string) => {
    setResolvedIds(prev => new Set(prev).add(id))
  }, [])

  const criticalCount = allAlerts.filter(a => a.severity === 'critical').length
  const warningCount  = allAlerts.filter(a => a.severity === 'warning').length

  // Live fleet counts derived from WS positions
  const liveRented    = vehicles.filter(v => v.status === 'rented').length
  const liveAvailable = vehicles.filter(v => v.status === 'available').length
  const liveCharging  = vehicles.filter(v => v.status === 'charging').length

  return (
    <div className="grid grid-cols-5 gap-4">
      {/* Map */}
      <div className="col-span-3 bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-slate-700 font-semibold text-sm shrink-0">{t('liveLocations')}</h2>
            {/* Live fleet mini-stats — updates from WS */}
            <div className="flex items-center gap-2 text-xs font-medium overflow-hidden">
              <span className="text-blue-600 whitespace-nowrap">Rented: {liveRented}</span>
              <span className="text-slate-300">·</span>
              <span className="text-green-600 whitespace-nowrap">Available: {liveAvailable}</span>
              {liveCharging > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-cyan-600 whitespace-nowrap">Charging: {liveCharging}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-xs text-slate-400">{wsConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
        <div className="h-80 rounded-xl overflow-hidden">
          <DashboardMap vehicles={vehicles} breachSet={breachSet} />
        </div>
      </div>

      {/* Alert Feed */}
      <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="text-slate-700 font-semibold text-sm">{t('alertsFeed')}</h2>
          {allAlerts.length > 0 && (
            <div className="flex items-center gap-1.5">
              {criticalCount > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                  {t('criticalBadge', { count: criticalCount })}
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">
                  {t('warningBadge', { count: warningCount })}
                </span>
              )}
            </div>
          )}
        </div>
        {allAlerts.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">{t('noAlerts')}</p>
        ) : (
          <AlertFeed alerts={allAlerts} onResolve={handleResolve} />
        )}
      </div>
    </div>
  )
}
