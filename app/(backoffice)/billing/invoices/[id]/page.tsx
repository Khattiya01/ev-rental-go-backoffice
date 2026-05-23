'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, Clock, AlertTriangle, Check,
  Loader2, Pencil, Trash2, X, Banknote, FileText, Eye,
  Receipt, Copy, CheckCheck,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import generatePayload from 'promptpay-qr'
import type { Invoice, BillingType, InvoiceStatus } from '@/lib/types'
import { useToast } from '@/components/ui/toast'
import ImageUploader from '@/components/ui/image-uploader'
import ImageLightbox from '@/components/ui/image-lightbox'
import { useCanWrite } from '@/lib/user-context'
import PageHeader from '@/components/ui/page-header'
import SectionCard from '@/components/ui/section-card'

const PROMPTPAY_DEFAULTS = { promptpayId: '', promptpayName: '' }

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0 })
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  paid: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
}
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: 'ชำระแล้ว', pending: 'รอชำระ', overdue: 'เกินกำหนด',
}
const STATUS_ICON: Record<InvoiceStatus, React.ReactNode> = {
  paid: <CheckCircle2 size={13} />,
  pending: <Clock size={13} />,
  overdue: <AlertTriangle size={13} />,
}
const BILLING_TYPE_LABEL: Record<BillingType, string> = {
  daily: 'รายวัน', monthly: 'รายเดือน', one_time: 'ครั้งเดียว',
}
const BILLING_TYPE_COLOR: Record<BillingType, string> = {
  daily: 'bg-sky-100 text-sky-700 border-sky-200',
  monthly: 'bg-violet-100 text-violet-700 border-violet-200',
  one_time: 'bg-amber-100 text-amber-700 border-amber-200',
}

