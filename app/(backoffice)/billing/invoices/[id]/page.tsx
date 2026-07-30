'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, Clock, AlertTriangle, Check,
  Loader2, Pencil, Trash2, X, Banknote, FileText, Eye,
  Receipt, Copy, CheckCheck, Download,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import generatePayload from 'promptpay-qr'
import type { Invoice, BillingType, InvoiceStatus, PaymentStatus, PaymentMethod } from '@/lib/types'
import { useToast } from '@/components/ui/toast'
import ImageUploader from '@/components/ui/image-uploader'
import ImageLightbox from '@/components/ui/image-lightbox'
import { useCanWrite, useCanDelete } from '@/lib/user-context'
import PageHeader from '@/components/ui/page-header'
import SectionCard from '@/components/ui/section-card'
import logoAsset from '@/public/images/logo.png'

const PROMPTPAY_DEFAULTS = { promptpayId: '', promptpayName: '' }

// Web-safe font stack for canvas text — page fonts (Geist) aren't inherited by
// canvas, so we list system fonts with native Thai coverage across platforms:
// "Leelawadee UI" (Windows), "Thonburi" (macOS), "Noto Sans Thai" (Linux/Chrome
// OS, if installed). Best-effort only: falls back to whichever installed system
// font actually covers Thai glyphs — there's no guarantee without loading a
// dedicated webfont for canvas use.
const SLIP_FONT_STACK = '"Segoe UI", "Leelawadee UI", "Noto Sans Thai", "Thonburi", "Sukhumvit Set", Tahoma, Arial, sans-serif'

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0 })
}

function formatSlipExpiry(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

// Same convention as formatSlipExpiry, plus year — unlike a same-day QR expiry,
// payment history is a permanent record that can span multiple years.
function formatPaymentDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

function traceRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  paid: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
}
const STATUS_ICON: Record<InvoiceStatus, React.ReactNode> = {
  paid: <CheckCircle2 size={13} />,
  pending: <Clock size={13} />,
  overdue: <AlertTriangle size={13} />,
}
const BILLING_TYPE_COLOR: Record<BillingType, string> = {
  daily: 'bg-sky-100 text-sky-700 border-sky-200',
  monthly: 'bg-violet-100 text-violet-700 border-violet-200',
  one_time: 'bg-amber-100 text-amber-700 border-amber-200',
}

// Payment attempt status — same color tokens as STATUS_STYLE (green/amber/red),
// plus a muted slate tone for the two terminal-but-inactive states.
const PAYMENT_STATUS_STYLE: Record<PaymentStatus, string> = {
  succeeded: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  canceled: 'bg-slate-100 text-slate-500 border-slate-200',
  expired: 'bg-slate-100 text-slate-500 border-slate-200',
}
const PAYMENT_STATUS_ICON: Record<PaymentStatus, React.ReactNode> = {
  succeeded: <CheckCircle2 size={13} />,
  pending: <Clock size={13} />,
  failed: <AlertTriangle size={13} />,
  canceled: <X size={13} />,
  expired: <X size={13} />,
}
// Brand name, written as-is rather than through i18n — matches the hardcoded
// "PromptPay" label already used in the payment channel card above.
const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  promptpay: 'PromptPay',
}

