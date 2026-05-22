'use client'

import { Search } from 'lucide-react'

export interface FilterOption {
  value: string
  label: string
  dotColor?: string
}

interface SearchFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  placeholder?: string
  filterOptions?: FilterOption[]
  activeFilter?: string
  onFilterChange?: (value: string) => void
}

export default function SearchFilterBar({
  search,
  onSearchChange,
  placeholder = 'ค้นหา...',
  filterOptions,
  activeFilter,
  onFilterChange,
}: SearchFilterBarProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
          />
        </div>
        {filterOptions && filterOptions.length > 0 && onFilterChange && (
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {filterOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => onFilterChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeFilter === opt.value
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opt.dotColor && (
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${opt.dotColor}`} />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
