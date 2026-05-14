import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { registrationLinks } from '@/db/schema'
import { uploadFile } from '@/lib/storage'

const PORTAL_ORIGIN = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.ev-rental.com'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': PORTAL_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function POST(request: Request): Promise<NextResponse> {
  const cors = corsHeaders()
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401, headers: cors })
  }

  const [link] = await db
    .select()
    .from(registrationLinks)
    .where(eq(registrationLinks.token, token))
    .limit(1)

  if (!link || link.usedAt || link.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401, headers: cors })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400, headers: cors })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400, headers: cors })
  }

  try {
    const result = await uploadFile(file, 'customers')
    return NextResponse.json(result, { status: 201, headers: cors })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 400, headers: cors })
  }
}
