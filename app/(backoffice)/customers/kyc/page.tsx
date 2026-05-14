'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, ImageOff, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Customer } from '@/lib/types'
import ImageLightbox, { ClickableImage } from '@/components/ui/image-lightbox'
import { useToast } from '@/components/ui/toast'


export default function KYCApprovalPage() {
  const t = useTranslations('customers')
  const searchParams = useSearchParams()
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const customerId = searchParams.get('id')

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<{ src: string; label: string } | null>(null)

  useEffect(() => {
    if (!customerId) {
      router.replace('/customers')
      return
    }
    const fetchCustomer = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/customers/${customerId}`)
        if (res.ok) {
          setCustomer(await res.json())
        } else {
          router.replace('/customers')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchCustomer()
  }, [customerId, router])

  const handleApprove = async () => {
    if (!customer || submitting) return
    setSubmitting(true)
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    setSubmitting(false)
    if (res.ok) {
      success(t('kyc.toast.approved'))
      router.push('/customers')
    } else {
      toastError(t('kyc.toast.approveError'))
    }
  }

  const handleRejectConfirm = async () => {
    if (!customer || submitting || !rejectReason.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', kycRejectReason: rejectReason.trim() }),
    })
    setSubmitting(false)
    if (res.ok) {
      success(t('kyc.toast.rejected'))
      setRejectModalOpen(false)
      router.push('/customers')
    } else {
      toastError(t('kyc.toast.rejectError'))
    }
  }

  const extractedData = customer
    ? [
        { label: t('kyc.fields.fullName'), value: customer.name || null },
        { label: t('kyc.fields.idNumber'), value: customer.idCardNumber || null },
        { label: t('kyc.fields.dateOfBirth'), value: customer.dateOfBirth || null },
        { label: t('kyc.fields.address'), value: customer.address || null },
        { label: t('kyc.fields.driverType'), value: customer.driverType || null },
      ]
    : []

  if (loading || !customer) {
    return <div className="text-center py-20 text-slate-400">{t('kyc.loading')}</div>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/customers')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm mb-3 transition-colors"
        >
          <ArrowLeft size={16} /> {t('kyc.backToList')}
        </button>
        <h1 className="text-slate-800 text-xl font-bold">
          {t('kyc.title', { name: customer.name })}
        </h1>
      </div>

      {/* Top row: Profile + Personal Info + Actions */}
      <div className="grid grid-cols-3 gap-5">
        {/* Profile photo */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-slate-800 font-semibold mb-4">{t('kyc.profilePhoto')}</h2>
          {customer.avatarUrl ? (
            <ClickableImage
              src={customer.avatarUrl}
              alt={t('kyc.profilePhoto')}
              className="w-full rounded-xl object-cover aspect-square"
              onClick={() => setPreview({ src: customer.avatarUrl, label: `${customer.name} — ${t('kyc.profilePhoto')}` })}
            />
          ) : (
            <div className="w-full rounded-xl bg-slate-100 aspect-square flex items-center justify-center">
              <div className="text-center text-slate-400">
                <ImageOff size={32} className="mx-auto mb-2" />
                <p className="text-xs">{t('kyc.noPhotoUploaded')}</p>
              </div>
            </div>
          )}
          <div className="mt-3 space-y-1">
            <p className="text-slate-800 text-sm font-semibold">{customer.name}</p>
            <p className="text-slate-500 text-xs">{customer.phone}</p>
            <span className="inline-block text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              {customer.driverType}
            </span>
          </div>
        </div>

        {/* Personal Info + Actions — spans 2 cols */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
          <h2 className="text-slate-800 font-semibold mb-4">{t('kyc.personalInfo')}</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 flex-1">
            {extractedData.map(item => (
              <div key={item.label}>
                <p className="text-slate-400 text-xs mb-0.5">{item.label}</p>
                {item.value
                  ? <p className="text-slate-700 text-sm font-medium">{item.value}</p>
                  : <p className="text-slate-300 text-sm italic">—</p>
                }
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <CheckCircle size={16} />
              {submitting ? t('kyc.processing') : t('kyc.approve')}
            </button>
            <button
              onClick={() => setRejectModalOpen(true)}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <XCircle size={16} />
              {t('kyc.reject')}
            </button>
          </div>
        </div>
      </div>

      {/* KYC Rejection History */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-slate-800 font-semibold mb-3">{t('kyc.rejectionHistory')}</h2>
        {customer.kycNotes ? (
          <div className="space-y-2">
            {customer.kycNotes.split('\n').map((entry, i) => (
              <div key={i} className="flex gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <p className="text-rose-800 leading-relaxed">{entry}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">{t('kyc.noRejectionHistory')}</p>
        )}
      </div>

      {/* Bottom: KYC Documents — full width 2×2 grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-slate-800 font-semibold mb-4">{t('kyc.kycDocuments')}</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: t('detail.kycIdFront'), url: customer.idCardFrontUrl },
            { label: t('detail.kycIdBack'), url: customer.idCardBackUrl },
            { label: t('detail.kycLicense'), url: customer.driverLicenseUrl },
            { label: t('kyc.driverTypeScreenshot', { driverType: customer.driverType }), url: customer.grabBoltScreenshotUrl },
          ].map(({ label, url }) => (
            <div key={label}>
              <p className="text-slate-500 text-xs font-medium mb-2">{label}</p>
              {url ? (
                <ClickableImage
                  src={url}
                  alt={label}
                  className="w-full object-contain aspect-[3/2] rounded-xl bg-slate-50"
                  onClick={() => setPreview({ src: url, label })}
                />
              ) : (
                <div className="w-full aspect-[3/2] rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5 bg-slate-50/50">
                  <ImageOff size={24} className="text-slate-300" />
                  <p className="text-slate-300 text-xs">{t('kyc.noImage')}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Image lightbox */}
      {preview && (
        <ImageLightbox
          src={preview.src}
          label={preview.label}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Reject reason modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-slate-800 text-lg font-bold">{t('kyc.rejectModal.title')}</h3>
            <p className="text-slate-500 text-sm">
              {t('kyc.rejectModal.message', { name: customer.name })}
            </p>
            <textarea
              rows={3}
              autoFocus
              placeholder={t('kyc.rejectModal.placeholder')}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setRejectModalOpen(false); setRejectReason('') }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm transition-colors"
              >
                {t('kyc.rejectModal.cancel')}
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={submitting || !rejectReason.trim()}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {submitting ? t('kyc.rejectModal.rejecting') : t('kyc.rejectModal.confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
