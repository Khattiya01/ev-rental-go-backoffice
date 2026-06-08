import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer } from 'ws'
import { jwtVerify } from 'jose'
import { addClient, removeClient, startBroadcaster } from './lib/ws-broadcaster'

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'

// Create the HTTP server first so Next.js can attach its own upgrade
// listener (for HMR WebSocket) via the httpServer option.
const server = createServer()
const app = next({ dev, turbopack: dev, httpServer: server })
const handle = app.getRequestHandler()

const wss = new WebSocketServer({ noServer: true })

function parseSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name.trim() === 'session') return rest.join('=')
  }
  return undefined
}

async function isAuthenticated(cookieHeader: string | undefined): Promise<boolean> {
  const token = parseSessionCookie(cookieHeader)
  if (!token) return false
  const secret = process.env.SESSION_SECRET
  if (!secret) return false
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] })
    return true
  } catch {
    return false
  }
}

wss.on('connection', (ws) => {
  addClient(ws)
  ws.on('close', () => removeClient(ws))
  ws.on('error', () => removeClient(ws))
})

server.on('request', (req, res) => {
  const parsedUrl = parse(req.url!, true)
  handle(req, res, parsedUrl)
})

server.on('upgrade', (req, socket, head) => {
  const { pathname } = parse(req.url ?? '/')
  if (pathname !== '/api/fleet/ws') {
    // Leave /_next/webpack-hmr and others to Next.js's own listener
    return
  }

  // Claim the socket synchronously before any other upgrade listener fires.
  // Auth check runs inside the WebSocket callback — avoids the async race.
  wss.handleUpgrade(req, socket, head, async (ws) => {
    const ok = await isAuthenticated(req.headers.cookie)
    if (!ok) {
      ws.close(4001, 'Unauthorized')
      return
    }
    wss.emit('connection', ws, req)
  })
})

app.prepare().then(() => {
  startBroadcaster()
  server.listen(port, () => {
    console.log(
      `> Ready on http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV}`
    )
  })
})
