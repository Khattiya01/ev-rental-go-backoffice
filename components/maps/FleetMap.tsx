'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Vehicle } from '@/lib/types'

// ─── Individual marker ────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  available:    '#22c55e',
  rented:       '#3b82f6',
  charging:     '#06b6d4',
  under_repair: '#f59e0b',
  offline:      '#64748b',
}

function createVehicleIcon(status: string) {
  const color = STATUS_COLOR[status] ?? '#64748b'
  return L.divIcon({
    // Encode status in className so iconCreateFunction can read it
    className: `fleet-marker status-${status}`,
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.4)">🚗</div>`,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
  })
}

// ─── Cluster icon ─────────────────────────────────────────────────────────────

// Priority: offline > under_repair > rented > charging > available
// The first matching status in this list wins the cluster color.
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

  // Extract statuses from each marker's className (encoded above)
  const markers: L.Marker[] = cluster.getAllChildMarkers()
  const statuses = markers.map((m) => {
    const cls = (m.options?.icon as L.DivIcon | undefined)?.options?.className ?? ''
    const match = cls.match(/status-(\w+)/)
    return match?.[1] ?? 'available'
  })

  // Pick highest-priority status colour
  const dominant = CLUSTER_PRIORITY.find(s => statuses.includes(s)) ?? 'available'
  const color = CLUSTER_COLOR[dominant]
  const size  = clusterSize(count)
  const fontSize = size >= 44 ? 14 : 12

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
      font-size: ${fontSize}px;
      font-family: ui-sans-serif, system-ui, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      letter-spacing: -0.5px;
    ">${count}</div>`,
    iconSize:   L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FleetMapProps {
  vehicles: Vehicle[]
}

export default function FleetMap({ vehicles }: FleetMapProps) {
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
        {vehicles.map(vehicle => (
          <Marker
            key={vehicle.id}
            position={[vehicle.lat, vehicle.lng]}
            icon={createVehicleIcon(vehicle.status)}
          >
            <Popup>
              <div style={{ fontSize: '12px', minWidth: '140px' }}>
                <strong style={{ fontSize: '13px' }}>{vehicle.plate}</strong>
                <br />{vehicle.make} {vehicle.model}
                <br />SoC: {vehicle.socPercent}%
                <br />Status: {vehicle.status.replace('_', ' ')}
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  )
}
