'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import ContractForm from '@/components/ui/contract-form'
import type { Contract } from '@/lib/types'

export default function EditContractPage() {
  const params = useParams()
  const t = useTranslations('contractForm')
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/contracts/${params.id}`)
        if (res.ok) setContract(await res.json())
        else setError(true)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    )
  }
  if (error || !contract) {
    return <div className="flex items-center justify-center py-20 text-slate-400 text-sm">{t('notFound')}</div>
  }

  return <ContractForm mode="edit" initialData={contract} />
}
