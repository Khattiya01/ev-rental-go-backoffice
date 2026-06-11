'use client'

import { useRouter } from 'next/navigation'
import { Save, Loader2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import type { Vehicle, VehicleStatus, GeofenceZone } from '@/lib/types'
import MultiImageUploader from '@/components/ui/multi-image-uploader'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/toast'
import PageHeader from '@/components/ui/page-header'
import SectionCard from '@/components/ui/section-card'
import ErrorAlert from '@/components/ui/error-alert'

const STATUS_OPTIONS: VehicleStatus[] = ['available', 'rented', 'charging', 'under_repair', 'offline']

const vehicleSchema = z.object({
  plate: z.string().min(1, 'กรุณากรอกทะเบียน'),
  make: z.string().min(1, 'กรุณากรอกยี่ห้อ'),
  model: z.string().min(1, 'กรุณากรอกรุ่น'),
  year: z.string().min(1, 'กรุณากรอกปี'),
  color: z.string(),
  vin: z.string(),
  status: z.enum(['available', 'rented', 'charging', 'under_repair', 'offline']),
  images: z.array(z.string()),
  odometer: z.string(),
  condition: z.string(),
  location: z.string(),
  nextServiceDate: z.string(),
  geofenceZoneId: z.string().optional(),  // '' = none, UUID = assigned
})

type VehicleFormData = z.infer<typeof vehicleSchema>

interface VehicleFormProps {
  mode: 'add' | 'edit'
  initialData?: Vehicle
}

export default function VehicleForm({ mode, initialData }: VehicleFormProps) {
  const router = useRouter()
  const t = useTranslations('vehicleForm')
  const td = useTranslations('vehicles')
  const { success, error: toastError } = useToast()
  const [zones, setZones] = useState<GeofenceZone[]>([])

  useEffect(() => {
    fetch('/api/geofences')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(({ data }: { data: GeofenceZone[] }) => setZones((data ?? []).filter(z => z.active)))
      .catch(() => {/* non-critical */})
  }, [])

  const STATUS_LABELS: Record<VehicleStatus, string> = {
    available: td('status.available'),
    rented: td('status.rented'),
    charging: td('status.charging'),
    under_repair: td('status.under_repair'),
    offline: td('status.offline'),
  }

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate: initialData?.plate ?? '',
      make: initialData?.make ?? '',
      model: initialData?.model ?? '',
      year: String(initialData?.year ?? new Date().getFullYear()),
      color: initialData?.color ?? '',
      vin: initialData?.vin ?? '',
      status: initialData?.status ?? 'available',
      images: initialData?.images ?? (initialData?.imageUrl ? [initialData.imageUrl] : []),
      odometer: String(initialData?.odometer ?? '0'),
      condition: initialData?.condition ?? 'Good',
      location: initialData?.location ?? '',
      nextServiceDate: initialData?.nextServiceDate ?? '',
      geofenceZoneId: initialData?.geofenceZoneId ?? '',
    },
  })

  const apiError = errors.root?.message

  async function onSubmit(data: VehicleFormData) {
    if (mode === 'edit' && !initialData) return

    const body = {
      plate: data.plate,
      make: data.make,
      model: data.model,
      year: parseInt(data.year, 10),
      color: data.color || null,
      vin: data.vin || null,
      imageUrl: data.images[0] ?? null,
      images: data.images,
      status: data.status,
      odometer: parseInt(data.odometer, 10) || 0,
      condition: data.condition || null,
      location: data.location || null,
      nextServiceDate: data.nextServiceDate || null,
      ...(mode === 'edit' ? { geofenceZoneId: data.geofenceZoneId || null } : {}),
    }

    try {
      const url = mode === 'add' ? '/api/vehicles' : `/api/vehicles/${initialData!.id}`
      const method = mode === 'add' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 201 || res.status === 200) {
        success(mode === 'add' ? t('toast.created') : t('toast.updated'))
        router.push('/fleet/vehicles')
        router.refresh()
      } else {
        const responseData = await res.json() as { error?: string }
        const msg = responseData?.error ?? (mode === 'add' ? t('toast.createError') : t('toast.updateError'))
        setError('root', { message: msg })
        toastError(msg)
      }
    } catch {
      const msg = t('networkError')
      setError('root', { message: msg })
      toastError(msg)
    }
  }

  const inputClass =
    'w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors'
  const inputErrorClass =
    'w-full bg-white border border-red-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'
  const fieldErrorClass = 'text-red-500 text-xs mt-1'

  return (
    <div className="space-y-6">
      <PageHeader
        onBack={() => router.back()}
        title={mode === 'add' ? t('addTitle') : t('editTitle', { plate: initialData?.plate ?? '' })}
        subtitle={mode === 'add' ? t('addSubtitle') : t('editSubtitle')}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <ErrorAlert message={apiError} />

        {/* Vehicle Identity */}
        <SectionCard className="p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5">{t('sectionIdentity')}</h2>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Photo — left column */}
            <Controller
              name="images"
              control={control}
              render={({ field }) => (
                <MultiImageUploader value={field.value} onChange={field.onChange} label={t('photosLabel')} />
              )}
            />

            {/* Fields — right column */}
            <div className="space-y-5">
              <div>
                <label htmlFor="plate" className={labelClass}>
                  {t('plateLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="plate"
                  type="text"
                  placeholder={t('platePlaceholder')}
                  {...register('plate')}
                  className={errors.plate ? inputErrorClass : inputClass}
                />
                {errors.plate && <p className={fieldErrorClass}>{errors.plate.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="make" className={labelClass}>
                    {t('makeLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="make"
                    type="text"
                    placeholder={t('makePlaceholder')}
                    {...register('make')}
                    className={errors.make ? inputErrorClass : inputClass}
                  />
                  {errors.make && <p className={fieldErrorClass}>{errors.make.message}</p>}
                </div>

                <div>
                  <label htmlFor="model" className={labelClass}>
                    {t('modelLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="model"
                    type="text"
                    placeholder={t('modelPlaceholder')}
                    {...register('model')}
                    className={errors.model ? inputErrorClass : inputClass}
                  />
                  {errors.model && <p className={fieldErrorClass}>{errors.model.message}</p>}
                </div>

                <div>
                  <label htmlFor="year" className={labelClass}>
                    {t('yearLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="year"
                    type="number"
                    min={1990}
                    max={2030}
                    {...register('year')}
                    className={errors.year ? inputErrorClass : inputClass}
                  />
                  {errors.year && <p className={fieldErrorClass}>{errors.year.message}</p>}
                </div>

                <div>
                  <label htmlFor="color" className={labelClass}>{t('colorLabel')}</label>
                  <input
                    id="color"
                    type="text"
                    placeholder={t('colorPlaceholder')}
                    {...register('color')}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="vin" className={labelClass}>VIN (Vehicle Identification Number)</label>
                <input
                  id="vin"
                  type="text"
                  placeholder="17-character VIN"
                  {...register('vin')}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Current Status */}
        <SectionCard className="p-6 space-y-5">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide">{t('sectionStatus')}</h2>

          <div>
            <label htmlFor="status" className={labelClass}>{t('statusLabel')}</label>
            <select
              id="status"
              {...register('status')}
              className={inputClass}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="odometer" className={labelClass}>{t('odometerLabel')}</label>
              <input
                id="odometer"
                type="number"
                min={0}
                {...register('odometer')}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="condition" className={labelClass}>{t('conditionLabel')}</label>
              <select
                id="condition"
                {...register('condition')}
                className={inputClass}
              >
                {(['Excellent', 'Good', 'Fair', 'Poor'] as const).map(c => (
                  <option key={c} value={c}>{t(`conditions.${c}` as Parameters<typeof t>[0])}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="location" className={labelClass}>{t('locationLabel')}</label>
              <input
                id="location"
                type="text"
                placeholder={t('locationPlaceholder')}
                {...register('location')}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="nextServiceDate" className={labelClass}>{t('nextServiceLabel')}</label>
              <input
                id="nextServiceDate"
                type="date"
                {...register('nextServiceDate')}
                className={inputClass}
              />
            </div>
          </div>
        </SectionCard>

        {/* Geofencing */}
        <SectionCard className="p-6 space-y-5">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide">{t('sectionGeofencing')}</h2>
          <div>
            <label htmlFor="geofenceZoneId" className={labelClass}>{t('geofenceZoneLabel')}</label>
            {/* Controller (not register) so value= prop is set on every render.
                Without it, react-hook-form sets the DOM value only at mount —
                before zones load — so the saved zone never appears selected. */}
            <Controller
              name="geofenceZoneId"
              control={control}
              render={({ field }) => (
                <select
                  id="geofenceZoneId"
                  {...field}
                  value={field.value ?? ''}
                  className={inputClass}
                >
                  <option value="">{t('geofenceZoneNone')}</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              )}
            />
            <p className="text-slate-400 text-xs mt-1">
              {t('geofenceZoneHint')}
            </p>
          </div>
        </SectionCard>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 py-2">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isSubmitting ? t('saving') : mode === 'add' ? t('addVehicle') : t('saveChanges')}
          </button>
        </div>
      </form>
    </div>
  )
}
