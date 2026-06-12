'use client'

import { useEffect, useRef, useState } from 'react'

export interface FleetSocketMessage {
  type: string
  data: unknown
}

/**
 * Connects to the fleet WebSocket (`/api/fleet/ws`) and keeps the connection
 * alive across drops with exponential backoff (1s → 2s → 4s … capped at 30s).
 *
 * The latest `onMessage` is held in a ref so updating the handler does not tear
 * down and rebuild the socket. Returns the live connection state for UI badges.
 *
 * A 4001 (Unauthorized) close is terminal — the session is invalid and
 * middleware will redirect on the next navigation, so we stop retrying rather
 * than hammer the server with rejected upgrades.
 */
export function useFleetSocket(onMessage: (msg: FleetSocketMessage) => void): { connected: boolean } {
  const [connected, setConnected] = useState(false)
  const onMessageRef = useRef(onMessage)

  // Keep the latest handler in the ref without re-running the socket effect.
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempts = 0
    let stopped = false

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      ws = new WebSocket(`${protocol}//${window.location.host}/api/fleet/ws`)

      ws.onopen = () => {
        attempts = 0
        setConnected(true)
      }

      ws.onmessage = (event: MessageEvent<string>) => {
        let msg: FleetSocketMessage
        try { msg = JSON.parse(event.data) } catch { return }
        onMessageRef.current(msg)
      }

      ws.onerror = () => {
        // Let onclose drive the reconnect; closing here avoids a half-open socket.
        ws?.close()
      }

      ws.onclose = (event: CloseEvent) => {
        setConnected(false)
        if (stopped || event.code === 4001) return
        const delay = Math.min(1000 * 2 ** attempts, 30_000)
        attempts++
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      // Detach handlers so the unmount close doesn't schedule a reconnect.
      if (ws) {
        ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null
        ws.close()
      }
    }
  }, [])

  return { connected }
}
