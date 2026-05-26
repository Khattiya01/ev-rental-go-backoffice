'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save, FileText, User, Car, CalendarDays,
  Loader2, X, Search,
} from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import FileUploader from '@/components/ui/file-uploader'
import { useToast } from '@/components/ui/toast'
import type { Contract, Customer, Vehicle } from '@/lib/types'
import PageHeader from '@/components/ui/page-header'
import SectionCard from '@/components/ui/section-card'
import ErrorAlert from '@/components/ui/error-alert'

// ─── Schema ───────────────────────────────────────────────────────
const contractSchema = z.object({
  customerId: z.string().min(1, 'กรุณาเลือกลูกค้า'),
  vehicleId: z.string().min(1, 'กรุณาเลือกรถ'),
  startDate: z.string().min(1, 'กรุณาระบุวันเริ่มสัญญา'),
  dueDate: z.string().min(1, 'กรุณาระบุวันสิ้นสุดสัญญา'),
  billingType: z.enum(['monthly', 'daily']),
  dailyRate: z.string(),
  monthlyRate: z.string(),
  depositAmount: z.string(),
  documentUrl: z.string(),
})

type ContractFormData = z.infer<typeof contractSchema>

// ─── Customer search picker ───────────────────────────────────────────
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

  // Display state for pickers (not in RHF — we sync IDs via setValue)
  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string } | null>(
    initialData ? { id: initialData.customerId, name: initialData.customerName, phone: '' } : null
  )
  const [vehicle, setVehicle] = useState<{ id: string; plate: string; model: string; make: string } | null>(
    initialData ? { id: initialData.vehicleId, plate: initialData.vehiclePlate, model: '', make: '' } : null
  )

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      customerId: initialData?.customerId ?? '',
      vehicleId: initialData?.vehicleId ?? '',
      startDate: initialData?.startDate ?? '',
      dueDate: initialData?.dueDate ?? '',
      billingType: initialData?.billingType ?? 'monthly',
      dailyRate: initialData ? String(initialData.dailyRate) : '',
      monthlyRate: initialData ? String(initialData.monthlyRate) : '',
      depositAmount: initialData ? String(initialData.depositAmount) : '',
      documentUrl: initialData?.documentUrl ?? '',
    },
  })

  const billingType = watch('billingType')

  function handleCustomerChange(c: { id: string; name: string; phone: string } | null) {
    setCustomer(c)
    setValue('customerId', c?.id ?? '', { shouldValidate: true })
  }

  function handleVehicleChange(v: { id: string; plate: string; model: string; make: string } | null) {
    setVehicle(v)
    setValue('vehicleId', v?.id ?? '', { shouldValidate: true })
  }

  const apiError = errors.root?.message

  const inputClass = 'w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'
  const fieldErrorClass = 'text-red-500 text-xs mt-1'

  async function onSubmit(data: ContractFormData) {
    try {
      let res: Response

      if (mode === 'add') {
        res = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: data.customerId,
            vehicleId: data.vehicleId,
            startDate: data.startDate,
            dueDate: data.dueDate,
            billingType: data.billingType,
            dailyRate: parseFloat(data.dailyRate) || 0,
            monthlyRate: parseFloat(data.monthlyRate) || 0,
            depositAmount: parseFloat(data.depositAmount) || 0,
            documentUrl: data.documentUrl || undefined,
          }),
        })
        if (res.status === 201) {
          const responseData = await res.json() as { contractNo: string; id: string }
          success(`สร้างสัญญา ${responseData.contractNo} เรียบร้อย`)
          router.push(`/contracts/${responseData.id}`)
          router.refresh()
          return
        }
      } else {
        res = await fetch(`/api/contracts/${initialData!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: data.startDate,
            dueDate: data.dueDate,
            billingType: data.billingType,
            dailyRate: parseFloat(data.dailyRate) || 0,
            monthlyRate: parseFloat(data.monthlyRate) || 0,
            depositAmount: parseFloat(data.depositAmount) || 0,
            documentUrl: data.documentUrl || '',
          }),
        })
        if (res.ok) {
          success('อัปเดตสัญญาเรียบร้อย')
          router.push(`/contracts/${initialData!.id}`)
          router.refresh()
          return
        }
      }

      const responseData = await res.json() as { error?: string }
      const msg = responseData?.error ?? (mode === 'add' ? 'สร้างสัญญาไม่สำเร็จ' : 'อัปเดตสัญญาไม่สำเร็จ')
      setError('root', { message: msg })
      toastError(msg)
    } catch {
      const msg = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      setError('root', { message: msg })
      toastError(msg)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        onBack={() => router.back()}
        title={mode === 'add' ? 'สร้างสัญญาเช่าใหม่' : `แก้ไขสัญญา #${initialData?.contractNo}`}
        subtitle={mode === 'add' ? 'กรอกข้อมูลสัญญาเช่าและอัปโหลดเอกสาร' : 'แก้ไขรายละเอียดและเอกสารสัญญา'}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <ErrorAlert message={apiError} />

        {/* Section 1: คู่สัญญา */}
        <SectionCard className="p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
            <User size={15} className="text-slate-400" />
            คู่สัญญา
            {mode === 'edit' && <span className="text-xs font-normal text-slate-400 normal-case ml-1">(ไม่สามารถเปลี่ยนแปลงได้)</span>}
          </h2>
          {/* Hidden inputs to register IDs in RHF */}
          <input type="hidden" {...register('customerId')} />
          <input type="hidden" {...register('vehicleId')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                ลูกค้า <span className="text-red-500">*</span>
              </label>
              <CustomerPicker value={customer} onChange={handleCustomerChange} disabled={mode === 'edit'} />
              {errors.customerId && <p className={fieldErrorClass}>{errors.customerId.message}</p>}
            </div>
            <div>
              <label className={labelClass}>
                รถ <span className="text-red-500">*</span>
              </label>
              <VehiclePicker value={vehicle} onChange={handleVehicleChange} disabled={mode === 'edit'} />
              {errors.vehicleId && <p className={fieldErrorClass}>{errors.vehicleId.message}</p>}
            </div>
          </div>
        </SectionCard>

        {/* Section 2: ระยะเวลาสัญญา */}
        <SectionCard className="p-6">
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
                {...register('startDate')}
                className={errors.startDate ? 'w-full bg-white border border-red-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors' : inputClass}
              />
              {errors.startDate && <p className={fieldErrorClass}>{errors.startDate.message}</p>}
            </div>
            <div>
              <label htmlFor="dueDate" className={labelClass}>
                วันสิ้นสุดสัญญา <span className="text-red-500">*</span>
              </label>
              <input
                id="dueDate"
                type="date"
                {...register('dueDate')}
                className={errors.dueDate ? 'w-full bg-white border border-red-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors' : inputClass}
              />
              {errors.dueDate && <p className={fieldErrorClass}>{errors.dueDate.message}</p>}
            </div>
          </div>
        </SectionCard>

        {/* Section 3: ราคาและเงื่อนไข */}
        <SectionCard className="p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5">
            ราคาและเงื่อนไข
          </h2>

          {/* Billing type selector */}
          <div className="mb-5">
            <label className={labelClass}>
              รูปแบบการเรียกเก็บเงิน <span className="text-red-500">*</span>
            </label>
            <input type="hidden" {...register('billingType')} />
            <div className="flex gap-2">
              {([
                { value: 'monthly', label: 'รายเดือน', sub: 'ออกใบแจ้งหนี้ทุกเดือน' },
                { value: 'daily',   label: 'รายวัน',   sub: 'ออกใบแจ้งหนี้ทุกวัน' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('billingType', opt.value)}
                  className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-medium transition-colors text-left ${
                    billingType === opt.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <span className="block font-semibold">{opt.label}</span>
                  <span className={`block text-xs mt-0.5 ${billingType === opt.value ? 'text-blue-100' : 'text-slate-400'}`}>
                    {opt.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

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
                  placeholder="0"
                  {...register('dailyRate')}
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
                  placeholder="0"
                  {...register('monthlyRate')}
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
                  placeholder="0"
                  {...register('depositAmount')}
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            ค่าปรับแบตเตอรี่: ความจุลดลงเกิน 5% คิดเพิ่ม ฿200 ต่อครั้ง
          </div>
        </SectionCard>

        {/* Section 4: เอกสารสัญญา */}
        <SectionCard className="p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
            <FileText size={15} className="text-slate-400" />
            เอกสารสัญญา
          </h2>
          <Controller
            name="documentUrl"
            control={control}
            render={({ field }) => (
              <FileUploader
                value={field.value}
                onChange={field.onChange}
                label="อัปโหลดสัญญา (PDF)"
                folder="contracts"
                accept="application/pdf"
                hint="PDF ขนาดไม่เกิน 10 MB"
              />
            )}
          />
        </SectionCard>

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
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isSubmitting ? 'กำลังบันทึก...' : mode === 'add' ? 'สร้างสัญญา' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </form>
    </div>
  )
}
