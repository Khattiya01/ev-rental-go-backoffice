'use client'

import Link from 'next/link'
import Image from 'next/image'
import logo from '@/public/images/logo.png'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import type { CurrentUser } from '@/lib/dal'
import {
  LayoutDashboard, Car, Map, Locate, Users, BadgeCheck, Ban,
  FileText, Receipt, AlertTriangle, Wrench, BarChart3, UserCog, DollarSign,
  Settings, ChevronDown, QrCode,
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
  collapsed: boolean
}

function NavGroupItem({
  group,
  pathname,
  collapsed,
}: {
  group: NavGroup
  pathname: string
  collapsed: boolean
}) {
  const isAnyChildActive = group.children.some(
    c => pathname === c.href || pathname.startsWith(c.href + '/')
  )
  const [open, setOpen] = useState(isAnyChildActive)
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const [flyoutTop, setFlyoutTop] = useState(0)
  const triggerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isAnyChildActive) setOpen(true)
  }, [isAnyChildActive])

  function showFlyout() {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setFlyoutTop(rect.top)
    }
    setFlyoutOpen(true)
  }

  function hideFlyout() {
    hideTimer.current = setTimeout(() => setFlyoutOpen(false), 80)
  }

  // Collapsed: icon button + flyout portal on hover
  if (collapsed) {
    return (
      <>
        <div
          ref={triggerRef}
          className="mb-0.5"
          onMouseEnter={showFlyout}
          onMouseLeave={hideFlyout}
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-lg mx-auto cursor-pointer transition-colors ${
              isAnyChildActive
                ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <group.icon className="w-5 h-5" />
          </div>
        </div>

        {flyoutOpen && createPortal(
          <div
            className="fixed z-[9999]"
            style={{ top: flyoutTop, left: 64 }}
            onMouseEnter={showFlyout}
            onMouseLeave={hideFlyout}
          >
            {/* transparent bridge to fill gap between sidebar and panel */}
            <div className="absolute inset-y-0 -left-4 w-4" />
            <div className="ml-2 min-w-44 bg-[#0f2d4a] border border-blue-900/60 rounded-lg shadow-xl py-1.5 overflow-hidden">
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest px-3 pb-1.5 pt-0.5">
                {group.label}
              </p>
              {group.children.map(child => {
                const isActive = pathname === child.href || pathname.startsWith(child.href + '/')
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => setFlyoutOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'text-blue-300 bg-blue-400/20'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {child.label}
                  </Link>
                )
              })}
            </div>
          </div>,
          document.body
        )}
      </>
    )
  }

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

export default function Sidebar({ user, collapsed }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('sidebar')

  const isSuperAdmin = user?.role === 'super_admin'
  const isViewer = user?.role === 'viewer'

  const navItems: NavItem[] = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    {
      label: t('fleet'),
      icon: Car,
      basePath: '/fleet',
      children: [
        { href: '/fleet/vehicles', label: t('vehicles'), icon: Car },
        // { href: '/fleet/map', label: t('liveMap'), icon: Map },
        // { href: '/fleet/geofencing', label: t('geofencing'), icon: Locate },
      ],
    },
    {
      label: t('customers'),
      icon: Users,
      basePath: '/customers',
      children: [
        { href: '/customers', label: t('allCustomers'), icon: Users },
        // { href: '/customers/kyc', label: t('kycApproval'), icon: BadgeCheck },
        // { href: '/customers/blacklist', label: t('blacklist'), icon: Ban },
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
    // { href: '/maintenance', label: t('maintenance'), icon: Wrench },
    // { href: '/reports', label: t('reports'), icon: BarChart3 },
    {
      label: t('settings'),
      icon: Settings,
      basePath: '/settings',
      children: [
        ...(isSuperAdmin ? [{ href: '/settings/users', label: t('users'), icon: UserCog }] : []),
        // ...(!isViewer ? [{ href: '/settings/pricing', label: t('pricing'), icon: DollarSign }] : []),
        { href: '/settings/payment', label: t('payment'), icon: QrCode },
      ],
    },
  ]

  const roleLabelFor = (role: string) => t(`roles.${role}` as Parameters<typeof t>[0]) ?? role

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A'

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-[#0c2340] border-r border-blue-900/50 flex flex-col z-30 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      {collapsed ? (
        <div className="flex items-center justify-center py-4 border-b border-blue-900/50">
          <Image
            src={logo}
            alt="EV Rental Go"
            height={32}
            style={{ width: 'auto' }}
            className="object-contain drop-shadow-[0_0_8px_rgba(45,212,191,0.4)]"
            priority
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-4 border-b border-blue-900/50">
          <Image
            src={logo}
            alt="EV Rental Go"
            height={40}
            style={{ width: 'auto' }}
            className="object-contain flex-shrink-0 drop-shadow-[0_0_8px_rgba(45,212,191,0.4)]"
            priority
          />
          <div className="flex flex-col leading-none">
            <div className="flex items-baseline gap-1">
              <span className="text-white font-bold text-sm tracking-wide">EV Rental</span>
              <span className="text-teal-400 font-extrabold text-sm tracking-wider">Go</span>
            </div>
            <span className="mt-1 text-[9px] font-semibold text-teal-500/70 uppercase tracking-widest border border-teal-500/30 rounded px-1 py-0.5 w-fit">
              Backoffice
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto py-3 ${collapsed ? 'px-1' : 'px-3'}`}>
        {navItems.map(item => {
          if (isGroup(item)) {
            return (
              <NavGroupItem
                key={item.basePath}
                group={item}
                pathname={pathname}
                collapsed={collapsed}
              />
            )
          }
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

          if (collapsed) {
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center w-10 h-10 rounded-lg mx-auto mb-0.5 transition-colors ${
                  isActive
                    ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <item.icon className="w-5 h-5" />
              </Link>
            )
          }

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

      {/* Footer */}
      <div className={`border-t border-blue-900/50 ${collapsed ? 'p-2' : 'p-3'}`}>
        {collapsed ? (
          <div className="flex justify-center py-1">
            <div
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold"
              title={user?.name ?? 'Admin'}
            >
              {initials}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="text-sm min-w-0">
              <p className="text-slate-200 font-medium leading-none truncate">
                {user?.name ?? 'Admin'}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {user?.role ? roleLabelFor(user.role) : 'Admin'}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

