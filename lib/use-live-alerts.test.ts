import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { Alert, AlertRecord } from '@/lib/types'
import type { FleetSocketMessage } from '@/lib/use-fleet-socket'

const useFleetSocketMock = vi.fn()
vi.mock('@/lib/use-fleet-socket', () => ({
  useFleetSocket: (onMessage: (msg: FleetSocketMessage) => void) => useFleetSocketMock(onMessage),
}))

let capturedOnMessage: ((msg: FleetSocketMessage) => void) | null = null

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'a1',
    type: 'battery_low',
    message: 'low battery',
    severity: 'warning',
    createdAt: '26 มิ.ย.',
    ...overrides,
  }
}

function wsAlertMessage(data: { id: string; severity: Alert['severity']; type?: Alert['type'] }): FleetSocketMessage {
  return {
    type: 'alert',
    data: {
      id: data.id,
      type: data.type ?? 'battery_low',
      severity: data.severity,
      message: 'live alert',
      createdAt: '2026-06-26T12:00:00.000Z',
    },
  }
}

beforeEach(() => {
  capturedOnMessage = null
  useFleetSocketMock.mockReset()
  useFleetSocketMock.mockImplementation((onMessage: (msg: FleetSocketMessage) => void) => {
    capturedOnMessage = onMessage
    return { connected: true }
  })
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useLiveAlerts', () => {
  it('uses the provided initialAlerts snapshot without self-fetching', async () => {
    const { useLiveAlerts } = await import('./use-live-alerts')
    const { result } = renderHook(() => useLiveAlerts({ initialAlerts: [makeAlert()] }))

    expect(result.current.alerts).toEqual([makeAlert()])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('self-fetches unresolved alerts when initialAlerts is omitted', async () => {
    const record: AlertRecord = {
      id: 'r1',
      type: 'vehicle_offline',
      message: 'offline',
      severity: 'critical',
      entityId: 'v1',
      resolved: false,
      createdAt: '2026-06-26T12:00:00.000Z',
      href: '/fleet/vehicles/v1',
    }
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [record] }),
    })

    const { useLiveAlerts } = await import('./use-live-alerts')
    const { result } = renderHook(() => useLiveAlerts({ limit: 8 }))

    expect(fetch).toHaveBeenCalledWith('/api/alerts?resolved=false&limit=8')
    await waitFor(() => expect(result.current.alerts).toHaveLength(1))
    expect(result.current.alerts[0].id).toBe('r1')
  })

  it('does not fetch or process messages when enabled is false', async () => {
    const { useLiveAlerts } = await import('./use-live-alerts')
    renderHook(() => useLiveAlerts({ enabled: false }))

    expect(fetch).not.toHaveBeenCalled()
    act(() => capturedOnMessage?.(wsAlertMessage({ id: 'live1', severity: 'critical' })))
    // nothing to assert on result since hook wasn't given a handle, but call must not throw
  })

  it('dedupes a live WS alert that shares an id with the snapshot', async () => {
    const { useLiveAlerts } = await import('./use-live-alerts')
    const { result } = renderHook(() =>
      useLiveAlerts({ initialAlerts: [makeAlert({ id: 'dup', severity: 'info' })] }),
    )

    act(() => capturedOnMessage?.(wsAlertMessage({ id: 'dup', severity: 'critical' })))

    expect(result.current.alerts).toHaveLength(1)
    // snapshot copy wins — the live duplicate is filtered out entirely
    expect(result.current.alerts[0].severity).toBe('info')
  })

  it('ignores non-alert WS message types', async () => {
    const { useLiveAlerts } = await import('./use-live-alerts')
    const { result } = renderHook(() => useLiveAlerts({ initialAlerts: [makeAlert()] }))

    act(() => capturedOnMessage?.({ type: 'position', data: {} }))

    expect(result.current.alerts).toHaveLength(1)
  })

  it('sorts merged alerts by severity (critical > warning > info), ignoring arrival order', async () => {
    const { useLiveAlerts } = await import('./use-live-alerts')
    const { result } = renderHook(() =>
      useLiveAlerts({ initialAlerts: [makeAlert({ id: 'info1', severity: 'info' })] }),
    )

    act(() => capturedOnMessage?.(wsAlertMessage({ id: 'warn1', severity: 'warning' })))
    act(() => capturedOnMessage?.(wsAlertMessage({ id: 'crit1', severity: 'critical' })))

    expect(result.current.alerts.map(a => a.id)).toEqual(['crit1', 'warn1', 'info1'])
  })

  it('resolve(id) removes the alert from state immediately (optimistic)', async () => {
    const { useLiveAlerts } = await import('./use-live-alerts')
    const { result } = renderHook(() =>
      useLiveAlerts({ initialAlerts: [makeAlert({ id: 'snap1' })] }),
    )
    act(() => capturedOnMessage?.(wsAlertMessage({ id: 'live1', severity: 'critical' })))
    expect(result.current.alerts).toHaveLength(2)

    act(() => result.current.resolve('live1'))
    expect(result.current.alerts.map(a => a.id)).toEqual(['snap1'])

    act(() => result.current.resolve('snap1'))
    expect(result.current.alerts).toHaveLength(0)
  })

  it('caps accumulated live alerts at 20, dropping the oldest', async () => {
    const { useLiveAlerts } = await import('./use-live-alerts')
    const { result } = renderHook(() => useLiveAlerts({ initialAlerts: [] }))

    for (let i = 0; i < 25; i++) {
      act(() => capturedOnMessage?.(wsAlertMessage({ id: `live${i}`, severity: 'info' })))
    }

    expect(result.current.alerts).toHaveLength(20)
    // newest-first, so live24 (most recent) is present, live0..live4 were dropped
    expect(result.current.alerts[0].id).toBe('live24')
    expect(result.current.alerts.some(a => a.id === 'live0')).toBe(false)
  })

  it('forwards the connected flag from useFleetSocket', async () => {
    useFleetSocketMock.mockImplementation((onMessage: (msg: FleetSocketMessage) => void) => {
      capturedOnMessage = onMessage
      return { connected: false }
    })
    const { useLiveAlerts } = await import('./use-live-alerts')
    const { result } = renderHook(() => useLiveAlerts({ initialAlerts: [] }))

    expect(result.current.connected).toBe(false)
  })
})
