'use client'

import { useRouter } from 'next/navigation'
import { Save, Loader2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import ImageUploader from '@/components/ui/image-uploader'
import type { Customer } from '@/lib/types'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/toast'
import PageHeader from '@/components/ui/page-header'
import SectionCard from '@/components/ui/section-card'
import ErrorAlert from '@/components/ui/error-alert'

const customerSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ'),
  phone: z.string().min(1, 'กรุณากรอกเบอร์โทร').regex(/^0[0-9]{9}$/, 'เบอร์โทร 10 หลัก (ขึ้นต้นด้วย 0)'),
  email: z.union([z.literal(''), z.string().email('รูปแบบอีเมลไม่ถูกต้อง')]),
  dateOfBirth: z.string(),
  idCardNumber: z.string(),
  address: z.string(),
  driverType: z.enum(['Grab', 'Bolt', 'Private']),
  avatarUrl: z.string(),
  idCardFrontUrl: z.string(),
  idCardBackUrl: z.string(),
  driverLicenseUrl: z.string(),
  grabBoltScreenshotUrl: z.string(),
  rating: z.string(),
  notes: z.string(),
  verifiedAtCounter: z.boolean(),
})

type CustomerFormData = z.infer<typeof customerSchema>

interface CustomerFormProps {
  mode: 'add' | 'edit'
  initialData?: Customer & { id: string; dateOfBirth?: string; idCardNumber?: string }
}

