'use client'

import { useActionState, useState } from 'react'
import { login } from '@/lib/actions/auth'
import { Car, Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import logo from '@/public/images/logo.png'

export default function LoginPage() {
  const t = useTranslations('login')
  const [state, action, pending] = useActionState(login, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="w-full max-w-sm">
      {/* Card */}
      <div className="bg-[#0d1b2e]/80 backdrop-blur-md rounded-2xl border border-cyan-900/40 p-8 shadow-2xl">
        {/* Logo */}
        {/* <div className="flex items-center gap-2 mb-6 justify-center">
          <Car className="text-cyan-400 w-7 h-7" />
          <span className="text-white font-bold text-xl tracking-wide">EV Rental Go</span>
        </div> */}

        <div className="flex items-center justify-center gap-3 px-4 py-4 ">
          <Image
            src={logo}
            alt="EV Rental Go"
            height={60}
            style={{ width: 'auto' }}
            className="object-contain flex-shrink-0 drop-shadow-[0_0_8px_rgba(45,212,191,0.4)]"
            priority
          />
          <div className="flex flex-col leading-none">
            <div className="flex items-baseline gap-1">
              <span className="text-white font-bold text-2xl tracking-wide">EV Rental</span>
              <span className="text-teal-400 font-extrabold text-2xl tracking-wider">Go</span>
            </div>
          </div>
        </div>

        <h1 className="text-white font-bold text-2xl text-center mb-1">{t('title')}</h1>
        <p className="text-slate-400 text-sm text-center mb-7">{t('subtitle')}</p>

        <form action={action} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold tracking-widest uppercase mb-1.5">{t('emailLabel')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="email"
                name="email"
                className="w-full bg-[#0a1628] border border-slate-700 rounded-lg pl-9 pr-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder-slate-600"
                placeholder="admin@evrentalgo.com"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold tracking-widest uppercase mb-1.5">{t('passwordLabel')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="w-full bg-[#0a1628] border border-slate-700 rounded-lg pl-9 pr-10 py-3 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder-slate-600"
                placeholder="••••••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-cyan-500" />
              <span className="text-slate-400 text-sm">{t('rememberMe')}</span>
            </label>
            <span className="text-cyan-400 text-sm cursor-pointer hover:text-cyan-300 transition-colors">{t('forgotPassword')}</span>
          </div>

          {state?.error && (
            <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2">{state.error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors mt-1 flex items-center justify-center gap-2"
          >
            {pending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('signingIn')}</>
              : <><span>{t('signIn')}</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

      </div>
    </div>
  )
}
