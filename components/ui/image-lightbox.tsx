'use client'

import { useEffect, useCallback } from 'react'
import { X, ZoomIn } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  label?: string
  onClose: () => void
}

export default function ImageLightbox({ src, label, onClose }: ImageLightboxProps) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [handleKey])

  return (
    <div
      className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
        aria-label="Close preview"
      >
        <X size={20} />
      </button>

      <div
        className="relative flex flex-col items-center gap-3 max-w-4xl w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label ?? 'Preview'}
          className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
        />
        {label && (
          <p className="text-white/60 text-sm">{label}</p>
        )}
      </div>
    </div>
  )
}

// Wrapper to make any image clickable with consistent styling
interface ClickableImageProps {
  src: string
  alt: string
  className?: string
  onClick: () => void
}

export function ClickableImage({ src, alt, className, onClick }: ClickableImageProps) {
  return (
    <div className="relative group cursor-zoom-in" onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={className} />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl flex items-center justify-center">
        <ZoomIn size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
      </div>
    </div>
  )
}
