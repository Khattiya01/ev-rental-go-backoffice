'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { InputHTMLAttributes } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save, FileText, User, Car, CalendarDays,
  Loader2, X, Search, Tag,
} from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import FileUploader from '@/components/ui/file-uploader'
import { useToast } from '@/components/ui/toast'
import type { Contract, Customer, Vehicle } from '@/lib/types'
import PageHeader from '@/components/ui/page-header'
import SectionCard from '@/components/ui/section-card'
import ErrorAlert from '@/components/ui/error-alert'

// ─── Static form type (schema built inside component for i18n) ────────────────
type ContractFormData = {
  customerId:    string
  vehicleId:     string
  startDate:     string
  dueDate:       string
  billingType:   'monthly' | 'daily'
  dailyRate:     string
  monthlyRate:   string
  depositAmount: string
  documentUrl:   string
}

// ─── Pricing type ─────────────────────────────────────────────────────────────
type PricingPlan = {
  vehicleModel: string
  dailyRate:    number
  monthlyRate:  number
  deposit:      number
}

// ─── Customer search picker ───────────────────────────────────────────────────
function CustomerPicker({
  value, onChange, disabled, placeholder, noResults,
}: {
  value: { id: string; name: string; phone: string } | null
  onChange: (v: { id: string; name: string; phone: string } | null) => void
  disabled?: boolean
  placeholder: string
  noResults: string
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
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{value.name.charAt(0)}</div>
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
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{value.name.charAt(0)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{value.name}</p>
          <p className="text-xs text-slate-400">{value.phone}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="p-1 rounded hover:bg-blue-100 text-slate-400"><X size={14} /></button>
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
          placeholder={placeholder}
          className={`${inputClass} pl-10`}
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
      </div>
      {open && query.trim() && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {results.length === 0 && !loading && <p className="px-4 py-3 text-sm text-slate-400">{noResults}</p>}
          {results.map(c => (
            <button key={c.id} type="button"
              onMouseDown={() => { onChange({ id: c.id, name: c.name, phone: c.phone }); setQuery(''); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{c.name.charAt(0)}</div>
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

// ─── Vehicle search picker ────────────────────────────────────────────────────
type VehicleSelection = { id: string; plate: string; model: string; make: string }

function VehiclePicker({
  value, onChange, disabled, placeholder, noResults,
}: {
  value: VehicleSelection | null
  onChange: (v: VehicleSelection | null) => void
  disabled?: boolean
  placeholder: string
  noResults: string
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
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0"><Car size={15} className="text-white" /></div>
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
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0"><Car size={15} className="text-white" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 font-mono">{value.plate}</p>
          <p className="text-xs text-slate-400">{value.make} {value.model}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="p-1 rounded hover:bg-green-100 text-slate-400"><X size={14} /></button>
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
          placeholder={placeholder}
          className={`${inputClass} pl-10`}
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {results.length === 0 && !loading && <p className="px-4 py-3 text-sm text-slate-400">{noResults}</p>}
          {results.map(v => (
            <button key={v.id} type="button"
              onMouseDown={() => { onChange({ id: v.id, plate: v.plate, model: v.model, make: v.make }); setQuery(''); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0"><Car size={14} className="text-white" /></div>
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

// ─── Rate input ───────────────────────────────────────────────────────────────
function RateInput({ id, label, registerProps, hint }: {
  id: string
  label: string
  registerProps: InputHTMLAttributes<HTMLInputElement>
  hint?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
        <input
          id={id}
          type="number"
          min="0"
          step="1"
          placeholder="0"
          {...registerProps}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors pl-8"
        />
      </div>
      {hint && <p className="text-slate-400 text-xs mt-1">{hint}</p>}
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────
interface ContractFormProps {
  mode: 'add' | 'edit'
  initialData?: Contract
}

export default function ContractForm({ mode, initialData }: ContractFormProps) {
  const router = useRouter()
  const t = useTranslations('contractForm')
  const { success, error: toastError } = useToast()

  // Build zod schema with translated validation messages
  const contractSchema = useMemo(() => z.object({
    customerId:    z.string().min(1, t('validation.customerRequired')),
    vehicleId:     z.string().min(1, t('validation.vehicleRequired')),
    startDate:     z.string().min(1, t('validation.startDateRequired')),
    dueDate:       z.string().min(1, t('validation.dueDateRequired')),
    billingType:   z.enum(['monthly', 'daily']),
    dailyRate:     z.string(),
    monthlyRate:   z.string(),
    depositAmount: z.string(),
    documentUrl:   z.string(),
  }), [t])

  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string } | null>(
    initialData ? { id: initialData.customerId, name: initialData.customerName, phone: '' } : null
  )
  const [vehicle, setVehicle] = useState<VehicleSelection | null>(
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
      customerId:    initialData?.customerId    ?? '',
      vehicleId:     initialData?.vehicleId     ?? '',
      startDate:     initialData?.startDate     ?? '',
      dueDate:       initialData?.dueDate       ?? '',
      billingType:   initialData?.billingType   ?? 'monthly',
      dailyRate:     initialData ? String(initialData.dailyRate)     : '',
      monthlyRate:   initialData ? String(initialData.monthlyRate)   : '',
      depositAmount: initialData ? String(initialData.depositAmount) : '',
      documentUrl:   initialData?.documentUrl   ?? '',
    },
  })

  const billingType = watch('billingType')

  // Auto-fill pricing defaults when vehicle selected (add mode only)
  const applyPricing = useCallback(async (make: string, model: string) => {
    try {
      const res = await fetch('/api/pricing')
      if (!res.ok) return
      const data = await res.json() as { plans: PricingPlan[] }
      const plan = data.plans.find(p => p.vehicleModel === `${make} ${model}`)
      if (!plan) return
      setValue('dailyRate',     String(plan.dailyRate))
      setValue('monthlyRate',   String(plan.monthlyRate))
      setValue('depositAmount', String(plan.deposit))
    } catch { /* silently ignore */ }
  }, [setValue])

  function handleCustomerChange(c: { id: string; name: string; phone: string } | null) {
    setCustomer(c)
    setValue('customerId', c?.id ?? '', { shouldValidate: true })
  }

  function handleVehicleChange(v: VehicleSelection | null) {
    setVehicle(v)
    setValue('vehicleId', v?.id ?? '', { shouldValidate: true })
    if (v && mode === 'add') applyPricing(v.make, v.model)
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
            customerId:    data.customerId,
            vehicleId:     data.vehicleId,
            startDate:     data.startDate,
            dueDate:       data.dueDate,
            billingType:   data.billingType,
            dailyRate:     parseFloat(data.dailyRate)     || 0,
            monthlyRate:   parseFloat(data.monthlyRate)   || 0,
            depositAmount: parseFloat(data.depositAmount) || 0,
            documentUrl:   data.documentUrl || undefined,
          }),
        })
        if (res.status === 201) {
          const rd = await res.json() as { contractNo: string; id: string }
          success(t('toast.created', { contractNo: rd.contractNo }))
          router.push(`/contracts/${rd.id}`)
          router.refresh()
          return
        }
      } else {
        res = await fetch(`/api/contracts/${initialData!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate:     data.startDate,
            dueDate:       data.dueDate,
            billingType:   data.billingType,
            dailyRate:     parseFloat(data.dailyRate)     || 0,
            monthlyRate:   parseFloat(data.monthlyRate)   || 0,
            depositAmount: parseFloat(data.depositAmount) || 0,
            documentUrl:   data.documentUrl || '',
          }),
        })
        if (res.ok) {
          success(t('toast.updated'))
          router.push(`/contracts/${initialData!.id}`)
          router.refresh()
          return
        }
      }

      const rd = await res.json() as { error?: string }
      const msg = rd?.error ?? t(mode === 'add' ? 'toast.createError' : 'toast.updateError')
      setError('root', { message: msg })
      toastError(msg)
    } catch {
      const msg = t('toast.genericError')
      setError('root', { message: msg })
      toastError(msg)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        onBack={() => router.back()}
        title={mode === 'add' ? t('addTitle') : t('editTitle', { contractNo: initialData?.contractNo ?? '' })}
        subtitle={mode === 'add' ? t('addSubtitle') : t('editSubtitle')}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <ErrorAlert message={apiError} />

        {/* ── Section 1: คู่สัญญา ────────────────────────────────────────── */}
        <SectionCard className="p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
            <User size={15} className="text-slate-400" />
            {t('parties.title')}
            {mode === 'edit' && (
              <span className="text-xs font-normal text-slate-400 normal-case ml-1">{t('parties.editNote')}</span>
            )}
          </h2>
          <input type="hidden" {...register('customerId')} />
          <input type="hidden" {...register('vehicleId')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                {t('parties.customerLabel')} <span className="text-red-500">*</span>
              </label>
              <CustomerPicker
                value={customer}
                onChange={handleCustomerChange}
                disabled={mode === 'edit'}
                placeholder={t('parties.customerPlaceholder')}
                noResults={t('parties.noCustomers')}
              />
              {errors.customerId && <p className={fieldErrorClass}>{errors.customerId.message}</p>}
            </div>
            <div>
              <label className={labelClass}>
                {t('parties.vehicleLabel')} <span className="text-red-500">*</span>
              </label>
              <VehiclePicker
                value={vehicle}
                onChange={handleVehicleChange}
                disabled={mode === 'edit'}
                placeholder={t('parties.vehiclePlaceholder')}
                noResults={t('parties.noVehicles')}
              />
              {errors.vehicleId && <p className={fieldErrorClass}>{errors.vehicleId.message}</p>}
            </div>
          </div>
        </SectionCard>

        {/* ── Section 2: ระยะเวลาสัญญา ─────────────────────────────────── */}
        <SectionCard className="p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
            <CalendarDays size={15} className="text-slate-400" />
            {t('period.title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="startDate" className={labelClass}>
                {t('period.startDate')} <span className="text-red-500">*</span>
              </label>
              <input
                id="startDate" type="date" {...register('startDate')}
                className={errors.startDate ? 'w-full bg-white border border-red-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors' : inputClass}
              />
              {errors.startDate && <p className={fieldErrorClass}>{errors.startDate.message}</p>}
            </div>
            <div>
              <label htmlFor="dueDate" className={labelClass}>
                {t('period.dueDate')} <span className="text-red-500">*</span>
              </label>
              <input
                id="dueDate" type="date" {...register('dueDate')}
                className={errors.dueDate ? 'w-full bg-white border border-red-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors' : inputClass}
              />
              {errors.dueDate && <p className={fieldErrorClass}>{errors.dueDate.message}</p>}
            </div>
          </div>
        </SectionCard>

        {/* ── Section 3: ราคาและเงื่อนไข ───────────────────────────────── */}
        <SectionCard className="p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
            <Tag size={15} className="text-slate-400" />
            {t('pricing.title')}
          </h2>

          {/* Billing type selector */}
          <div className="mb-5">
            <label className={labelClass}>
              {t('pricing.billingTypeLabel')} <span className="text-red-500">*</span>
            </label>
            <input type="hidden" {...register('billingType')} />
            <div className="flex gap-2">
              {([
                { value: 'monthly' as const, label: t('pricing.monthly'), sub: t('pricing.monthlyHint') },
                { value: 'daily'   as const, label: t('pricing.daily'),   sub: t('pricing.dailyHint') },
              ]).map(opt => (
                <button
                  key={opt.value} type="button"
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

          {/* Rate inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {billingType === 'daily' ? (
              <RateInput
                id="dailyRate"
                label={t('pricing.dailyRateLabel')}
                registerProps={register('dailyRate')}
                hint={vehicle?.make ? t('pricing.pricingFrom', { model: `${vehicle.make} ${vehicle.model}` }) : undefined}
              />
            ) : (
              <RateInput
                id="monthlyRate"
                label={t('pricing.monthlyRateLabel')}
                registerProps={register('monthlyRate')}
                hint={vehicle?.make ? t('pricing.pricingFrom', { model: `${vehicle.make} ${vehicle.model}` }) : undefined}
              />
            )}
            <RateInput
              id="depositAmount"
              label={t('pricing.depositLabel')}
              registerProps={register('depositAmount')}
            />
          </div>

          {mode === 'add' && (
            <p className="mt-3 text-xs text-slate-400">{t('pricing.autoHint')}</p>
          )}
        </SectionCard>

        {/* ── Section 4: เอกสารสัญญา ───────────────────────────────────── */}
        <SectionCard className="p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5 flex items-center gap-2">
            <FileText size={15} className="text-slate-400" />
            {t('document.title')}
          </h2>
          <Controller
            name="documentUrl"
            control={control}
            render={({ field }) => (
              <FileUploader
                value={field.value}
                onChange={field.onChange}
                label={t('document.uploadLabel')}
                folder="contracts"
                accept="application/pdf"
                hint={t('document.uploadHint')}
              />
            )}
          />
        </SectionCard>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button" onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            {t('buttons.cancel')}
          </button>
          <button
            type="submit" disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isSubmitting ? t('buttons.saving') : mode === 'add' ? t('buttons.create') : t('buttons.update')}
          </button>
        </div>
      </form>
    </div>
  )
}
