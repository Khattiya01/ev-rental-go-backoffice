'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import logo from '@/public/images/logo.png'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ChevronRight, ChevronLeft, Check,
  AlertCircle, Loader2, CheckCircle2,
  User, Car, FileText, ClipboardList,
} from 'lucide-react'
import ImageUploader from '@/components/ui/image-uploader'

// ─── Constants ────────────────────────────────────────────────
const DRIVER_TYPES = ['Grab', 'Bolt', 'Private'] as const

const STEPS = [
  { id: 1, title: 'ข้อมูลส่วนตัว', icon: User },
  { id: 2, title: 'ประเภทคนขับ', icon: Car },
  { id: 3, title: 'เอกสาร', icon: FileText },
  { id: 4, title: 'ยืนยัน', icon: ClipboardList },
]

// ─── Schema ───────────────────────────────────────────────────
const schema = z
  .object({
    name: z.string().min(1, 'กรุณากรอกชื่อ-นามสกุล'),
    phone: z.string().min(1, 'กรุณากรอกเบอร์โทรศัพท์'),
    email: z.string(),
    dateOfBirth: z.string(),
    idCardNumber: z.string(),
    address: z.string(),
    driverType: z.enum(DRIVER_TYPES),
    avatarUrl: z.string(),
    idCardFrontUrl: z.string().min(1, 'กรุณาอัปโหลดบัตรประชาชน (ด้านหน้า)'),
    idCardBackUrl: z.string().min(1, 'กรุณาอัปโหลดบัตรประชาชน (ด้านหลัง)'),
    driverLicenseUrl: z.string().min(1, 'กรุณาอัปโหลดใบขับขี่'),
    grabBoltScreenshotUrl: z.string(),
    consent: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.phone && !/^[0-9]{9,10}$/.test(data.phone)) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก' })
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'รูปแบบอีเมลไม่ถูกต้อง' })
    }
    if (data.idCardNumber && !/^[0-9]{13}$/.test(data.idCardNumber)) {
      ctx.addIssue({ code: 'custom', path: ['idCardNumber'], message: 'เลขบัตรประชาชนต้อง 13 หลัก' })
    }
    if (data.driverType !== 'Private' && !data.grabBoltScreenshotUrl) {
      ctx.addIssue({
        code: 'custom',
        path: ['grabBoltScreenshotUrl'],
        message: `กรุณาอัปโหลดสกรีนช็อตหน้าแอป ${data.driverType}`,
      })
    }
    if (!data.consent) {
      ctx.addIssue({ code: 'custom', path: ['consent'], message: 'กรุณายืนยันความถูกต้องของข้อมูล' })
    }
  })

type FormData = z.infer<typeof schema>

const STEP_FIELDS: Record<number, (keyof FormData)[]> = {
  1: ['name', 'phone', 'email', 'idCardNumber'],
  2: ['driverType', 'avatarUrl'],
  3: ['idCardFrontUrl', 'idCardBackUrl', 'driverLicenseUrl', 'grabBoltScreenshotUrl'],
  4: ['consent'],
}

// ─── Styles ───────────────────────────────────────────────────
const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors'
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

// ─── Shared components ────────────────────────────────────────
function FieldErr({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 text-red-500 text-xs mt-1.5">
      <AlertCircle size={12} className="shrink-0" />
      {message}
    </p>
  )
}

function BrandHeader() {
  return (
    <div className="bg-gradient-to-br from-green-700 via-green-600 to-teal-600 px-6 pt-10 pb-8 text-white">
      <div className="max-w-lg mx-auto flex items-center gap-4 mb-4">
        <div className="w-14 h-14 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
          <Image src={logo} alt="EV Rental GO" width={40} height={40} className="drop-shadow" />
        </div>
        <div>
          <p className="text-white/70 text-xs font-medium tracking-widest uppercase">EV Rental GO</p>
          <h1 className="text-white text-xl font-bold leading-tight">ลงทะเบียนคนขับ</h1>
        </div>
      </div>
      <p className="max-w-lg mx-auto text-white/70 text-sm leading-relaxed">
        กรอกข้อมูลและอัปโหลดเอกสารให้ครบ ทีมงานจะตรวจสอบและติดต่อกลับภายใน 1–2 วันทำการ
      </p>
    </div>
  )
}

