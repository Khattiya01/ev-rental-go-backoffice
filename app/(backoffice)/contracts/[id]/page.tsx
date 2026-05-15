'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Download, Receipt, Plus,
  X, Loader2, CheckCircle2, AlertCircle, Clock, AlertTriangle, Pencil,
  Eye, ChevronLeft, ChevronRight,
} from 'lucide-react'
import Badge from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type { Contract, Invoice, BillingType, InvoiceStatus } from '@/lib/types'

// ─── Helpers ─────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0 })
}

const INVOICE_STATUS_STYLE: Record<InvoiceStatus, string> = {
  paid: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
}
const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: 'ชำระแล้ว', pending: 'รอชำระ', overdue: 'เกินกำหนด',
}
const BILLING_TYPE_LABEL: Record<BillingType, string> = {
  daily: 'รายวัน', monthly: 'รายเดือน', one_time: 'ครั้งเดียว',
}
const BILLING_TYPE_COLOR: Record<BillingType, string> = {
  daily: 'bg-sky-100 text-sky-700 border-sky-200',
  monthly: 'bg-violet-100 text-violet-700 border-violet-200',
  one_time: 'bg-amber-100 text-amber-700 border-amber-200',
}

const INVOICE_PAGE_SIZE = 8

// ─── Quick Invoice Modal ──────────────────────────────────────────
function QuickInvoiceModal({
  contract, onClose, onCreated,
}: {
  contract: Contract
  onClose: () => void
  onCreated: () => void
}) {
  const { success, error: toastError } = useToast()
  const [saving, setSaving] = useState(false)
  const [billingType, setBillingType] = useState<BillingType>('monthly')
  const [amount, setAmount] = useState(String(contract.monthlyRate))
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')

  function handleBillingTypeChange(bt: BillingType) {
    setBillingType(bt)
    if (bt === 'monthly') setAmount(String(contract.monthlyRate))
    else if (bt === 'daily') setAmount(String(contract.dailyRate))
    else setAmount('')
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) { toastError('กรุณาระบุจำนวนเงิน'); return }
    if (!dueDate) { toastError('กรุณาระบุวันครบกำหนด'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          customerId: contract.customerId,
          customerName: contract.customerName,
          vehiclePlate: contract.vehiclePlate,
          billingType,
          amount: parsed,
          dueDate,
          description: description.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toastError(data.error ?? 'ออกใบแจ้งหนี้ไม่สำเร็จ'); return }
      success(`ออกใบแจ้งหนี้ ${data.invoiceNo} เรียบร้อย`)
      onCreated()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Receipt size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-slate-800 font-semibold text-sm">ออกใบแจ้งหนี้</h2>
              <p className="text-slate-400 text-xs">{contract.customerName} · {contract.vehiclePlate}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Billing type */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">ประเภทการชำระ</label>
            <div className="flex gap-2">
              {(['monthly', 'daily', 'one_time'] as BillingType[]).map(bt => (
                <button
                  key={bt}
                  type="button"
                  onClick={() => handleBillingTypeChange(bt)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    billingType === bt
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-300'
                  }`}
                >
                  {BILLING_TYPE_LABEL[bt]}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">จำนวนเงิน</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
              <input
                type="number" min="1" step="1" required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              />
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">วันครบกำหนดชำระ</label>
            <input
              type="date" required
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">หมายเหตุ (ไม่บังคับ)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="เช่น ค่าเช่าเดือน มิ.ย. 2569"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'กำลังออก...' : 'ออกใบแจ้งหนี้'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Close Contract Confirm Modal ─────────────────────────────────
function CloseContractModal({
  contract, onClose, onClosed,
}: {
  contract: Contract
  onClose: () => void
  onClosed: () => void
}) {
  const { success, error: toastError } = useToast()
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    setSaving(true)
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (!res.ok) { toastError('ปิดสัญญาไม่สำเร็จ'); return }
      success('ปิดสัญญาเรียบร้อย รถพร้อมให้เช่าต่อ')
      onClosed()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-slate-800 font-semibold">ปิดสัญญา {contract.contractNo}?</h3>
            <p className="text-slate-500 text-sm mt-1">
              รถ <span className="font-mono font-medium">{contract.vehiclePlate}</span> จะกลับมาเป็น
              สถานะ <span className="font-medium text-green-600">available</span> ทันที
              และไม่สามารถแก้ไขสถานะสัญญาได้อีก
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'กำลังปิด...' : 'ยืนยันปิดสัญญา'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────
export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { error: toastError } = useToast()

  const [contract, setContract] = useState<Contract | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingContract, setLoadingContract] = useState(true)
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [invoicePage, setInvoicePage] = useState(1)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [closeModalOpen, setCloseModalOpen] = useState(false)

  const loadContract = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${params.id}`)
      if (res.status === 404) { router.push('/contracts'); return }
      if (!res.ok) { toastError('โหลดข้อมูลสัญญาไม่สำเร็จ'); return }
      setContract(await res.json())
    } finally {
      setLoadingContract(false)
    }
  }, [params.id, router, toastError])

  const loadInvoices = useCallback(async () => {
    if (!params.id) return
    setLoadingInvoices(true)
    try {
      const res = await fetch(`/api/invoices?contractId=${params.id}&limit=100`)
      if (res.ok) setInvoices((await res.json()).data ?? [])
    } finally {
      setLoadingInvoices(false)
    }
  }, [params.id])

  useEffect(() => { loadContract() }, [loadContract])
  useEffect(() => { loadInvoices() }, [loadInvoices])

  if (loadingContract) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">กำลังโหลด...</div>
  }
  if (!contract) return null

  const badgeVariant =
    contract.status === 'active' ? 'active' as const
      : contract.status === 'overdue' ? 'overdue' as const : 'paid' as const

  const paidInvoices = invoices.filter(inv => inv.status === 'paid')
  const pendingInvoices = invoices.filter(inv => inv.status !== 'paid')
  const totalPaid = paidInvoices.reduce((s, inv) => s + inv.amount, 0)
  const totalPending = pendingInvoices.reduce((s, inv) => s + inv.amount, 0)
  const invoiceTotalPages = Math.max(1, Math.ceil(invoices.length / INVOICE_PAGE_SIZE))
  const pagedInvoices = invoices.slice((invoicePage - 1) * INVOICE_PAGE_SIZE, invoicePage * INVOICE_PAGE_SIZE)

  const invoiceStatusIcon = (status: InvoiceStatus) => {
    if (status === 'paid') return <CheckCircle2 size={14} className="text-green-500" />
    if (status === 'overdue') return <AlertCircle size={14} className="text-red-500" />
    return <Clock size={14} className="text-amber-500" />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-slate-800 text-xl font-bold">สัญญา #{contract.contractNo}</h1>
          <Badge variant={badgeVariant} />
        </div>
        <div className="flex gap-2">
          {contract.status !== 'completed' && (
            <button
              onClick={() => setCloseModalOpen(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              ปิดสัญญา
            </button>
          )}
          <Link
            href={`/contracts/${contract.id}/edit`}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Pencil className="w-4 h-4" />
            แก้ไข
          </Link>
          {contract.documentUrl && (
            <a
              href={contract.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              ดาวน์โหลด PDF
            </a>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-5 gap-5">
        {/* ── Left column ── */}
        <div className="col-span-2 space-y-4">
          {/* Contract details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-slate-800 font-semibold mb-4">รายละเอียดสัญญา</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-slate-400 text-xs">เงินมัดจำ</dt>
                <dd className="text-slate-800 text-2xl font-bold">฿{fmt(contract.depositAmount)}</dd>
              </div>
              <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-slate-400 text-xs">ค่าเช่า/วัน</dt>
                  <dd className="text-slate-800 text-lg font-bold mt-0.5">฿{fmt(contract.dailyRate)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs">ค่าเช่า/เดือน</dt>
                  <dd className="text-slate-800 text-lg font-bold mt-0.5">฿{fmt(contract.monthlyRate)}</dd>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-slate-400 text-xs">วันเริ่มสัญญา</dt>
                  <dd className="text-slate-700 text-sm font-medium mt-0.5">{contract.startDate}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs">วันครบกำหนด</dt>
                  <dd className={`text-sm font-medium mt-0.5 ${contract.status === 'overdue' ? 'text-red-600' : 'text-slate-700'}`}>
                    {contract.dueDate}
                  </dd>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <dt className="text-slate-400 text-xs">ค่าปรับแบตเตอรี่</dt>
                <dd className="text-slate-500 text-xs mt-0.5">ความจุลดเกิน 5% คิดเพิ่ม ฿200</dd>
              </div>
            </dl>
          </div>

          {/* Customer & Vehicle */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-slate-800 font-semibold mb-4">ผู้เช่า & รถ</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {contract.customerName.charAt(0)}
                </div>
                <div>
                  <p className="text-slate-700 text-sm font-medium">{contract.customerName}</p>
                  <p className="text-slate-400 text-xs mt-0.5">ผู้เช่า</p>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs">ทะเบียนรถ</p>
                  <p className="text-slate-700 text-sm font-mono font-medium mt-0.5">{contract.vehiclePlate}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Right: PDF preview ── */}
        <div className="col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span className="font-medium">สัญญา #{contract.contractNo}</span>
          </div>

          {contract.documentUrl ? (
            /* ── Real PDF iframe ── */
            <iframe
              src={contract.documentUrl}
              className="w-full flex-1 min-h-0"
              style={{ minHeight: 740 }}
              title={`สัญญา ${contract.contractNo}`}
            />
          ) : (
            /* ── Mock contract (no PDF uploaded yet) ── */
            <div className="flex flex-col items-center justify-center h-[540px] bg-slate-50 p-8 gap-6">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 text-slate-800">
                <h2 className="text-xl font-bold text-center mb-1">สัญญาเช่ารถ</h2>
                <p className="text-center text-slate-400 text-xs mb-4">EV RENTAL GO</p>
                <div className="h-px bg-slate-200 mb-4" />
                <p className="text-xs text-slate-500 mb-4">
                  สัญญาฉบับนี้ทำขึ้นระหว่าง EV Rental GO และผู้เช่าที่ระบุไว้ด้านล่าง
                  ภายใต้ข้อกำหนดและเงื่อนไขต่อไปนี้
                </p>
                <div className="space-y-2 text-xs text-slate-700">
                  {[
                    ['เลขสัญญา', contract.contractNo],
                    ['ผู้เช่า', contract.customerName],
                    ['ทะเบียนรถ', contract.vehiclePlate],
                    ['ระยะเวลา', `${contract.startDate} – ${contract.dueDate}`],
                    ['ค่าเช่ารายวัน', `฿${fmt(contract.dailyRate)}`],
                    ['เงินมัดจำ', `฿${fmt(contract.depositAmount)}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-400">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 p-3 bg-slate-50 rounded-lg">
                  <h3 className="font-bold text-xs mb-1.5">ข้อกำหนดและเงื่อนไข</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    1. คืนรถในสภาพเดิม 2. ค่าปรับแบตเตอรี่กรณีความจุลดเกิน 5% คิดเพิ่ม ฿200
                    3. คืนรถช้ากว่ากำหนดมีค่าปรับรายวัน
                  </p>
                </div>
                <div className="mt-6 flex justify-between border-t border-slate-200 pt-4">
                  <div className="text-center">
                    <div className="text-slate-400 text-xs h-8 flex items-end justify-center">ลายเซ็นดิจิตอล</div>
                    <div className="h-px bg-slate-300 w-24 mt-1" />
                    <p className="text-xs text-slate-400 mt-1">ผู้ให้เช่า</p>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-600 italic text-sm h-8 flex items-end justify-center">
                      {contract.customerName.split(' ')[0]}
                    </div>
                    <div className="h-px bg-slate-300 w-24 mt-1" />
                    <p className="text-xs text-slate-400 mt-1">ผู้เช่า</p>
                  </div>
                </div>
              </div>
              <Link
                href={`/contracts/${contract.id}/edit`}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <Pencil size={14} />
                อัปโหลดเอกสารสัญญา PDF
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Invoices panel (full width) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt size={18} className="text-violet-600" />
            <h2 className="text-slate-800 font-semibold">ใบแจ้งหนี้ในสัญญานี้</h2>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">{invoices.length} รายการ</span>
          </div>
          {/* Summary */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-right">
              <p className="text-slate-400 text-xs">รับชำระแล้ว</p>
              <p className="text-green-600 font-bold">฿{fmt(totalPaid)}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs">ค้างชำระ</p>
              <p className="text-amber-600 font-bold">฿{fmt(totalPending)}</p>
            </div>
            {contract.status !== 'completed' && (
              <button
                onClick={() => setInvoiceModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Plus size={13} />
                ออกใบแจ้งหนี้
              </button>
            )}
          </div>
        </div>

        {loadingInvoices ? (
          <div className="px-5 py-8 text-center text-slate-400 text-sm">กำลังโหลด...</div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
            <Receipt size={28} className="text-slate-200" />
            <p className="text-sm">ยังไม่มีใบแจ้งหนี้</p>
            {contract.status !== 'completed' && (
              <button
                onClick={() => setInvoiceModalOpen(true)}
                className="mt-1 flex items-center gap-1.5 text-violet-600 hover:text-violet-700 text-sm font-medium transition-colors"
              >
                <Plus size={14} />
                ออกใบแจ้งหนี้แรก
              </button>
            )}
          </div>
        ) : (
          <>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3 uppercase tracking-wider">Invoice #</th>
                <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3 uppercase tracking-wider">ประเภท</th>
                <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3 uppercase tracking-wider">จำนวนเงิน</th>
                <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3 uppercase tracking-wider">ครบกำหนด</th>
                <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3 uppercase tracking-wider">ชำระเมื่อ</th>
                <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3 uppercase tracking-wider">สถานะ</th>
                <th className="text-right text-slate-400 text-xs font-semibold px-5 py-3 uppercase tracking-wider" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-sm font-mono font-semibold text-slate-700">{inv.invoiceNo}</span>
                    {inv.description && (
                      <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[140px]">{inv.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${BILLING_TYPE_COLOR[inv.billingType]}`}>
                      {BILLING_TYPE_LABEL[inv.billingType]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-slate-800 tabular-nums">฿{fmt(inv.amount)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-sm ${inv.status === 'overdue' ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                      {inv.dueDate}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-400">{inv.paidAt ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${INVOICE_STATUS_STYLE[inv.status]}`}>
                      {invoiceStatusIcon(inv.status)}
                      {INVOICE_STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/billing/invoices/${inv.id}`}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="จัดการใบแจ้งหนี้"
                      >
                        <Eye size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {invoices.length > INVOICE_PAGE_SIZE && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-500">
                แสดง {(invoicePage - 1) * INVOICE_PAGE_SIZE + 1}–{Math.min(invoicePage * INVOICE_PAGE_SIZE, invoices.length)} จาก {invoices.length} รายการ
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setInvoicePage(p => p - 1)}
                  disabled={invoicePage === 1}
                  className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-xs text-slate-600 px-1 tabular-nums">{invoicePage} / {invoiceTotalPages}</span>
                <button
                  onClick={() => setInvoicePage(p => p + 1)}
                  disabled={invoicePage >= invoiceTotalPages}
                  className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Modals */}
      {invoiceModalOpen && (
        <QuickInvoiceModal
          contract={contract}
          onClose={() => setInvoiceModalOpen(false)}
          onCreated={loadInvoices}
        />
      )}
      {closeModalOpen && (
        <CloseContractModal
          contract={contract}
          onClose={() => setCloseModalOpen(false)}
          onClosed={loadContract}
        />
      )}
    </div>
  )
}
