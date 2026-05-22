'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { logout } from '@/lib/actions/auth'
import { setLocale } from '@/lib/actions/locale'
import type { CurrentUser } from '@/lib/dal'
import { mockAlerts } from '@/lib/mock-data'
import { Search, Bell, ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface HeaderProps {
  user: CurrentUser | null
  onToggle: () => void
  collapsed: boolean
}

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  viewer: 'Viewer',
}

const LOCALES = [
  { value: 'th', flag: '🇹🇭', label: 'ภาษาไทย' },
  { value: 'en', flag: '🇺🇸', label: 'English' },
] as const

export default function Header({ user, onToggle, collapsed }: HeaderProps) {
  const t = useTranslations('header')
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A'

  const currentLocale = LOCALES.find(l => l.value === locale) ?? LOCALES[0]

  function switchLocale(next: 'th' | 'en') {
    if (next === locale) { setLangOpen(false); return }
    setLangOpen(false)
    startTransition(async () => {
      await setLocale(next)
      window.location.reload()
    })
  }

  return (
    <header
      className={`fixed top-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 transition-all duration-300 ${
        collapsed ? 'left-16' : 'left-60'
      }`}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
        <div className="text-slate-600 font-semibold text-sm">{t('backoffice')}</div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Language Switcher Dropdown */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(v => !v)}
            disabled={isPending}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
              langOpen
                ? 'bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <span className="font-semibold uppercase tracking-wide text-xs">{currentLocale.value}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${langOpen ? 'rotate-180' : ''}`} />
          </button>

          {langOpen && (
            <div className="absolute right-0 top-10 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 overflow-hidden">
              {LOCALES.map(loc => (
                <button
                  key={loc.value}
                  onClick={() => switchLocale(loc.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    loc.value === locale
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-semibold uppercase tracking-wide text-xs">{loc.value}</span>
                  <span className="text-slate-400 text-xs">—</span>
                  <span className="text-xs">{loc.label}</span>
                  {loc.value === locale && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification bell */}
        <button className="relative text-slate-500 hover:text-slate-700 transition-colors p-1">
          <Bell className="w-5 h-5" />
          {mockAlerts.filter(a => a.severity === 'critical').length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
              {mockAlerts.filter(a => a.severity === 'critical').length}
            </span>
          )}
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
            <div className="text-left">
              <span className="text-slate-700 text-sm group-hover:text-slate-900 transition-colors leading-none block">
                {user?.name ?? 'Admin'}
              </span>
              <span className="text-slate-400 text-xs leading-none block">
                {roleLabel[user?.role ?? ''] ?? 'Admin'}
              </span>
            </div>
            <ChevronDown className="text-slate-400 w-3.5 h-3.5" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-11 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-slate-800 text-sm font-medium truncate">{user?.name}</p>
                <p className="text-slate-400 text-xs truncate">{user?.email}</p>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> {t('signOut')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
