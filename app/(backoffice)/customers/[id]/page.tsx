'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Phone, MapPin, CreditCard, Calendar, Car, UserCircle, Pencil, ClipboardList, FileText } from 'lucide-react'
import type { Customer } from '@/lib/types'
import type { Contract } from '@/db/schema'
import Badge from '@/components/ui/badge'
import Modal from '@/components/ui/modal'
import ImageLightbox, { ClickableImage } from '@/components/ui/image-lightbox'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/toast'
import { useCanWrite } from '@/lib/user-context'
import PageHeader from '@/components/ui/page-header'
import SectionCard from '@/components/ui/section-card'

export default function CustomerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('customers')
  const { success, error: toastError } = useToast()
  const canWrite = useCanWrite()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [contractsLoading, setContractsLoading] = useState(false)

  const [preview, setPreview] = useState<{ src: string; label: string } | null>(null)

  // Blacklist state
  const [blacklistReason, setBlacklistReason] = useState('')
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false)
  const [blacklistError, setBlacklistError] = useState('')

  // Suspend state
  const [suspendModalOpen, setSuspendModalOpen] = useState(false)

  // Reactivate / direct activate state
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false)
  const [directActivateModalOpen, setDirectActivateModalOpen] = useState(false)

  const fetchCustomer = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/customers/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setCustomer(data)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  useEffect(() => {
    if (!params.id) return
    setContractsLoading(true)
    fetch(`/api/contracts?customerId=${params.id}&limit=100`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then((json: { data: Contract[] }) => setContracts(json.data ?? []))
      .catch(() => setContracts([]))
      .finally(() => setContractsLoading(false))
  }, [params.id])

  const handleBlacklist = async () => {
    if (!customer) return
    if (!blacklistReason.trim()) {
      setBlacklistError(t('detail.blacklistReasonRequired'))
      return
    }
    setBlacklistError('')
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'blacklisted', bannedReason: blacklistReason }),
    })
    if (res.ok) {
      setCustomer(prev => prev ? { ...prev, status: 'blacklisted' } : prev)
      setBlacklistModalOpen(false)
      success(t('detail.toast.blacklisted'))
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      const msg = data.error ?? t('detail.toast.actionError')
      setBlacklistError(msg)
    }
  }

  const handleSuspend = async () => {
    if (!customer) return
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' }),
    })
    if (res.ok) {
      setCustomer(prev => prev ? { ...prev, status: 'suspended' } : prev)
      setSuspendModalOpen(false)
      success(t('detail.toast.suspended'))
    } else {
      const data = await res.json().catch(() => ({}))
      toastError(data.error ?? t('detail.toast.actionError'))
    }
  }

  const handleActivate = async () => {
    if (!customer) return
    const isPendingKyc = customer.status === 'pending_kyc'
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    if (res.ok) {
      setCustomer(prev =>
        prev
          ? { ...prev, status: 'active', bannedDate: undefined, bannedReason: undefined, bannedBy: undefined }
          : prev
      )
      setReactivateModalOpen(false)
      success(isPendingKyc ? t('detail.toast.activated') : t('detail.toast.reactivated'))
    } else {
      toastError(t('detail.toast.actionError'))
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        {t('detail.notFound')}
      </div>
    )
  }

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.floor(customer.rating))

  const driverTypeBadgeColor =
    customer.driverType === 'Grab'
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : customer.driverType === 'Bolt'
        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'

  const kycDocs: { label: string; url?: string }[] = [
    { label: t('detail.kycIdFront'), url: customer.idCardFrontUrl },
    { label: t('detail.kycIdBack'), url: customer.idCardBackUrl },
    { label: t('detail.kycLicense'), url: customer.driverLicenseUrl },
    { label: t('detail.kycGrabBolt'), url: customer.grabBoltScreenshotUrl },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        onBack={() => router.back()}
        title={t('detail.title')}
        subtitle={t('detail.subtitle')}
      >
        {canWrite && (
          <button
            onClick={() => router.push(`/customers/${customer.id}/edit`)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Pencil size={14} />
            {t('detail.edit')}
          </button>
        )}
      </PageHeader>

      {/* Profile header */}
      <SectionCard>
        <div className="flex items-center gap-4">
          {customer.avatarUrl ? (
            <ClickableImage
              src={customer.avatarUrl}
              alt={customer.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-blue-500/50"
              onClick={() => setPreview({ src: customer.avatarUrl, label: customer.name })}
            />
          ) : (
            <div className="w-20 h-20 rounded-full border-2 border-slate-200 flex items-center justify-center bg-slate-50">
              <UserCircle size={48} className="text-slate-300" />
            </div>
          )}
          <div>
            <h2 className="text-slate-800 text-2xl font-bold">{customer.name}</h2>
            <div className="flex items-center gap-1 mt-1">
              {stars.map((filled, i) => (
                <span key={i} className={filled ? 'text-amber-400' : 'text-slate-300'}>
                  ★
                </span>
              ))}
              <span className="text-slate-500 text-sm ml-1">
                {customer.rating > 0 ? customer.rating.toFixed(1) : t('detail.noRating')}
              </span>
            </div>
            <div className="mt-2">
              <Badge variant={customer.status} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Col 1 — Personal Info */}
        <SectionCard title={t('detail.personalInfo')}>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Mail size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-slate-400 text-xs">{t('detail.emailLabel')}</p>
                <p className="text-slate-700 text-sm">{customer.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-slate-400 text-xs">{t('detail.phoneLabel')}</p>
                <p className="text-slate-700 text-sm">{customer.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-slate-400 text-xs">{t('detail.addressLabel')}</p>
                <p className="text-slate-700 text-sm">{customer.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-slate-400 text-xs">{t('detail.idCardLabel')}</p>
                <p className="text-slate-700 text-sm">{customer.idCardNumber ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-slate-400 text-xs">{t('detail.dobLabel')}</p>
                <p className="text-slate-700 text-sm">{customer.dateOfBirth ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Car size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-slate-400 text-xs">{t('detail.driverTypeLabel')}</p>
                <span
                  className={`inline-block mt-0.5 px-2 py-0.5 text-xs rounded-full border ${driverTypeBadgeColor}`}
                >
                  {customer.driverType}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Col 2 — Driver Credit Score */}
        <SectionCard title={t('detail.creditScore')}>
          {customer.creditScore > 0 ? (
            <div className="text-center">
              <div className="relative w-28 h-28 mx-auto mb-3">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={
                      customer.creditScore > 800
                        ? '#22c55e'
                        : customer.creditScore > 600
                          ? '#f59e0b'
                          : '#ef4444'
                    }
                    strokeWidth="10"
                    strokeDasharray={`${(customer.creditScore / 1000) * 314} 314`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-slate-800 text-xl font-bold">{customer.creditScore}</span>
                  <span className="text-slate-500 text-xs">/ 1000</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-sm">{t('detail.noCreditScore')}</div>
          )}
        </SectionCard>

        {/* Col 3 — Rental History */}
        <SectionCard title={t('detail.rentalHistory')} className="flex flex-col">
          {contractsLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
            </div>
          ) : contracts.length === 0 ? (
            <p className="text-slate-400 text-sm">{t('detail.noRentalHistory')}</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-56">
              {contracts.map(c => {
                const statusColor =
                  c.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    c.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-500'
                const statusLabel =
                  c.status === 'active' ? 'กำลังเช่า' :
                    c.status === 'overdue' ? 'เกินกำหนด' : 'เสร็จสิ้น'
                return (
                  <Link
                    key={c.id}
                    href={`/contracts/${c.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 text-xs font-semibold">{c.contractNo}</p>
                      <p className="text-slate-400 text-xs truncate">{c.vehiclePlate} · {c.startDate} – {c.dueDate}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
          {contracts.length > 0 && (
            <p className="text-slate-400 text-xs mt-3">{contracts.length} สัญญา</p>
          )}
        </SectionCard>
      </div>

      {/* KYC Documents */}
      <SectionCard title={t('detail.kycDocuments')}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kycDocs.map(({ label, url }) => (
            <div key={label}>
              <p className="text-slate-400 text-xs mb-2">{label}</p>
              {url ? (
                <ClickableImage
                  src={url}
                  alt={label}
                  className="w-full h-40 object-cover rounded-xl border border-slate-200"
                  onClick={() => setPreview({ src: url, label })}
                />
              ) : (
                <div className="w-full h-40 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                  <p className="text-slate-300 text-xs">{t('detail.kycNotUploaded')}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Bottom row: Admin Notes + Account Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Admin Notes */}
        <SectionCard>
          <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
            <ClipboardList size={16} className="text-slate-400" />
            {t('detail.adminNotes')}
          </h3>
          <p className="text-slate-600 text-sm whitespace-pre-line">
            {customer.notes ? customer.notes : <span className="text-slate-400">{t('detail.noAdminNotes')}</span>}
          </p>
        </SectionCard>

        {/* Account Status Actions */}
        <SectionCard>
          <h3 className="text-slate-800 font-semibold mb-1">{t('detail.accountStatus')}</h3>
          <p className="text-slate-400 text-xs mb-4">{t('detail.accountStatusHint')}</p>

          {/* Current status display */}
          <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500 text-sm">{t('detail.currentStatus')}</span>
            <Badge variant={customer.status} />
            {customer.status === 'blacklisted' && customer.bannedDate && (
              <span className="text-slate-400 text-xs ml-auto">
                {t('detail.bannedOn', { date: customer.bannedDate })}
                {customer.bannedBy ? ` ${t('detail.bannedBy', { name: customer.bannedBy })}` : ''}
              </span>
            )}
          </div>

          {/* Blacklist reason display */}
          {customer.status === 'blacklisted' && customer.bannedReason && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-500 text-xs font-medium mb-0.5">{t('detail.banReason')}</p>
              <p className="text-red-700 text-sm">{customer.bannedReason}</p>
            </div>
          )}

          {/* Contextual action buttons */}
          <div className="space-y-3">
            {canWrite ? (
              <>
                {customer.status === 'pending_kyc' && (
                  <div className="space-y-2">
                    <Link
                      href={`/customers/kyc?id=${customer.id}`}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      {t('detail.reviewKycDocuments')}
                    </Link>
                    <button
                      onClick={() => setDirectActivateModalOpen(true)}
                      className="w-full bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      {t('detail.activateDirectly')}
                    </button>
                    <p className="text-slate-400 text-xs text-center">
                      {t('detail.activateDirectlyHint')}
                    </p>
                  </div>
                )}

                {customer.status === 'active' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSuspendModalOpen(true)}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      {t('detail.actions.suspend')}
                    </button>
                    <button
                      onClick={() => setBlacklistModalOpen(true)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      {t('detail.actions.blacklist')}
                    </button>
                  </div>
                )}

                {customer.status === 'suspended' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setReactivateModalOpen(true)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      {t('detail.actions.reactivate')}
                    </button>
                    <button
                      onClick={() => setBlacklistModalOpen(true)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      {t('detail.actions.blacklist')}
                    </button>
                  </div>
                )}

                {customer.status === 'blacklisted' && (
                  <button
                    onClick={() => setReactivateModalOpen(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    {t('detail.actions.reactivateAccount')}
                  </button>
                )}

              </>
            ) : null}
          </div>
        </SectionCard>
      </div>

      {/* Image lightbox */}
      {preview && (
        <ImageLightbox
          src={preview.src}
          label={preview.label}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Reactivate Confirmation Modal */}
      <Modal
        isOpen={reactivateModalOpen}
        onClose={() => setReactivateModalOpen(false)}
        title={customer.status === 'pending_kyc' ? t('detail.reactivateModal.activateTitle') : t('detail.reactivateModal.reactivateTitle')}
        footer={
          <>
            <button
              onClick={() => setReactivateModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('detail.reactivateModal.cancel')}
            </button>
            <button
              onClick={handleActivate}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {customer.status === 'pending_kyc' ? t('detail.reactivateModal.activate') : t('detail.reactivateModal.reactivate')}
            </button>
          </>
        }
      >
        <p className="text-slate-500 text-sm">
          {customer.status === 'pending_kyc'
            ? t('detail.reactivateModal.messageActivate', { name: customer.name })
            : t('detail.reactivateModal.messageReactivate', { name: customer.name })
          }
        </p>
      </Modal>

      {/* Suspend Confirmation Modal */}
      <Modal
        isOpen={suspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        title={t('detail.suspendModal.title')}
        footer={
          <>
            <button
              onClick={() => setSuspendModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('detail.suspendModal.cancel')}
            </button>
            <button
              onClick={handleSuspend}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {t('detail.suspendModal.confirm')}
            </button>
          </>
        }
      >
        <p className="text-slate-500 text-sm">
          {t('detail.suspendModal.message', { name: customer.name })}
          <br />
          <br />
          {t('detail.suspendModal.note')}
        </p>
      </Modal>

      {/* Blacklist Confirmation Modal */}
      <Modal
        isOpen={blacklistModalOpen}
        onClose={() => { setBlacklistModalOpen(false); setBlacklistReason(''); setBlacklistError('') }}
        title={t('detail.blacklistModal.title')}
        footer={
          <>
            <button
              onClick={() => { setBlacklistModalOpen(false); setBlacklistReason(''); setBlacklistError('') }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('detail.blacklistModal.cancel')}
            </button>
            <button
              onClick={handleBlacklist}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {t('detail.blacklistModal.confirm')}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-slate-500 text-sm">
            {t('detail.blacklistModal.message', { name: customer.name })}
          </p>
          <div>
            <p className="text-slate-600 text-xs font-medium mb-1.5">{t('detail.blacklistReasonLabel')}</p>
            <textarea
              value={blacklistReason}
              onChange={e => { setBlacklistReason(e.target.value); if (blacklistError) setBlacklistError('') }}
              placeholder={t('detail.blacklistReasonPlaceholder')}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-red-400 resize-none"
            />
          </div>
          {blacklistError && (
            <p className="text-red-500 text-sm">{blacklistError}</p>
          )}
        </div>
      </Modal>

      {/* Direct Activate Confirmation Modal */}
      <Modal
        isOpen={directActivateModalOpen}
        onClose={() => setDirectActivateModalOpen(false)}
        title={t('detail.directActivateModal.title')}
        footer={
          <>
            <button
              onClick={() => setDirectActivateModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('detail.directActivateModal.cancel')}
            </button>
            <button
              onClick={() => { setDirectActivateModalOpen(false); handleActivate() }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {t('detail.directActivateModal.confirm')}
            </button>
          </>
        }
      >
        <p className="text-slate-500 text-sm">
          {t('detail.directActivateModal.message', { name: customer.name })}
          <br /><br />
          {t('detail.directActivateModal.note')}
        </p>
      </Modal>
    </div>
  )
}
