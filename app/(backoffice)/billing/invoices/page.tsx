'use client'

import React, { useState } from 'react'
import { mockInvoices } from '@/lib/mock-data'
import Badge from '@/components/ui/badge'

export default function InvoicesPage() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const totalRevenue = mockInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Invoices & Transactions Management</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
            <span className="text-slate-400 text-sm">📅</span>
            <span className="text-slate-300 text-sm">Oct 1 - Oct 31, 2023</span>
            <span className="text-slate-500">▼</span>
          </div>
          <div className="text-slate-300 text-sm">
            Total Revenue:{' '}
            <span className="text-teal-400 font-semibold">${totalRevenue.toFixed(2)}</span>
            <span className="text-slate-500 text-xs ml-1">(This Month)</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700">
          <h2 className="text-white font-semibold text-sm">Recent Invoices</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Invoice ID ↓</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Customer Name</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Amount</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Due Date</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Status</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockInvoices.map(invoice => (
              <React.Fragment key={invoice.id}>
                <tr
                  className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                    expandedRow === invoice.id ? 'bg-slate-700/20' : ''
                  }`}
                >
                  <td className="px-5 py-3 text-slate-200 font-mono text-sm">
                    <button
                      onClick={() => setExpandedRow(expandedRow === invoice.id ? null : invoice.id)}
                      className="flex items-center gap-1 hover:text-white"
                    >
                      {expandedRow === invoice.id ? '▲' : '▼'} {invoice.id}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-300 text-sm">{invoice.customerName}</td>
                  <td className="px-5 py-3 text-slate-200 text-sm font-medium">${invoice.amount.toFixed(2)}</td>
                  <td className="px-5 py-3 text-slate-400 text-sm">{invoice.dueDate}</td>
                  <td className="px-5 py-3">
                    <Badge
                      variant={
                        invoice.status === 'paid'
                          ? 'paid'
                          : invoice.status === 'pending'
                            ? 'pending'
                            : 'overdue'
                      }
                    />
                  </td>
                  <td className="px-5 py-3">
                    <button className="text-slate-500 hover:text-slate-300 text-lg">⋯</button>
                  </td>
                </tr>
                {expandedRow === invoice.id && invoice.slipUrl && (
                  <tr className="border-b border-slate-700/50 bg-slate-700/10">
                    <td colSpan={6} className="px-5 py-4">
                      <div className="flex items-start gap-4">
                        <button className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0">
                          View Slip
                        </button>
                        <div className="bg-slate-700 rounded-xl p-3 w-40">
                          <div className="bg-white rounded-lg h-28 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl mb-1">🏦</div>
                              <p className="text-slate-600 text-xs">Payment Slip</p>
                              <p className="text-slate-500 text-xs">${invoice.amount.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
