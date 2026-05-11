'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { mockContracts } from '@/lib/mock-data'
import Badge from '@/components/ui/badge'

export default function ContractDetailPage() {
  const params = useParams()
  const contract = mockContracts.find(c => c.id === params.id) ?? mockContracts[0]
  const [autoReminder, setAutoReminder] = useState(true)

  const badgeVariant =
    contract.status === 'active'
      ? 'active'
      : contract.status === 'overdue'
        ? 'overdue'
        : 'paid'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-slate-800 text-xl font-bold">Contract #{contract.contractNo}</h1>
          <Badge variant={badgeVariant} />
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            ⬇️ Download PDF
          </button>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            Extend Contract
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-5 gap-5">
        {/* Left panel */}
        <div className="col-span-2 space-y-4">
          {/* Contract Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-slate-800 font-semibold mb-4">Contract Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-slate-400 text-xs">Deposit Amount</dt>
                <dd className="text-slate-800 text-2xl font-bold">${contract.depositAmount.toFixed(2)}</dd>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <dt className="text-slate-400 text-xs">Daily Rate</dt>
                <dd className="text-slate-800 text-2xl font-bold">${contract.dailyRate.toFixed(2)}</dd>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <dt className="text-slate-400 text-xs">Monthly Rate</dt>
                <dd className="text-slate-800 text-2xl font-bold">${contract.monthlyRate.toFixed(2)}</dd>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <dt className="text-slate-400 text-xs">Battery Health Penalty</dt>
                <dd className="text-slate-600 text-sm">&gt;5% degradation incurs $200 fee</dd>
              </div>
            </dl>
          </div>

          {/* Reminders & Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-slate-800 font-semibold mb-4">Reminders &amp; Actions</h2>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-slate-700 text-sm font-medium">Upcoming Expiry Notification</p>
                  <p className="text-slate-400 text-xs mt-1">Status: Last reminder sent: 2 days ago</p>
                </div>
                <span className="text-slate-400 text-lg">🕐</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-slate-600 text-sm">Schedule Auto-Reminder</p>
                <button
                  onClick={() => setAutoReminder(!autoReminder)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${autoReminder ? 'bg-blue-500' : 'bg-slate-200'}`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${autoReminder ? 'left-4' : 'left-0.5'}`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>☰</span>
              <span>Contract #{contract.contractNo}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="hover:text-slate-700">−</button>
              <span>1 / 1</span>
              <button className="hover:text-slate-700">+</button>
              <span>100%</span>
              <button className="hover:text-slate-700">⬇️</button>
              <button className="hover:text-slate-700">🖨</button>
            </div>
          </div>
          <div className="flex items-center justify-center h-[500px] bg-slate-50 p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 text-slate-800">
              <h2 className="text-xl font-bold text-center mb-4">RENTAL AGREEMENT</h2>
              <div className="h-px bg-slate-200 mb-4" />
              <p className="text-xs text-slate-600 mb-3">
                This contract is entered into between EV Rental GO and the customer identified below,
                subject to the following terms and conditions:
              </p>
              <div className="space-y-2 text-xs text-slate-700">
                <p><strong>Contract No:</strong> {contract.contractNo}</p>
                <p><strong>Customer:</strong> {contract.customerName}</p>
                <p><strong>Vehicle:</strong> {contract.vehiclePlate}</p>
                <p><strong>Period:</strong> {contract.startDate} – {contract.dueDate}</p>
                <p><strong>Daily Rate:</strong> ${contract.dailyRate}</p>
                <p><strong>Deposit:</strong> ${contract.depositAmount}</p>
              </div>
              <div className="mt-6">
                <h3 className="font-bold text-xs mb-2">TERMS &amp; CONDITIONS</h3>
                <p className="text-xs text-slate-500">
                  1. The vehicle must be returned in the same condition. 2. Battery health penalty applies
                  for &gt;5% degradation. 3. Late returns incur a daily penalty fee.
                </p>
              </div>
              <div className="mt-8 flex justify-between border-t border-slate-200 pt-4">
                <div className="text-center">
                  <div className="text-slate-400 italic text-xs h-8 flex items-end justify-center">
                    Digital Signature
                  </div>
                  <div className="h-px bg-slate-300 w-24 mt-1" />
                  <p className="text-xs text-slate-500 mt-1">Provider</p>
                </div>
                <div className="text-center">
                  <div className="text-slate-600 italic text-sm h-8 flex items-end justify-center">
                    Johan
                  </div>
                  <div className="h-px bg-slate-300 w-24 mt-1" />
                  <p className="text-xs text-slate-500 mt-1">Customer Signed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
