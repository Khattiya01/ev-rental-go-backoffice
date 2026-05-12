'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, X, ImageIcon, Star } from 'lucide-react'

interface MultiImageUploaderProps {
  value: string[]
  onChange: (urls: string[]) => void
  label?: string
  max?: number
}

type SlotState = 'idle' | 'uploading' | 'error'

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif'

export default function MultiImageUploader({
  value,
  onChange,
  label = 'Vehicle Photos',
  max = 10,
}: MultiImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [slotState, setSlotState] = useState<SlotState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  async function uploadFile(file: File): Promise<string | null> {
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setErrorMsg(data.error ?? 'Upload failed.')
        return null
      }
      return data.url
    } catch {
      setErrorMsg('Network error. Please try again.')
      return null
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const fileArr = Array.from(files)
    const remaining = max - value.length
    if (remaining <= 0) return

    const toUpload = fileArr.slice(0, remaining)
    setSlotState('uploading')
    setErrorMsg('')

    const results = await Promise.all(toUpload.map(f => uploadFile(f)))
    const uploaded = results.filter((u): u is string => u !== null)

    if (uploaded.length > 0) {
      onChange([...value, ...uploaded])
    }

    setSlotState(results.some(r => r === null) ? 'error' : 'idle')
  }

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) void handleFiles(e.target.files)
    e.target.value = ''
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function removeImage(index: number) {
    const next = value.filter((_, i) => i !== index)
    onChange(next)
    setErrorMsg('')
  }

  function setCover(index: number) {
    if (index === 0) return
    const next = [...value]
    const [picked] = next.splice(index, 1)
    onChange([picked, ...next])
  }

  const canAddMore = value.length < max

  return (
    <div className="space-y-2">
      <p className="block text-sm font-medium text-slate-700">
        {label}
        <span className="text-slate-400 font-normal ml-1.5">({value.length}/{max})</span>
      </p>

      <div className="flex flex-wrap gap-3">
        {/* Existing images */}
        {value.map((url, i) => (
          <div key={url} className="relative group w-32 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
            <img
              src={url}
              alt={`Photo ${i + 1}`}
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }}
            />

            {/* Cover badge */}
            {i === 0 && (
              <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-amber-400 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                <Star size={9} fill="white" />
                Cover
              </div>
            )}

            {/* Hover actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => setCover(i)}
                  title="Set as cover"
                  className="w-7 h-7 rounded-full bg-amber-400 hover:bg-amber-500 text-white flex items-center justify-center transition-colors"
                >
                  <Star size={12} fill="white" />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                title="Remove"
                className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}

        {/* Add more zone */}
        {canAddMore && (
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => inputRef.current?.click()}
            className={`flex-shrink-0 w-32 h-24 rounded-xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center gap-1
              ${isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
          >
            {slotState === 'uploading' ? (
              <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            ) : (
              <>
                <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                  <ImageIcon size={16} className="text-slate-400" />
                </div>
                <div className="text-center px-1">
                  <p className="text-slate-500 text-[11px] font-medium leading-tight">
                    Add photo
                  </p>
                  <p className="text-slate-400 text-[10px] mt-0.5">or drag here</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={onInputChange}
      />

      {slotState === 'error' && errorMsg && (
        <p className="text-red-500 text-xs">{errorMsg}</p>
      )}

      {value.length > 0 && (
        <p className="text-slate-400 text-xs">
          Hover a photo to set it as cover or remove it. The cover photo appears in the vehicle list.
        </p>
      )}
    </div>
  )
}
