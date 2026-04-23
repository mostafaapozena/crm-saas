'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import api from '../../lib/api'
import { setToken, setUser } from '../../lib/auth'
import { useLocale } from '../../hooks/useLocale'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const { data } = await api.post('/auth/login', form)
      setToken(data.token); setUser(data.user)
      router.push('/dashboard')
    } catch (err) { setError(err.response?.data?.error || t('errors.login_failed')) }
    finally { setLoading(false) }
  }

  const demos = [
    { label: 'Super Admin', email: 'admin@crm.com', password: 'Admin@123', color: '#004AFF' },
    { label: 'Sales Rep', email: 'sales@crm.com', password: 'Sales@123', color: '#0284c7' },
    { label: 'Project Manager', email: 'pm@crm.com', password: 'PM@123', color: '#7c3aed' },
    { label: 'Engineer', email: 'eng@crm.com', password: 'Eng@123', color: '#059669' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <Image src="/logo.png" alt="CAI2RUS" width={200} height={56} className="object-contain" priority />
        </div>

        <div className="rounded-2xl border p-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>{t('auth.sign_in_heading')}</h2>
          <p className="text-sm text-slate-400 mb-6">{t('auth.business_os')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t('auth.email_label')}</label>
              <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                placeholder={t('auth.email_placeholder')}
                className="w-full rounded-xl px-4 py-3 text-sm placeholder-slate-500 focus:outline-none transition"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onFocus={e => e.target.style.borderColor = '#004AFF'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t('auth.password_label')}</label>
              <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm placeholder-slate-500 focus:outline-none transition"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onFocus={e => e.target.style.borderColor = '#004AFF'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #004AFF, #0035cc)', boxShadow: '0 4px 20px rgba(0,74,255,0.3)' }}>
              {loading ? t('auth.signing_in') : t('auth.sign_in_btn')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs text-slate-500 mb-3 text-center">{t('auth.demo_login')}</p>
            <div className="grid grid-cols-2 gap-2">
              {demos.map(d => (
                <button key={d.email} onClick={() => setForm({ email: d.email, password: d.password })}
                  className="text-left px-3 py-2 rounded-lg text-xs transition hover:opacity-80"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <span className="block font-semibold mb-0.5" style={{ color: d.color }}>{d.label}</span>
                  <span className="text-slate-500">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
