'use client'

import { Loader2 } from 'lucide-react'

interface ToggleProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  loading?: boolean
  label?: string
}

export default function Toggle({ checked, onChange, disabled = false, loading = false, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled || loading}
      className={`relative inline-flex shrink-0 h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        checked ? 'bg-violet-600' : 'bg-slate-200'
      }`}
    >
      {loading ? (
        <Loader2 size={10} className="mx-auto animate-spin text-white" />
      ) : (
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`} />
      )}
    </button>
  )
}
