'use server'

import { redirect } from 'next/navigation'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'

export type LoginState = {
  error?: string
} | undefined

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (!user) {
    return { error: 'Invalid email or password' }
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatch) {
    return { error: 'Invalid email or password' }
  }

  await createSession(user.id, user.role)
  redirect('/dashboard')
}

export async function logout(): Promise<void> {
  const { deleteSession } = await import('@/lib/session')
  await deleteSession()
  redirect('/login')
}
