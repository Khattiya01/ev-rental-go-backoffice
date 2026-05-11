import 'server-only'
import { cache } from 'react'
import { getSession } from '@/lib/session'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'viewer'
}

/**
 * Get the currently logged-in user from session + DB.
 * Cached per request (React cache). Returns null if not authenticated.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession()
  if (!session) return null

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)

  return user ?? null
})
