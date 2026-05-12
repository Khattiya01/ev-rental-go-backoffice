/**
 * Storage abstraction layer.
 *
 * Dev  (STORAGE_PROVIDER=local, default): writes to public/uploads/
 * Prod (STORAGE_PROVIDER=s3):             uploads to AWS S3
 *
 * Only the server-side API route (/api/upload) imports this module.
 */

import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export interface StorageResult {
  url: string
  key: string
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function uploadFile(file: File): Promise<StorageResult> {
  if (!ALLOWED_TYPES[file.type]) {
    throw new Error('Invalid file type. Only JPEG, PNG, WebP and GIF are allowed.')
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File too large. Maximum allowed size is ${MAX_SIZE_BYTES / 1024 / 1024} MB.`)
  }

  const provider = process.env.STORAGE_PROVIDER ?? 'local'

  if (provider === 's3') {
    return uploadToS3(file)
  }

  return uploadToLocal(file)
}

export async function deleteFile(key: string): Promise<void> {
  const provider = process.env.STORAGE_PROVIDER ?? 'local'

  if (provider === 's3') {
    // TODO: implement S3 deletion when ready
    return
  }

  try {
    await fs.unlink(path.join(process.cwd(), 'public', 'uploads', key))
  } catch {
    // Ignore — file may already be gone
  }
}

// ---------------------------------------------------------------------------
// Local adapter (dev)
// ---------------------------------------------------------------------------

async function uploadToLocal(file: File): Promise<StorageResult> {
  const ext = ALLOWED_TYPES[file.type] ?? 'jpg'
  const key = `vehicles/${crypto.randomUUID()}.${ext}`
  const destDir = path.join(process.cwd(), 'public', 'uploads', 'vehicles')

  await fs.mkdir(destDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(path.join(process.cwd(), 'public', 'uploads', key), buffer)

  return { url: `/uploads/${key}`, key }
}

// ---------------------------------------------------------------------------
// S3 adapter (production) — stub, fill in when AWS credentials are ready
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function uploadToS3(_file: File): Promise<StorageResult> {
  /**
   * When ready, install: pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   *
   * Required env vars:
   *   AWS_REGION
   *   AWS_ACCESS_KEY_ID
   *   AWS_SECRET_ACCESS_KEY
   *   S3_BUCKET_NAME
   *
   * Then replace this stub with:
   *
   * const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
   * const client = new S3Client({ region: process.env.AWS_REGION })
   * const ext = ALLOWED_TYPES[file.type] ?? 'jpg'
   * const key = `vehicles/${crypto.randomUUID()}.${ext}`
   * const buffer = Buffer.from(await file.arrayBuffer())
   * await client.send(new PutObjectCommand({
   *   Bucket: process.env.S3_BUCKET_NAME,
   *   Key: key,
   *   Body: buffer,
   *   ContentType: file.type,
   * }))
   * return {
   *   key,
   *   url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
   * }
   */
  throw new Error('S3 provider is not yet configured. Set STORAGE_PROVIDER=local for development.')
}
