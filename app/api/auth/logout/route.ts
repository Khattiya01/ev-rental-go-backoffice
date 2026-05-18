import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session'

export async function POST(): Promise<NextResponse> {
  await deleteSession()
  return new NextResponse(null, { status: 204 })
}
