'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { mockCustomers, mockContracts } from '@/lib/mock-data'
import Badge from '@/components/ui/badge'
import Modal from '@/components/ui/modal'

export default function CustomerProfilePage() {
  const params = useParams()
  const customer = mockCustomers.find(c => c.id === params.id) ?? mockCustomers[0]
  const [blacklistReason, setBlacklistReason] = useState('')
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false)

  const customerContracts = mockContracts.filter(c => c.customerId === customer.id)

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.floor(customer.rating))

  return (
    <div className="space-y-5">
      <h1 className="text-white text-xl font-bold">Customer Management</h1>
      <p className="text-slate-400 text-sm -mt-3">Individual Customer Profile Details</p>

      {/* Profile header */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={customer.avatarUrl.replace('150', '200')}
            alt={customer.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-teal-500/50"
          />
          <div>
            <h2 className="text-white text-2xl font-bold">{customer.name}</h2>
            <div className="flex items-center gap-1 mt-1">
              {stars.map((filled, i) => (
                <span key={i} className={filled ? 'text-amber-400' : 'text-slate-600'}>
                  ★
                </span>
              ))}
              <span className="text-slate-400 text-sm ml-1">
                {customer.rating > 0 ? customer.rating.toFixed(1) : 'No rating'}
              </span>
            </div>
          </div>
        </div>
        <Badge
          variant={
            customer.status === 'pending_kyc'
              ? 'pending_kyc'
              : customer.status === 'active'
                ? 'active'
                : 'blacklisted'
          }
        />
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-3 gap-5">
        {/* Personal Info */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="text-white font-semibold mb-4">Personal Info</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 text-lg">✉️</span>
              <div>
                <p className="text-slate-500 text-xs">Email</p>
                <p className="text-slate-200 text-sm">{customer.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 text-lg">📞</span>
              <div>
                <p className="text-slate-500 text-xs">Phone</p>
                <p className="text-slate-200 text-sm">{customer.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 text-lg">📍</span>
              <div>
                <p className="text-slate-500 text-xs">Address</p>
                <p className="text-slate-200 text-sm">{customer.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Credit Score */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="text-white font-semibold mb-4">Driver Credit Score</h3>
          {customer.creditScore > 0 ? (
            <div className="text-center">
              <div className="relative w-28 h-28 mx-auto mb-3">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#334155" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={
                      customer.creditScore > 800
                        ? '#22c55e'
                        : customer.creditScore > 600
                          ? '#f59e0b'
                          : '#ef4444'
                    }
                    strokeWidth="10"
                    strokeDasharray={`${(customer.creditScore / 1000) * 314} 314`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-white text-xl font-bold">{customer.creditScore}</span>
                  <span className="text-slate-400 text-xs">/ 1000</span>
                </div>
              </div>
              <p className="text-green-400 text-sm">▲ +15 from last month</p>
              <div className="mt-3 space-y-1.5 text-left">
                {[
                  { icon: '✅', label: 'On-time payments', color: 'text-green-400' },
                  { icon: '⚠️', label: 'Minor speeding incident', color: 'text-amber-400' },
                  { icon: '✅', label: 'Low risk driver', color: 'text-green-400' },
                ].map(item => (
                  <p key={item.label} className="text-slate-400 text-xs flex items-center gap-2">
                    <span>{item.icon}</span>
                    {item.label}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">
              No credit score yet
              <br />
              (pending KYC)
            </div>
          )}
        </div>

        {/* Rental History */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="text-white font-semibold mb-4">Rental History</h3>
          <div className="space-y-2">
            {customerContracts.length > 0 ? (
              customerContracts.map(c => (
                <div
                  key={c.id}
                  className="flex justify-between items-center py-1.5 border-b border-slate-700/50"
                >
                  <div>
                    <p className="text-slate-300 text-sm">{c.vehiclePlate}</p>
                    <p className="text-slate-500 text-xs">{c.startDate}</p>
                  </div>
                  <span className="text-slate-200 text-sm font-semibold">
                    ${(c.dailyRate * 30).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">No rental history</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-5">
        {/* Claim & Accident History */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="text-white font-semibold mb-4">Claim &amp; Accident History</h3>
          <ul className="space-y-2 text-sm">
            <li className="text-slate-300">• Minor Scratch (Resolved)</li>
            <li className="text-slate-400">• No major incidents</li>
          </ul>
        </div>

        {/* Danger Zone */}
        <div className="bg-slate-800 rounded-xl border border-red-500/20 p-5">
          <h3 className="text-white font-semibold mb-4">Danger Zone</h3>
          <button
            onClick={() => setBlacklistModalOpen(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 mb-3"
          >
            ⚠️ Add to Blacklist
          </button>
          <textarea
            value={blacklistReason}
            onChange={e => setBlacklistReason(e.target.value)}
            placeholder="Reason for blacklisting..."
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
          />
        </div>
      </div>

      {/* Blacklist Confirmation Modal */}
      <Modal
        isOpen={blacklistModalOpen}
        onClose={() => setBlacklistModalOpen(false)}
        title="Confirm Blacklist"
        footer={
          <>
            <button
              onClick={() => setBlacklistModalOpen(false)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                console.log('Blacklisted:', customer.id, blacklistReason)
                setBlacklistModalOpen(false)
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              Confirm Blacklist
            </button>
          </>
        }
      >
        <p className="text-slate-400 text-sm">
          Are you sure you want to blacklist{' '}
          <strong className="text-slate-200">{customer.name}</strong>?
          {blacklistReason && (
            <>
              <br />
              <br />
              Reason: <em className="text-slate-300">{blacklistReason}</em>
            </>
          )}
        </p>
      </Modal>
    </div>
  )
}
