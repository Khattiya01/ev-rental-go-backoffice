import 'server-only'
import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { rolePermissions } from '@/db/schema'
import { NextResponse } from 'next/server'
import type { CurrentUser } from '@/lib/dal'
import type { PermResource, PermEntry, UserPermissions } from '@/lib/types'

const RESOURCES: PermResource[] = [
  'vehicles', 'customers', 'contracts', 'billing', 'maintenance', 'reports', 'settings',
]

const ROLE_DEFAULTS: Record<string, PermEntry> = {
  super_admin: { canRead: true, canWrite: true, canDelete: true },
  admin:       { canRead: true, canWrite: true, canDelete: false },
  viewer:      { canRead: true, canWrite: false, canDelete: false },
}

function buildDefaults(role: string): UserPermissions {
  const d = ROLE_DEFAULTS[role] ?? { canRead: false, canWrite: false, canDelete: false }
  return Object.fromEntries(RESOURCES.map(r => [r, { ...d }])) as UserPermissions
}

// Cached per-request — one DB query per role per request cycle
export const getPermissionsForRole = cache(async (role: string): Promise<UserPermissions> => {
  let rows: { resource: string; canRead: boolean; canWrite: boolean; canDelete: boolean }[]
  try {
    rows = await db
      .select({
        resource: rolePermissions.resource,
        canRead: rolePermissions.canRead,
        canWrite: rolePermissions.canWrite,
        canDelete: rolePermissions.canDelete,
      })
      .from(rolePermissions)
      .where(eq(rolePermissions.role, role))
  } catch {
    return buildDefaults(role)
  }

  const perms = buildDefaults(role)
  for (const row of rows) {
    const resource = row.resource as PermResource
    if ((RESOURCES as string[]).includes(resource)) {
      perms[resource] = { canRead: row.canRead, canWrite: row.canWrite, canDelete: row.canDelete }
    }
  }
  return perms
})

/**
 * Check if `user` is allowed to perform `action` on `resource`.
 * Returns a 403 NextResponse if denied, null if allowed.
 * super_admin always bypasses the matrix.
 */
export async function requirePermission(
  user: CurrentUser,
  resource: PermResource,
  action: keyof PermEntry,
): Promise<NextResponse | null> {
  if (user.role === 'super_admin') return null

  const perms = await getPermissionsForRole(user.role)
  if (!perms[resource][action]) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }
  return null
}