function StepBar({ step }: { step: number }) {
  return (
    <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-200 ${
                    step > s.id
                      ? 'bg-green-500 text-white shadow-sm shadow-green-200'
                      : step === s.id
                        ? 'bg-green-600 text-white shadow-md shadow-green-300 scale-110'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.id ? <Check size={13} strokeWidth={2.5} /> : s.id}
                </div>
                <span
                  className={`text-[10px] font-medium hidden sm:block ${
                    step === s.id ? 'text-green-600' : step > s.id ? 'text-green-500' : 'text-slate-400'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors duration-300 ${
                    step > s.id ? 'bg-green-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="sm:hidden text-green-600 text-xs font-semibold mt-1">
          ขั้นตอน {step} / {STEPS.length} — {STEPS[step - 1].title}
        </p>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-50">
        <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
        {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────
function RegisterForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [customerName, setCustomerName] = useState('')

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      dateOfBirth: '',
      idCardNumber: '',
      address: '',
      driverType: 'Grab',
      avatarUrl: '',
      idCardFrontUrl: '',
      idCardBackUrl: '',
      driverLicenseUrl: '',
      grabBoltScreenshotUrl: '',
      consent: false,
    },
  })

  const driverType = watch('driverType')
  const formValues = watch()

  useEffect(() => {
    if (!token) { setTokenValid(false); return }
    void (async () => {
      try {
        const res = await fetch(`/api/public/register?token=${token}`)
        setTokenValid(res.ok)
      } catch {
        setTokenValid(false)
      }
    })()
  }, [token])

  const uploadUrl = `/api/public/upload?token=${token}&folder=customers`

  async function handleNext() {
    const valid = await trigger(STEP_FIELDS[step])
    if (valid) setStep(s => s + 1)
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
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
        }),
      })
      if (res.ok) {
        const json = (await res.json()) as { name: string }
        setCustomerName(json.name)
        setSubmitted(true)
      } else {
        const json = (await res.json()) as { error?: string }
        setSubmitError(json.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      }
    } catch {
      setSubmitError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Image src={logo} alt="EV Rental GO" width={52} height={52} className="opacity-60" />
        <Loader2 className="animate-spin text-green-500" size={28} />
      </div>
    )
  }

  // ── Invalid token ────────────────────────────────────────────
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="bg-gradient-to-br from-green-700 to-teal-600 px-6 py-8 text-center">
          <Image src={logo} alt="EV Rental GO" width={52} height={52} className="mx-auto mb-3 drop-shadow" />
          <p className="text-white font-bold text-lg">EV Rental GO</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h2 className="text-slate-800 text-lg font-bold mb-2">ลิ้งหมดอายุแล้ว</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              ลิ้งลงทะเบียนนี้ใช้งานไม่ได้แล้ว
              <br />
              กรุณาติดต่อเจ้าหน้าที่เพื่อขอลิ้งใหม่
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="bg-gradient-to-br from-green-700 to-teal-600 px-6 py-8 text-center">
          <Image src={logo} alt="EV Rental GO" width={52} height={52} className="mx-auto mb-3 drop-shadow" />
          <p className="text-white font-bold text-lg">EV Rental GO</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-100">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h2 className="text-slate-800 text-xl font-bold mb-2">ลงทะเบียนสำเร็จ!</h2>
            <p className="text-green-600 font-semibold mb-3">ขอบคุณ คุณ{customerName}</p>
            <p className="text-slate-500 text-sm leading-relaxed">
              ทีมงานจะตรวจสอบเอกสารของคุณ
              <br />
              และแจ้งผลภายใน 1–2 วันทำการ
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              อยู่ระหว่างตรวจสอบ
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Documents summary for step 4 ─────────────────────────────
  const docItems = [
    { label: 'บัตรประชาชน (ด้านหน้า)', url: formValues.idCardFrontUrl },
    { label: 'บัตรประชาชน (ด้านหลัง)', url: formValues.idCardBackUrl },
    { label: 'ใบขับขี่', url: formValues.driverLicenseUrl },
    ...(driverType !== 'Private'
      ? [{ label: `สกรีนช็อตหน้าแอป ${driverType}`, url: formValues.grabBoltScreenshotUrl }]
      : []),
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <BrandHeader />
      <StepBar step={step} />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* ── Step 1: Personal Info ── */}
        {step === 1 && (
          <SectionCard title="ข้อมูลส่วนตัว" subtitle="ข้อมูลที่มี * จำเป็นต้องกรอก">
            <div>
              <label className={labelClass}>
                ชื่อ-นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                type="text"
                placeholder="ชื่อและนามสกุล"
                className={inputClass}
              />
              <FieldErr message={errors.name?.message} />
            </div>

            <div>
              <label className={labelClass}>
                เบอร์โทรศัพท์ <span className="text-red-500">*</span>
              </label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="0812345678"
                className={inputClass}
              />
              <FieldErr message={errors.phone?.message} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>อีเมล</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="example@email.com"
                  className={inputClass}
                />
                <FieldErr message={errors.email?.message} />
              </div>
              <div>
                <label className={labelClass}>วันเกิด</label>
                <input {...register('dateOfBirth')} type="date" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>เลขบัตรประชาชน 13 หลัก</label>
              <input
                {...register('idCardNumber')}
                type="text"
                placeholder="1234567890123"
                maxLength={13}
                className={inputClass}
              />
              <FieldErr message={errors.idCardNumber?.message} />
            </div>

            <div>
              <label className={labelClass}>ที่อยู่</label>
              <textarea
                {...register('address')}
                rows={3}
                placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด"
                className={inputClass}
              />
            </div>
          </SectionCard>
        )}

        {/* ── Step 2: Driver Type + Photo ── */}
        {step === 2 && (
          <SectionCard title="ประเภทคนขับ" subtitle="เลือกแพลตฟอร์มที่คุณใช้งาน">
            <div>
              <label className={labelClass}>
                คุณขับรถให้บริษัทใด <span className="text-red-500">*</span>
              </label>
              <Controller
                name="driverType"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {DRIVER_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => field.onChange(type)}
                        className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                          field.value === type
                            ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-green-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <Controller
              name="avatarUrl"
              control={control}
              render={({ field }) => (
                <ImageUploader
                  value={field.value}
                  onChange={field.onChange}
                  label="รูปถ่ายโปรไฟล์"
                  folder="customers"
                  uploadUrl={uploadUrl}
                />
              )}
            />
          </SectionCard>
        )}

        {/* ── Step 3: Documents ── */}
        {step === 3 && (
          <SectionCard
            title="เอกสารประกอบ"
            subtitle="อัปโหลดรูปถ่ายให้ชัดเจน JPG / PNG ไม่เกิน 5 MB"
          >
            <Controller
              name="idCardFrontUrl"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <ImageUploader
                    value={field.value}
                    onChange={field.onChange}
                    label="บัตรประชาชน (ด้านหน้า) *"
                    folder="customers"
                    uploadUrl={uploadUrl}
                  />
                  <FieldErr message={fieldState.error?.message} />
                </div>
              )}
            />

            <Controller
              name="idCardBackUrl"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <ImageUploader
                    value={field.value}
                    onChange={field.onChange}
                    label="บัตรประชาชน (ด้านหลัง) *"
                    folder="customers"
                    uploadUrl={uploadUrl}
                  />
                  <FieldErr message={fieldState.error?.message} />
                </div>
              )}
            />

            <Controller
              name="driverLicenseUrl"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <ImageUploader
                    value={field.value}
                    onChange={field.onChange}
                    label="ใบขับขี่ *"
                    folder="customers"
                    uploadUrl={uploadUrl}
                  />
                  <FieldErr message={fieldState.error?.message} />
                </div>
              )}
            />

            {driverType !== 'Private' && (
              <Controller
                name="grabBoltScreenshotUrl"
                control={control}
                render={({ field, fieldState }) => (
                  <div>
                    <ImageUploader
                      value={field.value}
                      onChange={field.onChange}
                      label={`สกรีนช็อตหน้าแอป ${driverType} *`}
                      folder="customers"
                      uploadUrl={uploadUrl}
                    />
                    <FieldErr message={fieldState.error?.message} />
                  </div>
                )}
              />
            )}
          </SectionCard>
        )}

        {/* ── Step 4: Review + Consent ── */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Data summary */}
            <SectionCard title="ตรวจสอบข้อมูล">
              <div className="divide-y divide-slate-50">
                {[
                  { label: 'ชื่อ-นามสกุล', value: formValues.name },
                  { label: 'เบอร์โทร', value: formValues.phone },
                  { label: 'อีเมล', value: formValues.email || '—' },
                  { label: 'วันเกิด', value: formValues.dateOfBirth || '—' },
                  { label: 'เลขบัตรประชาชน', value: formValues.idCardNumber || '—' },
                  { label: 'ที่อยู่', value: formValues.address || '—' },
                  { label: 'ประเภทคนขับ', value: formValues.driverType },
                ].map(row => (
                  <div key={row.label} className="flex gap-3 py-2.5 text-sm">
                    <span className="text-slate-400 w-32 shrink-0 text-xs pt-0.5">{row.label}</span>
                    <span className="text-slate-800 font-medium flex-1 break-words">{row.value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Documents checklist */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-2.5">
              <h3 className="text-slate-700 text-sm font-semibold mb-3">เอกสาร</h3>
              {docItems.map(doc => (
                <div key={doc.label} className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      doc.url ? 'bg-green-100' : 'bg-red-50'
                    }`}
                  >
                    {doc.url ? (
                      <Check size={11} className="text-green-600" strokeWidth={2.5} />
                    ) : (
                      <AlertCircle size={11} className="text-red-400" />
                    )}
                  </div>
                  <span className="text-slate-600 text-sm flex-1">{doc.label}</span>
                  <span className={`text-xs font-medium ${doc.url ? 'text-green-600' : 'text-red-400'}`}>
                    {doc.url ? 'อัปโหลดแล้ว' : 'ยังไม่ได้อัปโหลด'}
                  </span>
                </div>
              ))}
            </div>

            {/* Consent checkbox */}
            <Controller
              name="consent"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                      field.value
                        ? 'bg-green-50 border-green-400'
                        : fieldState.error
                          ? 'bg-red-50 border-red-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        field.value ? 'bg-green-600 border-green-600' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {field.value && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed select-none">
                      ข้าพเจ้ายืนยันว่าข้อมูลและเอกสารที่ให้ไว้ถูกต้องและเป็นความจริง
                      และยินยอมให้ EV Rental GO ใช้ข้อมูลดังกล่าวเพื่อการตรวจสอบตัวตน
                    </p>
                  </button>
                  <FieldErr message={fieldState.error?.message} />
                </div>
              )}
            />

            {/* Server error */}
            {submitError && (
              <div className="flex gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex gap-3 pt-2 pb-10">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-5 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ChevronLeft size={16} />
              ย้อนกลับ
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-green-200"
            >
              ถัดไป
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-green-200"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> กำลังส่งข้อมูล...
                </>
              ) : (
                'ส่งข้อมูลลงทะเบียน'
              )}
            </button>
          )}
        </div>

        <p className="text-center text-slate-400 text-xs pb-6">
          EV Rental GO © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
          <Image src={logo} alt="EV Rental GO" width={52} height={52} className="opacity-60" />
          <Loader2 className="animate-spin text-green-500" size={28} />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
