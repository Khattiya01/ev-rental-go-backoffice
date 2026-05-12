import BackofficeShell from '@/components/layout/backoffice-shell'
import { ToastProvider } from '@/components/ui/toast'
import { getCurrentUser } from '@/lib/dal'

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <ToastProvider>
      <BackofficeShell user={user}>
        {children}
      </BackofficeShell>
    </ToastProvider>
  )
}
