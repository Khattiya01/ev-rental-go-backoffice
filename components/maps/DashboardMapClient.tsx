'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useMemo } from 'react'
import AlertFeed from '@/components/dashboard/alert-feed'
import { useTranslations } from 'next-intl'
import type { Vehicle, VehicleStatus, Alert } from '@/lib/types'

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
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles)
  const [wsConnected, setWsConnected] = useState(false)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/fleet/ws`)

    ws.onopen  = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    ws.onerror = () => setWsConnected(false)

    ws.onmessage = (event: MessageEvent<string>) => {
      let msg: { type: string; data: WsPosition[] }
      try { msg = JSON.parse(event.data) } catch { return }
      if (msg.type !== 'positions') return

      setVehicles(prev => {
        const updates = new Map(msg.data.map(p => [p.vehicleId, p]))
        return prev.map(v => {
          const pos = updates.get(v.id)
          if (!pos) return v
          return { ...v, lat: pos.lat, lng: pos.lng, socPercent: pos.soc, status: pos.status as VehicleStatus }
        })
      })
    }

    return () => ws.close()
  }, [])

  // Live battery alerts — regenerated each time vehicles state updates
  const liveBatteryAlerts: Alert[] = useMemo(
    () => vehicles
      .filter(v => v.socPercent < 15)
      .map(v => ({
        id: `battery-${v.id}`,
        type:      'battery_low' as const,
        message:   `Battery Low (${v.socPercent}%) — ${v.plate}`,
        severity:  'critical'   as const,
        createdAt: wsConnected ? 'Live' : 'Just now',
        href: `/fleet/vehicles/${v.id}`,
      })),
    [vehicles, wsConnected]
  )

  const allAlerts: Alert[] = useMemo(() => {
    const SEV = { critical: 0, warning: 1, info: 2 } as const
    return [
      ...liveBatteryAlerts,
      ...staticAlerts.filter(a => a.type !== 'battery_low'),
    ].sort((a, b) => SEV[a.severity] - SEV[b.severity])
  }, [liveBatteryAlerts, staticAlerts])

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
          <DashboardMap vehicles={vehicles} />
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
          <AlertFeed alerts={allAlerts} />
        )}
      </div>
    </div>
  )
}
