import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/dal'

export async function GET(): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    id:    currentUser.id,
    name:  currentUser.name,
    email: currentUser.email,
    role:  currentUser.role,
  })
}
