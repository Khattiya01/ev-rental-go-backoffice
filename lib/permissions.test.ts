import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CurrentUser } from '@/lib/dal'

const whereMock = vi.fn()
const fromMock = vi.fn(() => ({ where: whereMock }))
const selectMock = vi.fn(() => ({ from: fromMock }))

vi.mock('@/db', () => ({
  db: { select: selectMock },
}))

function makeUser(role: CurrentUser['role']): CurrentUser {
  return { id: 'u1', name: 'Test User', email: 't@evrentalgo.com', role }
}

describe('requirePermission', () => {
  beforeEach(() => {
    vi.resetModules()
    selectMock.mockClear()
    fromMock.mockClear()
    whereMock.mockReset()
  })

  it('lets super_admin bypass the matrix entirely — no DB query at all', async () => {
    const { requirePermission } = await import('./permissions')
    const result = await requirePermission(makeUser('super_admin'), 'vehicles', 'canDelete')

    expect(result).toBeNull()
    expect(selectMock).not.toHaveBeenCalled()
  })

  it('allows an action when the DB matrix grants it', async () => {
    whereMock.mockResolvedValue([{ resource: 'vehicles', canRead: true, canWrite: true, canDelete: false }])
    const { requirePermission } = await import('./permissions')

    expect(await requirePermission(makeUser('admin'), 'vehicles', 'canWrite')).toBeNull()
  })

  it('denies an action the DB matrix forbids, returning a 403 JSON response', async () => {
    whereMock.mockResolvedValue([{ resource: 'vehicles', canRead: true, canWrite: true, canDelete: false }])
    const { requirePermission } = await import('./permissions')

    const result = await requirePermission(makeUser('admin'), 'vehicles', 'canDelete')
    expect(result).not.toBeNull()
    expect(result?.status).toBe(403)
    expect(await result?.json()).toEqual({ error: 'Insufficient permissions' })
  })

  it('falls back to role defaults (admin: read/write, no delete) when the DB query fails', async () => {
    whereMock.mockRejectedValue(new Error('connection refused'))
    const { requirePermission } = await import('./permissions')

    expect(await requirePermission(makeUser('admin'), 'vehicles', 'canWrite')).toBeNull()
    expect((await requirePermission(makeUser('admin'), 'vehicles', 'canDelete'))?.status).toBe(403)
  })

  it('falls back to read-only defaults for viewer when the matrix has no row for the role', async () => {
    whereMock.mockResolvedValue([])
    const { requirePermission } = await import('./permissions')

    expect(await requirePermission(makeUser('viewer'), 'vehicles', 'canRead')).toBeNull()
    expect((await requirePermission(makeUser('viewer'), 'vehicles', 'canWrite'))?.status).toBe(403)
  })

  it('ignores DB rows for a resource outside the known PermResource list', async () => {
    whereMock.mockResolvedValue([
      { resource: 'not-a-real-resource', canRead: true, canWrite: true, canDelete: true },
    ])
    const { requirePermission } = await import('./permissions')

    // the bogus row must not leak into 'vehicles' — admin default (no delete) still applies
    expect((await requirePermission(makeUser('admin'), 'vehicles', 'canDelete'))?.status).toBe(403)
  })

  it('applies the DB override only to the resource it names, leaving others on role defaults', async () => {
    whereMock.mockResolvedValue([{ resource: 'billing', canRead: true, canWrite: false, canDelete: false }])
    const { requirePermission } = await import('./permissions')

    // billing write explicitly revoked for admin via the override row
    expect((await requirePermission(makeUser('admin'), 'billing', 'canWrite'))?.status).toBe(403)
    // vehicles untouched by the override — admin default (write yes, delete no) still applies
    expect(await requirePermission(makeUser('admin'), 'vehicles', 'canWrite')).toBeNull()
  })
})
