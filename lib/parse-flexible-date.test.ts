import { describe, it, expect } from 'vitest'
import { parseFlexibleDate } from './parse-flexible-date'

describe('parseFlexibleDate', () => {
  it('parses YYYY-MM-DD (HTML date input format)', () => {
    const d = parseFlexibleDate('2026-06-26')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(5)
    expect(d?.getDate()).toBe(26)
  })

  it('parses DD/MM/YYYY (cron-generated format), including days > 12 that the bare Date constructor mis-parses', () => {
    const d = parseFlexibleDate('26/06/2026')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(5)
    expect(d?.getDate()).toBe(26)
  })

  it('does not swap day/month for DD/MM/YYYY even when the bare constructor would', () => {
    // new Date('05/06/2026') reads as May 6 (MM/DD/YYYY); the real date here is June 5.
    const d = parseFlexibleDate('05/06/2026')
    expect(d?.getMonth()).toBe(5) // June
    expect(d?.getDate()).toBe(5)
  })

  it('returns null for an unrecognized format', () => {
    expect(parseFlexibleDate('not-a-date')).toBeNull()
    expect(parseFlexibleDate('2026/06/26')).toBeNull()
    expect(parseFlexibleDate('')).toBeNull()
  })

  it('returns null for a numerically invalid DD/MM/YYYY (e.g. month 13)', () => {
    expect(parseFlexibleDate('15/13/2026')).toBeNull()
  })
})
