import type { ElementType } from 'react'

interface EmptyStateProps {
  icon: ElementType
  title: string
  subtitle?: string
}

export default function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-slate-400 py-16">
      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-1">
        <Icon size={22} className="text-slate-300" />
      </div>
      <p className="font-medium text-slate-500">{title}</p>
      {subtitle && <p className="text-sm">{subtitle}</p>}
    </div>
  )
}