export default function CustomerForm({ mode, initialData }: CustomerFormProps) {
  const router = useRouter()
  const t = useTranslations('customers')
  const { success, error: toastError } = useToast()

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      phone: initialData?.phone ?? '',
      email: initialData?.email ?? '',
      dateOfBirth: initialData?.dateOfBirth ?? '',
      idCardNumber: initialData?.idCardNumber ?? '',
      address: initialData?.address ?? '',
      driverType: (initialData?.driverType as 'Grab' | 'Bolt' | 'Private') ?? 'Grab',
      avatarUrl: initialData?.avatarUrl ?? '',
      idCardFrontUrl: initialData?.idCardFrontUrl ?? '',
      idCardBackUrl: initialData?.idCardBackUrl ?? '',
      driverLicenseUrl: initialData?.driverLicenseUrl ?? '',
      grabBoltScreenshotUrl: initialData?.grabBoltScreenshotUrl ?? '',
      rating: initialData?.rating != null ? String(initialData.rating) : '',
      notes: initialData?.notes ?? '',
      verifiedAtCounter: false,
    },
  })

  const driverType = watch('driverType')
  const verifiedAtCounter = watch('verifiedAtCounter')
  const apiError = errors.root?.message

  async function onSubmit(data: CustomerFormData) {
    try {
      let res: Response

      if (mode === 'add') {
        const body = {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          dateOfBirth: data.dateOfBirth || null,
          idCardNumber: data.idCardNumber || null,
          address: data.address || null,
          driverType: data.driverType,
          avatarUrl: data.avatarUrl || null,
          idCardFrontUrl: data.idCardFrontUrl || null,
          idCardBackUrl: data.idCardBackUrl || null,
          driverLicenseUrl: data.driverLicenseUrl || null,
          grabBoltScreenshotUrl: data.grabBoltScreenshotUrl || null,
          verifiedAtCounter: data.verifiedAtCounter,
        }
        res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.status === 201) {
          success(t('form.toast.created'))
          router.push('/customers')
          router.refresh()
          return
        }
      } else {
        const body: Record<string, unknown> = {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          dateOfBirth: data.dateOfBirth || null,
          idCardNumber: data.idCardNumber || null,
          address: data.address || null,
          driverType: data.driverType,
          avatarUrl: data.avatarUrl || null,
          idCardFrontUrl: data.idCardFrontUrl || null,
          idCardBackUrl: data.idCardBackUrl || null,
          driverLicenseUrl: data.driverLicenseUrl || null,
          grabBoltScreenshotUrl: data.grabBoltScreenshotUrl || null,
          notes: data.notes || null,
        }
        const ratingNum = parseFloat(data.rating)
        if (!isNaN(ratingNum)) body.rating = ratingNum
        res = await fetch(`/api/customers/${initialData!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          success(t('form.toast.updated'))
          router.push(`/customers/${initialData!.id}`)
          router.refresh()
          return
        }
      }

      const responseData = await res.json() as { error?: string }
      const errMsg = responseData?.error ?? (mode === 'add' ? t('form.toast.createError') : t('form.toast.updateError'))
      setError('root', { message: errMsg })
      toastError(errMsg)
    } catch {
      const msg = t('form.networkError')
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
        title={mode === 'add' ? t('form.addTitle') : t('form.editTitle', { name: initialData?.name ?? '' })}
        subtitle={mode === 'add' ? t('form.addSubtitle') : t('form.editSubtitle')}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <ErrorAlert message={apiError} />

        {/* Section 1: Personal Information */}
        <SectionCard className="p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5">
            {t('form.sectionPersonal')}
          </h2>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="name" className={labelClass}>
                  {t('form.nameLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder={t('form.namePlaceholder')}
                  {...register('name')}
                  className={errors.name ? inputErrorClass : inputClass}
                />
                {errors.name && <p className={fieldErrorClass}>{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  {t('form.phoneLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="text"
                  placeholder={t('form.phonePlaceholder')}
                  {...register('phone')}
                  className={errors.phone ? inputErrorClass : inputClass}
                />
                {errors.phone && <p className={fieldErrorClass}>{errors.phone.message}</p>}
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>{t('form.emailLabel')}</label>
                <input
                  id="email"
                  type="email"
                  placeholder={t('form.emailPlaceholder')}
                  {...register('email')}
                  className={errors.email ? inputErrorClass : inputClass}
                />
                {errors.email && <p className={fieldErrorClass}>{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="dateOfBirth" className={labelClass}>{t('form.dobLabel')}</label>
                <input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="idCardNumber" className={labelClass}>{t('form.idCardLabel')}</label>
                <input
                  id="idCardNumber"
                  type="text"
                  placeholder={t('form.idCardPlaceholder')}
                  {...register('idCardNumber')}
                  className={inputClass}
                />
              </div>

              {mode === 'edit' && (
                <div>
                  <label htmlFor="rating" className={labelClass}>
                    {t('form.ratingLabel')} <span className="text-slate-400 font-normal">{t('form.ratingHint')}</span>
                  </label>
                  <input
                    id="rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    placeholder={t('form.ratingPlaceholder')}
                    {...register('rating')}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="address" className={labelClass}>{t('form.addressLabel')}</label>
              <textarea
                id="address"
                rows={3}
                placeholder={t('form.addressPlaceholder')}
                {...register('address')}
                className={inputClass}
              />
            </div>

            {mode === 'edit' && (
              <div>
                <label htmlFor="notes" className={labelClass}>
                  {t('form.notesLabel')} <span className="text-slate-400 font-normal">{t('form.notesHint')}</span>
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  placeholder={t('form.notesPlaceholder')}
                  {...register('notes')}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        </SectionCard>

        {/* Section 2: Driver Information */}
        <SectionCard className="p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5">{t('form.sectionDriver')}</h2>
          <div className="space-y-5">
            <div>
              <label className={labelClass}>{t('form.driverTypeLabel')} <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                {(['Grab', 'Bolt', 'Private'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValue('driverType', type)}
                    className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors ${
                      driverType === type
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <Controller
              name="avatarUrl"
              control={control}
              render={({ field }) => (
                <ImageUploader value={field.value} onChange={field.onChange} label={t('form.avatarLabel')} folder="customers" />
              )}
            />
          </div>
        </SectionCard>

        {/* Section 3: KYC Documents */}
        <SectionCard className="p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5">{t('form.sectionKyc')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            <Controller
              name="idCardFrontUrl"
              control={control}
              render={({ field }) => (
                <ImageUploader value={field.value} onChange={field.onChange} label={t('form.kycIdFront')} folder="customers" />
              )}
            />
            <Controller
              name="idCardBackUrl"
              control={control}
              render={({ field }) => (
                <ImageUploader value={field.value} onChange={field.onChange} label={t('form.kycIdBack')} folder="customers" />
              )}
            />
            <Controller
              name="driverLicenseUrl"
              control={control}
              render={({ field }) => (
                <ImageUploader value={field.value} onChange={field.onChange} label={t('form.kycLicense')} folder="customers" />
              )}
            />
            <Controller
              name="grabBoltScreenshotUrl"
              control={control}
              render={({ field }) => (
                <ImageUploader value={field.value} onChange={field.onChange} label={t('form.kycGrabBolt')} folder="customers" />
              )}
            />
          </div>
          {mode === 'add' && (
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                verifiedAtCounter ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <input
                id="verifiedAtCounter"
                type="checkbox"
                {...register('verifiedAtCounter')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <label htmlFor="verifiedAtCounter" className="block text-sm font-medium text-slate-700 cursor-pointer">
                  {t('form.verifiedLabel')}
                </label>
                <p className="mt-1 text-xs text-slate-500">{t('form.verifiedHint')}</p>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? t('form.saving') : mode === 'add' ? t('form.saveCustomer') : t('form.saveChanges')}
          </button>
        </div>
      </form>
    </div>
  )
}
