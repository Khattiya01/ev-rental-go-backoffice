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
        <h1 className="text-slate-800 text-xl font-bold">Invoices &amp; Transactions Management</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <span className="text-slate-500 text-sm">📅</span>
            <span className="text-slate-600 text-sm">Oct 1 - Oct 31, 2023</span>
            <span className="text-slate-400">▼</span>
          </div>
          <div className="text-slate-600 text-sm">
            Total Revenue:{' '}
            <span className="text-blue-500 font-semibold">${totalRevenue.toFixed(2)}</span>
            <span className="text-slate-400 text-xs ml-1">(This Month)</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <h2 className="text-slate-800 font-semibold text-sm">Recent Invoices</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Invoice ID ↓</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Customer Name</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Amount</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Due Date</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Status</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockInvoices.map(invoice => (
              <React.Fragment key={invoice.id}>
                <tr
                  className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                    expandedRow === invoice.id ? 'bg-slate-50' : ''
                  }`}
                >
                  <td className="px-5 py-3 text-slate-700 font-mono text-sm">
                    <button
                      onClick={() => setExpandedRow(expandedRow === invoice.id ? null : invoice.id)}
                      className="flex items-center gap-1 hover:text-slate-800"
                    >
                      {expandedRow === invoice.id ? '▲' : '▼'} {invoice.id}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-sm">{invoice.customerName}</td>
                  <td className="px-5 py-3 text-slate-700 text-sm font-medium">${invoice.amount.toFixed(2)}</td>
                  <td className="px-5 py-3 text-slate-500 text-sm">{invoice.dueDate}</td>
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
                    <button className="text-slate-400 hover:text-slate-600 text-lg">⋯</button>
                  </td>
                </tr>
                {expandedRow === invoice.id && invoice.slipUrl && (
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td colSpan={6} className="px-5 py-4">
                      <div className="flex items-start gap-4">
                        <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0">
                          View Slip
                        </button>
                        <div className="bg-slate-100 rounded-xl p-3 w-40">
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
