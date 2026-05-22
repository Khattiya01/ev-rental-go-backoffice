'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function BackofficeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 border border-red-100">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-slate-800 text-lg font-semibold mb-1">เกิดข้อผิดพลาด</h2>
        <p className="text-slate-500 text-sm max-w-sm">
          {error.message || 'ไม่สามารถโหลดหน้านี้ได้ กรุณาลองใหม่อีกครั้ง'}
        </p>
        {error.digest && (
          <p className="text-slate-400 text-xs mt-1 font-mono">ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
      >
        ลองใหม่
      </button>
    </div>
  )
}
