'use client'
import { useState } from 'react'
import api from '../../lib/api'
import { getUser, setUser } from '../../lib/auth'
import Navbar from '../../components/Navbar'
import { Input, Btn } from '../../components/ui'
import { useLocale } from '../../hooks/useLocale'

export default function ProfilePage() {
  const { t } = useLocale()
  const user = getUser()
  const [form, setForm] = useState({ name: user?.name || '', currentPassword: '', newPassword: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      const payload = { name: form.name }
      if (form.newPassword) {
        if (!form.currentPassword) {
          setMsg({ type: 'error', text: t('profile.current_password_required') })
          setSaving(false)
          return
        }
        payload.password = form.newPassword
      }
      const { data } = await api.put(`/users/${user.id}`, payload)
      setUser({ ...user, name: data.name })
      setForm(f => ({ ...f, currentPassword: '', newPassword: '' }))
      setMsg({ type: 'success', text: t('profile.updated_success') })
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || t('profile.update_error') })
    } finally { setSaving(false) }
  }

  const roleColors = {
    SUPER_ADMIN: 'from-violet-500 to-purple-700',
    SALES: 'from-sky-500 to-blue-700',
    MARKETING: 'from-pink-500 to-rose-700',
    FINANCE: 'from-emerald-500 to-green-700',
  }

  return (
    <div className="max-w-2xl">
      <Navbar title={t('profile.title')} subtitle={t('profile.subtitle')} />

      {/* Avatar card */}
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-2xl p-6 mb-6 flex items-center gap-5"
      >
        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${roleColors[user?.role] || 'from-sky-500 to-blue-700'} flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0`}
        >
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{user?.name}</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
          <span
            className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          >
            {user?.role?.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Edit form */}
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-2xl p-6"
      >
        <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>
          {t('profile.update_details')}
        </h3>
        <form onSubmit={handleSave} className="space-y-4">
          {msg && (
            <div
              className={`px-4 py-3 rounded-xl text-sm border ${
                msg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {msg.text}
            </div>
          )}
          <Input label={t('profile.full_name')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label={t('profile.email')} value={user?.email} disabled className="opacity-50 cursor-not-allowed" />
          <hr style={{ borderColor: 'var(--border)' }} />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('profile.change_password')}</p>
          <Input label={t('profile.current_password')} type="password" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} placeholder="••••••••" />
          <Input label={t('profile.new_password')} type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} placeholder="••••••••" />
          <div className="pt-2">
            <Btn type="submit" disabled={saving}>
              {saving ? t('profile.saving') : t('profile.save_changes')}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}
