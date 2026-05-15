'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, UserPlus, Pencil } from 'lucide-react'
import ImageUploader from '@/components/ui/image-uploader'
import type { Customer } from '@/lib/types'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/toast'

interface CustomerFormProps {
  mode: 'add' | 'edit'
  initialData?: Customer & { id: string; dateOfBirth?: string; idCardNumber?: string }
}

export default function CustomerForm({ mode, initialData }: CustomerFormProps) {
  const router = useRouter()
  const t = useTranslations('customers')
  const { success, error: toastError } = useToast()

  const [name, setName] = useState(initialData?.name ?? '')
  const [phone, setPhone] = useState(initialData?.phone ?? '')
  const [email, setEmail] = useState(initialData?.email ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth ?? '')
  const [idCardNumber, setIdCardNumber] = useState(initialData?.idCardNumber ?? '')
  const [address, setAddress] = useState(initialData?.address ?? '')
  const [driverType, setDriverType] = useState<'Grab' | 'Bolt' | 'Private'>(
    (initialData?.driverType as 'Grab' | 'Bolt' | 'Private') ?? 'Grab'
  )
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl ?? '')
  const [idCardFrontUrl, setIdCardFrontUrl] = useState(initialData?.idCardFrontUrl ?? '')
  const [idCardBackUrl, setIdCardBackUrl] = useState(initialData?.idCardBackUrl ?? '')
  const [driverLicenseUrl, setDriverLicenseUrl] = useState(initialData?.driverLicenseUrl ?? '')
  const [grabBoltScreenshotUrl, setGrabBoltScreenshotUrl] = useState(initialData?.grabBoltScreenshotUrl ?? '')
  const [rating, setRating] = useState(initialData?.rating != null ? String(initialData.rating) : '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [verifiedAtCounter, setVerifiedAtCounter] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      let res: Response

      if (mode === 'add') {
        const body = {
          name, phone,
          email: email || null, dateOfBirth: dateOfBirth || null,
          idCardNumber: idCardNumber || null, address: address || null,
          driverType,
          avatarUrl: avatarUrl || null,
          idCardFrontUrl: idCardFrontUrl || null, idCardBackUrl: idCardBackUrl || null,
          driverLicenseUrl: driverLicenseUrl || null, grabBoltScreenshotUrl: grabBoltScreenshotUrl || null,
          verifiedAtCounter,
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
          name, phone,
          email: email || null, dateOfBirth: dateOfBirth || null,
          idCardNumber: idCardNumber || null, address: address || null,
          driverType,
          avatarUrl: avatarUrl || null,
          idCardFrontUrl: idCardFrontUrl || null, idCardBackUrl: idCardBackUrl || null,
          driverLicenseUrl: driverLicenseUrl || null, grabBoltScreenshotUrl: grabBoltScreenshotUrl || null,
          notes: notes || null,
        }
        const ratingNum = parseFloat(rating)
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

      const data = await res.json() as { error?: string }
      const errMsg = data?.error ?? (mode === 'add' ? t('form.toast.createError') : t('form.toast.updateError'))
      setError(errMsg)
      toastError(errMsg)
    } catch {
      const msg = t('form.networkError')
      setError(msg)
      toastError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

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
              {mode === 'add' ? t('form.addTitle') : t('form.editTitle', { name: initialData?.name ?? '' })}
            </h1>
            <p className="text-slate-500 text-sm">
              {mode === 'add' ? t('form.addSubtitle') : t('form.editSubtitle')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Section 1: Personal Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
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
                  required
                  placeholder={t('form.namePlaceholder')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  {t('form.phoneLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="text"
                  required
                  placeholder={t('form.phonePlaceholder')}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>{t('form.emailLabel')}</label>
                <input
                  id="email"
                  type="email"
                  placeholder={t('form.emailPlaceholder')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="dateOfBirth" className={labelClass}>{t('form.dobLabel')}</label>
                <input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="idCardNumber" className={labelClass}>{t('form.idCardLabel')}</label>
                <input
                  id="idCardNumber"
                  type="text"
                  placeholder={t('form.idCardPlaceholder')}
                  value={idCardNumber}
                  onChange={e => setIdCardNumber(e.target.value)}
                  className={inputClass}
                />
              </div>
              {mode === 'edit' && (
                <div>
                  <label htmlFor="rating" className={labelClass}>
                    {t('form.ratingLabel')} <span className="text-slate-400 font-normal">{t('form.ratingHint')}</span>
                  </label>
                  <input id="rating" type="number" min="0" max="5" step="0.1" placeholder={t('form.ratingPlaceholder')}
                    value={rating} onChange={e => setRating(e.target.value)} className={inputClass} />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="address" className={labelClass}>{t('form.addressLabel')}</label>
              <textarea
                id="address"
                rows={3}
                placeholder={t('form.addressPlaceholder')}
                value={address}
                onChange={e => setAddress(e.target.value)}
                className={inputClass}
              />
            </div>
            {mode === 'edit' && (
              <div>
                <label htmlFor="notes" className={labelClass}>
                  {t('form.notesLabel')} <span className="text-slate-400 font-normal">{t('form.notesHint')}</span>
                </label>
                <textarea id="notes" rows={4}
                  placeholder={t('form.notesPlaceholder')}
                  value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Driver Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5">{t('form.sectionDriver')}</h2>
          <div className="space-y-5">
            <div>
              <label className={labelClass}>{t('form.driverTypeLabel')} <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                {(['Grab', 'Bolt', 'Private'] as const).map(type => (
                  <button key={type} type="button" onClick={() => setDriverType(type)}
                    className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors ${
                      driverType === type
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <ImageUploader value={avatarUrl} onChange={setAvatarUrl} label={t('form.avatarLabel')} folder="customers" />
          </div>
        </div>

        {/* Section 3: KYC Documents */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide mb-5">{t('form.sectionKyc')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            <ImageUploader value={idCardFrontUrl} onChange={setIdCardFrontUrl} label={t('form.kycIdFront')} folder="customers" />
            <ImageUploader value={idCardBackUrl} onChange={setIdCardBackUrl} label={t('form.kycIdBack')} folder="customers" />
            <ImageUploader value={driverLicenseUrl} onChange={setDriverLicenseUrl} label={t('form.kycLicense')} folder="customers" />
            <ImageUploader value={grabBoltScreenshotUrl} onChange={setGrabBoltScreenshotUrl} label={t('form.kycGrabBolt')} folder="customers" />
          </div>
          {mode === 'add' && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
              verifiedAtCounter ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <input id="verifiedAtCounter" type="checkbox" checked={verifiedAtCounter}
                onChange={e => setVerifiedAtCounter(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              <div>
                <label htmlFor="verifiedAtCounter" className="block text-sm font-medium text-slate-700 cursor-pointer">
                  {t('form.verifiedLabel')}
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  {t('form.verifiedHint')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors">
            <Save size={16} />
            {submitting ? t('form.saving') : mode === 'add' ? t('form.saveCustomer') : t('form.saveChanges')}
          </button>
        </div>
      </form>
    </div>
  )
}
