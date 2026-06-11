'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import VehicleForm from '@/components/ui/vehicle-form'
import type { Vehicle } from '@/lib/types'

export default function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const t = useTranslations('vehicleDetail')
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { id } = await params
      setLoading(true)
      try {
        const res = await fetch(`/api/vehicles/${id}`, { cache: 'no-store' })
        if (res.status === 404) { setNotFound(true); return }
        if (!res.ok) return
        setVehicle(await res.json() as Vehicle)
      } finally {
        setLoading(false)
      }
    }
    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (notFound || !vehicle) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">{t('notFound')}</p>
        <button
          onClick={() => router.push('/fleet/vehicles')}
          className="text-blue-500 hover:underline text-sm"
        >
          {t('backToList')}
        </button>
      </div>
    )
  }

  return <VehicleForm mode="edit" initialData={vehicle} />
}
