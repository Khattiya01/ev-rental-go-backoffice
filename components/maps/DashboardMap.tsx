'use client'

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Vehicle } from '@/lib/types'

const statusColor: Record<string, string> = {
  available: '#22c55e',
  rented: '#3b82f6',
  charging: '#06b6d4',
  under_repair: '#f59e0b',
  offline: '#64748b',
}

interface DashboardMapProps {
  vehicles: Vehicle[]
}

export default function DashboardMap({ vehicles }: DashboardMapProps) {
  return (
    <MapContainer
      center={[13.756, 100.502]}
      zoom={12}
      style={{ height: '100%', width: '100%', borderRadius: '12px' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      {vehicles.map(vehicle => (
        <CircleMarker
          key={vehicle.id}
          center={[vehicle.lat, vehicle.lng]}
          radius={8}
          fillColor={statusColor[vehicle.status] ?? '#64748b'}
          color="white"
          weight={1.5}
          fillOpacity={0.9}
        >
          <Popup>
            <div style={{ color: '#1e293b', fontSize: '12px' }}>
              <strong>{vehicle.plate}</strong><br />
              {vehicle.make} {vehicle.model}<br />
              SoC: {vehicle.socPercent}%
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
