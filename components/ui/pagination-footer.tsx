'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationFooterProps {
  page: number
  totalPages: number
  label: string
  onPageChange: (page: number) => void
}

export default function PaginationFooter({ page, totalPages, label, onPageChange }: PaginationFooterProps) {
  return (
    <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
      <span className="text-sm text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm text-slate-600 px-2 tabular-nums">{page} / {totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
