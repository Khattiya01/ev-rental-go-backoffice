'use client'

import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/toast'
import PageHeader from '@/components/ui/page-header'
import Toggle from '@/components/ui/toggle'

// ─── Schema ───────────────────────────────────────────────────────────────────
const planSchema = z.object({
  id:           z.string().nullable(),
  vehicleModel: z.string(),
  dailyRate:    z.number().min(0),
  monthlyRate:  z.number().min(0),
  deposit:      z.number().min(0),
  enabled:      z.boolean(),
})

const pricingSchema = z.object({ plans: z.array(planSchema) })
type PricingFormData = z.infer<typeof pricingSchema>

type NumericField = 'dailyRate' | 'monthlyRate' | 'deposit'

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-2/3 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(j => (
              <div key={j} className="flex justify-between items-center">
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-8 bg-slate-100 rounded w-28" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Number stepper ───────────────────────────────────────────────────────────
function Stepper({ value, onChange, step = 500 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
      <input
        type="number"
        min="0"
        value={value}
        onChange={e => onChange(Math.max(0, Number(e.target.value)))}
        className="bg-transparent text-slate-700 text-sm px-2.5 py-1.5 w-24 focus:outline-none text-right"
      />
      <div className="flex flex-col border-l border-slate-200">
        <button type="button" onClick={() => onChange(value + step)} className="text-slate-400 hover:text-slate-600 px-1.5 text-[10px] leading-none py-0.5">▲</button>
        <button type="button" onClick={() => onChange(Math.max(0, value - step))} className="text-slate-400 hover:text-slate-600 px-1.5 text-[10px] leading-none py-0.5">▼</button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PricingSettingsPage() {
  const t = useTranslations('pricingSettings')
  const { success, error: toastError } = useToast()

  const numericFields: { label: string; field: NumericField }[] = [
    { label: t('fields.dailyRate'),   field: 'dailyRate' },
    { label: t('fields.monthlyRate'), field: 'monthlyRate' },
    { label: t('fields.deposit'),     field: 'deposit' },
  ]

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<PricingFormData>({
    resolver: zodResolver(pricingSchema),
    defaultValues: { plans: [] },
  })

  const { fields } = useFieldArray({ control, name: 'plans' })

  useEffect(() => {
    fetch('/api/pricing')
      .then(r => r.json())
      .then((data: { plans: PricingFormData['plans'] }) => reset({ plans: data.plans }))
      .catch(() => toastError(t('toast.loadError')))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(data: PricingFormData) {
    try {
      const res = await fetch('/api/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: data.plans }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        toastError(err.error ?? t('toast.saveError'))
        return
      }
      success(t('toast.saveSuccess'))
    } catch {
      toastError(t('toast.genericError'))
    }
  }

  const plans = watch('plans')
  const hasPlans = fields.length > 0

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-24">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <button
          type="submit"
          disabled={isSubmitting || !hasPlans}
          className="shrink-0 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          {isSubmitting ? t('saving') : t('save')}
        </button>
      </div>

      {!hasPlans ? <Skeleton /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {fields.map((field, index) => {
            const enabled = plans[index]?.enabled ?? false
            const isNew   = !plans[index]?.id

            return (
              <div
                key={field.id}
                className={`bg-white rounded-xl border p-5 transition-all ${
                  enabled ? 'border-violet-400/50 shadow-sm' : 'border-slate-200 opacity-70'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-slate-800 font-semibold text-sm">{field.vehicleModel}</h3>
                    {isNew && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-0.5 inline-block">
                        {t('unsetBadge')}
                      </span>
                    )}
                  </div>
                  <Toggle
                    checked={enabled}
                    onChange={() => setValue(`plans.${index}.enabled`, !enabled)}
                    label={t('enableLabel')}
                  />
                </div>

                {/* Rate fields */}
                <div className="space-y-3">
                  {numericFields.map(item => (
                    <div key={item.field} className="flex items-center justify-between gap-2">
                      <label className="text-slate-500 text-xs shrink-0">{item.label}</label>
                      <Stepper
                        value={getValues(`plans.${index}.${item.field}`) ?? 0}
                        onChange={v => setValue(`plans.${index}.${item.field}`, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasPlans && fields.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-400 text-sm">{t('emptyFleet')}</p>
        </div>
      )}
    </form>
  )
}
