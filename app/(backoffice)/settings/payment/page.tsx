'use client'

import { useEffect, useState } from 'react'
import { Banknote, QrCode, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/components/ui/toast'
import { useCanWrite } from '@/lib/user-context'
import PageHeader from '@/components/ui/page-header'

const paymentSchema = z.object({
  promptpayId: z.string().min(1, 'กรุณากรอกเบอร์หรือเลขบัตรประชาชน'),
  promptpayName: z.string().min(1, 'กรุณากรอกชื่อบัญชี'),
})

type PaymentFormData = z.infer<typeof paymentSchema>

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors'
const inputErrCls = 'w-full bg-slate-50 border border-red-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5'

export default function PaymentSettingsPage() {
  const { success, error: toastError } = useToast()
  const canWrite = useCanWrite()
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { promptpayId: '', promptpayName: '' },
  })

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json() as PaymentFormData
          reset(data)
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [reset])

  async function onSubmit(data: PaymentFormData) {
    setSaved(false)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        success('บันทึกการตั้งค่าเรียบร้อย')
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const errData = await res.json() as { error?: string }
        const msg = errData.error ?? 'บันทึกไม่สำเร็จ'
        setError('root', { message: msg })
        toastError(msg)
      }
    } catch {
      const msg = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      setError('root', { message: msg })
      toastError(msg)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="บัญชีรับโอนเงิน" subtitle="ข้อมูลนี้จะถูกใช้สร้าง QR Code ในหน้าใบแจ้งหนี้" />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
            <QrCode size={17} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-slate-800 font-semibold text-sm">PromptPay</h2>
            <p className="text-slate-400 text-xs">เบอร์โทรหรือเลขบัตรประชาชนที่ผูก PromptPay</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-5 space-y-4">
            {errors.root && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
                {errors.root.message}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  เบอร์โทร / เลขบัตรประชาชน {canWrite && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Banknote size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="0812345678"
                    readOnly={!canWrite}
                    {...register('promptpayId')}
                    className={`${errors.promptpayId ? inputErrCls : inputCls} pl-9 ${!canWrite ? 'bg-slate-100 cursor-default' : ''}`}
                  />
                </div>
                {errors.promptpayId && (
                  <p className="text-red-500 text-xs mt-1">{errors.promptpayId.message}</p>
                )}
                <p className="text-slate-400 text-xs mt-1">เบอร์มือถือหรือเลขบัตรประชาชนที่ผูก PromptPay</p>
              </div>

              <div>
                <label className={labelCls}>ชื่อบัญชี {canWrite && <span className="text-red-500">*</span>}</label>
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล"
                  readOnly={!canWrite}
                  {...register('promptpayName')}
                  className={`${errors.promptpayName ? inputErrCls : inputCls} ${!canWrite ? 'bg-slate-100 cursor-default' : ''}`}
                />
                {errors.promptpayName && (
                  <p className="text-red-500 text-xs mt-1">{errors.promptpayName.message}</p>
                )}
              </div>
            </div>

            {canWrite && (
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {isSubmitting
                    ? <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก...</>
                    : saved
                      ? <><CheckCircle2 size={14} /> บันทึกแล้ว</>
                      : <><Save size={14} /> บันทึกการตั้งค่า</>
                  }
                </button>
                {saved && <span className="text-green-600 text-sm">✓ บันทึกเรียบร้อย</span>}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
