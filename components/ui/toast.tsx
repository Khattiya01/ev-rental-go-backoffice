'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  description?: string
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, description?: string) => void
  success: (message: string, description?: string) => void
  error: (message: string, description?: string) => void
  warning: (message: string, description?: string) => void
  info: (message: string, description?: string) => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Config ──────────────────────────────────────────────────────────────────

const DURATION_MS = 4000

const typeConfig: Record<ToastType, {
  icon: React.ElementType
  accent: string        // left bar + progress bar color
  iconBg: string        // icon circle background
  iconColor: string     // icon color
}> = {
  success: {
    icon: CheckCircle2,
    accent: 'bg-emerald-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  error: {
    icon: XCircle,
    accent: 'bg-red-500',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
  },
  warning: {
    icon: AlertTriangle,
    accent: 'bg-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  info: {
    icon: Info,
    accent: 'bg-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, message: string, description?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message, description }])
    setTimeout(() => dismiss(id), DURATION_MS)
  }, [dismiss])

  const success = useCallback((message: string, description?: string) => toast('success', message, description), [toast])
  const error   = useCallback((message: string, description?: string) => toast('error',   message, description), [toast])
  const warning = useCallback((message: string, description?: string) => toast('warning', message, description), [toast])
  const info    = useCallback((message: string, description?: string) => toast('info',    message, description), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}

      {/* Progress bar keyframe */}
      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Toast container — bottom-right */}
      <div className="fixed bottom-5 right-5 z-[10000] flex flex-col-reverse gap-2 w-[340px] pointer-events-none">
        {toasts.map(t => {
          const cfg = typeConfig[t.type]
          const Icon = cfg.icon
          return (
            <div
              key={t.id}
              className="pointer-events-auto relative flex items-center gap-3 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden pr-4 pl-5 py-3.5"
              style={{ animation: 'toast-slide-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              {/* Left accent bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.accent}`} />

              {/* Icon circle */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
                <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
              </div>

              {/* Message + description */}
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 text-sm font-medium leading-snug">{t.message}</p>
                {t.description && (
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{t.description}</p>
                )}
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Progress bar */}
              <div
                className={`absolute bottom-0 left-0 right-0 h-0.5 origin-left ${cfg.accent} opacity-40`}
                style={{ animation: `toast-progress ${DURATION_MS}ms linear forwards` }}
              />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
