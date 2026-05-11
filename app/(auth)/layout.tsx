import WaveBackground from '@/components/ui/wave-background'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050d1a] relative overflow-hidden">
      <WaveBackground />
      <div className="relative z-10 w-full flex flex-col items-center justify-center min-h-screen px-4">
        {children}
        {/* Footer */}
        <div className="fixed bottom-4 left-0 right-0 flex items-center justify-between px-8">
          <p className="text-slate-500 text-xs">© 2024 EV Rental Go Backoffice. Secure Administrative Portal.</p>
          <div className="flex gap-4">
            {/* <span className="text-slate-500 text-xs cursor-pointer hover:text-slate-400">Privacy Policy</span> */}
            {/* <span className="text-slate-500 text-xs cursor-pointer hover:text-slate-400">Security Standards</span> */}
            <span className="text-slate-500 text-xs cursor-pointer hover:text-slate-400">Support</span>
          </div>
        </div>
      </div>
    </div>
  )
}
