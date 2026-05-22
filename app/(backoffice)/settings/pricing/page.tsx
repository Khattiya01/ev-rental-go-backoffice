'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { mockPricingPlans } from '@/lib/mock-data'
import { useToast } from '@/components/ui/toast'
import PageHeader from '@/components/ui/page-header'

const planSchema = z.object({
  id: z.string(),
  vehicleModel: z.string(),
  dailyRate: z.number().min(0, 'ต้องมากกว่าหรือเท่ากับ 0'),
  monthlyRate: z.number().min(0, 'ต้องมากกว่าหรือเท่ากับ 0'),
  deposit: z.number().min(0, 'ต้องมากกว่าหรือเท่ากับ 0'),
  enabled: z.boolean(),
})

const pricingSchema = z.object({
  plans: z.array(planSchema),
})

type PricingFormData = z.infer<typeof pricingSchema>

type NumericField = 'dailyRate' | 'monthlyRate' | 'deposit'

const numericFields: { label: string; field: NumericField }[] = [
  { label: 'Daily Rate:', field: 'dailyRate' },
  { label: 'Monthly Rate:', field: 'monthlyRate' },
  { label: 'Security Deposit:', field: 'deposit' },
]

export default function PricingSettingsPage() {
  const { success, error: toastError } = useToast()

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { isSubmitting },
  } = useForm<PricingFormData>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      plans: mockPricingPlans.map(p => ({
        id: p.id,
        vehicleModel: p.vehicleModel,
        dailyRate: p.dailyRate,
        monthlyRate: p.monthlyRate,
        deposit: p.deposit,
        enabled: p.enabled,
      })),
    },
  })

  const { fields } = useFieldArray({ control, name: 'plans' })

  function step(index: number, field: NumericField, delta: number) {
    const current = getValues(`plans.${index}.${field}`)
    setValue(`plans.${index}.${field}`, Math.max(0, current + delta))
  }

  function toggleEnabled(index: number) {
    const current = getValues(`plans.${index}.enabled`)
    setValue(`plans.${index}.enabled`, !current)
  }

  async function onSubmit(_data: PricingFormData) {
    try {
      // TODO: call /api/settings/pricing when endpoint is ready
      await new Promise(r => setTimeout(r, 300))
      success('บันทึก Pricing เรียบร้อย')
    } catch {
      toastError('บันทึกไม่สำเร็จ')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-24">
      <PageHeader title="Rental Pricing Configuration" />

      <div className="grid grid-cols-3 gap-4">
        {fields.map((field, index) => {
          const enabled = getValues(`plans.${index}.enabled`)
          return (
            <div
              key={field.id}
              className={`bg-white rounded-xl border p-5 transition-colors ${
                enabled ? 'border-blue-500/40' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 font-semibold text-sm">{field.vehicleModel}</h3>
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
                        {...register(`plans.${index}.${item.field}`, { valueAsNumber: true })}
                        className="bg-transparent text-slate-700 text-sm px-2 py-1.5 w-20 focus:outline-none"
                      />
                      <div className="flex flex-col border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => step(index, item.field, 10)}
                          className="text-slate-400 hover:text-slate-600 px-1.5 text-xs leading-none py-0.5"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => step(index, item.field, -10)}
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
                    type="button"
                    onClick={() => toggleEnabled(index)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      enabled ? 'bg-blue-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        enabled ? 'left-4' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating Save button */}
      <div className="fixed bottom-6 right-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white px-8 py-3 rounded-xl font-semibold shadow-2xl transition-colors"
        >
          {isSubmitting ? 'กำลังบันทึก...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
