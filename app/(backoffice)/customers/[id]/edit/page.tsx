'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import CustomerForm from '@/components/ui/customer-form'
import type { Customer } from '@/lib/types'
import { useTranslations } from 'next-intl'

export default function EditCustomerPage() {
  const params = useParams()
  const t = useTranslations('customers')
  const [customer, setCustomer] = useState<(Customer & { id: string; dateOfBirth?: string; idCardNumber?: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchCustomer() {
      try {
        const res = await fetch(`/api/customers/${params.id}`)
        if (res.ok) {
          setCustomer(await res.json())
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    void fetchCustomer()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (error || !customer) {
    return <div className="flex items-center justify-center py-20 text-slate-400">{t('detail.notFound')}</div>
  }

  return <CustomerForm mode="edit" initialData={customer} />
}
