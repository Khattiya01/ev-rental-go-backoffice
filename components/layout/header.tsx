'use client'

import { mockAlerts } from '@/lib/mock-data'

export default function Header() {
  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 z-20">
      {/* Left: Page title area (breadcrumb would go here) */}
      <div className="text-slate-300 font-semibold text-sm">Backoffice</div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search..."
            className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-1.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-teal-500 w-48 transition-colors"
          />
        </div>

        {/* Notification bell */}
        <button className="relative text-slate-400 hover:text-slate-200 transition-colors">
          <span className="text-xl">🔔</span>
          {mockAlerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
              {mockAlerts.filter(a => a.severity === 'critical').length}
            </span>
          )}
        </button>

        {/* Admin profile */}
        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold">A</div>
          <span className="text-slate-300 text-sm group-hover:text-white transition-colors">Admin</span>
          <span className="text-slate-500 text-xs">▼</span>
        </div>
      </div>
    </header>
  )
}
