'use client'

import { useState } from 'react'
import { mockCustomers, mockVehicles } from '@/lib/mock-data'

const pendingCustomers = mockCustomers.filter(c => c.status === 'pending_kyc')

export default function KYCApprovalPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const customer = pendingCustomers[currentIndex] ?? mockCustomers[1]

  const totalVehicles = mockVehicles.length
  const activeRentals = mockVehicles.filter(v => v.status === 'rented').length
  const available = mockVehicles.filter(v => v.status === 'available').length
  const maintenance = mockVehicles.filter(v => v.status === 'under_repair').length
  const pendingKYC = mockCustomers.filter(c => c.status === 'pending_kyc').length

  const extractedData = [
    { label: 'Full Name', value: customer.name },
    { label: 'ID Number', value: '123-456-789' },
    { label: 'Date of Birth', value: '15/05/1985' },
    { label: 'Address', value: customer.address },
    { label: 'Expiry Date', value: '01/01/2028' },
  ]

  const summaryCards = [
    { title: 'Total Vehicles', value: totalVehicles, icon: '🚗', color: 'bg-blue-500/20' },
    { title: 'Active Rentals', value: activeRentals, icon: '🕐', color: 'bg-blue-500/10' },
    { title: 'Available', value: available, icon: '✅', color: 'bg-green-500/20' },
    { title: 'Maintenance', value: maintenance, icon: '🔧', color: 'bg-amber-500/20' },
    { title: 'Pending e-KYC', value: pendingKYC, icon: '👤', color: 'bg-purple-500/20' },
  ]

  return (
    <div className="space-y-5">
      <h1 className="text-slate-800 text-xl font-bold">KYC Verification: {customer.name}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-4">
        {summaryCards.map(card => (
          <div
            key={card.title}
            className={`${card.color} rounded-xl border border-slate-200 p-4 flex items-center justify-between`}
          >
            <div>
              <p className="text-slate-500 text-xs">{card.title}</p>
              <p className="text-slate-800 text-2xl font-bold">{card.value.toLocaleString()}</p>
            </div>
            <span className="text-2xl">{card.icon}</span>
          </div>
        ))}
      </div>

      {/* Queue navigation */}
      {pendingCustomers.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-sm">
            Reviewing {currentIndex + 1} of {pendingCustomers.length} pending
          </span>
          <button
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg text-xs transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={() => setCurrentIndex(i => Math.min(pendingCustomers.length - 1, i + 1))}
            disabled={currentIndex === pendingCustomers.length - 1}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg text-xs transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* KYC comparison */}
      <div className="grid grid-cols-3 gap-5">
        {/* Selfie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-slate-800 font-semibold mb-4">User Selfie</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={customer.avatarUrl.replace('150', '300')}
            alt="User Selfie"
            className="w-full rounded-xl object-cover aspect-square"
          />
        </div>

        {/* Document comparison */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-800 font-semibold">Document Comparison</h2>
            <span className="text-green-400 text-sm font-semibold bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
              98% Match
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-400 text-xs mb-2 text-center">ID Card (Front)</p>
              <div className="bg-slate-100 rounded-xl p-4 h-36 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl mb-2">🪴</div>
                  <p className="text-slate-500 text-xs">ID Card</p>
                  <p className="text-slate-700 text-xs font-medium mt-1">{customer.name}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-2 text-center">Driver&apos;s License</p>
              <div className="bg-slate-100 rounded-xl p-4 h-36 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl mb-2">🚗</div>
                  <p className="text-slate-500 text-xs">Driver License</p>
                  <p className="text-slate-700 text-xs font-medium mt-1">{customer.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Extracted data */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-800 font-semibold">Extracted Personal Data</h2>
            <span className="text-green-400 text-xs flex items-center gap-1">✅ Verified</span>
          </div>
          <div className="space-y-3">
            {extractedData.map(item => (
              <div key={item.label} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-slate-400 text-xs">{item.label}</p>
                  <p className="text-slate-700 text-sm font-medium">{item.value}</p>
                </div>
                <span className="text-green-400 text-xs whitespace-nowrap">✅ Verified</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
              Approve
            </button>
            <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
              Reject ▼
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
