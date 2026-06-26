'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Bell, AlertCircle, AlertTriangle, Info, ChevronRight, BellOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AlertSeverity } from '@/lib/types'
import Badge from '@/components/ui/badge'
import ResolveAlertButton from '@/components/ui/resolve-alert-button'
import { useLiveAlerts } from '@/lib/use-live-alerts'
import { useCanRead } from '@/lib/user-context'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { useTranslations } from 'next-intl'

const DROPDOWN_LIMIT = 8
const FETCH_LIMIT = 20

const severityIcon: Record<AlertSeverity, { icon: LucideIcon; className: string }> = {
  critical: { icon: AlertCircle, className: 'text-red-500' },
  warning: { icon: AlertTriangle, className: 'text-amber-500' },
  info: { icon: Info, className: 'text-blue-500' },
}

export default function NotificationBell() {
  const t = useTranslations('header')
  const canRead = useCanRead('reports')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { alerts, resolve } = useLiveAlerts({
    limit: FETCH_LIMIT,
    formatCreatedAt: formatRelativeTime,
    enabled: canRead,
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!canRead) return null

  const visible = alerts.slice(0, DROPDOWN_LIMIT)
  const count = alerts.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative text-slate-500 hover:text-slate-700 transition-colors p-1"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <p className="text-slate-800 text-sm font-semibold">{t('notifications.title')}</p>
            {count > 0 && <span className="text-slate-400 text-xs">{count}</span>}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <BellOff className="w-6 h-6" />
                <p className="text-xs">{t('notifications.empty')}</p>
              </div>
            ) : (
              visible.map(alert => {
                const Sev = severityIcon[alert.severity]
                const row = (
                  <div className="flex items-start gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                    <Sev.icon className={`w-4 h-4 mt-0.5 shrink-0 ${Sev.className}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 text-xs leading-snug">{alert.message}</p>
                      <div className="flex items-center justify-between mt-1">
                        <Badge variant={alert.type} />
                        <span className="text-slate-400 text-[10px] whitespace-nowrap">{alert.createdAt}</span>
                      </div>
                    </div>
                    <ResolveAlertButton
                      alertId={alert.id}
                      onResolved={resolve}
                      className="shrink-0 mt-0.5 text-slate-400"
                    />
                    {alert.href && <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-300" />}
                  </div>
                )
                return alert.href ? (
                  <Link key={alert.id} href={alert.href} onClick={() => setOpen(false)}>
                    {row}
                  </Link>
                ) : (
                  <div key={alert.id}>{row}</div>
                )
              })
            )}
          </div>

          <Link
            href="/alerts"
            onClick={() => setOpen(false)}
            className="block text-center px-4 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors border-t border-slate-100"
          >
            {t('notifications.viewAll')}
          </Link>
        </div>
      )}
    </div>
  )
}
