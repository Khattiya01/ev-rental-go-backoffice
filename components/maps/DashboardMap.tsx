'use client'

import { useState } from 'react'
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

function createVehicleIcon(status: string) {
  const color = STATUS_COLORS[status as VehicleStatus] ?? '#94a3b8'
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
  const dominant = CLUSTER_PRIORITY.find(s => statuses.includes(s)) ?? 'available'
  const color    = STATUS_COLORS[dominant]
  const size     = clusterSize(count)

  return L.divIcon({
    className: '',
    html: `<div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 3px solid white;
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

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardMapProps {
  vehicles: Vehicle[]
}

export default function DashboardMap({ vehicles }: DashboardMapProps) {
  const t = useTranslations('dashboard.mapFilter')
  const [activeFilter, setActiveFilter] = useState<VehicleStatus | 'all'>('all')

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
          {filtered.map(vehicle => (
            <Marker
              key={vehicle.id}
              position={[vehicle.lat, vehicle.lng]}
              icon={createVehicleIcon(vehicle.status)}
            >
              <Popup>
                <div style={{ color: '#1e293b', fontSize: '12px' }}>
                  <strong>{vehicle.plate}</strong><br />
                  {vehicle.make} {vehicle.model}<br />
                  SoC: {vehicle.socPercent}%
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  )
}
