import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatRelativeTime } from './format-relative-time'

const NOW = new Date('2026-06-26T12:00:00.000Z')
const rtf = new Intl.RelativeTimeFormat('th', { numeric: 'always', style: 'short' })

function isoSecondsAgo(seconds: number): string {
  return new Date(NOW.getTime() - seconds * 1000).toISOString()
}

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "เมื่อสักครู่" for anything under 60 seconds', () => {
    expect(formatRelativeTime(isoSecondsAgo(0))).toBe('เมื่อสักครู่')
    expect(formatRelativeTime(isoSecondsAgo(59))).toBe('เมื่อสักครู่')
  })

  it('clamps a timestamp slightly in the future (clock skew) to "เมื่อสักครู่" instead of going negative', () => {
    const future = new Date(NOW.getTime() + 5_000).toISOString()
    expect(formatRelativeTime(future)).toBe('เมื่อสักครู่')
  })

  it('formats minutes for 1 minute up to just under 1 hour', () => {
    expect(formatRelativeTime(isoSecondsAgo(60))).toBe(rtf.format(-1, 'minute'))
    expect(formatRelativeTime(isoSecondsAgo(3599))).toBe(rtf.format(-59, 'minute'))
  })

  it('switches to hours at exactly the 3600s boundary', () => {
    expect(formatRelativeTime(isoSecondsAgo(3600))).toBe(rtf.format(-1, 'hour'))
    expect(formatRelativeTime(isoSecondsAgo(86399))).toBe(rtf.format(-23, 'hour'))
  })

  it('switches to days at exactly the 86400s boundary', () => {
    expect(formatRelativeTime(isoSecondsAgo(86400))).toBe(rtf.format(-1, 'day'))
    expect(formatRelativeTime(isoSecondsAgo(604799))).toBe(rtf.format(-6, 'day'))
  })

  it('falls back to a short absolute date once 7 days or older', () => {
    const iso = isoSecondsAgo(604800)
    expect(formatRelativeTime(iso)).toBe(
      new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
    )
  })
})
