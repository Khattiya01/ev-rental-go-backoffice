'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Vehicle } from '@/lib/types'

const statusColor: Record<string, string> = {
  available: '#22c55e',
  rented: '#3b82f6',
  charging: '#06b6d4',
  under_repair: '#f59e0b',
  offline: '#64748b',
}

function createVehicleIcon(status: string) {
  const color = statusColor[status] ?? '#64748b'
  return L.divIcon({
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.5)">🚗</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

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
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; CARTO'
      />
      {vehicles.map(vehicle => (
        <Marker key={vehicle.id} position={[vehicle.lat, vehicle.lng]} icon={createVehicleIcon(vehicle.status)}>
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
    </MapContainer>
  )
}
