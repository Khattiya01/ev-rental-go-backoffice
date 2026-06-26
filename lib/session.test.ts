// @vitest-environment node
//
// jsdom's globals live in a different realm than Node's — jose's internal
// `instanceof Uint8Array` checks fail across that boundary (TextEncoder().encode()
// produces a Node-realm Uint8Array that jsdom's checks don't recognize). This module
// is server-only crypto with no DOM dependency, so it runs under plain Node instead.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import type { SessionPayload } from './session'

// `session.ts` throws at module-eval time if SESSION_SECRET is unset, and a static
// top-level `import` would be hoisted above any `process.env` assignment in this file —
// so the secret must be set *before* a dynamic import, in a beforeAll.
let encrypt: (payload: SessionPayload) => Promise<string>
let decrypt: (session: string | undefined) => Promise<SessionPayload | null>

beforeAll(async () => {
  process.env.SESSION_SECRET = 'unit-test-session-secret-do-not-use-in-prod'
  const mod = await import('./session')
  encrypt = mod.encrypt
  decrypt = mod.decrypt
})

function makePayload(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    userId: 'user-1',
    role: 'admin',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  }
}

describe('encrypt / decrypt', () => {
  it('round-trips userId and role unchanged', async () => {
    const payload = makePayload()
    const token = await encrypt(payload)
    const decrypted = await decrypt(token)

    expect(decrypted?.userId).toBe(payload.userId)
    expect(decrypted?.role).toBe(payload.role)
  })

  it('round-trips expiresAt as the same point in time (note: comes back as an ISO string, not a Date instance — JWT claims are JSON, so Date.toJSON() runs on sign)', async () => {
    const payload = makePayload()
    const token = await encrypt(payload)
    const decrypted = await decrypt(token)

    expect(new Date(decrypted!.expiresAt as unknown as string).getTime()).toBe(payload.expiresAt.getTime())
  })

  it('returns null for an undefined session value', async () => {
    expect(await decrypt(undefined)).toBeNull()
  })

  it('returns null for a malformed token instead of throwing', async () => {
    expect(await decrypt('not.a.valid.jwt')).toBeNull()
  })

  it('returns null when the signature has been tampered with', async () => {
    const token = await encrypt(makePayload())
    const [header, payload, signature] = token.split('.')
    const tamperedSignature = signature.slice(0, -1) + (signature.endsWith('A') ? 'B' : 'A')

    expect(await decrypt(`${header}.${payload}.${tamperedSignature}`)).toBeNull()
  })

  it('rejects a token signed with a different secret', async () => {
    // Simulate a token forged with a different key — verify must fail closed.
    const otherSecretEnv = process.env.SESSION_SECRET
    process.env.SESSION_SECRET = 'a-completely-different-secret-value'
    vi.resetModules()
    const otherSession = await import('./session')
    const tokenFromOtherSecret = await otherSession.encrypt(makePayload())
    process.env.SESSION_SECRET = otherSecretEnv

    expect(await decrypt(tokenFromOtherSecret)).toBeNull()
  })
})

describe('token expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null once the JWT exp claim (7 days) has passed', async () => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'))
    const token = await encrypt(makePayload())

    vi.setSystemTime(new Date('2026-06-09T00:00:01.000Z')) // 8 days later
    expect(await decrypt(token)).toBeNull()
  })

  it('still verifies a token that has not yet hit its 7 day expiry', async () => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'))
    const token = await encrypt(makePayload())

    vi.setSystemTime(new Date('2026-06-06T00:00:00.000Z')) // 5 days later
    expect(await decrypt(token)).not.toBeNull()
  })
})
