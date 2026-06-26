import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

const mkdirMock = vi.fn().mockResolvedValue(undefined)
const writeFileMock = vi.fn().mockResolvedValue(undefined)
const unlinkMock = vi.fn().mockResolvedValue(undefined)

vi.mock('fs/promises', () => {
  const impl = { mkdir: mkdirMock, writeFile: writeFileMock, unlink: unlinkMock }
  return { ...impl, default: impl }
})

function makeFile(bytes: number, type = 'image/jpeg', name = 'photo.jpg'): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe('uploadFile', () => {
  beforeEach(() => {
    mkdirMock.mockClear()
    writeFileMock.mockClear()
    delete process.env.STORAGE_PROVIDER
  })

  it('rejects a MIME type outside the allowlist before touching the filesystem', async () => {
    const { uploadFile } = await import('./storage')
    const file = makeFile(100, 'application/zip', 'archive.zip')

    await expect(uploadFile(file)).rejects.toThrow('Invalid file type')
    expect(mkdirMock).not.toHaveBeenCalled()
  })

  it('rejects a file over the 10 MB limit', async () => {
    const { uploadFile } = await import('./storage')
    const file = makeFile(10 * 1024 * 1024 + 1)

    await expect(uploadFile(file)).rejects.toThrow('File too large')
    expect(mkdirMock).not.toHaveBeenCalled()
  })

  it('accepts a file exactly at the 10 MB limit', async () => {
    const { uploadFile } = await import('./storage')
    const file = makeFile(10 * 1024 * 1024)

    await expect(uploadFile(file)).resolves.toEqual({
      url: expect.any(String),
      key: expect.any(String),
    })
  })

  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['image/gif', 'gif'],
    ['application/pdf', 'pdf'],
  ])('accepts %s and maps it to .%s', async (mime, ext) => {
    const { uploadFile } = await import('./storage')
    const file = makeFile(100, mime, 'doc')

    const result = await uploadFile(file, 'customers')

    expect(result.key).toMatch(new RegExp(`^customers/[0-9a-f-]+\\.${ext}$`))
    expect(result.url).toBe(`/uploads/${result.key}`)
  })

  it('writes through the local adapter by default (mkdir + writeFile)', async () => {
    const { uploadFile } = await import('./storage')
    await uploadFile(makeFile(100), 'vehicles')

    expect(mkdirMock).toHaveBeenCalledTimes(1)
    expect(writeFileMock).toHaveBeenCalledTimes(1)
  })

  it('throws the unconfigured-stub error when STORAGE_PROVIDER=s3', async () => {
    process.env.STORAGE_PROVIDER = 's3'
    const { uploadFile } = await import('./storage')

    await expect(uploadFile(makeFile(100))).rejects.toThrow('S3 provider is not yet configured')
  })
})

describe('deleteFile', () => {
  beforeEach(() => {
    unlinkMock.mockClear()
    unlinkMock.mockResolvedValue(undefined)
    delete process.env.STORAGE_PROVIDER
  })

  it('unlinks the local file by key', async () => {
    const { deleteFile } = await import('./storage')
    await deleteFile('vehicles/abc.jpg')

    expect(unlinkMock).toHaveBeenCalledTimes(1)
    const [calledPath] = unlinkMock.mock.calls[0]
    expect(calledPath).toBe(path.join(process.cwd(), 'public', 'uploads', 'vehicles/abc.jpg'))
  })

  it('silently ignores a missing file instead of throwing', async () => {
    unlinkMock.mockRejectedValueOnce(new Error('ENOENT'))
    const { deleteFile } = await import('./storage')

    await expect(deleteFile('vehicles/already-gone.jpg')).resolves.toBeUndefined()
  })

  it('is a no-op for the s3 provider (deletion not yet implemented)', async () => {
    process.env.STORAGE_PROVIDER = 's3'
    const { deleteFile } = await import('./storage')

    await expect(deleteFile('vehicles/abc.jpg')).resolves.toBeUndefined()
    expect(unlinkMock).not.toHaveBeenCalled()
  })
})
