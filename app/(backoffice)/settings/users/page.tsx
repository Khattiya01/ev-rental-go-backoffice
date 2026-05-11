'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Pencil, Trash2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import Modal from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useTranslations } from 'next-intl'
import type { AdminUser, AdminRole } from '@/lib/types'

const roleBadge: Record<AdminRole, string> = {
  super_admin: 'bg-blue-100 text-blue-700 border border-blue-200',
  admin: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  viewer: 'bg-slate-100 text-slate-600 border border-slate-200',
}

function RoleBadge({ role }: { role: AdminRole }) {
  const t = useTranslations('users')
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge[role]}`}>
      {t(`roles.${role}` as Parameters<typeof t>[0])}
    </span>
  )
}

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  )
}

const EMPTY_CREATE = { name: '', email: '', password: '', role: 'admin' as AdminRole }
const EMPTY_EDIT = { name: '', role: 'admin' as AdminRole }

export default function UsersSettingsPage() {
  const t = useTranslations('users')
  const { success, error: toastError } = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [showPassword, setShowPassword] = useState(false)

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/users')
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? t('toast.fetchError'))
        return
      }
      const data: AdminUser[] = await res.json()
      setUsers(data)
    } catch {
      setError(t('toast.fetchError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchUsers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      if (!res.ok) {
        const data = await res.json()
        setCreateError(data.error ?? t('toast.createError'))
        return
      }
      setCreateOpen(false)
      setCreateForm(EMPTY_CREATE)
      await fetchUsers()
      success(t('toast.created'))
    } catch {
      setCreateError(t('toast.createError'))
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setEditLoading(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const data = await res.json()
        setEditError(data.error ?? t('toast.updateError'))
        return
      }
      setEditOpen(false)
      setEditUser(null)
      await fetchUsers()
      success(t('toast.updated'))
    } catch {
      setEditError(t('toast.updateError'))
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete(user: AdminUser) {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const data = await res.json() as { error?: string }
        toastError(data.error ?? t('toast.deleteError'))
        return
      }
      setDeleteOpen(false)
      setDeleteUser(null)
      await fetchUsers()
      success(t('toast.deleted', { name: user.name }))
    } catch {
      toastError(t('toast.deleteError'))
    } finally {
      setDeleteLoading(false)
    }
  }

  function openDelete(user: AdminUser) {
    setDeleteUser(user)
    setDeleteOpen(true)
  }

  function openEdit(user: AdminUser) {
    setEditUser(user)
    setEditForm({ name: user.name, role: user.role })
    setEditError(null)
    setEditOpen(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-slate-800 text-xl font-bold">{t('title')}</h1>
        <button
          onClick={() => { setCreateForm(EMPTY_CREATE); setCreateError(null); setCreateOpen(true) }}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {t('addNewAdmin')}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">{t('columns.name')}</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">{t('columns.email')}</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">{t('columns.role')}</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">{t('columns.createdAt')}</th>
              <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="px-5 py-3"><div className="h-4 bg-slate-200 rounded animate-pulse w-32" /></td>
                  <td className="px-5 py-3"><div className="h-4 bg-slate-200 rounded animate-pulse w-48" /></td>
                  <td className="px-5 py-3"><div className="h-4 bg-slate-200 rounded animate-pulse w-24" /></td>
                  <td className="px-5 py-3"><div className="h-4 bg-slate-200 rounded animate-pulse w-24" /></td>
                  <td className="px-5 py-3"><div className="h-4 bg-slate-200 rounded animate-pulse w-20" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">{t('empty')}</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} />
                      <span className="text-slate-700 text-sm font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-sm">{user.email}</td>
                  <td className="px-5 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-5 py-3 text-slate-500 text-sm">{new Date(user.createdAt).toLocaleDateString('th-TH')}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => openDelete(user)}
                        className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setShowPassword(false) }}
        title={t('createModal.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('createModal.cancel')}
            </button>
            <button
              form="create-user-form"
              type="submit"
              disabled={createLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {createLoading ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('createModal.saving')}</span>
              ) : t('createModal.save')}
            </button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {createError}
            </div>
          )}
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('createModal.nameLabel')}</label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('createModal.emailLabel')}</label>
            <input
              type="email"
              required
              value={createForm.email}
              onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('createModal.passwordLabel')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={createForm.password}
                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 pr-10 text-slate-800 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('createModal.roleLabel')}</label>
            <select
              required
              value={createForm.role}
              onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as AdminRole }))}
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="super_admin">{t('roles.super_admin')}</option>
              <option value="admin">{t('roles.admin')}</option>
              <option value="viewer">{t('roles.viewer')}</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('editModal.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('editModal.cancel')}
            </button>
            <button
              form="edit-user-form"
              type="submit"
              disabled={editLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {editLoading ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('editModal.saving')}</span>
              ) : t('editModal.save')}
            </button>
          </>
        }
      >
        <form id="edit-user-form" onSubmit={handleEdit} className="space-y-4">
          {editError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {editError}
            </div>
          )}
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('editModal.nameLabel')}</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('editModal.roleLabel')}</label>
            <select
              required
              value={editForm.role}
              onChange={e => setEditForm(f => ({ ...f, role: e.target.value as AdminRole }))}
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="super_admin">{t('roles.super_admin')}</option>
              <option value="admin">{t('roles.admin')}</option>
              <option value="viewer">{t('roles.viewer')}</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => { if (!deleteLoading) { setDeleteOpen(false); setDeleteUser(null) } }}
        title={t('deleteModal.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => { setDeleteOpen(false); setDeleteUser(null) }}
              disabled={deleteLoading}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {t('deleteModal.cancel')}
            </button>
            <button
              type="button"
              onClick={() => deleteUser && void handleDelete(deleteUser)}
              disabled={deleteLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {deleteLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('deleteModal.deleting')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  {t('deleteModal.confirm')}
                </span>
              )}
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-7 h-7 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-slate-700 text-sm">
              {t('deleteModal.message')}{' '}
              <span className="font-semibold text-slate-900">&quot;{deleteUser?.name}&quot;</span>
              {' '}{t('deleteModal.messageSuffix')}
            </p>
            <p className="text-slate-400 text-xs mt-1">{t('deleteModal.warning')}</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
