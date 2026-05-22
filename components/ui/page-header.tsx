import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: string
  onBack?: () => void
  children?: ReactNode
}

export default function PageHeader({ title, subtitle, onBack, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      {onBack ? (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-slate-800 text-xl font-bold">{title}</h1>
            {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-slate-800 text-xl font-bold">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
