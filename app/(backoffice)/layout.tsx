import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import { ToastProvider } from '@/components/ui/toast'
import { getCurrentUser } from '@/lib/dal'

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50">
        <Sidebar user={user} />
        <Header user={user} />
        <main className="ml-60 pt-14 min-h-screen">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
