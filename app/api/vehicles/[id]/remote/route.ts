import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { users, vehicles, auditLogs } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'

const VALID_ACTIONS = ['cutoff', 'restore', 'reset'] as const
type RemoteAction = typeof VALID_ACTIONS[number]

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'vehicles', 'canWrite')
  if (denied) return denied

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, password } = body

  if (typeof action !== 'string' || !(VALID_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    )
  }

  // cutoff and restore both require password re-verification
  if (action === 'cutoff' || action === 'restore') {
    if (typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Password is required for this action' }, { status: 400 })
    }

    const [userRecord] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1)

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const passwordMatch = await bcrypt.compare(password, userRecord.passwordHash)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }
  }

  // Verify vehicle exists
  const [vehicle] = await db
    .select({ id: vehicles.id, plate: vehicles.plate })
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1)

  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }

  // Update motorCutoffActive state in DB (bump version so edit-form optimistic
  // locks see the change).
  if (action === 'cutoff') {
    await db.update(vehicles).set({ motorCutoffActive: true, version: sql`${vehicles.version} + 1` }).where(eq(vehicles.id, id))
  } else if (action === 'restore') {
    await db.update(vehicles).set({ motorCutoffActive: false, version: sql`${vehicles.version} + 1` }).where(eq(vehicles.id, id))
  }

  // Log to audit_log
  await db.insert(auditLogs).values({
    adminId: currentUser.id,
    action: `vehicle.remote.${action}`,
    entityType: 'vehicle',
    entityId: id,
    metadata: { plate: vehicle.plate, adminName: currentUser.name },
  })

  return NextResponse.json({ success: true, action: action as RemoteAction, vehicleId: id })
}
