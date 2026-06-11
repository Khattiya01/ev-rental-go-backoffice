'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Pencil, Trash2, Plus, ArrowLeft, CheckCircle } from 'lucide-react'
import { zoneColor } from '@/lib/geofence-utils'
import { ConfirmModal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import type { GeofenceZone } from '@/lib/types'

const GeofenceMap = dynamic(() => import('@/components/maps/GeofenceMap'), { ssr: false })

type Mode = 'browse' | 'create' | 'edit'

interface AdminUser { id: string; name: string; role: string }

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  viewer: 'Viewer',
}

export default function GeofencingPage() {
  const { success, error } = useToast()

  const [zones, setZones] = useState<GeofenceZone[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('browse')
  const [editingZone, setEditingZone] = useState<GeofenceZone | null>(null)

  // Admin users for recipient picker
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])

  // Form state
  const [drawnCoords, setDrawnCoords] = useState<[number, number][] | null>(null)
  const [zoneName, setZoneName] = useState('')
  const [alertRecipients, setAlertRecipients] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [clearKey, setClearKey] = useState(0)

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<GeofenceZone | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadZones = useCallback(async () => {
    const res = await fetch('/api/geofences?includeInactive=true')
    if (res.ok) {
      const { data } = await res.json()
      setZones(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadZones() }, [loadZones])

  useEffect(() => {
    fetch('/api/users/directory')
      .then(r => r.ok ? r.json() : [])
      .then((rows: AdminUser[]) => setAdminUsers(rows ?? []))
      .catch(() => {/* non-critical */})
  }, [])

  // ─── Mode transitions ──────────────────────────────────────────────────────

  const enterCreate = () => {
    setMode('create')
    setEditingZone(null)
    setDrawnCoords(null)
    setZoneName('')
    setAlertRecipients([])
    setSaveError('')
    setClearKey(k => k + 1)
  }

  const enterEdit = (zone: GeofenceZone) => {
    setMode('edit')
    setEditingZone(zone)
    setDrawnCoords(zone.coordinates)
    setZoneName(zone.name)
    setAlertRecipients(Array.isArray(zone.alertRecipients) ? zone.alertRecipients : [])
    setSaveError('')
    setClearKey(k => k + 1)
  }

  const handleCancel = () => {
    setMode('browse')
    setEditingZone(null)
    setDrawnCoords(null)
    setClearKey(k => k + 1)
  }

  const handleRedraw = () => {
    setDrawnCoords(null)
    setClearKey(k => k + 1)
  }

  // ─── Save (create or update) ───────────────────────────────────────────────

  const handleSave = async () => {
    if (!drawnCoords || drawnCoords.length < 3) {
      setSaveError('Draw a zone boundary on the map first')
      return
    }
    if (!zoneName.trim()) {
      setSaveError('Zone name is required')
      return
    }

    setSaving(true)
    setSaveError('')
    try {
      const url    = mode === 'edit' && editingZone ? `/api/geofences/${editingZone.id}` : '/api/geofences'
      const method = mode === 'edit' ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: zoneName.trim(), coordinates: drawnCoords, alertRecipients }),
      })

      if (!res.ok) {
        const body = await res.json()
        const msg = body.error ?? 'Failed to save zone'
        setSaveError(msg)
        error(mode === 'edit' ? 'Failed to update zone' : 'Failed to create zone', msg)
        return
      }

      const label = zoneName.trim()
      setMode('browse')
      setEditingZone(null)
      setDrawnCoords(null)
      setClearKey(k => k + 1)
      await loadZones()
      success(
        mode === 'edit' ? 'Zone updated' : 'Zone created',
        label,
      )
    } finally {
      setSaving(false)
    }
  }

  // ─── Toggle active ─────────────────────────────────────────────────────────

  const handleToggleActive = async (zone: GeofenceZone) => {
    const next = !zone.active
    const res = await fetch(`/api/geofences/${zone.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: next }),
    })
    if (res.ok) {
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, active: next } : z))
      success(next ? 'Zone activated' : 'Zone deactivated', zone.name)
    } else {
      error('Failed to update zone', zone.name)
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/geofences/${deleteTarget.id}`, { method: 'DELETE' })
    const label = deleteTarget.name
    if (res.ok || res.status === 204) {
      setZones(prev => prev.filter(z => z.id !== deleteTarget.id))
      success('Zone deleted', label)
    } else {
      error('Failed to delete zone')
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  // ─── Derived data ──────────────────────────────────────────────────────────

  const activeZones   = zones.filter(z => z.active)
  const inactiveZones = zones.filter(z => !z.active)
  const drawMode      = mode === 'create' || mode === 'edit'

  // ─── Panel: Browse ─────────────────────────────────────────────────────────
  // NOTE: All panel JSX is inlined here (not extracted to sub-components) so that
  // input fields inside the form panel don't lose focus on each keystroke.
  // React remounts a component whenever its constructor reference changes — which
  // happens every render when components are defined inside a parent function.

  const browsePanel = (
    <>
      <div className="p-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-slate-800 font-semibold text-sm">Zone Manager</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {loading ? 'Loading…' : `${zones.length} zone${zones.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={enterCreate}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Zone
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!loading && zones.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">No zones yet</p>
            <p className="text-slate-300 text-xs mt-1">Click "New Zone" to draw one on the map</p>
          </div>
        )}

        {activeZones.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-1">
              Active ({activeZones.length})
            </p>
            <div className="space-y-0.5">
              {activeZones.map(zone => {
                const color = zoneColor(zone.id)
                const isBeingEdited = editingZone?.id === zone.id
                return (
                  <div key={zone.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${isBeingEdited ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'}`}>
                    <span className="w-3 h-3 rounded-sm shrink-0 mt-0.5" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{zone.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {zone.alertRecipients.length === 0 ? 'All admins notified' : `${zone.alertRecipients.length} recipient${zone.alertRecipients.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleToggleActive(zone)} title="Deactivate" className="relative w-8 h-4 rounded-full transition-colors bg-blue-500">
                        <span className="absolute top-0.5 left-4 w-3 h-3 bg-white rounded-full shadow transition-all" />
                      </button>
                      <button onClick={() => enterEdit(zone)} title="Edit zone" className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors rounded">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(zone)} title="Delete zone" className="p-1.5 text-slate-300 hover:text-red-400 transition-colors rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {inactiveZones.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-1">
              Inactive ({inactiveZones.length})
            </p>
            <div className="space-y-0.5">
              {inactiveZones.map(zone => {
                const isBeingEdited = editingZone?.id === zone.id
                return (
                  <div key={zone.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${isBeingEdited ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'}`}>
                    <span className="w-3 h-3 rounded-sm shrink-0 mt-0.5" style={{ background: '#cbd5e1', opacity: 0.6 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-400 truncate">{zone.name}</p>
                      <p className="text-[10px] text-slate-300 truncate">
                        {zone.alertRecipients.length === 0 ? 'All admins notified' : `${zone.alertRecipients.length} recipient${zone.alertRecipients.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleToggleActive(zone)} title="Activate" className="relative w-8 h-4 rounded-full transition-colors bg-slate-200">
                        <span className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-all" />
                      </button>
                      <button onClick={() => enterEdit(zone)} title="Edit zone" className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors rounded">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(zone)} title="Delete zone" className="p-1.5 text-slate-300 hover:text-red-400 transition-colors rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )

  // ─── Panel: Form (create / edit) ───────────────────────────────────────────

  const isEdit = mode === 'edit'
  const coordsAreFromExisting = isEdit && editingZone !== null && drawnCoords === editingZone.coordinates

  const formPanel = (
    <>
      <div className="p-4 border-b border-slate-100 shrink-0">
        <button onClick={handleCancel} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to zones
        </button>
        <h2 className="text-slate-800 font-semibold text-sm">
          {isEdit ? `Edit: ${editingZone?.name}` : 'New Zone'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Step 1 — Draw */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
            <p className="text-sm font-semibold text-slate-700">Draw Boundary</p>
          </div>
          <p className="text-xs text-slate-400 mb-2.5 pl-7">
            Use the draw tools (top-right of map) to outline the zone boundary.
          </p>

          {drawnCoords ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-green-700 text-xs font-medium">
                  {coordsAreFromExisting ? 'Existing boundary loaded' : `${drawnCoords.length} points drawn`}
                </p>
                {coordsAreFromExisting && (
                  <p className="text-green-600 text-[10px]">Draw a new shape to replace it</p>
                )}
              </div>
              <button onClick={handleRedraw} className="text-xs text-slate-400 hover:text-slate-600 shrink-0 transition-colors">
                Redraw
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg px-3 py-3 text-center">
              <p className="text-slate-400 text-xs">No boundary drawn yet</p>
              <p className="text-slate-300 text-[10px] mt-0.5">Use the tools on the map →</p>
            </div>
          )}
        </div>

        {/* Step 2 — Details */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
            <p className="text-sm font-semibold text-slate-700">Zone Details</p>
          </div>
          <div className="pl-7 space-y-3">
            <div>
              <label className="block text-slate-500 text-xs mb-1">Zone Name *</label>
              <input
                value={zoneName}
                onChange={e => setZoneName(e.target.value)}
                placeholder="e.g., Greater Bangkok"
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-500 text-xs">Alert Recipients on Breach</label>
                {alertRecipients.length > 0 && (
                  <button
                    onClick={() => setAlertRecipients([])}
                    className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Clear (notify all)
                  </button>
                )}
              </div>
              {adminUsers.length === 0 ? (
                <p className="text-slate-400 text-xs italic">Leave empty to notify all admins</p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {adminUsers.map(user => {
                    const checked = alertRecipients.includes(user.id)
                    return (
                      <label
                        key={user.id}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setAlertRecipients(prev =>
                            checked ? prev.filter(id => id !== user.id) : [...prev, user.id]
                          )}
                          className="accent-indigo-500 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-400">{ROLE_BADGE[user.role] ?? user.role}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1.5">
                {alertRecipients.length === 0 ? 'All admins will be notified' : `${alertRecipients.length} user${alertRecipients.length !== 1 ? 's' : ''} selected`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 shrink-0">
        {saveError && <p className="text-red-500 text-xs mb-2">{saveError}</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : isEdit ? 'Update Zone' : 'Save Zone'}
        </button>
      </div>
    </>
  )

  // ─── Page ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <h1 className="text-slate-800 text-xl font-bold">Fleet Geofencing</h1>

      <div className="flex gap-0 h-[calc(100vh-10rem)] rounded-xl overflow-hidden border border-slate-200">
        {/* Map — 65% */}
        <div className="flex-1 relative">
          <GeofenceMap
            zones={zones}
            drawMode={drawMode}
            editingZoneId={editingZone?.id}
            clearKey={clearKey}
            onZoneDrawn={setDrawnCoords}
          />

          {drawMode && (
            <div className="absolute bottom-12 left-3 z-[1000] bg-white/95 border border-indigo-200 rounded-lg px-3 py-2 shadow-sm backdrop-blur-sm">
              <p className="text-indigo-700 text-xs font-semibold">Draw mode active</p>
              <p className="text-slate-400 text-[10px]">Use tools in the top-right corner</p>
            </div>
          )}
        </div>

        {/* Right panel — fixed width */}
        <div className="w-72 border-l border-slate-200 bg-white flex flex-col min-h-0">
          {mode === 'browse' ? browsePanel : formPanel}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        description="Any vehicles assigned to this zone will be unassigned. This action cannot be undone."
        confirmLabel="Delete Zone"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
