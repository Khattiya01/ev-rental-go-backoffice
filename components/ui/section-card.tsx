import type { ReactNode } from 'react'

interface SectionCardProps {
  title?: string
  children: ReactNode
  className?: string
}

export default function SectionCard({ title, children, className = '' }: SectionCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 ${className}`}>
      {title && <h3 className="text-slate-800 font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  )
}
