import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Alert } from '@/lib/types'

const severityConfig: Record<Alert['severity'], {
  border: string
  bg: string
  icon: LucideIcon
  iconColor: string
  textColor: string
}> = {
  critical: { border: 'border-l-red-500', bg: 'bg-red-500/10', icon: AlertCircle, iconColor: 'text-red-500', textColor: 'text-red-600' },
  warning:  { border: 'border-l-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle, iconColor: 'text-amber-500', textColor: 'text-amber-600' },
  info:     { border: 'border-l-blue-500', bg: 'bg-blue-500/10', icon: Info, iconColor: 'text-blue-500', textColor: 'text-blue-600' },
}

interface AlertFeedProps {
  alerts: Alert[]
}

export default function AlertFeed({ alerts }: AlertFeedProps) {
  return (
    <div className="space-y-2">
      {alerts.map(alert => {
        const config = severityConfig[alert.severity]
        const Icon = config.icon
        return (
          <div key={alert.id} className={`border-l-4 ${config.border} ${config.bg} rounded-r-lg p-3`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
                <p className={`text-sm font-medium ${config.textColor}`}>{alert.message}</p>
              </div>
              <span className="text-slate-400 text-xs whitespace-nowrap flex-shrink-0">{alert.createdAt}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
