'use client'
import { useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'
import { getUser } from '../../lib/auth'
import Navbar from '../../components/Navbar'
import { Modal, Input, Select, Btn, Empty, Spinner } from '../../components/ui'
import { useRouter } from 'next/navigation'
import { useLocale } from '../../hooks/useLocale'

const ROLE_PALETTE = [
  'bg-violet-500/20 text-violet-400', 'bg-sky-500/20 text-sky-400',
  'bg-pink-500/20 text-pink-400',     'bg-emerald-500/20 text-emerald-400',
  'bg-amber-500/20 text-amber-400',   'bg-rose-500/20 text-rose-400',
  'bg-teal-500/20 text-teal-400',     'bg-indigo-500/20 text-indigo-400',
  'bg-lime-500/20 text-lime-400',     'bg-cyan-500/20 text-cyan-400',
  'bg-orange-500/20 text-orange-400', 'bg-fuchsia-500/20 text-fuchsia-400',
  'bg-purple-500/20 text-purple-400', 'bg-blue-500/20 text-blue-400',
  'bg-red-500/20 text-red-400',
]

const roleColor = (key = '') => {
  const hash = [...key].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return ROLE_PALETTE[hash % ROLE_PALETTE.length]
}

const EMPTY_FORM = { name: '', email: '', password: '', role: '', department: '' }

export default function UsersPage() {
  const { t } = useLocale()
  const router = useRouter()
  const currentUser = getUser()

  const [users, setUsers]           = useState([])
  const [roles, setRoles]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [rolesLoading, setRolesLoading] = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    if (currentUser?.role !== 'SUPER_ADMIN') { router.replace('/dashboard') }
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setUsers(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true)
    try {
      const { data } = await api.get('/users/roles')
      setRoles(data)
      if (data.length > 0) setForm(f => ({ ...f, role: f.role || data[0].key }))
    } catch (e) { console.error(e) }
    finally { setRolesLoading(false) }
  }, [])

  useEffect(() => { fetchUsers(); fetchRoles() }, [])

  const openCreate = () => {
    setEditing(null); setError('')
    setForm({ ...EMPTY_FORM, role: roles[0]?.key || '' })
    setModalOpen(true)
  }

  const openEdit = (u) => {
    setEditing(u); setError('')
    setForm({ name: u.name, email: u.email, password: '', role: u.role, department: u.department || '' })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const payload = { ...form }
      if (editing && !payload.password) delete payload.password
      if (editing) await api.put(`/users/${editing.id}`, payload)
      else          await api.post('/users', payload)
      setModalOpen(false); fetchUsers()
    } catch (err) { setError(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('users.delete_confirm'))) return
    try { await api.delete(`/users/${id}`); fetchUsers() }
    catch (err) { alert(err.response?.data?.error || t('errors.delete_error')) }
  }

  const getRoleLabel = (roleKey) => {
    const found = roles.find(r => r.key === roleKey)
    return found ? found.label : (roleKey || '—').replace(/_/g, ' ')
  }

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const HEADERS = [t('users.user_col'), t('common.email'), t('users.role'), t('users.department'), t('users.joined'), t('common.actions')]

  return (
    <div>
      <Navbar
        title={t('users.title')}
        subtitle={`${users.length} ${t('users.subtitle')}`}
        action={<Btn onClick={openCreate}>{t('users.new_user')}</Btn>}
      />

      {loading ? <Spinner /> : users.length === 0 ? <Empty message={t('users.no_users')} /> : (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {HEADERS.map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/30 to-blue-600/30 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm flex-shrink-0">
                        {user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{user.name}</p>
                        {user.id === currentUser?.id && <span className="text-xs text-slate-500">{t('users.you')}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-400">{user.email}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${roleColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">{user.department || '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{fmtDate(user.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEdit(user)} className="text-slate-400 hover:text-sky-400 transition text-xs">{t('common.edit')}</button>
                      {user.id !== currentUser?.id && (
                        <button onClick={() => handleDelete(user.id)} className="text-slate-400 hover:text-red-400 transition text-xs">{t('common.delete')}</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('users.edit_user') : t('users.add_member')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={t('users.full_name')} value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Jane Smith" />
          <Input label={t('common.email')} type="email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} required
            placeholder="jane@company.com" disabled={!!editing} />
          <Input
            label={editing ? t('users.new_password_hint') : `${t('users.password')} *`}
            type="password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required={!editing} placeholder="••••••••" />
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t('users.role')} *</label>
            {rolesLoading ? (
              <p className="text-xs text-slate-500 py-2">{t('common.loading')}</p>
            ) : (
              <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} required>
                <option value="" disabled>{t('users.select_role')}</option>
                {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </Select>
            )}
          </div>
          <Input label={t('users.department_optional')} value={form.department}
            onChange={e => setForm({ ...form, department: e.target.value })}
            placeholder="Engineering, Sales, Finance…" />
          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving || rolesLoading} className="flex-1">
              {saving ? t('common.saving') : editing ? t('users.update_user') : t('users.create_user')}
            </Btn>
            <Btn type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
