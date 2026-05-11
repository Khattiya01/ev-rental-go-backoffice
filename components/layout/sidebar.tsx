'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { CurrentUser } from '@/lib/dal'
import {
  LayoutDashboard, Car, Map, Locate, Users, BadgeCheck, Ban,
  FileText, Receipt, AlertTriangle, Wrench, BarChart3, UserCog, DollarSign,
  Settings, ChevronDown,
  type LucideIcon
} from 'lucide-react'

type NavLeaf = { href: string; label: string; icon: LucideIcon }
type NavGroup = { label: string; icon: LucideIcon; basePath: string; children: NavLeaf[] }
type NavItem = NavLeaf | NavGroup

function isGroup(item: NavItem): item is NavGroup {
  return 'children' in item
}

interface SidebarProps {
  user: CurrentUser | null
}

function NavGroupItem({ group, pathname }: { group: NavGroup; pathname: string }) {
  const isAnyChildActive = group.children.some(
    c => pathname === c.href || pathname.startsWith(c.href + '/')
  )
  const [open, setOpen] = useState(isAnyChildActive)

  // Auto-expand when navigating into this group
  useEffect(() => {
    if (isAnyChildActive) setOpen(true)
  }, [isAnyChildActive])

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors ${
          isAnyChildActive && !open
            ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
            : 'text-slate-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <group.icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="ml-3 pl-3 border-l border-blue-900/60 mb-0.5">
          {group.children.map(child => {
            const isActive = pathname === child.href || pathname.startsWith(child.href + '/')
            return (
              <Link
                key={child.href}
                href={child.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('sidebar')

  const navItems: NavItem[] = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    {
      label: t('fleet'),
      icon: Car,
      basePath: '/fleet',
      children: [
        { href: '/fleet/vehicles', label: t('vehicles'), icon: Car },
        { href: '/fleet/map', label: t('liveMap'), icon: Map },
        { href: '/fleet/geofencing', label: t('geofencing'), icon: Locate },
      ],
    },
    {
      label: t('customers'),
      icon: Users,
      basePath: '/customers',
      children: [
        { href: '/customers', label: t('allCustomers'), icon: Users },
        { href: '/customers/kyc', label: t('kycApproval'), icon: BadgeCheck },
        { href: '/customers/blacklist', label: t('blacklist'), icon: Ban },
      ],
    },
    { href: '/contracts', label: t('rentals'), icon: FileText },
    {
      label: t('billing'),
      icon: Receipt,
      basePath: '/billing',
      children: [
        { href: '/billing/invoices', label: t('invoices'), icon: Receipt },
        { href: '/billing/overdue', label: t('collections'), icon: AlertTriangle },
      ],
    },
    { href: '/maintenance', label: t('maintenance'), icon: Wrench },
    { href: '/reports', label: t('reports'), icon: BarChart3 },
    {
      label: t('settings'),
      icon: Settings,
      basePath: '/settings',
      children: [
        { href: '/settings/users', label: t('users'), icon: UserCog },
        { href: '/settings/pricing', label: t('pricing'), icon: DollarSign },
      ],
    },
  ]

  const roleLabelFor = (role: string) => t(`roles.${role}` as Parameters<typeof t>[0]) ?? role

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A'

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-[#0c2340] border-r border-blue-900/50 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-blue-900/50">
        <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
          <Car className="w-5 h-5" />
        </div>
        <div className="leading-none">
          <span className="text-white font-bold text-base">EV Rental </span>
          <span className="text-teal-400 font-bold text-base">Go</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navItems.map(item => {
          if (isGroup(item)) {
            return <NavGroupItem key={item.basePath} group={item} pathname={pathname} />
          }
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer — real user */}
      <div className="p-3 border-t border-blue-900/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="text-sm min-w-0">
            <p className="text-slate-200 font-medium leading-none truncate">{user?.name ?? 'Admin'}</p>
            <p className="text-slate-400 text-xs mt-0.5">{roleLabelFor(user?.role ?? '') || 'Admin'}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
