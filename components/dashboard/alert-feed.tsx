'use client'

import Link from 'next/link'
import { AlertCircle, AlertTriangle, Info, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Alert } from '@/lib/types'
import Badge from '@/components/ui/badge'
import ResolveAlertButton from '@/components/ui/resolve-alert-button'

// payment_overdue is computed live from the invoices table (synthetic id `overdue-{id}`),
// not backed by a real `alerts` row — there's nothing to PATCH, so no resolve action for it.
// vehicle_offline is normally auto-resolved by the gateway when telemetry resumes — manual
// resolve stays available here as a fallback if that auto-resolve doesn't fire.
const RESOLVABLE_TYPES: Alert['type'][] = ['battery_low', 'geofence_breach', 'payment_reminder', 'vehicle_offline']

const severityConfig: Record<Alert['severity'], {
  border: string
  bg: string
  hoverBg: string
  icon: LucideIcon
  iconColor: string
  textColor: string
}> = {
  critical: { border: 'border-l-red-500',   bg: 'bg-red-50',   hoverBg: 'hover:bg-red-100/70',   icon: AlertCircle,   iconColor: 'text-red-500',   textColor: 'text-red-700' },
  warning:  { border: 'border-l-amber-500', bg: 'bg-amber-50', hoverBg: 'hover:bg-amber-100/70', icon: AlertTriangle, iconColor: 'text-amber-500', textColor: 'text-amber-700' },
  info:     { border: 'border-l-blue-500',  bg: 'bg-blue-50',  hoverBg: 'hover:bg-blue-100/70',  icon: Info,          iconColor: 'text-blue-500',  textColor: 'text-blue-700' },
}

function AlertCard({ alert, onResolve }: { alert: Alert; onResolve?: (id: string) => void }) {
  const sev        = severityConfig[alert.severity]
  const SevIcon    = sev.icon
  const resolvable = RESOLVABLE_TYPES.includes(alert.type)

  const inner = (
    <div className={`border-l-4 ${sev.border} ${sev.bg} ${alert.href ? `${sev.hoverBg} transition-colors` : ''} rounded-r-lg px-3 py-2.5`}>
      <div className="flex items-start gap-2">
        <SevIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${sev.iconColor}`} />
        <p className={`text-xs font-medium leading-snug ${sev.textColor} flex-1 min-w-0`}>
          {alert.message}
        </p>
        {resolvable && onResolve && (
          <ResolveAlertButton
            alertId={alert.id}
            onResolved={onResolve}
            className={`shrink-0 mt-0.5 ${sev.iconColor}`}
          />
        )}
        {alert.href && (
          <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${sev.iconColor} opacity-50`} />
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5 pl-5">
        <Badge variant={alert.type} />
        <span className="text-slate-400 text-[10px] whitespace-nowrap">{alert.createdAt}</span>
      </div>
    </div>
  )

  if (alert.href) {
    return <Link href={alert.href}>{inner}</Link>
  }
  return inner
}

interface AlertFeedProps {
  alerts: Alert[]
  onResolve?: (id: string) => void
}

export default function AlertFeed({ alerts, onResolve }: AlertFeedProps) {
  return (
    <div className="overflow-y-auto max-h-90 space-y-2 pr-0.5">
      {alerts.map(alert => (
        <AlertCard key={alert.id} alert={alert} onResolve={onResolve} />
      ))}
    </div>
  )
}
