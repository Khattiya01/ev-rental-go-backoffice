'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/modal'
import { Vehicle, VehicleStatus } from '@/lib/types'

interface VehicleFormModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'add' | 'edit'
  initialData?: Vehicle
  onSuccess: () => void
}

const STATUS_LABELS: Record<VehicleStatus, string> = {
  available: 'Available',
  rented: 'Rented',
  charging: 'Charging',
  under_repair: 'Under Repair',
  offline: 'Offline',
}

const STATUS_OPTIONS: VehicleStatus[] = ['available', 'rented', 'charging', 'under_repair', 'offline']

export default function VehicleFormModal({
  isOpen,
  onClose,
  mode,
  initialData,
  onSuccess,
}: VehicleFormModalProps) {
  const [plate, setPlate] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [color, setColor] = useState('')
  const [vin, setVin] = useState('')
  const [status, setStatus] = useState<VehicleStatus>('available')
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    if (mode === 'edit' && initialData) {
      setPlate(initialData.plate)
      setMake(initialData.make)
      setModel(initialData.model)
      setYear(String(initialData.year))
      setColor(initialData.color ?? '')
      setVin(initialData.vin ?? '')
      setStatus(initialData.status)
      setImageUrl(initialData.imageUrl ?? '')
    } else {
      setPlate('')
      setMake('')
      setModel('')
      setYear(String(new Date().getFullYear()))
      setColor('')
      setVin('')
      setStatus('available')
      setImageUrl('')
    }
    setError('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
      if (mode === 'edit' && !initialData) return
      const url = mode === 'add' ? '/api/vehicles' : `/api/vehicles/${initialData.id}`
      const method = mode === 'add' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 201 || res.status === 200) {
        onSuccess()
        onClose()
      } else {
        const data = await res.json()
        setError(data?.error ?? 'An unexpected error occurred.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add Vehicle' : 'Edit Vehicle'}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="vehicle-form"
            disabled={submitting}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : mode === 'add' ? 'Add Vehicle' : 'Save Changes'}
          </button>
        </>
      }
    >
      <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="plate" className={labelClass}>
            Plate Number <span className="text-red-500">*</span>
          </label>
          <input
            id="plate"
            type="text"
            required
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="make" className={labelClass}>
              Make <span className="text-red-500">*</span>
            </label>
            <input
              id="make"
              type="text"
              required
              value={make}
              onChange={(e) => setMake(e.target.value)}
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
              value={model}
              onChange={(e) => setModel(e.target.value)}
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
              onChange={(e) => setYear(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="color" className={labelClass}>
              Color
            </label>
            <input
              id="color"
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="vin" className={labelClass}>
              VIN
            </label>
            <input
              id="vin"
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as VehicleStatus)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label htmlFor="imageUrl" className={labelClass}>
              Image URL
            </label>
            <input
              id="imageUrl"
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </form>
    </Modal>
  )
}
