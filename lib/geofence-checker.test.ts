import { describe, it, expect } from 'vitest'
import { pointInPolygon } from './geofence-checker'

// Coordinates are [lat, lng][] — a 10x10 square spanning lat/lng 0..10.
const square: [number, number][] = [
  [0, 0],
  [0, 10],
  [10, 10],
  [10, 0],
]

describe('pointInPolygon', () => {
  it('returns true for a point clearly inside the polygon', () => {
    expect(pointInPolygon(5, 5, square)).toBe(true)
  })

  it('returns false for a point clearly outside the polygon', () => {
    expect(pointInPolygon(15, 15, square)).toBe(false)
    expect(pointInPolygon(5, 15, square)).toBe(false)
  })

  it('returns false when the polygon has fewer than 3 points instead of throwing', () => {
    expect(pointInPolygon(5, 5, [])).toBe(false)
    expect(pointInPolygon(5, 5, [[0, 0]])).toBe(false)
    expect(pointInPolygon(5, 5, [[0, 0], [10, 10]])).toBe(false)
  })

  it('handles a point lying exactly on a polygon edge deterministically', () => {
    // Ray-casting convention here treats a point on the left edge as inside.
    expect(pointInPolygon(5, 0, square)).toBe(true)
  })

  describe('concave polygon (L-shape)', () => {
    // Bottom bar spans lat 0-5 across the full lng 0-10; upper-left bar spans
    // lat 5-10 but only lng 0-5 — the lat 5-10 / lng 5-10 quadrant is a notch cut out.
    const lShape: [number, number][] = [
      [0, 0],
      [0, 10],
      [5, 10],
      [5, 5],
      [10, 5],
      [10, 0],
    ]

    it('returns true inside the bottom bar', () => {
      expect(pointInPolygon(2, 8, lShape)).toBe(true)
    })

    it('returns true inside the upper-left bar', () => {
      expect(pointInPolygon(8, 2, lShape)).toBe(true)
    })

    it('returns false inside the notch that was cut out', () => {
      expect(pointInPolygon(8, 8, lShape)).toBe(false)
    })
  })
})
