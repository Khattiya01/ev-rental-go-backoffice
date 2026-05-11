'use client'

import { useState } from 'react'
import { mockPricingPlans } from '@/lib/mock-data'
import type { PricingPlan } from '@/lib/types'

export default function PricingSettingsPage() {
  const [plans, setPlans] = useState<PricingPlan[]>(mockPricingPlans)

  const updatePlan = (id: string, field: keyof PricingPlan, value: number | boolean) => {
    setPlans(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)))
  }

  type NumericField = 'dailyRate' | 'monthlyRate' | 'deposit'

  const numericFields: { label: string; field: NumericField }[] = [
    { label: 'Daily Rate:', field: 'dailyRate' },
    { label: 'Monthly Rate:', field: 'monthlyRate' },
    { label: 'Security Deposit:', field: 'deposit' },
  ]

  return (
    <div className="space-y-5 pb-24">
      <h1 className="text-slate-800 text-xl font-bold">Rental Pricing Configuration</h1>

      <div className="grid grid-cols-3 gap-4">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl border p-5 transition-colors ${
              plan.enabled ? 'border-blue-500/40' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-800 font-semibold text-sm">{plan.vehicleModel}</h3>
              <div className="w-10 h-6 bg-slate-500 rounded-full flex items-center justify-center text-slate-400 text-xs">
                🚗
              </div>
            </div>

            <div className="space-y-3">
              {numericFields.map(item => (
                <div key={item.field} className="flex items-center justify-between">
                  <label className="text-slate-500 text-sm">{item.label}</label>
                  <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    <span className="text-slate-400 px-2 text-sm">$</span>
                    <input
                      type="number"
                      value={plan[item.field] as number}
                      onChange={e => updatePlan(plan.id, item.field, Number(e.target.value))}
                      className="bg-transparent text-slate-700 text-sm px-2 py-1.5 w-20 focus:outline-none"
                    />
                    <div className="flex flex-col border-l border-slate-200">
                      <button
                        onClick={() => updatePlan(plan.id, item.field, (plan[item.field] as number) + 10)}
                        className="text-slate-400 hover:text-slate-600 px-1.5 text-xs leading-none py-0.5"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => updatePlan(plan.id, item.field, (plan[item.field] as number) - 10)}
                        className="text-slate-400 hover:text-slate-600 px-1.5 text-xs leading-none py-0.5"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500 text-sm">Enable Package</span>
                <button
                  onClick={() => updatePlan(plan.id, 'enabled', !plan.enabled)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    plan.enabled ? 'bg-blue-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                      plan.enabled ? 'left-4' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Save button */}
      <div className="fixed bottom-6 right-6">
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold shadow-2xl transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  )
}
