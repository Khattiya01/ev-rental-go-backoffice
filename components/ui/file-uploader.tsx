'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, X, FileText, Loader2 } from 'lucide-react'

interface FileUploaderProps {
  value: string
  onChange: (url: string) => void
  label?: string
  folder?: string
  accept?: string
  hint?: string
}

type UploadState = 'idle' | 'uploading' | 'error'

export default function FileUploader({
  value,
  onChange,
  label = 'Document',
  folder = 'contracts',
  accept = 'application/pdf',
  hint = 'PDF up to 10 MB',
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileName, setFileName] = useState('')

  async function handleFile(file: File) {
    setUploadState('uploading')
    setErrorMsg('')
    setFileName(file.name)

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch(`/api/upload?folder=${folder}`, { method: 'POST', body: form })
      const data = await res.json() as { url?: string; error?: string }

      if (!res.ok || !data.url) {
        setErrorMsg(data.error ?? 'Upload failed')
        setUploadState('error')
        return
      }

      onChange(data.url)
      setUploadState('idle')
    } catch {
      setErrorMsg('Network error — please try again')
      setUploadState('error')
    }
  }

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRemove() {
    onChange('')
    setFileName('')
    setUploadState('idle')
    setErrorMsg('')
  }

  const displayName = fileName || (value ? value.split('/').pop() : '')

  return (
    <div className="space-y-2">
      {label && <p className="block text-sm font-medium text-slate-700">{label}</p>}

      {value ? (
        /* ── File preview ── */
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{displayName || 'เอกสารสัญญา'}</p>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              เปิดดูเอกสาร →
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-blue-200 hover:border-blue-400 text-blue-600 text-xs rounded-lg font-medium transition-colors"
            >
              <Upload size={12} />
              เปลี่ยน
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50'
          }`}
        >
          {uploadState === 'uploading' ? (
            <>
              <Loader2 size={24} className="text-blue-500 animate-spin" />
              <p className="text-slate-500 text-sm">กำลังอัปโหลด...</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                <FileText size={20} className="text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-slate-600 text-sm font-medium">
                  วางไฟล์ที่นี่ หรือ <span className="text-blue-500">คลิกเพื่อเลือก</span>
                </p>
                <p className="text-slate-400 text-xs mt-0.5">{hint}</p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
      />

      {uploadState === 'error' && errorMsg && (
        <p className="text-red-500 text-xs">{errorMsg}</p>
      )}
    </div>
  )
}