// ─── Edit Modal ───────────────────────────────────────────────
function EditModal({
  invoice, onClose, onSaved,
}: {
  invoice: Invoice
  onClose: () => void
  onSaved: (inv: Invoice) => void
}) {
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
    if (!form.customerName.trim()) { toastError('กรุณากรอกชื่อลูกค้า'); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { toastError('กรุณากรอกจำนวนเงิน'); return }
    if (!form.dueDate) { toastError('กรุณาระบุวันครบกำหนด'); return }

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
        success('แก้ไข Invoice เรียบร้อย')
        onSaved(await res.json() as Invoice)
      } else {
        const data = await res.json() as { error?: string }
        toastError(data.error ?? 'เกิดข้อผิดพลาด')
      }
    } catch {
      toastError('เกิดข้อผิดพลาด กรุณาลองใหม่')
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
            <h3 className="font-semibold text-slate-800">แก้ไข {invoice.invoiceNo}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>ชื่อลูกค้า <span className="text-red-500">*</span></label>
              <input type="text" value={form.customerName} onChange={e => set('customerName', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>ทะเบียนรถ</label>
              <input type="text" placeholder="กท-1234" value={form.vehiclePlate} onChange={e => set('vehiclePlate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>ประเภทการชำระ</label>
              <select value={form.billingType} onChange={e => set('billingType', e.target.value)} className={inputCls}>
                <option value="monthly">รายเดือน</option>
                <option value="daily">รายวัน</option>
                <option value="one_time">ครั้งเดียว</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>รายละเอียด</label>
              <input type="text" value={form.description} onChange={e => set('description', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>จำนวนเงิน (฿) <span className="text-red-500">*</span></label>
              <input type="number" min="1" value={form.amount} onChange={e => set('amount', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>วันครบกำหนด <span className="text-red-500">*</span></label>
              <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">ยกเลิก</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors">
            {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
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
  const { success, error: toastError } = useToast()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' })
      if (res.status === 204) {
        success(`ลบ ${invoice.invoiceNo} เรียบร้อย`)
        onDeleted()
      } else {
        const data = await res.json() as { error?: string }
        toastError(data.error ?? 'เกิดข้อผิดพลาด')
      }
    } catch {
      toastError('เกิดข้อผิดพลาด กรุณาลองใหม่')
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
            <h3 className="font-semibold text-slate-800">ลบ Invoice</h3>
            <p className="text-slate-500 text-sm">{invoice.invoiceNo} — {invoice.customerName}</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm">ยืนยันการลบ Invoice นี้? ดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">ยกเลิก</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-semibold transition-colors">
            {deleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const canWrite = useCanWrite()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [slipPreview, setSlipPreview] = useState(false)
  const [paySettings, setPaySettings] = useState(PROMPTPAY_DEFAULTS)

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

  const loadInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${params.id}`)
      if (res.status === 404) { router.push('/billing/invoices'); return }
      if (!res.ok) { toastError('โหลดข้อมูลไม่สำเร็จ'); return }
      const data = await res.json() as Invoice
      setInvoice(data)
      setSlipUrl(data.slipUrl ?? '')
    } finally {
      setLoading(false)
    }
  }, [params.id, router, toastError])

  useEffect(() => { loadInvoice() }, [loadInvoice])

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
        success(`${invoice.invoiceNo} — บันทึกการชำระเงินเรียบร้อย`)
        setInvoice(await res.json() as Invoice)
      } else {
        const data = await res.json() as { error?: string }
        toastError(data.error ?? 'เกิดข้อผิดพลาด')
      }
    } catch {
      toastError('เกิดข้อผิดพลาด กรุณาลองใหม่')
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
        success('บันทึกสลิปเรียบร้อย')
        setInvoice(await res.json() as Invoice)
      } else {
        toastError('บันทึกสลิปไม่สำเร็จ')
      }
    } catch {
      toastError('เกิดข้อผิดพลาด กรุณาลองใหม่')
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
          {STATUS_LABEL[invoice.status]}
        </span>
        {canWrite && (
          <>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Pencil size={14} />
              แก้ไข
            </button>
            {invoice.status !== 'paid' && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Trash2 size={14} />
                ลบ
              </button>
            )}
          </>
        )}
      </PageHeader>

      {/* Body */}
      <div className="grid grid-cols-5 gap-5">
        {/* ── Left: Invoice details ── */}
        <div className="col-span-2 space-y-4">
          <SectionCard title="รายละเอียดใบแจ้งหนี้">
            <dl className="space-y-3">
              <div>
                <dt className="text-slate-400 text-xs">ยอดชำระ</dt>
                <dd className="text-slate-800 text-2xl font-bold tabular-nums">฿{fmt(invoice.amount)}</dd>
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <Row label="เลขใบแจ้งหนี้" value={<span className="font-mono font-semibold">{invoice.invoiceNo}</span>} />
                <Row label="ลูกค้า" value={invoice.customerName} />
                {invoice.vehiclePlate && (
                  <Row label="ทะเบียนรถ" value={<span className="font-mono">{invoice.vehiclePlate}</span>} />
                )}
                <Row label="ประเภท" value={
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${BILLING_TYPE_COLOR[invoice.billingType]}`}>
                    {BILLING_TYPE_LABEL[invoice.billingType]}
                  </span>
                } />
                {invoice.description && (
                  <Row label="หมายเหตุ" value={invoice.description} />
                )}
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <Row label="วันครบกำหนด" value={
                  <span className={invoice.status === 'overdue' ? 'text-red-600 font-semibold' : ''}>
                    {invoice.dueDate}
                    {invoice.status === 'overdue' && invoice.daysOverdue && (
                      <span className="text-red-400 text-xs font-normal ml-1">(เกิน {invoice.daysOverdue} วัน)</span>
                    )}
                  </span>
                } />
                {invoice.status === 'paid' && invoice.paidAt && (
                  <Row label="ชำระเมื่อ" value={<span className="text-green-600 font-medium">{invoice.paidAt}</span>} />
                )}
              </div>
            </dl>
          </SectionCard>

          {/* Link back to contract */}
          {invoice.contractId && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="text-slate-800 font-semibold text-sm">สัญญาที่เกี่ยวข้อง</h2>
              </div>
              <Link
                href={`/contracts/${invoice.contractId}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 text-sm font-medium">สัญญาเช่ารถ</p>
                  <p className="text-slate-400 text-xs mt-0.5">แตะเพื่อดูรายละเอียดสัญญา</p>
                </div>
                <Eye size={15} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
              </Link>
            </div>
          )}
        </div>

        {/* ── Right: Payment + Slip ── */}
        <div className="col-span-3 space-y-4">
          {/* QR + Mark Paid */}
          <SectionCard title="ช่องทางชำระเงิน">
            <div className="space-y-5">
              {/* QR + PromptPay info — always visible */}
              <div className="flex gap-6 items-start">
                {invoice.status !== 'paid' && (
                  <div className="shrink-0">
                    {qrPayload ? (
                      <button
                        onClick={copyPromptpayId}
                        className="relative inline-block p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm group hover:border-blue-300 transition-colors cursor-pointer"
                      >
                        <QRCode value={qrPayload} size={160} />
                        <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700 shadow">
                            {copied ? <><CheckCheck size={12} className="text-green-500" /> คัดลอกแล้ว</> : <><Copy size={12} /> คัดลอก ID</>}
                          </span>
                        </div>
                      </button>
                    ) : (
                      <Link
                        href="/settings"
                        className="w-[184px] h-[184px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <p className="text-slate-400 text-xs text-center px-4">ยังไม่ตั้งค่าบัญชี</p>
                        <p className="text-blue-500 text-xs font-medium">ตั้งค่าที่นี่ →</p>
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
                    {paySettings.promptpayId || 'ยังไม่ตั้งค่า'}
                    {paySettings.promptpayId && (
                      copied
                        ? <CheckCheck size={11} className="text-green-500" />
                        : <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                  <div className="pt-2">
                    <p className="text-slate-400 text-xs">ยอดชำระ</p>
                    <p className="text-2xl font-bold text-slate-800 tabular-nums">฿{fmt(invoice.amount)}</p>
                  </div>
                  {invoice.status !== 'paid' && (
                    <p className="text-slate-400 text-xs">สแกนผ่านแอปธนาคารหรือ Wallet</p>
                  )}
                </div>
              </div>

              {/* Paid badge */}
              {invoice.status === 'paid' && (
                <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-green-700 font-semibold text-sm">ชำระแล้ว</p>
                    {invoice.paidAt && <p className="text-slate-400 text-xs">{invoice.paidAt}</p>}
                  </div>
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
                      ? <><Loader2 size={15} className="animate-spin" /> กำลังบันทึก...</>
                      : <><Check size={15} /> ยืนยันชำระแล้ว</>
                    }
                  </button>
                  <p className="text-slate-400 text-xs text-center mt-2">จะบันทึกเวลาชำระและสลิป (ถ้ามี) พร้อมกัน</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Slip */}
          <SectionCard title="สลิปการโอน">

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
                    alt="สลิปการโอน"
                    className="w-full max-h-56 object-contain bg-slate-50"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Eye size={14} />
                      ดูเต็มจอ
                    </div>
                  </div>
                </div>
              </div>
            ) : invoice.status === 'paid' ? (
              /* Paid but no slip */
              <div className="flex items-center gap-2 text-slate-400 py-2">
                <FileText size={16} />
                <p className="text-sm">ไม่มีสลิปแนบ</p>
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
                    บันทึกสลิป
                  </button>
                )}
                <p className="text-slate-400 text-xs">อัปโหลดสลิปก่อน แล้วกด &quot;ยืนยันชำระแล้ว&quot; เพื่อปิดบิล</p>
              </div>
            ) : null}
          </SectionCard>
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
          label={`สลิป ${invoice.invoiceNo}`}
          onClose={() => setSlipPreview(false)}
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
