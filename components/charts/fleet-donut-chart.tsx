'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useTranslations } from 'next-intl'

interface FleetDonutChartProps {
  available: number
  rented: number
  charging: number
  underRepair: number
  offline: number
}

const COLORS = {
  available: '#22c55e',
  rented: '#3b82f6',
  charging: '#06b6d4',
  underRepair: '#f59e0b',
  offline: '#94a3b8',
} as const

type StatusKey = keyof typeof COLORS

export default function FleetDonutChart({ available, rented, charging, underRepair, offline }: FleetDonutChartProps) {
  const t = useTranslations('dashboard')
  const tMap = useTranslations('dashboard.mapFilter')

  const STATUS_CONFIG: { key: StatusKey; label: string }[] = [
    { key: 'available', label: tMap('available') },
    { key: 'rented', label: tMap('rented') },
    { key: 'charging', label: tMap('charging') },
    { key: 'underRepair', label: tMap('underRepair') },
    { key: 'offline', label: tMap('offline') },
  ]

  const values: Record<StatusKey, number> = { available, rented, charging, underRepair, offline }

  const data = STATUS_CONFIG
    .map(s => ({ ...s, value: values[s.key], color: COLORS[s.key] }))
    .filter(d => d.value > 0)

  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        {t('noAlerts')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={70}
              dataKey="value"
              strokeWidth={2}
              stroke="#fff"
            >
              {data.map(entry => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [
                `${Number(value)} ${t('vehicleUnit')} (${Math.round((Number(value) / total) * 100)}%)`,
              ]}
              contentStyle={{
                background: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-700">{total}</span>
          <span className="text-xs text-slate-400">{t('vehicleUnit')}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {STATUS_CONFIG.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[key] }} />
            <span className="text-xs text-slate-500 truncate">{label}</span>
            <span className="text-xs font-semibold text-slate-700 ml-auto">{values[key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
