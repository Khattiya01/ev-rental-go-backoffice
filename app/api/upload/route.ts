import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/dal'
import { uploadFile } from '@/lib/storage'

export async function POST(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided. Use field name "file".' }, { status: 400 })
  }

  try {
    const result = await uploadFile(file)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
