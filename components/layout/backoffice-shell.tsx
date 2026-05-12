'use client'

import { useState } from 'react'
import Sidebar from './sidebar'
import Header from './header'
import type { CurrentUser } from '@/lib/dal'

interface BackofficeShellProps {
  user: CurrentUser | null
  children: React.ReactNode
}

export default function BackofficeShell({ user, children }: BackofficeShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} collapsed={collapsed} />
      <Header user={user} onToggle={() => setCollapsed(c => !c)} collapsed={collapsed} />
      <main
        className={`pt-14 min-h-screen transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
