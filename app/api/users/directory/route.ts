import { NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'
import { asc } from 'drizzle-orm'

// Minimal user directory — accessible to any user with vehicles.canRead
// Used for selecting alert recipients in geofence zone configuration
export async function GET(): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'vehicles', 'canRead')
  if (denied) return denied

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .orderBy(asc(users.name))

  return NextResponse.json(rows)
}
