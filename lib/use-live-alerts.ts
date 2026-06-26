'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Alert, AlertRecord } from '@/lib/types'
import { useFleetSocket, type FleetSocketMessage } from '@/lib/use-fleet-socket'

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const

function defaultFormatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface UseLiveAlertsOptions {
  /** Server-provided unresolved alerts (e.g. SSR dashboard feed). Omit to self-fetch from `/api/alerts`. */
  initialAlerts?: Alert[]
  /** Max rows to self-fetch when `initialAlerts` is omitted. */
  limit?: number
  /** Formats a raw ISO timestamp (from `/api/alerts` or the WS payload) into the display string stored in `Alert.createdAt`. Defaults to the Thai absolute format used by the dashboard feed. */
  formatCreatedAt?: (iso: string) => string
  /** Set false to skip fetching/processing — e.g. while waiting on a permission check. */
  enabled?: boolean
}

interface UseLiveAlertsResult {
  alerts: Alert[]
  resolve: (id: string) => void
  connected: boolean
}

/**
 * Unresolved alerts merged from a snapshot (server-provided or self-fetched)
 * plus live WS `type: 'alert'` events, deduplicated by id and sorted by
 * severity. Shared by the dashboard alert feed and the header notification
 * bell so both consume the same global broadcast instead of each re-deriving it.
 */
export function useLiveAlerts(options: UseLiveAlertsOptions = {}): UseLiveAlertsResult {
  const { initialAlerts, limit = 8, formatCreatedAt = defaultFormatCreatedAt, enabled = true } = options
  const [snapshot, setSnapshot] = useState<Alert[]>(initialAlerts ?? [])
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([])
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (initialAlerts || !enabled) return
    let cancelled = false
    fetch(`/api/alerts?resolved=false&limit=${limit}`)
      .then(res => (res.ok ? res.json() : null))
      .then((json: { data: AlertRecord[] } | null) => {
        if (cancelled || !json) return
        setSnapshot(json.data.map(a => ({
          id: a.id,
          type: a.type,
          message: a.message,
          severity: a.severity,
          createdAt: formatCreatedAt(a.createdAt),
          href: a.href,
        })))
      })
      .catch(() => {/* non-critical */})
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const handleMessage = useCallback((msg: FleetSocketMessage) => {
    if (!enabled || msg.type !== 'alert') return
    const d = msg.data as { id: string; type: Alert['type']; severity: Alert['severity']; message: string; createdAt: string; href?: string }
    const incoming: Alert = {
      id: d.id,
      type: d.type,
      severity: d.severity,
      message: d.message,
      createdAt: formatCreatedAt(d.createdAt),
      href: d.href,
    }
    setLiveAlerts(prev => (prev.some(a => a.id === incoming.id) ? prev : [incoming, ...prev].slice(0, 20)))
  }, [enabled, formatCreatedAt])

  const { connected } = useFleetSocket(handleMessage)

  const alerts = useMemo(() => {
    const snapshotIds = new Set(snapshot.map(a => a.id))
    const freshLive = liveAlerts.filter(a => !snapshotIds.has(a.id))
    return [...freshLive, ...snapshot]
      .filter(a => !resolvedIds.has(a.id))
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  }, [snapshot, liveAlerts, resolvedIds])

  const resolve = useCallback((id: string) => {
    setResolvedIds(prev => new Set(prev).add(id))
  }, [])

  return { alerts, resolve, connected }
}
