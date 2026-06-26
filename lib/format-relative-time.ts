const UNITS: { limitSeconds: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { limitSeconds: 3600, divisor: 60, unit: 'minute' },
  { limitSeconds: 86400, divisor: 3600, unit: 'hour' },
  { limitSeconds: 604800, divisor: 86400, unit: 'day' },
]

const rtf = new Intl.RelativeTimeFormat('th', { numeric: 'always', style: 'short' })

/** Compact relative time for tight UI (notification dropdown rows). Falls back to a short absolute date once older than a week. */
export function formatRelativeTime(iso: string): string {
  const diffSeconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (diffSeconds < 60) return 'เมื่อสักครู่'
  for (const { limitSeconds, divisor, unit } of UNITS) {
    if (diffSeconds < limitSeconds) return rtf.format(-Math.floor(diffSeconds / divisor), unit)
  }
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}
