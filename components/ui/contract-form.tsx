'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, FileText, User, Car, CalendarDays,
  Loader2, X, Search,
} from 'lucide-react'
import FileUploader from '@/components/ui/file-uploader'
import { useToast } from '@/components/ui/toast'
import type { Contract, Customer, Vehicle } from '@/lib/types'

// ─── Customer search picker ───────────────────────────────────────
function CustomerPicker({
  value, onChange, disabled,
}: {
  value: { id: string; name: string; phone: string } | null
  onChange: (v: { id: string; name: string; phone: string } | null) => void
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
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
      setLoading(true)
      try {
        const res = await fetch(`/api/customers?status=active&search=${encodeURIComponent(query)}&limit=8`)
        if (res.ok) setResults((await res.json()).data ?? [])
      } finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const inputClass = 'w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors'

  if (disabled && value) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {value.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">{value.name}</p>
          <p className="text-xs text-slate-400">{value.phone}</p>
        </div>
      </div>
    )
  }

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
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="ค้นหาชื่อลูกค้า (เฉพาะผ่าน KYC แล้ว)"
          className={`${inputClass} pl-10`}
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
      </div>
      {open && query.trim() && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {results.length === 0 && !loading && (
            <p className="px-4 py-3 text-sm text-slate-400">ไม่พบลูกค้า หรือยังไม่ผ่าน KYC</p>
          )}
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => { onChange({ id: c.id, name: c.name, phone: c.phone }); setQuery(''); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {c.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{c.name}</p>
                <p className="text-xs text-slate-400">{c.phone} · {c.driverType}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Vehicle search picker ────────────────────────────────────────
function VehiclePicker({
  value, onChange, disabled,
}: {
  value: { id: string; plate: string; model: string; make: string } | null
  onChange: (v: { id: string; plate: string; model: string; make: string } | null) => void
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Vehicle[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const q = query.trim() ? `&search=${encodeURIComponent(query)}` : ''
        const res = await fetch(`/api/vehicles?status=available${q}&limit=8`)
        if (res.ok) setResults((await res.json()).data ?? [])
      } finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const inputClass = 'w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors'

  if (disabled && value) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
          <Car size={15} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800 font-mono">{value.plate}</p>
          <p className="text-xs text-slate-400">{value.make} {value.model}</p>
        </div>
      </div>
    )
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
          <Car size={15} className="text-white" />
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
        <Car size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="ค้นหาทะเบียน / รุ่นรถ (เฉพาะว่างอยู่)"
          className={`${inputClass} pl-10`}
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {results.length === 0 && !loading && (
            <p className="px-4 py-3 text-sm text-slate-400">ไม่พบรถว่าง</p>
          )}
          {results.map(v => (
            <button
              key={v.id}
              type="button"
              onMouseDown={() => { onChange({ id: v.id, plate: v.plate, model: v.model, make: v.make }); setQuery(''); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                <Car size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 font-mono">{v.plate}</p>
                <p className="text-xs text-slate-400">{v.make} {v.model} · {v.year}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────
interface ContractFormProps {
  mode: 'add' | 'edit'
  initialData?: Contract
}

export default function ContractForm({ mode, initialData }: ContractFormProps) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Customer & vehicle
  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string } | null>(
    initialData ? { id: initialData.customerId, name: initialData.customerName, phone: '' } : null
  )
  const [vehicle, setVehicle] = useState<{ id: string; plate: string; model: string; make: string } | null>(
    initialData ? { id: initialData.vehicleId, plate: initialData.vehiclePlate, model: '', make: '' } : null
  )

  // Dates & rates
  const [startDate, setStartDate] = useState(initialData?.startDate ?? '')
  const [dueDate, setDueDate] = useState(initialData?.dueDate ?? '')
  const [dailyRate, setDailyRate] = useState(initialData ? String(initialData.dailyRate) : '')
  const [monthlyRate, setMonthlyRate] = useState(initialData ? String(initialData.monthlyRate) : '')
  const [depositAmount, setDepositAmount] = useState(initialData ? String(initialData.depositAmount) : '')

  // Document
  const [documentUrl, setDocumentUrl] = useState(initialData?.documentUrl ?? '')

  const inputClass = 'w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setFormError('')

    if (mode === 'add') {
      if (!customer) { toastError('กรุณาเลือกลูกค้า'); return }
      if (!vehicle) { toastError('กรุณาเลือกรถ'); return }
    }
    if (!startDate || !dueDate) { toastError('กรุณาระบุวันเริ่มและวันสิ้นสุดสัญญา'); return }

    setSubmitting(true)
    try {
      let res: Response

      if (mode === 'add') {
        res = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: customer!.id,
            vehicleId: vehicle!.id,
            startDate,
            dueDate,
            dailyRate: parseFloat(dailyRate) || 0,
            monthlyRate: parseFloat(monthlyRate) || 0,
            depositAmount: parseFloat(depositAmount) || 0,
            documentUrl: documentUrl || undefined,
          }),
        })
        if (res.status === 201) {
          const data = await res.json() as { contractNo: string; id: string }
          success(`สร้างสัญญา ${data.contractNo} เรียบร้อย`)
          router.push(`/contracts/${data.id}`)
          router.refresh()
          return
        }
      } else {
        res = await fetch(`/api/contracts/${initialData!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate,
            dueDate,
            dailyRate: parseFloat(dailyRate) || 0,
            monthlyRate: parseFloat(monthlyRate) || 0,
            depositAmount: parseFloat(depositAmount) || 0,
            documentUrl: documentUrl || '',
          }),
        })
        if (res.ok) {
          success('อัปเดตสัญญาเรียบร้อย')
          router.push(`/contracts/${initialData!.id}`)
          router.refresh()
          return
        }
      }

      const data = await res.json() as { error?: string }
      const msg = data?.error ?? (mode === 'add' ? 'สร้างสัญญาไม่สำเร็จ' : 'อัปเดตสัญญาไม่สำเร็จ')
      setFormError(msg)
      toastError(msg)
    } catch {
      const msg = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      setFormError(msg)
      toastError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-slate-800 text-xl font-bold">
              {mode === 'add' ? 'สร้างสัญญาเช่าใหม่' : `แก้ไขสัญญา #${initialData?.contractNo}`}
            </h1>
            <p className="text-slate-500 text-sm">
              {mode === 'add' ? 'กรอกข้อมูลสัญญาเช่าและอัปโหลดเอกสาร' : 'แก้ไขรายละเอียดและเอกสารสัญญา'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{formError}</div>
        )}

        {/* Section 1: คู่สัญญา */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
            <User size={15} className="text-slate-400" />
            คู่สัญญา
            {mode === 'edit' && <span className="text-xs font-normal text-slate-400 normal-case ml-1">(ไม่สามารถเปลี่ยนแปลงได้)</span>}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                ลูกค้า <span className="text-red-500">*</span>
              </label>
              <CustomerPicker value={customer} onChange={setCustomer} disabled={mode === 'edit'} />
            </div>
            <div>
              <label className={labelClass}>
                รถ <span className="text-red-500">*</span>
              </label>
              <VehiclePicker value={vehicle} onChange={setVehicle} disabled={mode === 'edit'} />
            </div>
          </div>
        </div>

        {/* Section 2: ระยะเวลาสัญญา */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
            <CalendarDays size={15} className="text-slate-400" />
            ระยะเวลาสัญญา
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="startDate" className={labelClass}>
                วันเริ่มสัญญา <span className="text-red-500">*</span>
              </label>
              <input
                id="startDate"
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="dueDate" className={labelClass}>
                วันสิ้นสุดสัญญา <span className="text-red-500">*</span>
              </label>
              <input
                id="dueDate"
                type="date"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 3: ราคาและเงื่อนไข */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5">
            ราคาและเงื่อนไข
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label htmlFor="dailyRate" className={labelClass}>ค่าเช่ารายวัน (฿)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                <input
                  id="dailyRate"
                  type="number"
                  min="0"
                  step="1"
                  value={dailyRate}
                  onChange={e => setDailyRate(e.target.value)}
                  placeholder="0"
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="monthlyRate" className={labelClass}>ค่าเช่ารายเดือน (฿)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                <input
                  id="monthlyRate"
                  type="number"
                  min="0"
                  step="1"
                  value={monthlyRate}
                  onChange={e => setMonthlyRate(e.target.value)}
                  placeholder="0"
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="depositAmount" className={labelClass}>เงินมัดจำ (฿)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                <input
                  id="depositAmount"
                  type="number"
                  min="0"
                  step="1"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="0"
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            ค่าปรับแบตเตอรี่: ความจุลดลงเกิน 5% คิดเพิ่ม ฿200 ต่อครั้ง
          </div>
        </div>

        {/* Section 4: เอกสารสัญญา */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
            <FileText size={15} className="text-slate-400" />
            เอกสารสัญญา
          </h2>
          <FileUploader
            value={documentUrl}
            onChange={setDocumentUrl}
            label="อัปโหลดสัญญา (PDF)"
            folder="contracts"
            accept="application/pdf"
            hint="PDF ขนาดไม่เกิน 10 MB"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {submitting ? 'กำลังบันทึก...' : mode === 'add' ? 'สร้างสัญญา' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </form>
    </div>
  )
}
