'use client'

import { useState, useEffect, useMemo } from 'react'
import { UserPlus, Pencil, Trash2, Loader2, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Modal from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useTranslations } from 'next-intl'
import type { AdminUser, AdminRole } from '@/lib/types'
import PageHeader from '@/components/ui/page-header'
import EmptyState from '@/components/ui/empty-state'
import PaginationFooter from '@/components/ui/pagination-footer'
import ActionButton from '@/components/ui/action-button'

// ─── Form types ───────────────────────────────────────────────────
type CreateFormData = { name: string; email: string; password: string; role: AdminRole }
type EditFormData = { name: string; role: AdminRole }
type ChangePasswordFormData = { newPassword: string; confirmPassword: string }

// ─── Sub-components ───────────────────────────────────────────────
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

const PAGE_SIZE = 10

export default function UsersSettingsPage() {
  const t = useTranslations('users')
  const { success, error: toastError } = useToast()

  const createSchema = useMemo(() => z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    email: z.string().email({ message: t('validation.emailInvalid') }),
    password: z.string().min(8, t('validation.passwordMin')),
    role: z.enum(['super_admin', 'admin', 'viewer']),
  }), [t])

  const editSchema = useMemo(() => z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    role: z.enum(['super_admin', 'admin', 'viewer']),
  }), [t])

  const changePasswordSchema = useMemo(() => z.object({
    newPassword: z.string().min(8, t('validation.passwordMin')),
    confirmPassword: z.string().min(1, t('validation.confirmPasswordRequired')),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: t('validation.passwordMismatch'),
    path: ['confirmPassword'],
  }), [t])

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [changePasswordUser, setChangePasswordUser] = useState<AdminUser | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [page, setPage] = useState(1)

  // ─── Create form ──────────────────────────────────────────────
  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', role: 'admin' },
  })

  // ─── Edit form ────────────────────────────────────────────────
  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', role: 'admin' },
  })

  // ─── Change password form ──────────────────────────────────────
  const changePasswordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  async function fetchUsers() {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/users')
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setFetchError(data.error ?? t('toast.fetchError'))
        return
      }
      const data: AdminUser[] = await res.json()
      setUsers(data)
    } catch {
      setFetchError(t('toast.fetchError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchUsers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate(data: CreateFormData) {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errData = await res.json() as { error?: string }
        createForm.setError('root', { message: errData.error ?? t('toast.createError') })
        return
      }
      setCreateOpen(false)
      createForm.reset()
      await fetchUsers()
      success(t('toast.created'))
    } catch {
      createForm.setError('root', { message: t('toast.createError') })
    }
  }

  async function handleEdit(data: EditFormData) {
    if (!editUser) return
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errData = await res.json() as { error?: string }
        editForm.setError('root', { message: errData.error ?? t('toast.updateError') })
        return
      }
      setEditOpen(false)
      setEditUser(null)
      await fetchUsers()
      success(t('toast.updated'))
    } catch {
      editForm.setError('root', { message: t('toast.updateError') })
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

  async function handleChangePassword(data: ChangePasswordFormData) {
    if (!changePasswordUser) return
    try {
      const res = await fetch(`/api/users/${changePasswordUser.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: data.newPassword }),
      })
      if (!res.ok) {
        const errData = await res.json() as { error?: string }
        changePasswordForm.setError('root', { message: errData.error ?? t('toast.passwordChangeError') })
        return
      }
      setChangePasswordOpen(false)
      setChangePasswordUser(null)
      changePasswordForm.reset()
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      success(t('toast.passwordChanged'))
    } catch {
      changePasswordForm.setError('root', { message: t('toast.passwordChangeError') })
    }
  }

  function openEdit(user: AdminUser) {
    setEditUser(user)
    editForm.reset({ name: user.name, role: user.role })
    setEditOpen(true)
  }

  function openDelete(user: AdminUser) {
    setDeleteUser(user)
    setDeleteOpen(true)
  }

  function openChangePassword(user: AdminUser) {
    setChangePasswordUser(user)
    changePasswordForm.reset()
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setChangePasswordOpen(true)
  }

  const inputCls = 'w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-blue-400 transition-colors'
  const inputErrCls = 'w-full bg-slate-100 border border-red-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-red-400 transition-colors'
  const fieldErrCls = 'text-red-500 text-xs mt-1'

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        subtitle={users.length > 0 ? t('subtitleCount', { count: users.length }) : t('subtitleDefault')}
      >
        <button
          onClick={() => { createForm.reset(); setCreateOpen(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {t('addNewAdmin')}
        </button>
      </PageHeader>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {fetchError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200">
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.name')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.email')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.role')}</th>
              <th className="text-left text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.createdAt')}</th>
              <th className="text-right text-slate-400 text-xs font-semibold px-5 py-3.5 uppercase tracking-wider">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" /><div className="h-4 bg-slate-100 rounded animate-pulse w-28" /></div></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-44" /></td>
                  <td className="px-5 py-4"><div className="h-5 bg-slate-100 rounded-full animate-pulse w-20" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-16 ml-auto" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center">
                  <EmptyState icon={UserPlus} title={t('empty')} />
                </td>
              </tr>
            ) : (
              users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(user => (
                <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} />
                      <span className="text-slate-700 text-sm font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-sm">{user.email}</td>
                  <td className="px-5 py-3.5"><RoleBadge role={user.role} /></td>
                  <td className="px-5 py-3.5 text-slate-500 text-sm tabular-nums">{new Date(user.createdAt).toLocaleDateString('th-TH')}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <ActionButton variant="view" onClick={() => openChangePassword(user)} icon={KeyRound} title={t('changePassword')} />
                      <ActionButton variant="edit" onClick={() => openEdit(user)} icon={Pencil} title={t('edit')} />
                      <ActionButton variant="delete" onClick={() => openDelete(user)} icon={Trash2} title={t('delete')} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && users.length > 0 && (
          <PaginationFooter
            page={page}
            totalPages={Math.max(1, Math.ceil(users.length / PAGE_SIZE))}
            label={t('pagination.showing', { from: Math.min((page - 1) * PAGE_SIZE + 1, users.length), to: Math.min(page * PAGE_SIZE, users.length), total: users.length })}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setShowPassword(false); createForm.reset() }}
        title={t('createModal.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => { setCreateOpen(false); setShowPassword(false); createForm.reset() }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('createModal.cancel')}
            </button>
            <button
              form="create-user-form"
              type="submit"
              disabled={createForm.formState.isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {createForm.formState.isSubmitting ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('createModal.saving')}</span>
              ) : t('createModal.save')}
            </button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
          {createForm.formState.errors.root && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {createForm.formState.errors.root.message}
            </p>
          )}
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('createModal.nameLabel')}</label>
            <input
              type="text"
              {...createForm.register('name')}
              className={createForm.formState.errors.name ? inputErrCls : inputCls}
            />
            {createForm.formState.errors.name && (
              <p className={fieldErrCls}>{createForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('createModal.emailLabel')}</label>
            <input
              type="email"
              {...createForm.register('email')}
              className={createForm.formState.errors.email ? inputErrCls : inputCls}
            />
            {createForm.formState.errors.email && (
              <p className={fieldErrCls}>{createForm.formState.errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('createModal.passwordLabel')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...createForm.register('password')}
                className={`${createForm.formState.errors.password ? inputErrCls : inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {createForm.formState.errors.password && (
              <p className={fieldErrCls}>{createForm.formState.errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('createModal.roleLabel')}</label>
            <select
              {...createForm.register('role')}
              className={inputCls}
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
        onClose={() => { setEditOpen(false); setEditUser(null) }}
        title={t('editModal.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => { setEditOpen(false); setEditUser(null) }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('editModal.cancel')}
            </button>
            <button
              form="edit-user-form"
              type="submit"
              disabled={editForm.formState.isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {editForm.formState.isSubmitting ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('editModal.saving')}</span>
              ) : t('editModal.save')}
            </button>
          </>
        }
      >
        <form id="edit-user-form" onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
          {editForm.formState.errors.root && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {editForm.formState.errors.root.message}
            </p>
          )}
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('editModal.nameLabel')}</label>
            <input
              type="text"
              {...editForm.register('name')}
              className={editForm.formState.errors.name ? inputErrCls : inputCls}
            />
            {editForm.formState.errors.name && (
              <p className={fieldErrCls}>{editForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('editModal.roleLabel')}</label>
            <select
              {...editForm.register('role')}
              className={inputCls}
            >
              <option value="super_admin">{t('roles.super_admin')}</option>
              <option value="admin">{t('roles.admin')}</option>
              <option value="viewer">{t('roles.viewer')}</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={changePasswordOpen}
        onClose={() => { setChangePasswordOpen(false); setChangePasswordUser(null); changePasswordForm.reset(); setShowNewPassword(false); setShowConfirmPassword(false) }}
        title={`${t('changePasswordModal.title')}${changePasswordUser ? ` — ${changePasswordUser.name}` : ''}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => { setChangePasswordOpen(false); setChangePasswordUser(null); changePasswordForm.reset(); setShowNewPassword(false); setShowConfirmPassword(false) }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('changePasswordModal.cancel')}
            </button>
            <button
              form="change-password-form"
              type="submit"
              disabled={changePasswordForm.formState.isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {changePasswordForm.formState.isSubmitting ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('changePasswordModal.saving')}</span>
              ) : t('changePasswordModal.save')}
            </button>
          </>
        }
      >
        <form id="change-password-form" onSubmit={changePasswordForm.handleSubmit(handleChangePassword)} className="space-y-4">
          {changePasswordForm.formState.errors.root && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {changePasswordForm.formState.errors.root.message}
            </p>
          )}
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('changePasswordModal.newPasswordLabel')}</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                {...changePasswordForm.register('newPassword')}
                className={`${changePasswordForm.formState.errors.newPassword ? inputErrCls : inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {changePasswordForm.formState.errors.newPassword && (
              <p className={fieldErrCls}>{changePasswordForm.formState.errors.newPassword.message}</p>
            )}
          </div>
          <div>
            <label className="block text-slate-500 text-sm mb-1">{t('changePasswordModal.confirmPasswordLabel')}</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                {...changePasswordForm.register('confirmPassword')}
                className={`${changePasswordForm.formState.errors.confirmPassword ? inputErrCls : inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {changePasswordForm.formState.errors.confirmPassword && (
              <p className={fieldErrCls}>{changePasswordForm.formState.errors.confirmPassword.message}</p>
            )}
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
