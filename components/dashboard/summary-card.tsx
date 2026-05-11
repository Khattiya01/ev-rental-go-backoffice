import Sparkline from '@/components/charts/sparkline'

interface SummaryCardProps {
  title: string
  value: number | string
  icon: string
  color: string
  sparklineData?: number[]
  trend?: string
}

export default function SummaryCard({ title, value, icon, color, sparklineData, trend }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{title}</p>
          <p className="text-slate-800 text-3xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {trend && <p className="text-blue-500 text-xs mt-1">{trend}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
          {icon}
        </div>
      </div>
      {sparklineData && (
        <div className="h-10">
          <Sparkline data={sparklineData} color="#14b8a6" />
        </div>
      )}
    </div>
  )
}
