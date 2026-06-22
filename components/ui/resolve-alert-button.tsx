'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

interface ResolveAlertButtonProps {
  alertId: string
  onResolved: (id: string) => void
  className?: string
  iconClassName?: string
  // Dashboard feed cards want the icon dimmed until hover (it sits inline with text);
  // table action cells want full opacity to match the other ActionButtons in the row.
  dim?: boolean
}

// Renders as a span with role="button", not a real <button> — callers may nest
// this inside a <Link> (an <a>), and a <button> nested inside <a> is invalid
// HTML5 nesting (interactive content inside <a>). The browser's parser auto-closes
// the anchor early during SSR when it hits a real <button>, which breaks layout/hydration.
export default function ResolveAlertButton({ alertId, onResolved, className = '', iconClassName = '', dim = true }: ResolveAlertButtonProps) {
  const [resolving, setResolving] = useState(false)

  async function handleResolve(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (resolving) return
    setResolving(true)
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      })
      if (res.ok) onResolved(alertId)
    } finally {
      setResolving(false)
    }
  }

  return (
    <span
      role="button"
      tabIndex={0}
      title="Resolve"
      aria-disabled={resolving}
      onClick={handleResolve}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') handleResolve(e)
      }}
      className={`cursor-pointer ${dim ? 'opacity-50 hover:opacity-100' : ''} ${resolving ? 'opacity-30 pointer-events-none' : ''} transition-opacity ${className}`}
    >
      {resolving ? <Loader2 className={`w-3.5 h-3.5 animate-spin ${iconClassName}`} /> : <Check className={`w-3.5 h-3.5 ${iconClassName}`} />}
    </span>
  )
}
