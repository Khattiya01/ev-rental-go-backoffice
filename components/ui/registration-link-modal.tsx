'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Link2, Copy, Check, Plus, Clock, AlertCircle, RefreshCw, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

interface LinkRecord {
  id: string
  url: string
  note: string | null
  status: 'active' | 'expired' | 'used'
  expiresAt: string
  createdBy: string
  createdAt: string
}

interface RegistrationLinkModalProps {
  onClose: () => void
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-slate-100 text-slate-400',
  used: 'bg-blue-100 text-blue-600',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'ใช้งานได้',
  expired: 'หมดอายุ',
  used: 'ใช้แล้ว',
}

const PAGE_SIZE = 5

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  })
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

export default function RegistrationLinkModal({ onClose }: RegistrationLinkModalProps) {
  const [links, setLinks] = useState<LinkRecord[]>([])
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [note, setNote] = useState('')
  const [newLink, setNewLink] = useState<LinkRecord | null>(null)
  const [copied, setCopied] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchLinks = useCallback(async (p: number) => {
    setLoadingLinks(true)
    try {
      const res = await fetch(`/api/registration-links?page=${p}&limit=${PAGE_SIZE}`)
      if (res.ok) {
        const json = await res.json() as { data: LinkRecord[]; total: number }
        setLinks(json.data ?? [])
        setTotal(json.total ?? 0)
      }
    } finally {
      setLoadingLinks(false)
    }
  }, [])

  useEffect(() => {
    void fetchLinks(page)
  }, [fetchLinks, page])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleGenerate() {
    setGenerating(true)
    setNewLink(null)
    try {
      const res = await fetch('/api/registration-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note || undefined }),
      })
      if (res.ok) {
        const data = await res.json() as LinkRecord
        setNewLink(data)
        setNote('')
        setPage(1)
        void fetchLinks(1)
      }
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/registration-links/${id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        const remainingOnPage = links.filter(l => l.id !== id).length
        const newPage = remainingOnPage === 0 && page > 1 ? page - 1 : page
        setPage(newPage)
        void fetchLinks(newPage)
        if (newLink?.id === id) setNewLink(null)
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function copyToClipboard(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-lg">
              <Link2 size={16} className="text-blue-600" />
            </div>
            <h2 className="text-slate-800 font-semibold">สร้างลิ้งลงทะเบียน</h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Generate section */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                หมายเหตุ (ระบุชื่อลูกค้า เพื่อให้จำได้ง่าย)
              </label>
              <input
                type="text"
                placeholder="เช่น คุณสมชาย — Line: @somchai"
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleGenerate() }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
              />
            </div>
            <button
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {generating
                ? <><RefreshCw size={15} className="animate-spin" /> กำลังสร้าง...</>
                : <><Plus size={15} /> สร้างลิ้งใหม่</>
              }
            </button>
          </div>

          {/* New link result */}
          {newLink && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 text-xs font-semibold">
                <Check size={14} /> สร้างลิ้งสำเร็จ — หมดอายุใน {daysUntil(newLink.expiresAt)} วัน
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={newLink.url}
                  className="flex-1 bg-white border border-green-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none font-mono"
                />
                <button
                  onClick={() => void copyToClipboard(newLink.url)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    copied ? 'bg-green-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <p className="text-green-600 text-xs">
                คัดลอกลิ้งนี้ส่งให้ลูกค้าทาง Line ได้เลย ลิ้งใช้ได้ครั้งเดียว
              </p>
            </div>
          )}

          {/* Recent links */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-700 text-sm font-semibold">
                ลิ้งทั้งหมด
                {total > 0 && <span className="ml-1.5 text-slate-400 font-normal">({total})</span>}
              </h3>
              <button
                onClick={() => void fetchLinks(page)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <RefreshCw size={12} /> รีเฟรช
              </button>
            </div>

            {loadingLinks ? (
              <div className="space-y-2">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">ยังไม่มีลิ้ง</p>
              </div>
            ) : (
              <div className="space-y-2">
                {links.map(link => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${STATUS_STYLE[link.status]}`}>
                          {STATUS_LABEL[link.status]}
                        </span>
                        {link.note && (
                          <span className="text-slate-600 text-xs truncate">{link.note}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <Clock size={11} />
                        <span>
                          {link.status === 'active'
                            ? `หมดอายุใน ${daysUntil(link.expiresAt)} วัน`
                            : `สร้างเมื่อ ${formatDate(link.createdAt)}`}
                        </span>
                        <span>· {link.createdBy}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {link.status === 'active' && (
                        <button
                          onClick={() => void copyToClipboard(link.url)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Copy size={12} /> Copy
                        </button>
                      )}
                      <button
                        onClick={() => void handleDelete(link.id)}
                        disabled={deletingId === link.id}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                        title="ลบลิ้ง"
                      >
                        {deletingId === link.id
                          ? <RefreshCw size={12} className="animate-spin" />
                          : <Trash2 size={13} />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1 || loadingLinks}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} /> ก่อนหน้า
                </button>
                <span className="text-xs text-slate-400">
                  หน้า {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loadingLinks}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ถัดไป <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
