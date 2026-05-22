'use client'

import { useState, useEffect } from 'react'
import { Banknote, QrCode, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useCanWrite } from '@/lib/user-context'

interface PaymentSettings {
  promptpayId: string
  promptpayName: string
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5'

export default function PaymentSettingsPage() {
  const { success, error: toastError } = useToast()
  const canWrite = useCanWrite()
  const [settings, setSettings] = useState<PaymentSettings>({ promptpayId: '', promptpayName: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) setSettings(await res.json())
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        success('บันทึกการตั้งค่าเรียบร้อย')
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        toastError('บันทึกไม่สำเร็จ')
      }
    } catch {
      toastError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-slate-800 text-xl font-bold">บัญชีรับโอนเงิน</h1>
        <p className="text-slate-500 text-sm mt-0.5">ข้อมูลนี้จะถูกใช้สร้าง QR Code ในหน้าใบแจ้งหนี้</p>
      </div>

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
          <div className="px-5 py-8 text-center text-slate-400 text-sm">กำลังโหลด...</div>
        ) : (
          <form onSubmit={handleSave} className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  เบอร์โทร / เลขบัตรประชาชน {canWrite && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Banknote size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={settings.promptpayId}
                    onChange={e => canWrite && setSettings(s => ({ ...s, promptpayId: e.target.value }))}
                    placeholder="0812345678"
                    className={`${inputCls} pl-9 ${!canWrite ? 'bg-slate-100 cursor-default' : ''}`}
                    readOnly={!canWrite}
                    required={canWrite}
                  />
                </div>
                <p className="text-slate-400 text-xs mt-1">เบอร์มือถือหรือเลขบัตรประชาชนที่ผูก PromptPay</p>
              </div>
              <div>
                <label className={labelCls}>ชื่อบัญชี {canWrite && <span className="text-red-500">*</span>}</label>
                <input
                  type="text"
                  value={settings.promptpayName}
                  onChange={e => canWrite && setSettings(s => ({ ...s, promptpayName: e.target.value }))}
                  placeholder="ชื่อ-นามสกุล"
                  className={`${inputCls} ${!canWrite ? 'bg-slate-100 cursor-default' : ''}`}
                  readOnly={!canWrite}
                  required={canWrite}
                />
              </div>
            </div>

            {canWrite && (
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {saving
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
