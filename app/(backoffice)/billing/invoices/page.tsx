'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import {
  Plus, Search, Receipt, CheckCircle2, Clock, AlertTriangle,
  Banknote, Pencil, Trash2, X,
  FileText, Eye, Car, Loader2,
} from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import EmptyState from '@/components/ui/empty-state'
import PaginationFooter from '@/components/ui/pagination-footer'
import SearchFilterBar from '@/components/ui/search-filter-bar'
import ActionButton from '@/components/ui/action-button'
import type { Invoice, BillingType, InvoiceStatus, Customer, Vehicle } from '@/lib/types'
import { useToast } from '@/components/ui/toast'
import { useCanWrite } from '@/lib/user-context'

// ─── Constants ────────────────────────────────────────────────
const PAGE_SIZE = 20

const BILLING_TYPE_LABEL: Record<BillingType, string> = {
  daily: 'รายวัน',
  monthly: 'รายเดือน',
  one_time: 'ครั้งเดียว',
}
const BILLING_TYPE_COLOR: Record<BillingType, string> = {
  daily: 'bg-sky-100 text-sky-700 border-sky-200',
  monthly: 'bg-violet-100 text-violet-700 border-violet-200',
  one_time: 'bg-amber-100 text-amber-700 border-amber-200',
}
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: 'ชำระแล้ว', pending: 'รอชำระ', overdue: 'เกินกำหนด',
}

type FilterTab = 'all' | InvoiceStatus
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'pending', label: 'รอชำระ' },
  { key: 'overdue', label: 'เกินกำหนด' },
  { key: 'paid', label: 'ชำระแล้ว' },
]

// ─── Helpers ──────────────────────────────────────────────────
function fmt(amount: number) {
  return amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const styles: Record<InvoiceStatus, string> = {
    paid: 'bg-green-100 text-green-700 border-green-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    overdue: 'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {status === 'paid' && <CheckCircle2 size={11} />}
      {status === 'pending' && <Clock size={11} />}
      {status === 'overdue' && <AlertTriangle size={11} />}
      {STATUS_LABEL[status]}
    </span>
  )
}

