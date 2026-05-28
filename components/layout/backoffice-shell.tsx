'use client'

import { useState } from 'react'
import Sidebar from './sidebar'
import Header from './header'
import type { CurrentUser } from '@/lib/dal'
import type { UserPermissions } from '@/lib/types'
import { UserProvider } from '@/lib/user-context'

interface BackofficeShellProps {
  user: CurrentUser | null
  permissions: UserPermissions | null
  children: React.ReactNode
}

export default function BackofficeShell({ user, permissions, children }: BackofficeShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <UserProvider user={user} permissions={permissions}>
      <div className="min-h-screen bg-slate-50">
        <Sidebar user={user} collapsed={collapsed} />
        <Header user={user} onToggle={() => setCollapsed(c => !c)} collapsed={collapsed} />
        <main
          className={`pt-14 min-h-screen transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>
    </UserProvider>
  )
}
