export const ZONE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4']

/** Stable color derived from zone ID — won't shift as zones are added/removed */
export function zoneColor(zoneId: string): string {
  let hash = 0
  for (let i = 0; i < zoneId.length; i++) hash = (hash * 31 + zoneId.charCodeAt(i)) | 0
  return ZONE_COLORS[Math.abs(hash) % ZONE_COLORS.length]
}
