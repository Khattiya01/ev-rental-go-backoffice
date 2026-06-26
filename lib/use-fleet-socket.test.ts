import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFleetSocket } from './use-fleet-socket'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: (() => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null
  closeCalls = 0

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  close() {
    this.closeCalls++
  }

  // Test helper — simulates the server/browser tearing the socket down.
  simulateClose(code: number) {
    this.onclose?.({ code })
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  MockWebSocket.instances = []
  // @ts-expect-error -- test stub, doesn't need the full WebSocket surface
  global.WebSocket = MockWebSocket
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useFleetSocket', () => {
  it('connects to the fleet WS endpoint on mount', () => {
    renderHook(() => useFleetSocket(() => {}))

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:3000/api/fleet/ws')
  })

  it('reports connected=true after onopen and false again after a drop', () => {
    const { result } = renderHook(() => useFleetSocket(() => {}))
    expect(result.current.connected).toBe(false)

    act(() => MockWebSocket.instances[0].onopen?.())
    expect(result.current.connected).toBe(true)

    act(() => MockWebSocket.instances[0].simulateClose(1006))
    expect(result.current.connected).toBe(false)
  })

  it('reconnects with exponential backoff capped at 30s', () => {
    renderHook(() => useFleetSocket(() => {}))

    // 1st drop (before ever connecting) -> 1s delay
    act(() => MockWebSocket.instances[0].simulateClose(1006))
    expect(MockWebSocket.instances).toHaveLength(1)
    act(() => vi.advanceTimersByTime(999))
    expect(MockWebSocket.instances).toHaveLength(1)
    act(() => vi.advanceTimersByTime(1))
    expect(MockWebSocket.instances).toHaveLength(2)

    // 2nd drop -> 2s delay
    act(() => MockWebSocket.instances[1].simulateClose(1006))
    act(() => vi.advanceTimersByTime(1999))
    expect(MockWebSocket.instances).toHaveLength(2)
    act(() => vi.advanceTimersByTime(1))
    expect(MockWebSocket.instances).toHaveLength(3)

    // 3rd drop -> 4s delay
    act(() => MockWebSocket.instances[2].simulateClose(1006))
    act(() => vi.advanceTimersByTime(4000))
    expect(MockWebSocket.instances).toHaveLength(4)
  })

  it('caps backoff at 30s after repeated failures', () => {
    renderHook(() => useFleetSocket(() => {}))

    // Fail enough times that 1000 * 2**attempts would exceed 30s without the cap.
    for (let i = 0; i < 6; i++) {
      const idx = MockWebSocket.instances.length - 1
      act(() => MockWebSocket.instances[idx].simulateClose(1006))
      act(() => vi.advanceTimersByTime(30_000))
    }

    const idx = MockWebSocket.instances.length - 1
    act(() => MockWebSocket.instances[idx].simulateClose(1006))
    act(() => vi.advanceTimersByTime(29_999))
    expect(MockWebSocket.instances).toHaveLength(idx + 1)
    act(() => vi.advanceTimersByTime(1))
    expect(MockWebSocket.instances).toHaveLength(idx + 2)
  })

  it('resets the backoff counter to 0 after a successful reconnect', () => {
    renderHook(() => useFleetSocket(() => {}))

    // Fail twice to push attempts up (next delay would be 4s if not reset).
    act(() => MockWebSocket.instances[0].simulateClose(1006))
    act(() => vi.advanceTimersByTime(1000))
    act(() => MockWebSocket.instances[1].simulateClose(1006))
    act(() => vi.advanceTimersByTime(2000))

    // Successful connect resets attempts to 0.
    act(() => MockWebSocket.instances[2].onopen?.())

    // Next drop should wait only 1s again, not 4s.
    act(() => MockWebSocket.instances[2].simulateClose(1006))
    act(() => vi.advanceTimersByTime(999))
    expect(MockWebSocket.instances).toHaveLength(3)
    act(() => vi.advanceTimersByTime(1))
    expect(MockWebSocket.instances).toHaveLength(4)
  })

  it('does not reconnect after a 4001 (unauthorized) close — terminal', () => {
    renderHook(() => useFleetSocket(() => {}))

    act(() => MockWebSocket.instances[0].simulateClose(4001))
    act(() => vi.advanceTimersByTime(60_000))

    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('does not reconnect after unmount', () => {
    const { unmount } = renderHook(() => useFleetSocket(() => {}))

    unmount()
    act(() => vi.advanceTimersByTime(60_000))

    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('forwards parsed messages to the latest onMessage handler without re-creating the socket', () => {
    const first = vi.fn()
    const { result, rerender } = renderHook(({ handler }) => useFleetSocket(handler), {
      initialProps: { handler: first },
    })

    const second = vi.fn()
    rerender({ handler: second })
    expect(MockWebSocket.instances).toHaveLength(1) // handler swap didn't reconnect

    act(() => {
      MockWebSocket.instances[0].onmessage?.({ data: JSON.stringify({ type: 'alert', data: { id: '1' } }) } as MessageEvent<string>)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith({ type: 'alert', data: { id: '1' } })
    expect(result.current).toBeDefined()
  })

  it('ignores unparseable message payloads instead of throwing', () => {
    const onMessage = vi.fn()
    renderHook(() => useFleetSocket(onMessage))

    expect(() => {
      act(() => {
        MockWebSocket.instances[0].onmessage?.({ data: 'not json' } as MessageEvent<string>)
      })
    }).not.toThrow()
    expect(onMessage).not.toHaveBeenCalled()
  })
})
