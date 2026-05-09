'use client'

import dynamic from 'next/dynamic'
import type { Vehicle } from '@/lib/types'

const DashboardMap = dynamic(() => import('@/components/maps/DashboardMap'), { ssr: false })

export default function DashboardMapClient({ vehicles }: { vehicles: Vehicle[] }) {
  return <DashboardMap vehicles={vehicles} />
}
