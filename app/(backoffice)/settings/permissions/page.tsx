'use client'

import { useEffect, useState, useCallback } from 'react'
import { Shield, Loader2, Save, Lock } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import PageHeader from '@/components/ui/page-header'
import type { AdminRole } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────
type Resource = 'vehicles' | 'customers' | 'contracts' | 'billing' | 'maintenance' | 'reports' | 'settings'
type PermKey  = 'canRead' | 'canWrite' | 'canDelete'
type PermEntry = Record<PermKey, boolean>
type PermMatrix = Record<AdminRole, Record<Resource, PermEntry>>

const ROLES: { role: AdminRole; label: string; color: string }[] = [
  { role: 'super_admin', label: 'Super Admin', color: 'bg-blue-100 text-blue-700' },
  { role: 'admin',       label: 'Admin',       color: 'bg-emerald-100 text-emerald-700' },
  { role: 'viewer',      label: 'Viewer',      color: 'bg-slate-100 text-slate-600' },
]

type PageEntry = { path: string; label: string; soon?: true }

const RESOURCES: { resource: Resource; label: string; icon: string; pages: PageEntry[] }[] = [
  {
    resource: 'vehicles',
    label: 'ยานพาหนะ',
    icon: '🚗',
    pages: [
      { path: '/fleet/vehicles',   label: 'รายการยานพาหนะ' },
      { path: '/fleet/map',        label: 'Live Map',       soon: true },
      { path: '/fleet/geofencing', label: 'Geofencing',     soon: true },
    ],
  },
  {
    resource: 'customers',
    label: 'ลูกค้า',
    icon: '👤',
    pages: [
      { path: '/customers',          label: 'รายการลูกค้า' },
      { path: '/customers/kyc',      label: 'อนุมัติ KYC',   soon: true },
      { path: '/customers/blacklist',label: 'Blacklist' },
    ],
  },
  {
    resource: 'contracts',
    label: 'สัญญา',
    icon: '📋',
    pages: [
      { path: '/contracts', label: 'สัญญาเช่าทั้งหมด' },
    ],
  },
  {
    resource: 'billing',
    label: 'การเงิน',
    icon: '💰',
    pages: [
      { path: '/billing/invoices', label: 'ใบแจ้งหนี้' },
      { path: '/billing/overdue',  label: 'ติดตามหนี้' },
    ],
  },
  {
    resource: 'maintenance',
    label: 'บำรุงรักษา',
    icon: '🔧',
    pages: [
      { path: '/maintenance', label: 'ตั๋วซ่อม / รายงานตรวจสภาพ', soon: true },
    ],
  },
  {
    resource: 'reports',
    label: 'รายงาน & Dashboard',
    icon: '📊',
    pages: [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/reports',   label: 'รายงานการเงิน / สินทรัพย์', soon: true },
    ],
  },
  {
    resource: 'settings',
    label: 'ตั้งค่าระบบ',
    icon: '⚙️',
    pages: [
      { path: '/settings/pricing', label: 'แผนราคา' },
      { path: '/settings/payment', label: 'PromptPay' },
    ],
  },
]

const PERM_COLS: { key: PermKey; label: string }[] = [
  { key: 'canRead',   label: 'ดู' },
  { key: 'canWrite',  label: 'แก้ไข' },
  { key: 'canDelete', label: 'ลบ' },
]

