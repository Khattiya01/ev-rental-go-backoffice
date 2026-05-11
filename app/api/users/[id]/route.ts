import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'

const VALID_ROLES = ['super_admin', 'admin', 'viewer'] as const

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: { name?: unknown; role?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, role } = body

  if (name === undefined && role === undefined) {
    return NextResponse.json({ error: 'At least one of name or role is required' }, { status: 400 })
  }

  const fields: { name?: string; role?: typeof VALID_ROLES[number] } = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
    }
    fields.name = name.trim()
  }

  if (role !== undefined) {
    if (typeof role !== 'string' || !(VALID_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
    }
    fields.role = role as typeof VALID_ROLES[number]
  }

  if (fields.role && fields.role !== 'super_admin' && currentUser.id === id) {
    return NextResponse.json({ error: 'Cannot downgrade your own role' }, { status: 400 })
  }

  let rows: { id: string; name: string; email: string; role: typeof VALID_ROLES[number]; createdAt: Date }[]
  try {
    rows = await db
      .update(users)
      .set(fields)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const updated = rows[0]
  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  if (currentUser.id === id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id })

  if (!deleted) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
