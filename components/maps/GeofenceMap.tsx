'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polygon, FeatureGroup, ZoomControl, useMap } from 'react-leaflet'
import { EditControl } from 'react-leaflet-draw'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import { zoneColor } from '@/lib/geofence-utils'
import type { GeofenceZone } from '@/lib/types'

// ─── Locate Me control ────────────────────────────────────────────────────────
// Adds a "⊕" button near the zoom controls that flies to the user's GPS position.

function LocateControl() {
  const map = useMap()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const LocateBtn = (L.Control as any).extend({
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
        const btn = L.DomUtil.create('a', '', container)
        btn.title  = 'Go to my location'
        btn.href   = '#'
        btn.style.cssText = [
          'width:30px', 'height:30px', 'display:flex',
          'align-items:center', 'justify-content:center',
          'font-size:16px', 'text-decoration:none', 'color:#333',
          'cursor:pointer',
        ].join(';')
        // Crosshair SVG icon
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`

        L.DomEvent.on(btn, 'click', (e: Event) => {
          L.DomEvent.preventDefault(e)
          L.DomEvent.stopPropagation(e)
          btn.style.opacity = '0.4'
          map.locate({ setView: true, maxZoom: 15 })
          map.once('locationfound',  () => { btn.style.opacity = '1' })
          map.once('locationerror',  () => {
            btn.style.opacity = '1'
            // Silent fail — browser already shows a permission prompt
          })
        })

        return container
      },
    })

    const ctrl = new LocateBtn({ position: 'bottomright' })
    ctrl.addTo(map)
    return () => { ctrl.remove() }
  }, [map])

  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

interface GeofenceMapProps {
  zones: GeofenceZone[]
  drawMode: boolean
  editingZoneId?: string
  clearKey?: number
  onZoneDrawn: (coords: [number, number][]) => void
}

export default function GeofenceMap({ zones, drawMode, editingZoneId, clearKey, onZoneDrawn }: GeofenceMapProps) {
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)

  useEffect(() => {
    if (clearKey !== undefined) {
      featureGroupRef.current?.clearLayers()
    }
  }, [clearKey])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreated = (e: any) => {
    const { layer, layerType } = e
    let coords: [number, number][] = []

    if (layerType === 'polygon' || layerType === 'rectangle') {
      const latlngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[]
      coords = latlngs.map(ll => [ll.lat, ll.lng])
    } else if (layerType === 'circle') {
      const circle = layer as L.Circle
      const center = circle.getLatLng()
      const r = circle.getRadius()
      coords = Array.from({ length: 32 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 32
        return [
          center.lat + (r / 111320) * Math.cos(angle),
          center.lng + (r / (111320 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle),
        ] as [number, number]
      })
    }

    if (coords.length >= 3) {
      featureGroupRef.current?.clearLayers()
      featureGroupRef.current?.addLayer(layer)
      onZoneDrawn(coords)
    }
  }

  return (
    <MapContainer
      center={[13.756, 100.502]}
      zoom={11}
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; CARTO'
      />

      {/* Zoom + Locate controls — all at bottom-right, away from draw tools (top-right) */}
      <ZoomControl position="bottomright" />
      <LocateControl />

      {/* Saved zone polygons */}
      {zones.map(zone => {
        const isEditing = zone.id === editingZoneId
        const color     = zoneColor(zone.id)
        return (
          <Polygon
            key={zone.id}
            positions={zone.coordinates}
            pathOptions={{
              color,
              fillColor:   color,
              fillOpacity: isEditing ? 0.06 : zone.active ? 0.15 : 0.05,
              weight:      isEditing ? 1.5  : 2,
              dashArray:   isEditing ? '8 4' : zone.active ? undefined : '6 3',
              opacity:     zone.active ? 1 : 0.45,
            }}
          />
        )
      })}

      {/* Draw layer — only mounted in create/edit mode */}
      {drawMode && (
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright"
            onCreated={handleCreated}
            draw={{
              polygon:      { shapeOptions: { color: '#6366f1', fillOpacity: 0.12 } },
              rectangle:    { shapeOptions: { color: '#6366f1', fillOpacity: 0.12 } },
              circle:       { shapeOptions: { color: '#6366f1', fillOpacity: 0.12 } },
              circlemarker: false,
              marker:       false,
              polyline:     false,
            }}
            edit={{ edit: false, remove: false }}
          />
        </FeatureGroup>
      )}
    </MapContainer>
  )
}