// ─── Helper ───────────────────────────────────────────────────────────────────
function CheckBox({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-checked={checked}
      role="checkbox"
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
        checked
          ? 'bg-violet-600 border-violet-600 text-white'
          : 'border-slate-300 hover:border-violet-400'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3">
          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PermissionsPage() {
  const { success, error: toastError } = useToast()
  const [matrix, setMatrix]     = useState<PermMatrix | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [permRes, meRes] = await Promise.all([
        fetch('/api/permissions'),
        fetch('/api/users/me'),
      ])
      const permData = await permRes.json() as { permissions: PermMatrix }
      setMatrix(permData.permissions)

      if (meRes.ok) {
        const meData = await meRes.json() as { role?: AdminRole }
        setIsSuperAdmin(meData.role === 'super_admin')
      }
    } catch {
      toastError('โหลดข้อมูลสิทธิ์ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(role: AdminRole, resource: Resource, key: PermKey) {
    if (!matrix || !isSuperAdmin) return
    setMatrix(prev => {
      if (!prev) return prev
      const updated = structuredClone(prev)
      updated[role][resource][key] = !updated[role][resource][key]

      // canWrite/canDelete implies canRead
      if ((key === 'canWrite' || key === 'canDelete') && updated[role][resource][key]) {
        updated[role][resource].canRead = true
      }
      // removing canRead clears write/delete
      if (key === 'canRead' && !updated[role][resource][key]) {
        updated[role][resource].canWrite  = false
        updated[role][resource].canDelete = false
      }

      return updated
    })
  }

  async function handleSave() {
    if (!matrix) return
    setSaving(true)
    try {
      const res = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: matrix }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        toastError(err.error ?? 'บันทึกไม่สำเร็จ')
        return
      }
      success('บันทึกสิทธิ์เรียบร้อยแล้ว')
    } catch {
      toastError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Role Permissions Matrix"
          subtitle="กำหนดสิทธิ์การเข้าถึงแต่ละส่วนของระบบ ตามบทบาทผู้ใช้งาน"
        />
        {isSuperAdmin && (
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        )}
      </div>

      {!isSuperAdmin && !loading && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-700 text-sm">
          <Shield size={16} className="shrink-0" />
          เฉพาะ Super Admin เท่านั้นที่แก้ไขสิทธิ์ได้
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : matrix ? (
        <>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Desktop table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-slate-500 font-medium w-72">ทรัพยากร / หน้าที่ครอบคลุม</th>
                  {ROLES.map(r => (
                    <th key={r.role} className="px-4 py-3" colSpan={3}>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${r.color}`}>
                        {r.label}
                      </span>
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-2" />
                  {ROLES.map(r => (
                    PERM_COLS.map(col => (
                      <th key={`${r.role}-${col.key}`} className="px-3 py-2 text-slate-400 font-normal text-xs text-center">
                        {col.label}
                      </th>
                    ))
                  ))}
                </tr>
              </thead>
              <tbody>
                {RESOURCES.map((res, idx) => (
                  <tr key={res.resource} className={idx % 2 === 0 ? '' : 'bg-slate-50/30'}>
                    <td className="px-5 py-3 align-top">
                      <div className="font-medium text-slate-700 mb-1.5">
                        <span className="mr-1.5">{res.icon}</span>
                        {res.label}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {res.pages.map(p => (
                          <span key={p.path} className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono leading-relaxed">
                            <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                            {p.path}
                            {p.soon && (
                              <span className="font-sans text-[9px] font-semibold text-amber-500 bg-amber-50 px-1 py-0.5 rounded">
                                เร็วๆ นี้
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    {ROLES.map(r => (
                      PERM_COLS.map(col => (
                        <td key={`${r.role}-${col.key}`} className="px-3 py-3 text-center">
                          <div className="flex justify-center">
                            <CheckBox
                              checked={matrix[r.role][res.resource][col.key]}
                              onChange={() => toggle(r.role, res.resource, col.key)}
                              disabled={!isSuperAdmin}
                            />
                          </div>
                        </td>
                      ))
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="border-t border-slate-100 px-5 py-3 flex flex-wrap gap-4 text-xs text-slate-400">
            <span>✓ = มีสิทธิ์</span>
            <span>☐ = ไม่มีสิทธิ์</span>
            <span className="text-slate-300">|</span>
            <span>การเปิด "แก้ไข" หรือ "ลบ" จะเปิด "ดู" อัตโนมัติ</span>
          </div>
        </div>

        {/* Always super_admin — outside the matrix */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5 text-sm">
          <Lock size={15} className="text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-blue-700 mb-2">
              หน้าที่ล็อคไว้เฉพาะ Super Admin เสมอ — ไม่สามารถแก้ไขผ่าน Matrix ได้
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { path: '/settings/users',       label: 'จัดการผู้ใช้งานระบบ' },
                { path: '/settings/permissions', label: 'Role Permissions Matrix (หน้านี้)' },
              ].map(p => (
                <span key={p.path} className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 rounded-lg px-2.5 py-1 text-xs">
                  <Lock size={10} />
                  <span className="font-mono">{p.path}</span>
                  <span className="text-blue-500">— {p.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        </>
      ) : null}
    </div>
  )
}