// ─── Edit Modal ───────────────────────────────────────────────
function EditModal({
  invoice, onClose, onSaved,
}: {
  invoice: Invoice
  onClose: () => void
  onSaved: (inv: Invoice) => void
}) {
  const t = useTranslations('invoices.detail.editModal')
  const tBilling = useTranslations('invoices.billingType')
  const { success, error: toastError } = useToast()
  const [form, setForm] = useState({
    customerName: invoice.customerName,
    vehiclePlate: invoice.vehiclePlate ?? '',
    description: invoice.description ?? '',
    billingType: invoice.billingType,
    amount: String(invoice.amount),
    dueDate: invoice.dueDate,
  })
  const [saving, setSaving] = useState(false)

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.customerName.trim()) { toastError(t('validation.customerRequired')); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { toastError(t('validation.amountRequired')); return }
    if (!form.dueDate) { toastError(t('validation.dueDateRequired')); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          vehiclePlate: form.vehiclePlate.trim() || null,
          description: form.description.trim() || null,
          billingType: form.billingType,
          amount,
          dueDate: form.dueDate,
        }),
      })
      if (res.ok) {
        success(t('editSuccess'))
        onSaved(await res.json() as Invoice)
      } else {
        const data = await res.json() as { error?: string }
        toastError(data.error ?? t('genericError'))
      }
    } catch {
      toastError(t('retryError'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors'
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText size={15} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800">{t('title', { invoiceNo: invoice.invoiceNo })}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>{t('customerLabel')} <span className="text-red-500">*</span></label>
              <input type="text" value={form.customerName} onChange={e => set('customerName', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('plateLabel')}</label>
              <input type="text" placeholder={t('platePlaceholder')} value={form.vehiclePlate} onChange={e => set('vehiclePlate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('billingTypeLabel')}</label>
              <select value={form.billingType} onChange={e => set('billingType', e.target.value)} className={inputCls}>
                <option value="monthly">{tBilling('monthly')}</option>
                <option value="daily">{tBilling('daily')}</option>
                <option value="one_time">{tBilling('one_time')}</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>{t('descriptionLabel')}</label>
              <input type="text" value={form.description} onChange={e => set('description', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('amountLabel')} <span className="text-red-500">*</span></label>
              <input type="number" min="1" value={form.amount} onChange={e => set('amount', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('dueDateLabel')} <span className="text-red-500">*</span></label>
              <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">{t('cancel')}</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors">
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Modal ─────────────────────────────────────────────
function DeleteModal({
  invoice, onClose, onDeleted,
}: {
  invoice: Invoice
  onClose: () => void
  onDeleted: () => void
}) {
  const t = useTranslations('invoices.delete')
  const { success, error: toastError } = useToast()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' })
      if (res.status === 204) {
        success(t('deleteSuccess', { invoiceNo: invoice.invoiceNo }))
        onDeleted()
      } else {
        const data = await res.json() as { error?: string }
        toastError(data.error ?? t('genericError'))
      }
    } catch {
      toastError(t('retryError'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{t('title')}</h3>
            <p className="text-slate-500 text-sm">{invoice.invoiceNo} — {invoice.customerName}</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm">{t('confirmText')}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">{t('cancel')}</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-semibold transition-colors">
            {deleting ? t('deleting') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Stripe QR Modal ──────────────────────────────────────────
interface PaymentIntentData {
  paymentIntentId: string
  qrData: string
  qrImagePng: string
  expiresAt: string
  amount: number
}

interface PaymentStatusData {
  invoiceStatus: InvoiceStatus
  paymentStatus: PaymentStatus | null
  receiptUrl: string | null
}

// Mirrors the API's `payments` entry shape (Pick<Payment, ...> with
// createdAt/paidAt pre-converted to ISO strings server-side).
interface PaymentHistoryItem {
  id: string
  status: PaymentStatus
  method: PaymentMethod
  amount: number
  receiptUrl: string | null
  createdAt: string
  paidAt: string | null
}

// Page-level payment-status snapshot (receipt link + full payment history for
// the currently viewed invoice). Distinct from `PaymentStatusData` above —
// that one is StripeQrModal's polling response shape — to avoid future edits
// grabbing the wrong type despite the similar name.
interface InvoicePaymentStatus {
  invoiceId: string
  receiptUrl: string | null
  payments: PaymentHistoryItem[]
}

function StripeQrModal({
  invoice, onClose, onRefresh,
}: {
  invoice: Invoice
  onClose: () => void
  onRefresh: () => void
}) {
  const t = useTranslations('invoices.detail')
  const { success, error: toastError } = useToast()
  const [loading, setLoading] = useState(true)
  const [intentData, setIntentData] = useState<PaymentIntentData | null>(null)
  const [expired, setExpired] = useState(false)
  const [failed, setFailed] = useState(false)
  const [intentLoadFailed, setIntentLoadFailed] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // `isCancelled` lets the mount effect below opt out of applying state
  // updates from a request whose owning effect instance has already been
  // cleaned up (unmount, or React StrictMode's mount → cleanup → mount
  // double-invoke). The retry/"generate new QR" buttons call this directly
  // on click and omit the argument — for them cancellation never applies,
  // so behavior there is unchanged.
  const requestPaymentIntent = useCallback(async (isCancelled: () => boolean = () => false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payment-intent`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json() as PaymentIntentData
        if (isCancelled()) return
        setIntentData(data)
        setExpired(false)
        setFailed(false)
        setIntentLoadFailed(false)
      } else {
        const data = await res.json() as { error?: string }
        if (isCancelled()) return
        toastError(data.error ?? t('toast.paymentIntentError'))
        setIntentLoadFailed(true)
      }
    } catch {
      if (isCancelled()) return
      toastError(t('toast.retryError'))
      setIntentLoadFailed(true)
    } finally {
      if (!isCancelled()) setLoading(false)
    }
  }, [invoice.id, t, toastError])

  useEffect(() => {
    let cancelled = false
    requestPaymentIntent(() => cancelled)
    return () => { cancelled = true }
  }, [requestPaymentIntent])

  // One-shot expiry timer — NOT a recurring poll. Re-armed whenever a fresh
  // `expiresAt` comes in (initial fetch or "Generate New QR").
  const expiresAt = intentData?.expiresAt
  useEffect(() => {
    if (!expiresAt) return
    const msRemaining = new Date(expiresAt).getTime() - Date.now()
    const timer = setTimeout(() => setExpired(true), Math.max(msRemaining, 0))
    return () => clearTimeout(timer)
  }, [expiresAt])

  // Recurring poll — DB-backed status only (no Stripe SDK call), per contract #2.
  // Stops re-arming once the QR expires or the payment fails: `expired`/`failed`
  // flip from the one-shot timer above / the poll's own failed-status branch,
  // and the guard clause below then skips creating a new interval for a dead
  // QR. Also torn down on unmount and the instant payment succeeds.
  useEffect(() => {
    if (!intentData || expired || failed) return
    let errorShown = false
    const interval = setInterval(() => {
      fetch(`/api/invoices/${invoice.id}/payment-status`)
        .then(res => {
          if (!res.ok) throw new Error('poll failed')
          return res.json() as Promise<PaymentStatusData>
        })
        .then(data => {
          if (data.invoiceStatus === 'paid' || data.paymentStatus === 'succeeded') {
            clearInterval(interval)
            success(t('paymentSuccess'))
            onRefresh()
            onClose()
          } else if (data.paymentStatus === 'failed') {
            clearInterval(interval)
            setFailed(true)
          }
        })
        .catch(() => {
          if (!errorShown) {
            errorShown = true
            toastError(t('toast.paymentStatusError'))
          }
        })
    }, 3000)
    return () => clearInterval(interval)
  }, [intentData, expired, failed, invoice.id, onClose, onRefresh, success, t, toastError])

  // Composites the same-origin hidden QR SVG + logo into a branded "payment
  // slip" card. Rejects (via loadImage's onerror) on any image-load failure
  // so downloadStripeQr()'s catch can fall back to the raw Stripe QR image.
  async function buildBrandedSlipCanvas(invoiceNo: string, data: PaymentIntentData): Promise<HTMLCanvasElement> {
    const svg = document.querySelector<SVGSVGElement>('#stripe-slip-qr-source')
    if (!svg) throw new Error('QR source not mounted')
    const svgXml = new XMLSerializer().serializeToString(svg)
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgXml)}`

    const [qrImg, logoImg] = await Promise.all([
      loadImage(svgUrl),
      loadImage(logoAsset.src),
    ])

    const width = 480
    const height = 640
    const headerHeight = 160
    const cardRadius = 24

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context unavailable')

    // White rounded card background
    traceRoundedRect(ctx, 0, 0, width, height, cardRadius)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    // Clip everything below to the card's rounded outline so the header
    // band's top corners pick up the same rounding for free.
    ctx.save()
    traceRoundedRect(ctx, 0, 0, width, height, cardRadius)
    ctx.clip()

    // Header band
    ctx.fillStyle = '#4f46e5'
    ctx.fillRect(0, 0, width, headerHeight)

    // Logo (preserve aspect ratio), centered near the top of the header
    const logoTargetHeight = 44
    const logoRatio = logoImg.naturalWidth && logoImg.naturalHeight
      ? logoImg.naturalWidth / logoImg.naturalHeight
      : 1
    const logoTargetWidth = logoTargetHeight * logoRatio
    const logoX = (width - logoTargetWidth) / 2
    const logoY = 28
    ctx.drawImage(logoImg, logoX, logoY, logoTargetWidth, logoTargetHeight)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    // Subtitle
    ctx.fillStyle = '#ffffff'
    ctx.font = `500 15px ${SLIP_FONT_STACK}`
    ctx.fillText(t('slipSubtitle'), width / 2, logoY + logoTargetHeight + 28)

    // QR code
    const qrSize = 220
    const qrX = (width - qrSize) / 2
    const qrY = headerHeight + 36
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

    // Invoice number
    ctx.fillStyle = '#1e293b'
    ctx.font = `600 15px ${SLIP_FONT_STACK}`
    ctx.fillText(invoiceNo, width / 2, qrY + qrSize + 34)

    // Amount
    ctx.fillStyle = '#16a34a'
    ctx.font = `bold 34px ${SLIP_FONT_STACK}`
    ctx.fillText(`฿${fmt(data.amount)}`, width / 2, qrY + qrSize + 78)

    // Expiry
    ctx.fillStyle = '#64748b'
    ctx.font = `400 13px ${SLIP_FONT_STACK}`
    ctx.fillText(`${t('slipExpiryLabel')}: ${formatSlipExpiry(data.expiresAt)}`, width / 2, qrY + qrSize + 108)

    // Footer
    ctx.fillStyle = '#94a3b8'
    ctx.font = `400 12px ${SLIP_FONT_STACK}`
    ctx.fillText(t('slipFooter'), width / 2, height - 24)

    ctx.restore()

    return canvas
  }

  async function downloadStripeQr() {
    if (!intentData) return
    setDownloading(true)
    try {
      const canvas = await buildBrandedSlipCanvas(invoice.invoiceNo, intentData)
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Failed to encode slip image')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payment-slip-${invoice.invoiceNo}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(intentData.qrImagePng, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  function handleClose() {
    onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Receipt size={15} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-800">{t('stripeQrTitle')}</h3>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">
          {loading && !intentData ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : failed ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-slate-500 text-sm text-center">{t('paymentFailed')}</p>
              <button
                onClick={() => requestPaymentIntent()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                {t('generateNewQr')}
              </button>
            </div>
          ) : expired ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-slate-500 text-sm text-center">{t('qrExpired')}</p>
              <button
                onClick={() => requestPaymentIntent()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                {t('generateNewQr')}
              </button>
            </div>
          ) : intentData ? (
            <div className="flex flex-col items-center gap-3">
              {/* Same-origin QR source for canvas compositing (branded slip download).
                  Hidden from view — the Stripe-hosted qrImagePng above is what's shown. */}
              <div className="hidden">
                <QRCode value={intentData.qrData} size={240} id="stripe-slip-qr-source" />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={intentData.qrImagePng}
                alt={t('stripeQrTitle')}
                className="w-48 h-48 object-contain border-2 border-slate-200 rounded-2xl p-2"
              />
              <p className="text-slate-800 text-2xl font-bold tabular-nums">฿{fmt(intentData.amount)}</p>
              <p className="text-slate-400 text-xs text-center">{t('scanToPayStripe')}</p>
              <p className="text-slate-500 text-sm">{t('waitingPayment')}</p>
            </div>
          ) : intentLoadFailed ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-slate-500 text-sm text-center">{t('intentLoadFailed')}</p>
              <button
                onClick={() => requestPaymentIntent()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                {t('retryPayment')}
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={handleClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">
            {t('stripeQrCancel')}
          </button>
          {intentData && !expired && !failed && (
            <button
              onClick={downloadStripeQr}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {downloading ? t('generatingSlip') : t('downloadQr')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const t = useTranslations('invoices.detail')
  const tBilling = useTranslations('invoices.billingType')
  const tStatus = useTranslations('invoices.status')
  const params = useParams()
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const canWrite  = useCanWrite('billing')
  const canDelete = useCanDelete('billing')

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [slipPreview, setSlipPreview] = useState(false)
  const [stripeModalOpen, setStripeModalOpen] = useState(false)
  const [paySettings, setPaySettings] = useState(PROMPTPAY_DEFAULTS)
  const [paymentStatusData, setPaymentStatusData] = useState<InvoicePaymentStatus | null>(null)

  // Payment form state
  const [slipUrl, setSlipUrl] = useState('')
  const [paying, setPaying] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyPromptpayId() {
    if (!paySettings.promptpayId) return
    void navigator.clipboard.writeText(paySettings.promptpayId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function downloadQrCode() {
    const svg = document.querySelector<SVGSVGElement>('#promptpay-qr svg')
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([xml], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${paySettings.promptpayId || 'promptpay'}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : PROMPTPAY_DEFAULTS)
      .then(d => setPaySettings(d as typeof PROMPTPAY_DEFAULTS))
      .catch(() => { })
  }, [])

  // Invoice type has no `receiptUrl`/payment-history columns (they live on
  // `payments`, which can have multiple attempts per invoice) — pull both from
  // the same DB-backed status endpoint the QR modal polls. Runs on every
  // invoice load/refresh (not gated on paid status) so the Payment History
  // section can show attempts — including failed/pending ones — regardless of
  // the invoice's current status. Tagged with the invoice id so stale data
  // from a previously viewed invoice can't leak into the render below while
  // this fetch for the new one is in flight.
  const loadPaymentStatus = useCallback(async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payment-status`)
      if (!res.ok) return
      const data = await res.json() as { receiptUrl: string | null; payments: PaymentHistoryItem[] }
      setPaymentStatusData({ invoiceId, receiptUrl: data.receiptUrl, payments: data.payments ?? [] })
    } catch {
      // best-effort — payment history / receipt link simply won't show
    }
  }, [])

  // Memoized so StripeQrModal's poll `useEffect` (which depends on `onClose`)
  // doesn't tear down and re-create its 3s interval on unrelated parent
  // re-renders (e.g. the `copied` state toggle) while the modal is open.
  const closeStripeModal = useCallback(() => setStripeModalOpen(false), [])

  const loadInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${params.id}`)
      if (res.status === 404) { router.push('/billing/invoices'); return }
      if (!res.ok) { toastError(t('loadError')); return }
      const data = await res.json() as Invoice
      setInvoice(data)
      setSlipUrl(data.slipUrl ?? '')
      void loadPaymentStatus(data.id)
    } finally {
      setLoading(false)
    }
  }, [params.id, router, toastError, t, loadPaymentStatus])

  useEffect(() => { loadInvoice() }, [loadInvoice])

  const stripeReceiptUrl = invoice && paymentStatusData?.invoiceId === invoice.id
    ? paymentStatusData.receiptUrl
    : null
  const paymentHistory = invoice && paymentStatusData?.invoiceId === invoice.id
    ? paymentStatusData.payments
    : []

  async function handleMarkPaid() {
    if (!invoice) return
    setPaying(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', slipUrl: slipUrl || null }),
      })
      if (res.ok) {
        success(t('toast.markPaidSuccess', { invoiceNo: invoice.invoiceNo }))
        setInvoice(await res.json() as Invoice)
      } else {
        const data = await res.json() as { error?: string }
        toastError(data.error ?? t('toast.genericError'))
      }
    } catch {
      toastError(t('toast.retryError'))
    } finally {
      setPaying(false)
    }
  }

  async function handleSaveSlip() {
    if (!invoice || !slipUrl) return
    setPaying(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slipUrl }),
      })
      if (res.ok) {
        success(t('toast.slipSaveSuccess'))
        setInvoice(await res.json() as Invoice)
      } else {
        toastError(t('toast.slipSaveError'))
      }
    } catch {
      toastError(t('toast.retryError'))
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    )
  }
  if (!invoice) return null

  const qrPayload = (() => {
    try { return paySettings.promptpayId ? generatePayload(paySettings.promptpayId, { amount: invoice.amount }) : '' } catch { return '' }
  })()

  return (
    <div className="space-y-5">
      <PageHeader
        onBack={() => router.back()}
        title={<span className="font-mono">{invoice.invoiceNo}</span>}
        subtitle={invoice.customerName}
      >
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLE[invoice.status]}`}>
          {STATUS_ICON[invoice.status]}
          {tStatus(invoice.status)}
        </span>
        {canWrite && (
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Pencil size={14} />
            {t('edit')}
          </button>
        )}
        {canDelete && invoice.status !== 'paid' && (
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Trash2 size={14} />
            {t('delete')}
          </button>
        )}
      </PageHeader>

      {/* Body */}
      <div className="grid grid-cols-5 gap-5">
        {/* ── Left: Invoice details ── */}
        <div className="col-span-2 space-y-4">
          <SectionCard title={t('detailsTitle')}>
            <dl className="space-y-3">
              <div>
                <dt className="text-slate-400 text-xs">{t('amountDue')}</dt>
                <dd className="text-slate-800 text-2xl font-bold tabular-nums">฿{fmt(invoice.amount)}</dd>
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <Row label={t('invoiceNo')} value={<span className="font-mono font-semibold">{invoice.invoiceNo}</span>} />
                <Row label={t('customer')} value={invoice.customerName} />
                {invoice.vehiclePlate && (
                  <Row label={t('plate')} value={<span className="font-mono">{invoice.vehiclePlate}</span>} />
                )}
                <Row label={t('type')} value={
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${BILLING_TYPE_COLOR[invoice.billingType]}`}>
                    {tBilling(invoice.billingType)}
                  </span>
                } />
                {invoice.description && (
                  <Row label={t('note')} value={invoice.description} />
                )}
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <Row label={t('dueDate')} value={
                  <span className={invoice.status === 'overdue' ? 'text-red-600 font-semibold' : ''}>
                    {invoice.dueDate}
                    {invoice.status === 'overdue' && invoice.daysOverdue && (
                      <span className="text-red-400 text-xs font-normal ml-1">{t('overdueDays', { days: invoice.daysOverdue })}</span>
                    )}
                  </span>
                } />
                {invoice.status === 'paid' && invoice.paidAt && (
                  <Row label={t('paidAt')} value={<span className="text-green-600 font-medium">{invoice.paidAt}</span>} />
                )}
              </div>
            </dl>
          </SectionCard>

          {/* Link back to contract */}
          {invoice.contractId && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="text-slate-800 font-semibold text-sm">{t('relatedContract')}</h2>
              </div>
              <Link
                href={`/contracts/${invoice.contractId}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 text-sm font-medium">{t('contractCardTitle')}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{t('contractCardHint')}</p>
                </div>
                <Eye size={15} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
              </Link>
            </div>
          )}
        </div>

        {/* ── Right: Payment + Slip ── */}
        <div className="col-span-3 space-y-4">
          {/* QR + Mark Paid */}
          <SectionCard title={t('paymentChannel')}>
            <div className="space-y-5">
              {/* QR + PromptPay info — always visible */}
              <div className="flex gap-6 items-start">
                {invoice.status !== 'paid' && (
                  <div className="shrink-0">
                    {qrPayload ? (
                      <button
                        id="promptpay-qr"
                        onClick={downloadQrCode}
                        className="relative inline-block p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm group hover:border-blue-300 transition-colors cursor-pointer"
                      >
                        <QRCode value={qrPayload} size={160} />
                        <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700 shadow">
                            <Download size={12} /> {t('downloadQr')}
                          </span>
                        </div>
                      </button>
                    ) : (
                      <Link
                        href="/settings"
                        className="w-[184px] h-[184px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <p className="text-slate-400 text-xs text-center px-4">{t('noAccount')}</p>
                        <p className="text-blue-500 text-xs font-medium">{t('setupHere')}</p>
                      </Link>
                    )}
                  </div>
                )}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Banknote size={13} className="text-green-500" />
                    PromptPay
                  </div>
                  <p className="text-slate-700 font-semibold text-sm">{paySettings.promptpayName || '—'}</p>
                  <button
                    onClick={copyPromptpayId}
                    disabled={!paySettings.promptpayId}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-500 disabled:pointer-events-none transition-colors group"
                  >
                    {paySettings.promptpayId || t('notConfigured')}
                    {paySettings.promptpayId && (
                      copied
                        ? <CheckCheck size={11} className="text-green-500" />
                        : <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                  <div className="pt-2">
                    <p className="text-slate-400 text-xs">{t('amountToPay')}</p>
                    <p className="text-2xl font-bold text-slate-800 tabular-nums">฿{fmt(invoice.amount)}</p>
                  </div>
                  {invoice.status !== 'paid' && (
                    <p className="text-slate-400 text-xs">{t('scanHint')}</p>
                  )}
                </div>
              </div>

              {/* Pay with Stripe QR — unpaid, writable, and above the PromptPay minimum */}
              {canWrite && invoice.status !== 'paid' && invoice.amount >= 10 && (
                <div className="border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setStripeModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    <Receipt size={15} />
                    {t('payWithStripe')}
                  </button>
                </div>
              )}

              {/* Paid badge */}
              {invoice.status === 'paid' && (
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-green-700 font-semibold text-sm">{t('paidBadge')}</p>
                      {invoice.paidAt && <p className="text-slate-400 text-xs">{invoice.paidAt}</p>}
                    </div>
                  </div>
                  {stripeReceiptUrl && (
                    <a
                      href={stripeReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors shrink-0"
                    >
                      <Receipt size={13} />
                      {t('viewStripeReceipt')}
                    </a>
                  )}
                </div>
              )}

              {/* Mark paid button — only for unpaid + canWrite */}
              {invoice.status !== 'paid' && canWrite && (
                <div className="border-t border-slate-100 pt-4">
                  <button
                    onClick={handleMarkPaid}
                    disabled={paying}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    {paying
                      ? <><Loader2 size={15} className="animate-spin" /> {t('saving')}</>
                      : <><Check size={15} /> {t('markPaid')}</>
                    }
                  </button>
                  <p className="text-slate-400 text-xs text-center mt-2">{t('markPaidHint')}</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Slip */}
          <SectionCard title={t('slipTitle')}>

            {invoice.status === 'paid' && invoice.slipUrl ? (
              /* Paid + has slip → show preview */
              <div className="space-y-3">
                <div
                  className="relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer group"
                  onClick={() => setSlipPreview(true)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={invoice.slipUrl}
                    alt={t('slipAlt')}
                    className="w-full max-h-56 object-contain bg-slate-50"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Eye size={14} />
                      {t('viewFullscreen')}
                    </div>
                  </div>
                </div>
              </div>
            ) : invoice.status === 'paid' ? (
              /* Paid but no slip */
              <div className="flex items-center gap-2 text-slate-400 py-2">
                <FileText size={16} />
                <p className="text-sm">{t('noSlip')}</p>
              </div>
            ) : canWrite ? (
              /* Not paid → allow upload (admin only) */
              <div className="space-y-3">
                <ImageUploader
                  value={slipUrl}
                  onChange={setSlipUrl}
                  label=""
                  folder="invoices"
                />
                {slipUrl && slipUrl !== invoice.slipUrl && (
                  <button
                    onClick={handleSaveSlip}
                    disabled={paying}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    {paying ? <Loader2 size={14} className="animate-spin" /> : null}
                    {t('saveSlip')}
                  </button>
                )}
                <p className="text-slate-400 text-xs">{t('slipUploadHint')}</p>
              </div>
            ) : null}
          </SectionCard>

          {/* Payment History — Stripe payment attempts for this invoice.
              Historical record only: omitted entirely when empty (unlike the
              Slip card above, there's no empty-state UI here — a payment
              in-progress state is StripeQrModal's job, not this card's). */}
          {paymentHistory.length > 0 && (
            <SectionCard title={t('paymentHistoryTitle')}>
              <ul className="space-y-3">
                {paymentHistory.map(payment => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 last:border-0 pb-3 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-slate-700 text-sm font-medium">
                        {PAYMENT_METHOD_LABEL[payment.method]} · <span className="tabular-nums">฿{fmt(payment.amount)}</span>
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {formatPaymentDate(payment.paidAt ?? payment.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${PAYMENT_STATUS_STYLE[payment.status]}`}>
                        {PAYMENT_STATUS_ICON[payment.status]}
                        {t(`paymentStatus.${payment.status}`)}
                      </span>
                      {payment.receiptUrl && (
                        <a
                          href={payment.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          <Receipt size={13} />
                          {t('viewStripeReceipt')}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Modals */}
      {editOpen && (
        <EditModal
          invoice={invoice}
          onClose={() => setEditOpen(false)}
          onSaved={inv => { setInvoice(inv); setEditOpen(false) }}
        />
      )}
      {deleteOpen && (
        <DeleteModal
          invoice={invoice}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => router.push('/billing/invoices')}
        />
      )}
      {slipPreview && invoice.slipUrl && (
        <ImageLightbox
          src={invoice.slipUrl}
          label={t('slipLightboxLabel', { invoiceNo: invoice.invoiceNo })}
          onClose={() => setSlipPreview(false)}
        />
      )}
      {stripeModalOpen && invoice && (
        <StripeQrModal
          invoice={invoice}
          onClose={closeStripeModal}
          onRefresh={loadInvoice}
        />
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-400 text-xs shrink-0">{label}</dt>
      <dd className="text-slate-700 text-sm text-right">{value}</dd>
    </div>
  )
}