// ─── Summary card ─────────────────────────────────────────────
function SummaryCard({
  icon: Icon, label, value, sub, iconClass, valueClass,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string
  iconClass: string; valueClass: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 text-xs">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${valueClass}`}>{value}</p>
        {sub && <p className="text-slate-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── CustomerPicker ───────────────────────────────────────────
function CustomerPicker({
  value, onChange,
}: {
  value: { id: string; name: string; phone: string } | null
  onChange: (v: { id: string; name: string; phone: string } | null) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=8`)
        if (res.ok) setResults((await res.json()).data ?? [])
      } finally { setSearching(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors'

  if (value) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {value.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{value.name}</p>
          <p className="text-xs text-slate-400">{value.phone}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="p-1 rounded hover:bg-blue-100 text-slate-400">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="ค้นหาชื่อลูกค้า..."
          className={`${inputCls} pl-9`}
        />
      </div>
      {open && (query.trim() || results.length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {searching ? (
            <p className="px-4 py-3 text-xs text-slate-400">กำลังค้นหา...</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-400">ไม่พบลูกค้า</p>
          ) : results.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => { onChange({ id: c.id, name: c.name, phone: c.phone }); setQuery(''); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{c.name}</p>
                <p className="text-xs text-slate-400">{c.phone}</p>
              </div>
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full border shrink-0 ${
                c.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}>{c.status === 'active' ? 'active' : c.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── VehiclePicker ────────────────────────────────────────────
function VehiclePicker({
  value, onChange,
}: {
  value: { id: string; plate: string; make: string; model: string } | null
  onChange: (v: { id: string; plate: string; make: string; model: string } | null) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Vehicle[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/vehicles?search=${encodeURIComponent(query)}&limit=8`)
        if (res.ok) setResults((await res.json()).data ?? [])
      } finally { setSearching(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors'

  const STATUS_COLOR: Record<string, string> = {
    available: 'bg-green-50 text-green-700 border-green-200',
    rented: 'bg-blue-50 text-blue-700 border-blue-200',
    charging: 'bg-amber-50 text-amber-700 border-amber-200',
    under_repair: 'bg-red-50 text-red-700 border-red-200',
    offline: 'bg-slate-50 text-slate-400 border-slate-200',
  }
  const STATUS_LABEL: Record<string, string> = {
    available: 'ว่าง', rented: 'กำลังเช่า', charging: 'ชาร์จ',
    under_repair: 'ซ่อม', offline: 'ออฟไลน์',
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
          <Car size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 font-mono">{value.plate}</p>
          <p className="text-xs text-slate-400">{value.make} {value.model}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="p-1 rounded hover:bg-green-100 text-slate-400">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Car size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="ค้นหาทะเบียน / รุ่นรถ..."
          className={`${inputCls} pl-9`}
        />
        {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
      </div>
      {open && (query.trim() || results.length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {searching ? (
            <p className="px-4 py-3 text-xs text-slate-400">กำลังค้นหา...</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-400">ไม่พบรถ</p>
          ) : results.map(v => (
            <button
              key={v.id}
              type="button"
              onMouseDown={() => { onChange({ id: v.id, plate: v.plate, make: v.make ?? '', model: v.model }); setQuery(''); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                <Car size={13} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-700 font-mono">{v.plate}</p>
                <p className="text-xs text-slate-400">{v.make} {v.model} · {v.year}</p>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[v.status] ?? STATUS_COLOR.offline}`}>
                {STATUS_LABEL[v.status] ?? v.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Form modal schema (Create / Edit) ───────────────────────
const invoiceSchema = z.object({
  customerId: z.string().nullable(),
  customerName: z.string().min(1, 'กรุณาเลือกลูกค้า'),
  customerPhone: z.string(),
  vehicleId: z.string().nullable(),
  vehiclePlate: z.string(),
  vehicleMake: z.string(),
  vehicleModel: z.string(),
  description: z.string(),
  billingType: z.enum(['daily', 'monthly', 'one_time']),
  amount: z.string().refine(v => {
    const n = parseFloat(v)
    return !isNaN(n) && n > 0
  }, { message: 'กรุณากรอกจำนวนเงินที่ถูกต้อง (> 0)' }),
  dueDate: z.string().min(1, 'กรุณาระบุวันครบกำหนด'),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

function InvoiceFormModal({
  invoice, onClose, onSaved,
}: {
  invoice: Invoice | null
  onClose: () => void
  onSaved: (inv: Invoice) => void
}) {
  const { success, error: toastError } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice
      ? {
          customerId: invoice.customerId ?? null,
          customerName: invoice.customerName,
          customerPhone: '',
          vehicleId: null,
          vehiclePlate: invoice.vehiclePlate ?? '',
          vehicleMake: '',
          vehicleModel: '',
          description: invoice.description ?? '',
          billingType: invoice.billingType,
          amount: String(invoice.amount),
          dueDate: invoice.dueDate,
        }
      : {
          customerId: null,
          customerName: '',
          customerPhone: '',
          vehicleId: null,
          vehiclePlate: '',
          vehicleMake: '',
          vehicleModel: '',
          description: '',
          billingType: 'monthly',
          amount: '',
          dueDate: '',
        },
  })

  const watchedCustomerName = watch('customerName')
  const watchedCustomerId = watch('customerId')
  const watchedCustomerPhone = watch('customerPhone')
  const watchedVehiclePlate = watch('vehiclePlate')
  const watchedVehicleId = watch('vehicleId')
  const watchedVehicleMake = watch('vehicleMake')
  const watchedVehicleModel = watch('vehicleModel')

  const selectedCustomer = watchedCustomerName
    ? { id: watchedCustomerId ?? '', name: watchedCustomerName, phone: watchedCustomerPhone }
    : null

  const selectedVehicle = watchedVehiclePlate
    ? { id: watchedVehicleId ?? '', plate: watchedVehiclePlate, make: watchedVehicleMake, model: watchedVehicleModel }
    : null

  function handleCustomerSelect(c: { id: string; name: string; phone: string } | null) {
    setValue('customerId', c?.id ?? null, { shouldValidate: true })
    setValue('customerName', c?.name ?? '', { shouldValidate: true })
    setValue('customerPhone', c?.phone ?? '')
  }

  function handleVehicleSelect(v: { id: string; plate: string; make: string; model: string } | null) {
    setValue('vehicleId', v?.id ?? null)
    setValue('vehiclePlate', v?.plate ?? '')
    setValue('vehicleMake', v?.make ?? '')
    setValue('vehicleModel', v?.model ?? '')
  }

  async function onSubmit(data: InvoiceFormData) {
    try {
      const body = {
        customerId: data.customerId,
        customerName: data.customerName.trim(),
        vehiclePlate: data.vehiclePlate.trim() || null,
        description: data.description.trim() || null,
        billingType: data.billingType,
        amount: parseFloat(data.amount),
        dueDate: data.dueDate,
      }
      const res = invoice
        ? await fetch(`/api/invoices/${invoice.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      if (res.ok) {
        const saved = await res.json() as Invoice
        success(invoice ? 'แก้ไข Invoice เรียบร้อย' : `สร้าง Invoice ${saved.invoiceNo} เรียบร้อย`)
        onSaved(saved)
      } else {
        const errData = await res.json() as { error?: string }
        const msg = errData.error ?? 'เกิดข้อผิดพลาด'
        setError('root', { message: msg })
        toastError(msg)
      }
    } catch {
      const msg = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      setError('root', { message: msg })
      toastError(msg)
    }
  }

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors'
  const inputErrCls = 'w-full bg-slate-50 border border-red-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors'
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5'
  const fieldErrCls = 'text-red-500 text-xs mt-1'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText size={15} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800">
              {invoice ? `แก้ไข ${invoice.invoiceNo}` : 'สร้าง Invoice ใหม่'}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form id="invoice-form" onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {errors.root && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {errors.root.message}
            </p>
          )}

          {/* Hidden inputs for picker-driven fields */}
          <input type="hidden" {...register('customerId')} />
          <input type="hidden" {...register('customerName')} />
          <input type="hidden" {...register('customerPhone')} />
          <input type="hidden" {...register('vehicleId')} />
          <input type="hidden" {...register('vehiclePlate')} />
          <input type="hidden" {...register('vehicleMake')} />
          <input type="hidden" {...register('vehicleModel')} />

          {/* Customer picker */}
          <div>
            <label className={labelCls}>ลูกค้า <span className="text-red-500">*</span></label>
            <CustomerPicker value={selectedCustomer} onChange={handleCustomerSelect} />
            {errors.customerName && <p className={fieldErrCls}>{errors.customerName.message}</p>}
          </div>

          {/* Vehicle picker */}
          <div>
            <label className={labelCls}>ทะเบียนรถ</label>
            <VehiclePicker value={selectedVehicle} onChange={handleVehicleSelect} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>ประเภทการชำระ <span className="text-red-500">*</span></label>
              <select {...register('billingType')} className={inputCls}>
                <option value="monthly">รายเดือน</option>
                <option value="daily">รายวัน</option>
                <option value="one_time">ครั้งเดียว</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>รายละเอียด</label>
              <input
                type="text"
                placeholder="เช่น ค่าเช่าเดือน พ.ค. 69"
                {...register('description')}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>จำนวนเงิน (฿) <span className="text-red-500">*</span></label>
              <input
                type="number"
                placeholder="8000"
                min="1"
                {...register('amount')}
                className={errors.amount ? inputErrCls : inputCls}
              />
              {errors.amount && <p className={fieldErrCls}>{errors.amount.message}</p>}
            </div>
            <div>
              <label className={labelCls}>วันครบกำหนด <span className="text-red-500">*</span></label>
              <input
                type="date"
                {...register('dueDate')}
                className={errors.dueDate ? inputErrCls : inputCls}
              />
              {errors.dueDate && <p className={fieldErrCls}>{errors.dueDate.message}</p>}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">
            ยกเลิก
          </button>
          <button
            form="invoice-form"
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {isSubmitting ? 'กำลังบันทึก...' : invoice ? 'บันทึกการแก้ไข' : 'สร้าง Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete confirm ───────────────────────────────────────────
function DeleteModal({
  invoice, onClose, onDeleted,
}: {
  invoice: Invoice
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const { success, error: toastError } = useToast()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' })
      if (res.status === 204) {
        success(`ลบ ${invoice.invoiceNo} เรียบร้อย`)
        onDeleted(invoice.id)
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
        <p className="text-slate-500 text-sm">
          ยืนยันการลบ Invoice นี้? ดำเนินการนี้ไม่สามารถย้อนกลับได้
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">
            ยกเลิก
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-semibold transition-colors">
            {deleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Summary interface ─────────────────────────────────────────
interface Summary {
  paidThisMonth: number
  pendingCount: number
  overdueCount: number
  totalOutstanding: number
}

// ─── Main page ────────────────────────────────────────────────
export default function InvoicesPage() {
  const { error: toastError } = useToast()
  const canWrite = useCanWrite()

  const [invoiceList, setInvoiceList] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [summary, setSummary] = useState<Summary>({ paidThisMonth: 0, pendingCount: 0, overdueCount: 0, totalOutstanding: 0 })

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Invoice | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const doFetch = useCallback(async (s: string, f: FilterTab, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
      if (s) params.set('search', s)
      if (f !== 'all') params.set('status', f)
      const res = await fetch(`/api/invoices?${params}`)
      if (!res.ok) { toastError('โหลดข้อมูลไม่สำเร็จ'); return }
      const json = await res.json() as { data: Invoice[]; total: number; summary: Summary }
      setInvoiceList(json.data ?? [])
      setTotal(json.total ?? 0)
      setSummary(json.summary ?? { paidThisMonth: 0, pendingCount: 0, overdueCount: 0, totalOutstanding: 0 })
    } finally {
      setLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    const t = setTimeout(() => void doFetch(search, filter, page), 300)
    return () => clearTimeout(t)
  }, [search, filter, page, doFetch])

  function onSaved(_inv: Invoice) {
    setCreateOpen(false)
    setEditTarget(null)
    void doFetch(search, filter, page)
  }

  function onDeleted(id: string) {
    setInvoiceList(prev => prev.filter(i => i.id !== id))
    setDeleteTarget(null)
    void doFetch(search, filter, page)
  }

  return (
    <div className="space-y-5">
      <PageHeader title="ใบแจ้งหนี้ & การชำระเงิน" subtitle="จัดการ Invoice และติดตามการชำระค่าเช่า">
        {canWrite && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            สร้าง Invoice
          </button>
        )}
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard icon={Banknote} label="เก็บได้รวม" value={`฿${fmt(summary.paidThisMonth)}`}
          iconClass="bg-green-100 text-green-600" valueClass="text-green-700" />
        <SummaryCard icon={Clock} label="รอชำระ" value={`${summary.pendingCount} ใบ`}
          sub="รอการชำระเงิน"
          iconClass="bg-amber-100 text-amber-600" valueClass="text-amber-700" />
        <SummaryCard icon={AlertTriangle} label="เกินกำหนด" value={`${summary.overdueCount} ใบ`}
          sub="ต้องติดตามด่วน"
          iconClass="bg-red-100 text-red-600" valueClass="text-red-700" />
        <SummaryCard icon={Receipt} label="ยอดค้างรวม" value={`฿${fmt(summary.totalOutstanding)}`}
          sub="pending + overdue"
          iconClass="bg-slate-100 text-slate-500" valueClass="text-slate-800" />
      </div>

      <SearchFilterBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1) }}
        placeholder="ค้นหาชื่อลูกค้า, เลข Invoice, ทะเบียน..."
        filterOptions={FILTER_TABS.map(t => ({ value: t.key, label: t.label }))}
        activeFilter={filter}
        onFilterChange={v => { setFilter(v as FilterTab); setPage(1) }}
      />

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200">
              {['Invoice #', 'ลูกค้า', 'ทะเบียน', 'ประเภท', 'จำนวนเงิน', 'ครบกำหนด', 'สถานะ', ''].map(h => (
                <th key={h} className="text-left text-slate-400 text-xs font-semibold px-4 py-3.5 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + (j * 13) % 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : invoiceList.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center">
                  <EmptyState icon={Receipt} title="ยังไม่มี Invoice" subtitle={'กดปุ่ม "สร้าง Invoice" เพื่อเพิ่มรายการแรก'} />
                </td>
              </tr>
            ) : (
              invoiceList.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Invoice # */}
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm font-semibold text-slate-700">{inv.invoiceNo}</span>
                    {inv.description && (
                      <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[120px]">{inv.description}</p>
                    )}
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3.5 text-slate-700 text-sm font-medium">
                    {inv.customerName}
                  </td>

                  {/* Plate */}
                  <td className="px-4 py-3.5">
                    {inv.vehiclePlate
                      ? <span className="text-slate-600 text-sm font-mono">{inv.vehiclePlate}</span>
                      : <span className="text-slate-300 text-sm">—</span>
                    }
                  </td>

                  {/* Billing type */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${BILLING_TYPE_COLOR[inv.billingType]}`}>
                      {BILLING_TYPE_LABEL[inv.billingType]}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3.5">
                    <span className="text-slate-800 font-semibold text-sm tabular-nums">
                      ฿{fmt(inv.amount)}
                    </span>
                  </td>

                  {/* Due date */}
                  <td className="px-4 py-3.5">
                    <span className={`text-sm ${inv.status === 'overdue' ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>
                      {inv.dueDate}
                    </span>
                    {inv.status === 'overdue' && inv.daysOverdue && inv.daysOverdue > 0 && (
                      <p className="text-red-400 text-xs">เกิน {inv.daysOverdue} วัน</p>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <div className="space-y-1">
                      <StatusBadge status={inv.status} />
                      {inv.status === 'paid' && inv.paidAt && (
                        <p className="text-slate-400 text-xs">{inv.paidAt}</p>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <ActionButton variant="view" href={`/billing/invoices/${inv.id}`} icon={Eye} title="ดูใบแจ้งหนี้" />
                      {canWrite && (
                        <ActionButton variant="edit" onClick={() => setEditTarget(inv)} icon={Pencil} title="แก้ไข" />
                      )}
                      {canWrite && inv.status !== 'paid' && (
                        <ActionButton variant="delete" onClick={() => setDeleteTarget(inv)} icon={Trash2} title="ลบ" />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && total > 0 && (
          <PaginationFooter
            page={page}
            totalPages={totalPages}
            label={`แสดง ${invoiceList.length} จาก ${total} รายการ`}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Modals */}
      {(createOpen || editTarget) && (
        <InvoiceFormModal
          invoice={editTarget}
          onClose={() => { setCreateOpen(false); setEditTarget(null) }}
          onSaved={onSaved}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          invoice={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  )
}
