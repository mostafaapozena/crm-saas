'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Lock } from 'lucide-react'
import api from '../../../lib/api'
import Navbar from '../../../components/Navbar'
import { Spinner } from '../../../components/ui'
import { useLocale } from '../../../hooks/useLocale'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

function getPeriods(count = 6) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

const CATEGORIES = ['rent', 'utilities', 'insurance', 'software', 'equipment', 'other']
const RECURRENCES = ['monthly', 'quarterly', 'annually', 'one-time']

const CATEGORY_COLORS = {
  rent: '#004AFF', utilities: '#10b981', insurance: '#f59e0b',
  software: '#8b5cf6', equipment: '#ef4444', other: '#64748b',
}

export default function FixedCostsPage() {
  const { t } = useLocale()
  const periods = getPeriods(6)
  const [period, setPeriod] = useState(periods[periods.length - 1])
  const [data, setData] = useState({ costs: [], total: 0 })
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', category: 'rent', amount: '', recurrence: 'monthly', period: '', notes: '', business_unit_id: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/fixed-costs?period=${period}`),
      api.get('/business-units'),
    ]).then(([fc, bu]) => {
      setData(fc.data)
      setUnits(bu.data)
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [period])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', category: 'rent', amount: '', recurrence: 'monthly', period, notes: '', business_unit_id: '' })
    setShowForm(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ title: c.title, category: c.category, amount: c.amount, recurrence: c.recurrence, period: c.period, notes: c.notes || '', business_unit_id: c.business_unit_id || '' })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, amount: parseFloat(form.amount), business_unit_id: form.business_unit_id || null }
      if (editing) await api.put(`/fixed-costs/${editing.id}`, payload)
      else await api.post('/fixed-costs', payload)
      setShowForm(false)
      load()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('finance.delete_fixed_cost_confirm'))) return
    await api.delete(`/fixed-costs/${id}`)
    load()
  }

  return (
    <div>
      <Navbar title={t('nav.fixed_costs')} subtitle={t('finance.fixed_costs_subtitle')}
        action={
          <div className="flex items-center gap-2">
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#004AFF', color: '#fff' }}>
              <Plus size={16} /> {t('finance.add_cost')}
            </button>
          </div>
        }
      />

      {/* Total Card */}
      <div className="mb-6 rounded-2xl border p-5 flex items-center gap-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Lock size={24} className="text-amber-400" />
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('finance.total_fixed_costs_period', { period })}</p>
          <p className="text-3xl font-black" style={{ color: '#f59e0b' }}>{fmt(data.total)}</p>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {data.costs.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Lock size={32} className="text-slate-600" />
              <p className="text-slate-500 text-sm">{t('finance.no_fixed_costs')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {[t('common.name'), t('procurement.category'), t('common.amount'), t('finance.recurrence'), t('finance.business_unit_col'), t('common.notes'), ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.costs.map(c => (
                  <tr key={c.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text)' }}>{c.title}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                        style={{ background: `${CATEGORY_COLORS[c.category] || '#64748b'}20`, color: CATEGORY_COLORS[c.category] || '#64748b' }}>
                        {c.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-amber-400">{fmt(c.amount)}</td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{c.recurrence}</td>
                    <td className="px-4 py-3 text-slate-400">{c.businessUnit?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{c.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(c)} className="text-slate-500 hover:text-blue-400 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(c.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-bold mb-5" style={{ color: 'var(--text)' }}>{editing ? t('finance.edit_fixed_cost') : t('finance.add_fixed_cost')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('common.name')}</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Office Rent" required
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              {[
                { label: t('procurement.category'), field: 'category', options: CATEGORIES },
                { label: t('finance.recurrence'), field: 'recurrence', options: RECURRENCES },
              ].map(({ label, field, options }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
                  <select value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm capitalize"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('common.amount')}</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00" required
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('common.period')}</label>
                <input type="text" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                  placeholder="YYYY-MM" required
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('finance.business_unit_col')}</label>
                <select value={form.business_unit_id} onChange={e => setForm(f => ({ ...f, business_unit_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  <option value="">— {t('common.all')} —</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('common.notes')}</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-slate-400"
                  style={{ border: '1px solid var(--border)' }}>{t('common.cancel')}</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: '#004AFF', color: '#fff' }}>
                  {saving ? t('common.saving') : editing ? t('common.update') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
