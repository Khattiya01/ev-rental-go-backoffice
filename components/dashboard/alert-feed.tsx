import type { Alert } from '@/lib/types'

const severityConfig = {
  critical: { border: 'border-l-red-500', bg: 'bg-red-500/10', icon: '🔴', textColor: 'text-red-400' },
  warning: { border: 'border-l-amber-500', bg: 'bg-amber-500/10', icon: '⚠️', textColor: 'text-amber-400' },
  info: { border: 'border-l-blue-500', bg: 'bg-blue-500/10', icon: 'ℹ️', textColor: 'text-blue-400' },
}

interface AlertFeedProps {
  alerts: Alert[]
}

export default function AlertFeed({ alerts }: AlertFeedProps) {
  return (
    <div className="space-y-2">
      {alerts.map(alert => {
        const config = severityConfig[alert.severity]
        return (
          <div key={alert.id} className={`border-l-4 ${config.border} ${config.bg} rounded-r-lg p-3`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">{config.icon}</span>
                <p className={`text-sm font-medium ${config.textColor}`}>{alert.message}</p>
              </div>
              <span className="text-slate-500 text-xs whitespace-nowrap flex-shrink-0">{alert.createdAt}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
