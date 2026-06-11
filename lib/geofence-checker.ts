/**
 * Ray Casting point-in-polygon test.
 * Coordinates are stored as [lat, lng][] (same as Leaflet / GeofenceZone.coordinates).
 * Pure function — no browser imports, safe to use in Node.js (ws-broadcaster).
 */
export function pointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  const n = polygon.length
  if (n < 3) return false

  let inside = false
  let j = n - 1

  for (let i = 0; i < n; i++) {
    const latI = polygon[i][0], lngI = polygon[i][1]
    const latJ = polygon[j][0], lngJ = polygon[j][1]

    // Cast horizontal ray from (lat, lng) rightward; count edge crossings.
    // lat = y-axis, lng = x-axis in standard geometry.
    if (
      (lngI > lng) !== (lngJ > lng) &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI
    ) {
      inside = !inside
    }

    j = i
  }

  return inside
}
