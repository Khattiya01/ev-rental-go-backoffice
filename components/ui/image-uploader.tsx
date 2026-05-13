'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ImageUploaderProps {
  value: string
  onChange: (url: string) => void
  label?: string
  folder?: string
}

type UploadState = 'idle' | 'uploading' | 'error'

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif'

export default function ImageUploader({ value, onChange, label = 'Photo', folder = 'vehicles' }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const t = useTranslations('common.imageUploader')
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  async function handleFile(file: File) {
    setUploadState('uploading')
    setErrorMsg('')

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch(`/api/upload?folder=${folder}`, { method: 'POST', body: form })
      const data = await res.json() as { url?: string; error?: string }

      if (!res.ok || !data.url) {
        setErrorMsg(data.error ?? t('uploadError'))
        setUploadState('error')
        return
      }

      onChange(data.url)
      setUploadState('idle')
    } catch {
      setErrorMsg(t('networkError'))
      setUploadState('error')
    }
  }

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    // reset so same file can be re-selected
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
    setUploadState('idle')
    setErrorMsg('')
  }

  return (
    <div className="space-y-2">
      <p className="block text-sm font-medium text-slate-700">{label}</p>

      {value ? (
        /* ── Preview ── */
        <div className="relative w-full max-w-xs group">
          <img
            src={value}
            alt="Vehicle"
            className="w-full h-44 object-cover rounded-xl border border-slate-200"
            onError={e => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
            title={t('removeTitle')}
          >
            <X size={13} />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          >
            <Upload size={12} />
            {t('replace')}
          </button>
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 w-full h-44 rounded-xl border-2 border-dashed cursor-pointer transition-colors
            ${isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
        >
          {uploadState === 'uploading' ? (
            <>
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-slate-500 text-sm">{t('uploading')}</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                <ImageIcon size={20} className="text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-slate-600 text-sm font-medium">
                  {t('dropOrBrowse')} <span className="text-blue-500">{t('browse')}</span>
                </p>
                <p className="text-slate-400 text-xs mt-0.5">{t('hint')}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={onInputChange}
      />

      {/* Error message */}
      {uploadState === 'error' && errorMsg && (
        <p className="text-red-500 text-xs">{errorMsg}</p>
      )}
    </div>
  )
}
