import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { rolePermissions } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import type { AdminRole } from '@/lib/types'

const ROLES: AdminRole[] = ['super_admin', 'admin', 'viewer']
const RESOURCES = ['vehicles', 'customers', 'contracts', 'billing', 'maintenance', 'reports', 'settings'] as const
type Resource = typeof RESOURCES[number]

type PermEntry = { canRead: boolean; canWrite: boolean; canDelete: boolean }
type PermMatrix = Record<AdminRole, Record<Resource, PermEntry>>

function buildDefaults(): PermMatrix {
  const matrix = {} as PermMatrix
  for (const role of ROLES) {
    matrix[role] = {} as Record<Resource, PermEntry>
    for (const resource of RESOURCES) {
      if (role === 'super_admin') {
        matrix[role][resource] = { canRead: true, canWrite: true, canDelete: true }
      } else if (role === 'admin') {
        matrix[role][resource] = { canRead: true, canWrite: true, canDelete: false }
      } else {
        matrix[role][resource] = { canRead: true, canWrite: false, canDelete: false }
      }
    }
  }
  return matrix
}

export async function GET(): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(rolePermissions)

  if (rows.length === 0) {
    return NextResponse.json({ permissions: buildDefaults() })
  }

  const matrix = buildDefaults()
  for (const row of rows) {
    const role = row.role as AdminRole
    const resource = row.resource as Resource
    if (ROLES.includes(role) && RESOURCES.includes(resource)) {
      matrix[role][resource] = {
        canRead:   row.canRead,
        canWrite:  row.canWrite,
        canDelete: row.canDelete,
      }
    }
  }

  return NextResponse.json({ permissions: matrix })
}

export async function PUT(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (currentUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super_admin can modify permissions' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = (body as Record<string, unknown>).permissions as Record<string, unknown>
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ error: 'permissions object required' }, { status: 400 })
  }

  const rows: { role: string; resource: Resource; canRead: boolean; canWrite: boolean; canDelete: boolean }[] = []

  for (const role of ROLES) {
    const roleData = raw[role] as Record<string, unknown>
    if (!roleData) continue
    for (const resource of RESOURCES) {
      const entry = roleData[resource] as Record<string, unknown>
      if (!entry) continue
      rows.push({
        role,
        resource,
        canRead:   entry.canRead  === true,
        canWrite:  entry.canWrite === true,
        canDelete: entry.canDelete === true,
      })
    }
  }

  for (const row of rows) {
    await db
      .insert(rolePermissions)
      .values({ ...row, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [rolePermissions.role, rolePermissions.resource],
        set: { canRead: row.canRead, canWrite: row.canWrite, canDelete: row.canDelete, updatedAt: new Date() },
      })
  }

  return NextResponse.json({ ok: true })
}
