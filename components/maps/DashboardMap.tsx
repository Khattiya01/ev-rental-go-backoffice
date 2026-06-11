'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslations } from 'next-intl'
import type { Vehicle } from '@/lib/types'

type VehicleStatus = 'available' | 'rented' | 'charging' | 'under_repair' | 'offline'

const STATUS_COLORS: Record<VehicleStatus, string> = {
  available:    '#22c55e',
  rented:       '#3b82f6',
  charging:     '#06b6d4',
  under_repair: '#f59e0b',
  offline:      '#94a3b8',
}

// ─── Individual marker ────────────────────────────────────────────────────────

function createVehicleIcon(status: string, isBreach: boolean) {
  const color = STATUS_COLORS[status as VehicleStatus] ?? '#94a3b8'

  if (isBreach) {
    return L.divIcon({
      className: `fleet-marker status-${status} breach-true`,
      html: `
        <div style="position:relative;width:32px;height:32px;">
          <div class="fleet-breach-ping"
               style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.35);pointer-events:none;"></div>
          <div style="position:absolute;inset:4px;background:${color};border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🚗</div>
          <div style="position:absolute;top:-1px;right:-1px;width:12px;height:12px;background:#ef4444;border-radius:50%;border:1.5px solid white;display:flex;align-items:center;justify-content:center;font-size:8px;color:white;font-weight:700;line-height:1;">!</div>
        </div>`,
      iconSize:   [32, 32],
      iconAnchor: [16, 16],
    })
  }

  return L.divIcon({
    className: `fleet-marker status-${status}`,
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🚗</div>`,
    iconSize:   [24, 24],
    iconAnchor: [12, 12],
  })
}

// ─── Cluster icon ─────────────────────────────────────────────────────────────

const CLUSTER_PRIORITY = ['offline', 'under_repair', 'rented', 'charging', 'available'] as const

function clusterSize(count: number): number {
  if (count >= 20) return 46
  if (count >= 7)  return 38
  return 30
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClusterIcon(cluster: any): L.DivIcon {
  const count: number = cluster.getChildCount()
  const markers: L.Marker[] = cluster.getAllChildMarkers()
  const statuses = markers.map((m) => {
    const cls = (m.options?.icon as L.DivIcon | undefined)?.options?.className ?? ''
    return cls.match(/status-(\w+)/)?.[1] ?? 'available'
  })
  const hasBreached = markers.some((m) => {
    const cls = (m.options?.icon as L.DivIcon | undefined)?.options?.className ?? ''
    return cls.includes('breach-true')
  })

  const dominant = CLUSTER_PRIORITY.find(s => statuses.includes(s)) ?? 'available'
  const color    = STATUS_COLORS[dominant]
  const size     = clusterSize(count)

  const border = hasBreached
    ? 'border: 3px solid #ef4444; box-shadow: 0 0 0 2px rgba(239,68,68,0.2), 0 2px 8px rgba(0,0,0,0.3);'
    : 'border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);'

  return L.divIcon({
    className: '',
    html: `<div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      ${border}
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: ${size >= 38 ? 13 : 11}px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${count}</div>`,
    iconSize:   L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  })
}

// ─── SoC colour helper ────────────────────────────────────────────────────────

function socColor(soc: number): string {
  if (soc < 15) return '#ef4444'
  if (soc < 30) return '#f59e0b'
  return '#22c55e'
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardMapProps {
  vehicles:  Vehicle[]
  breachSet?: Set<string>
}

export default function DashboardMap({ vehicles, breachSet = new Set() }: DashboardMapProps) {
  const t = useTranslations('dashboard.mapFilter')
  const [activeFilter, setActiveFilter] = useState<VehicleStatus | 'all'>('all')

  // Inject ping animation for breach markers once on mount
  useEffect(() => {
    const style = document.createElement('style')
    style.dataset.fleetBreach = '1'
    style.textContent = `
      @keyframes fleet-breach-ping {
        75%, 100% { transform: scale(2.2); opacity: 0; }
      }
      .fleet-breach-ping {
        animation: fleet-breach-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
      }
    `
    if (!document.querySelector('[data-fleet-breach]')) {
      document.head.appendChild(style)
    }
    return () => style.remove()
  }, [])

  const STATUS_CONFIG: { key: VehicleStatus; label: string }[] = [
    { key: 'available',    label: t('available') },
    { key: 'rented',       label: t('rented') },
    { key: 'charging',     label: t('charging') },
    { key: 'under_repair', label: t('underRepair') },
    { key: 'offline',      label: t('offline') },
  ]

  const filtered = activeFilter === 'all'
    ? vehicles
    : vehicles.filter(v => v.status === activeFilter)

  const breachCount = vehicles.filter(v => breachSet.has(v.id)).length

  return (
    <div className="relative h-full w-full">
      {/* Filter chips */}
      <div className="absolute top-2 left-2 z-[1000] flex flex-wrap gap-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
            activeFilter === 'all'
              ? 'bg-slate-700 text-white border-slate-700'
              : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {t('all')} ({vehicles.length})
        </button>
        {STATUS_CONFIG.map(({ key, label }) => {
          const cnt = vehicles.filter(v => v.status === key).length
          if (cnt === 0) return null
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                activeFilter === key
                  ? 'text-white border-transparent'
                  : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              style={activeFilter === key ? { background: STATUS_COLORS[key], borderColor: STATUS_COLORS[key] } : undefined}
            >
              {label} ({cnt})
            </button>
          )
        })}
        {/* Breach badge */}
        {breachCount > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white border border-red-500 animate-pulse">
            ⚠ {breachCount} outside zone
          </span>
        )}
      </div>

      {/* Status legend */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 px-2.5 py-2 flex flex-col gap-1">
        {STATUS_CONFIG.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[key] }} />
            <span className="text-[10px] text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      <MapContainer
        center={[13.756, 100.502]}
        zoom={12}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MarkerClusterGroup iconCreateFunction={createClusterIcon} chunkedLoading>
          {filtered.map(vehicle => {
            const isBreach = breachSet.has(vehicle.id)
            const sc = socColor(vehicle.socPercent)
            return (
              <Marker
                key={vehicle.id}
                position={[vehicle.lat, vehicle.lng]}
                icon={createVehicleIcon(vehicle.status, isBreach)}
              >
                <Popup maxWidth={210}>
                  <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '12px', minWidth: '178px', lineHeight: 1.4 }}>

                    {/* Plate + status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a', letterSpacing: '0.05em' }}>
                        {vehicle.plate}
                      </strong>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '20px',
                        background: `${STATUS_COLORS[vehicle.status as VehicleStatus] ?? '#94a3b8'}22`,
                        color: STATUS_COLORS[vehicle.status as VehicleStatus] ?? '#94a3b8',
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                      }}>
                        {vehicle.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Make / Model */}
                    <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: '11px' }}>
                      {vehicle.make} {vehicle.model}
                    </p>

                    {/* SoC bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px' }}>🔋</span>
                      <div style={{ flex: 1, height: '4px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ width: `${vehicle.socPercent}%`, height: '100%', background: sc, borderRadius: '99px' }} />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: sc, minWidth: '28px', textAlign: 'right' }}>
                        {vehicle.socPercent}%
                      </span>
                    </div>

                    {/* Zone row */}
                    {vehicle.geofenceZoneName && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 7px',
                        borderRadius: '5px',
                        marginBottom: '6px',
                        background: isBreach ? '#fef2f2' : '#f8fafc',
                        border: `1px solid ${isBreach ? '#fecaca' : '#e2e8f0'}`,
                      }}>
                        <span style={{ fontSize: '11px' }}>{isBreach ? '⚠️' : '📍'}</span>
                        <span style={{
                          flex: 1,
                          fontSize: '10px',
                          color: isBreach ? '#b91c1c' : '#475569',
                          fontWeight: isBreach ? 600 : 400,
                        }}>
                          {vehicle.geofenceZoneName}
                        </span>
                        {isBreach && (
                          <span style={{
                            fontSize: '8px',
                            fontWeight: 700,
                            color: '#dc2626',
                            background: '#fee2e2',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            textTransform: 'uppercase',
                          }}>
                            Outside
                          </span>
                        )}
                      </div>
                    )}

                    {/* Link */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '5px' }}>
                      <a
                        href={`/fleet/vehicles/${vehicle.id}`}
                        style={{ display: 'block', textAlign: 'right', fontSize: '11px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}
                      >
                        View Details →
                      </a>
                    </div>

                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  )
}
