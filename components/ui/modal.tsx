'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, Trash2, CheckCircle, Info, type LucideIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalVariant = 'default' | 'danger' | 'warning' | 'success' | 'info'
export type ModalSize    = 'sm' | 'md' | 'lg' | 'xl'

// ─── Config maps ─────────────────────────────────────────────────────────────

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

const VARIANT_ICON: Record<ModalVariant, LucideIcon> = {
  default: Info,
  info:    Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger:  Trash2,
}

const VARIANT_ICON_BG: Record<ModalVariant, string> = {
  default: 'bg-blue-100   text-blue-600',
  info:    'bg-blue-100   text-blue-600',
  success: 'bg-green-100  text-green-600',
  warning: 'bg-amber-100  text-amber-600',
  danger:  'bg-red-100    text-red-600',
}

const VARIANT_BTN: Record<ModalVariant, string> = {
  default: 'bg-blue-600  hover:bg-blue-700  focus-visible:ring-blue-500',
  info:    'bg-blue-600  hover:bg-blue-700  focus-visible:ring-blue-500',
  success: 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-500',
  warning: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500',
  danger:  'bg-red-600   hover:bg-red-700   focus-visible:ring-red-500',
}

// ─── Portal mount helper ──────────────────────────────────────────────────────
// Renders children into document.body so position:fixed escapes all parent
// stacking contexts (including Leaflet's z-index:1000 control container).

function PortalMount({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

// ─── Shared backdrop + scroll-lock ────────────────────────────────────────────

function useModalBase(isOpen: boolean, onClose: () => void, closeOnBackdrop = true) {
  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  return { handleBackdrop: closeOnBackdrop ? onClose : undefined }
}

// ─── Base Modal ───────────────────────────────────────────────────────────────

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  size?: ModalSize
  variant?: ModalVariant
  icon?: LucideIcon
  closeOnBackdrop?: boolean
  /** Hide the default header close (×) button */
  hideClose?: boolean
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant,
  icon,
  closeOnBackdrop = true,
  hideClose = false,
}: ModalProps) {
  const { handleBackdrop } = useModalBase(isOpen, onClose, closeOnBackdrop)

  if (!isOpen) return null

  const showIconBadge = variant && variant !== 'default'
  const IconComp = icon ?? (showIconBadge ? VARIANT_ICON[variant!] : null)

  return (
    <PortalMount>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleBackdrop}
        />

        {/* Dialog */}
        <div
          className={`relative z-10 w-full ${SIZE_CLASS[size]} bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="flex items-start gap-3 p-5 border-b border-slate-100 shrink-0">
            {IconComp && (
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${variant ? VARIANT_ICON_BG[variant] : 'bg-blue-100 text-blue-600'}`}>
                <IconComp className="w-4.5 h-4.5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 id="modal-title" className="text-slate-800 font-semibold text-base leading-snug">
                {title}
              </h2>
              {description && (
                <p className="text-slate-500 text-sm mt-0.5 leading-relaxed">{description}</p>
              )}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Scrollable body */}
          {children && (
            <div className="flex-1 overflow-y-auto p-5">
              {children}
            </div>
          )}

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-2.5 p-5 pt-0 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </PortalMount>
  )
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
// Simple yes/no modal for delete, irreversible actions, etc.

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ModalVariant
  loading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      variant={variant}
      hideClose
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${VARIANT_BTN[variant]}`}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Processing…
              </span>
            ) : confirmLabel}
          </button>
        </>
      }
    />
  )
}

// ─── Button helpers (for use in footer prop) ──────────────────────────────────

interface ModalButtonProps {
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  variant?: ModalVariant
  type?: 'button' | 'submit'
  form?: string
}

export function ModalPrimaryButton({ onClick, disabled, loading, children, variant = 'default', type = 'button', form }: ModalButtonProps) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${VARIANT_BTN[variant]}`}
    >
      {loading ? (
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Saving…
        </span>
      ) : children}
    </button>
  )
}

export function ModalSecondaryButton({ onClick, disabled, children, type = 'button' }: ModalButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  )
}
