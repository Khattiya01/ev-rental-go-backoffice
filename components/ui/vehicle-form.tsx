'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Car } from 'lucide-react'
import type { Vehicle, VehicleStatus } from '@/lib/types'

const STATUS_LABELS: Record<VehicleStatus, string> = {
  available: 'Available',
  rented: 'Rented',
  charging: 'Charging',
  under_repair: 'Under Repair',
  offline: 'Offline',
}

const STATUS_OPTIONS: VehicleStatus[] = ['available', 'rented', 'charging', 'under_repair', 'offline']

interface VehicleFormProps {
  mode: 'add' | 'edit'
  initialData?: Vehicle
}

export default function VehicleForm({ mode, initialData }: VehicleFormProps) {
  const router = useRouter()

  const [plate, setPlate] = useState(initialData?.plate ?? '')
  const [make, setMake] = useState(initialData?.make ?? '')
  const [model, setModel] = useState(initialData?.model ?? '')
  const [year, setYear] = useState(String(initialData?.year ?? new Date().getFullYear()))
  const [color, setColor] = useState(initialData?.color ?? '')
  const [vin, setVin] = useState(initialData?.vin ?? '')
  const [status, setStatus] = useState<VehicleStatus>(initialData?.status ?? 'available')
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'edit' && !initialData) return

    setSubmitting(true)
    setError('')

    const body = {
      plate,
      make,
      model,
      year: parseInt(year, 10),
      color: color || null,
      vin: vin || null,
      imageUrl: imageUrl || null,
      status,
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
        router.push('/fleet/vehicles')
        router.refresh()
      } else {
        const data = await res.json() as { error?: string }
        setError(data?.error ?? 'An unexpected error occurred.')
      }
    } catch {
      setError('Network error. Please try again.')
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
          <div className="flex items-center justify-center w-9 h-9 bg-blue-500/10 rounded-xl">
            <Car size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-slate-800 text-xl font-bold">
              {mode === 'add' ? 'Add New Vehicle' : `Edit Vehicle — ${initialData?.plate}`}
            </h1>
            <p className="text-slate-500 text-sm">
              {mode === 'add' ? 'Register a new EV to the fleet' : 'Update vehicle information'}
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

        {/* Vehicle Identity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide">Vehicle Identity</h2>

          <div>
            <label htmlFor="plate" className={labelClass}>
              Plate Number <span className="text-red-500">*</span>
            </label>
            <input
              id="plate"
              type="text"
              required
              placeholder="e.g. กข 1234 กรุงเทพ"
              value={plate}
              onChange={e => setPlate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="make" className={labelClass}>
                Make <span className="text-red-500">*</span>
              </label>
              <input
                id="make"
                type="text"
                required
                placeholder="e.g. Tesla, BYD, Hyundai"
                value={make}
                onChange={e => setMake(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="model" className={labelClass}>
                Model <span className="text-red-500">*</span>
              </label>
              <input
                id="model"
                type="text"
                required
                placeholder="e.g. Model 3, Atto 3, Ioniq 5"
                value={model}
                onChange={e => setModel(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="year" className={labelClass}>
                Year <span className="text-red-500">*</span>
              </label>
              <input
                id="year"
                type="number"
                required
                min={1990}
                max={2030}
                value={year}
                onChange={e => setYear(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="color" className={labelClass}>Color</label>
              <input
                id="color"
                type="text"
                placeholder="e.g. White, Black, Blue"
                value={color}
                onChange={e => setColor(e.target.value)}
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
              value={vin}
              onChange={e => setVin(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Status & Media */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-wide">Status & Media</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="status" className={labelClass}>Status</label>
              <select
                id="status"
                value={status}
                onChange={e => setStatus(e.target.value as VehicleStatus)}
                className={inputClass}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="imageUrl" className={labelClass}>Image URL</label>
              <input
                id="imageUrl"
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {imageUrl && (
            <div>
              <p className={labelClass}>Preview</p>
              <img
                src={imageUrl}
                alt="Vehicle preview"
                className="w-48 h-32 object-cover rounded-xl border border-slate-200"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 py-2">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={15} />
            {submitting ? 'Saving…' : mode === 'add' ? 'Add Vehicle' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
