'use client'

import { createContext, useContext } from 'react'
import type { CurrentUser } from '@/lib/dal'
import type { PermResource, UserPermissions } from '@/lib/types'

type UserContextValue = {
  user: CurrentUser | null
  permissions: UserPermissions | null
}

const UserContext = createContext<UserContextValue>({ user: null, permissions: null })

export function UserProvider({
  user,
  permissions,
  children,
}: {
  user: CurrentUser | null
  permissions: UserPermissions | null
  children: React.ReactNode
}) {
  return <UserContext.Provider value={{ user, permissions }}>{children}</UserContext.Provider>
}

export function useCurrentUser(): CurrentUser | null {
  return useContext(UserContext).user
}

export function useCanRead(resource: PermResource): boolean {
  const { user, permissions } = useContext(UserContext)
  if (!user) return false
  if (user.role === 'super_admin') return true
  return permissions?.[resource]?.canRead ?? false
}

/** Pass a resource for matrix-aware check; omit for legacy role-only check. */
export function useCanWrite(resource?: PermResource): boolean {
  const { user, permissions } = useContext(UserContext)
  if (!user) return false
  if (user.role === 'super_admin') return true
  if (!resource) return user.role === 'admin'
  return permissions?.[resource]?.canWrite ?? false
}

export function useCanDelete(resource: PermResource): boolean {
  const { user, permissions } = useContext(UserContext)
  if (!user) return false
  if (user.role === 'super_admin') return true
  return permissions?.[resource]?.canDelete ?? false
}

export function useIsSuperAdmin(): boolean {
  return useContext(UserContext).user?.role === 'super_admin'
}
