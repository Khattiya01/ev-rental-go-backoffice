import { Car, Zap, Wrench, WifiOff } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface FleetHealthBarProps {
  total: number
  charging: number
  underRepair: number
  offline: number
}

export default function FleetHealthBar({ total, charging, underRepair, offline }: FleetHealthBarProps) {
  const t = useTranslations('dashboard.fleetHealth')

  const pills = [
    {
      key: 'total' as const,
      label: t('totalFleet'),
      icon: Car,
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      iconColor: 'text-slate-500',
      value: total,
    },
    {
      key: 'charging' as const,
      label: t('charging'),
      icon: Zap,
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      iconColor: 'text-cyan-500',
      value: charging,
    },
    {
      key: 'underRepair' as const,
      label: t('underRepair'),
      icon: Wrench,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      iconColor: 'text-amber-500',
      value: underRepair,
    },
    {
      key: 'offline' as const,
      label: t('offline'),
      icon: WifiOff,
      bg: 'bg-red-50',
      text: 'text-red-700',
      iconColor: 'text-red-400',
      value: offline,
    },
  ]

  return (
    <div className="flex gap-3">
      {pills.map(({ key, label, icon: Icon, bg, text, iconColor, value }) => (
        <div
          key={key}
          className={`flex items-center gap-2.5 flex-1 rounded-xl px-4 py-3 ${bg}`}
        >
          <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
          <div className="min-w-0">
            <p className={`text-xs font-medium ${text} opacity-70 whitespace-nowrap`}>{label}</p>
            <p className={`text-xl font-bold ${text}`}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
