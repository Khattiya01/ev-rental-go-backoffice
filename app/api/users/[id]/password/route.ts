import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: { newPassword?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { newPassword } = body

  if (!newPassword || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'newPassword is required' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)

  const [updated] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, id))
    .returning({ id: users.id })

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
