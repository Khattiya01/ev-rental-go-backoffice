'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/fleet/vehicles', label: 'Vehicles', icon: '🚗' },
  { href: '/fleet/map', label: 'Live Map', icon: '🗺️' },
  { href: '/fleet/geofencing', label: 'Geofencing', icon: '📍' },
  { href: '/customers', label: 'Customers', icon: '👥' },
  { href: '/customers/kyc', label: 'e-KYC Approval', icon: '🪪' },
  { href: '/customers/blacklist', label: 'Blacklist', icon: '🚫' },
  { href: '/contracts', label: 'Rentals', icon: '📄' },
  { href: '/billing/invoices', label: 'Billing', icon: '💰' },
  { href: '/billing/overdue', label: 'Collections', icon: '📬' },
  { href: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { href: '/reports', label: 'Reports', icon: '📈' },
  { href: '/settings/users', label: 'Users', icon: '⚙️' },
  { href: '/settings/pricing', label: 'Pricing', icon: '💲' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-slate-900 border-r border-slate-800 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0">
          🚗
        </div>
        <div className="leading-none">
          <span className="text-white font-bold text-base">EV Rental </span>
          <span className="text-teal-400 font-bold text-base">Go</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors ${
                isActive
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold">A</div>
          <div className="text-sm">
            <p className="text-slate-200 font-medium leading-none">Admin</p>
            <p className="text-slate-500 text-xs mt-0.5">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
