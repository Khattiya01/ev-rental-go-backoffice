import BackofficeShell from '@/components/layout/backoffice-shell'
import { ToastProvider } from '@/components/ui/toast'
import { getCurrentUser } from '@/lib/dal'
import { getPermissionsForRole } from '@/lib/permissions'

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const permissions = user ? await getPermissionsForRole(user.role) : null

  return (
    <ToastProvider>
      <BackofficeShell user={user} permissions={permissions}>
        {children}
      </BackofficeShell>
    </ToastProvider>
  )
}
