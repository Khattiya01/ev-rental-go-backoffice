'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Vehicle } from '@/lib/types'

// ─── Status colours ───────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  available:    '#22c55e',
  rented:       '#3b82f6',
  charging:     '#06b6d4',
  under_repair: '#f59e0b',
  offline:      '#64748b',
}

// ─── Individual marker ────────────────────────────────────────────────────────

function createVehicleIcon(status: string, isBreach: boolean) {
  const color = STATUS_COLOR[status] ?? '#64748b'

  if (isBreach) {
    return L.divIcon({
      className: `fleet-marker status-${status} breach-true`,
      html: `
        <div style="position:relative;width:38px;height:38px;">
          <div class="fleet-breach-ping"
               style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.35);pointer-events:none;"></div>
          <div style="position:absolute;inset:5px;background:${color};border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.35);">🚗</div>
          <div style="position:absolute;top:-1px;right:-1px;width:14px;height:14px;background:#ef4444;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:9px;color:white;font-weight:700;line-height:1;">!</div>
        </div>`,
      iconSize:   [38, 38],
      iconAnchor: [19, 19],
    })
  }

  return L.divIcon({
    className: `fleet-marker status-${status}`,
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.4)">🚗</div>`,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
  })
}

// ─── Cluster icon ─────────────────────────────────────────────────────────────

const CLUSTER_PRIORITY = ['offline', 'under_repair', 'rented', 'charging', 'available'] as const
const CLUSTER_COLOR: Record<string, string> = {
  offline:      '#64748b',
  under_repair: '#f59e0b',
  rented:       '#3b82f6',
  charging:     '#06b6d4',
  available:    '#22c55e',
}

function clusterSize(count: number): number {
  if (count >= 20) return 52
  if (count >= 7)  return 44
  return 36
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
  const color    = CLUSTER_COLOR[dominant]
  const size     = clusterSize(count)
  const fontSize = size >= 44 ? 14 : 12

  const border = hasBreached
    ? 'border: 3px solid #ef4444; box-shadow: 0 0 0 2px rgba(239,68,68,0.25), 0 2px 8px rgba(0,0,0,0.3);'
    : 'border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.35);'

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
      font-size: ${fontSize}px;
      font-family: ui-sans-serif, system-ui, sans-serif;
      letter-spacing: -0.5px;
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

interface FleetMapProps {
  vehicles:  Vehicle[]
  breachSet?: Set<string>
}

export default function FleetMap({ vehicles, breachSet = new Set() }: FleetMapProps) {
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

  return (
    <MapContainer
      center={[13.756, 100.502]}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; CARTO'
      />
      <MarkerClusterGroup iconCreateFunction={createClusterIcon} chunkedLoading>
        {vehicles.map(vehicle => {
          const isBreach = breachSet.has(vehicle.id)
          const sc = socColor(vehicle.socPercent)
          return (
            <Marker
              key={vehicle.id}
              position={[vehicle.lat, vehicle.lng]}
              icon={createVehicleIcon(vehicle.status, isBreach)}
            >
              <Popup maxWidth={224}>
                <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '12px', minWidth: '190px', lineHeight: 1.4 }}>

                  {/* Plate + status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '14px', color: '#0f172a', letterSpacing: '0.05em' }}>
                      {vehicle.plate}
                    </strong>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '20px',
                      background: `${STATUS_COLOR[vehicle.status] ?? '#64748b'}22`,
                      color: STATUS_COLOR[vehicle.status] ?? '#64748b',
                      textTransform: 'capitalize',
                      whiteSpace: 'nowrap',
                    }}>
                      {vehicle.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Make / Model */}
                  <p style={{ margin: '0 0 7px', color: '#64748b', fontSize: '12px' }}>
                    {vehicle.make} {vehicle.model}
                    {vehicle.year ? ` · ${vehicle.year}` : ''}
                  </p>

                  {/* SoC bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
                    <span style={{ fontSize: '12px' }}>🔋</span>
                    <div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: `${vehicle.socPercent}%`, height: '100%', background: sc, borderRadius: '99px' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: sc, minWidth: '30px', textAlign: 'right' }}>
                      {vehicle.socPercent}%
                    </span>
                  </div>

                  {/* Zone row */}
                  {vehicle.geofenceZoneName && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      marginBottom: '7px',
                      background: isBreach ? '#fef2f2' : '#f8fafc',
                      border: `1px solid ${isBreach ? '#fecaca' : '#e2e8f0'}`,
                    }}>
                      <span style={{ fontSize: '12px' }}>{isBreach ? '⚠️' : '📍'}</span>
                      <span style={{
                        flex: 1,
                        fontSize: '11px',
                        color: isBreach ? '#b91c1c' : '#475569',
                        fontWeight: isBreach ? 600 : 400,
                      }}>
                        {vehicle.geofenceZoneName}
                      </span>
                      {isBreach && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: '#dc2626',
                          background: '#fee2e2',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          Outside
                        </span>
                      )}
                    </div>
                  )}

                  {/* Link */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
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
  )
}
