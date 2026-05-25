import type { LucideIcon } from 'lucide-react'
import Sparkline from '@/components/charts/sparkline'

interface SummaryCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  iconColor: string
  color: string
  sparklineData?: number[]
  sparklineColor?: string
  trend?: string
}

export default function SummaryCard({ title, value, icon: Icon, iconColor, color, sparklineData, sparklineColor = '#14b8a6', trend }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{title}</p>
          <p className="text-slate-800 text-3xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {trend && <p className="text-xs mt-1 font-medium text-slate-500">{trend}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      {sparklineData && (
        <div className="h-10">
          <Sparkline data={sparklineData} color={sparklineColor} />
        </div>
      )}
    </div>
  )
}
