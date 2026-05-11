'use client'

import { MapContainer, TileLayer, Polygon } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { GeofenceZone } from '@/lib/types'

const zoneColors = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7']

interface GeofenceMapProps {
  zones: GeofenceZone[]
}

export default function GeofenceMap({ zones }: GeofenceMapProps) {
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
      {zones.map((zone, i) => (
        <Polygon
          key={zone.id}
          positions={zone.coordinates}
          pathOptions={{
            color: zoneColors[i % zoneColors.length],
            fillColor: zoneColors[i % zoneColors.length],
            fillOpacity: 0.2,
            weight: 2,
          }}
        />
      ))}
    </MapContainer>
  )
}
