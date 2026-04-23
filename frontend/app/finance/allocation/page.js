'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Play, Percent, Layers } from 'lucide-react'
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

export default function AllocationPage() {
  const { t } = useLocale()
  const periods = getPeriods(6)
  const [tab, setTab] = useState('rules')
  const [period, setPeriod] = useState(periods[periods.length - 1])
  const [rules, setRules] = useState([])
  const [entries, setEntries] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', source_category: '', business_unit_id: '', allocation_type: 'percentage', value: '', is_active: true })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/cost-allocation/rules'),
      api.get(`/cost-allocation/entries?period=${period}`),
      api.get('/business-units'),
    ]).then(([r, e, u]) => {
      setRules(r.data)
      setEntries(e.data)
      setUnits(u.data)
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [period])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', source_category: '', business_unit_id: units[0]?.id || '', allocation_type: 'percentage', value: '', is_active: true })
    setShowForm(true)
  }

  const openEdit = (r) => {
    setEditing(r)
    setForm({ name: r.name, source_category: r.source_category, business_unit_id: r.business_unit_id, allocation_type: r.allocation_type, value: r.value, is_active: r.is_active })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, value: parseFloat(form.value) }
      if (editing) await api.put(`/cost-allocation/rules/${editing.id}`, payload)
      else await api.post('/cost-allocation/rules', payload)
      setShowForm(false)
      load()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDeleteRule = async (id) => {
    if (!confirm(t('finance.delete_rule_confirm'))) return
    await api.delete(`/cost-allocation/rules/${id}`)
    load()
  }

  const handleRun = async () => {
    setRunning(true)
    try {
      const r = await api.post('/cost-allocation/run', { period })
      alert(t('finance.allocation_complete', { count: r.data.count || 0 }))
      load()
    } catch (err) { console.error(err) }
    finally { setRunning(false) }
  }

  return (
    <div>
      <Navbar title={t('nav.allocation')} subtitle={t('finance.allocation_subtitle')}
        action={
          <div className="flex items-center gap-2">
            {tab === 'entries' && (
              <select value={period} onChange={e => setPeriod(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {periods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {tab === 'rules' && (
              <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                <Plus size={14} /> {t('finance.add_rule')}
              </button>
            )}
            <button onClick={handleRun} disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#004AFF', color: '#fff' }}>
              <Play size={14} /> {running ? t('finance.running') : t('finance.run_allocation')}
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {[{ id: 'rules', label: t('finance.allocation_rules_tab'), Icon: Percent }, { id: 'entries', label: t('finance.allocation_history_tab'), Icon: Layers }].map(tabItem => (
          <button key={tabItem.id} onClick={() => setTab(tabItem.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === tabItem.id
              ? { background: '#004AFF', color: '#fff' }
              : { color: 'var(--text-secondary)' }}>
            <tabItem.Icon size={14} /> {tabItem.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : tab === 'rules' ? (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {rules.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Percent size={32} className="text-slate-600" />
              <p className="text-slate-500 text-sm">{t('finance.no_rules')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {[t('common.name'), t('finance.source_category'), t('finance.business_unit_col'), t('common.type'), t('common.amount'), t('common.status'), ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text)' }}>{r.name}</td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{r.source_category}</td>
                    <td className="px-4 py-3 text-slate-300">{r.businessUnit?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
                        style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>{r.allocation_type}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-purple-400">
                      {r.allocation_type === 'percentage' ? `${r.value}%` : fmt(r.value)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${r.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {r.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)} className="text-slate-500 hover:text-blue-400 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDeleteRule(r.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Layers size={32} className="text-slate-600" />
              <p className="text-slate-500 text-sm">{t('finance.no_allocation_entries')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {[t('finance.business_unit_col'), t('finance.rule_col'), t('finance.allocated_amount'), t('common.notes')].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text)' }}>{e.businessUnit?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{e.rule?.name || '—'}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-purple-400">{fmt(e.allocated_amount)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{e.notes || '—'}</td>
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
            <h2 className="text-base font-bold mb-5" style={{ color: 'var(--text)' }}>{editing ? t('finance.edit_rule') : t('finance.new_rule_modal')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: t('finance.rule_name'), field: 'name', placeholder: 'e.g. Marketing Share' },
                { label: t('finance.source_category'), field: 'source_category', placeholder: 'e.g. operating, payroll, fixed' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
                  <input type="text" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder} required
                    className="w-full px-3 py-2 rounded-xl text-sm"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('finance.business_unit_col')}</label>
                <select value={form.business_unit_id} onChange={e => setForm(f => ({ ...f, business_unit_id: e.target.value }))}
                  required className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  <option value="">— {t('common.all')} —</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('finance.allocation_type_label')}</label>
                <select value={form.allocation_type} onChange={e => setForm(f => ({ ...f, allocation_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  <option value="percentage">{t('finance.percentage')}</option>
                  <option value="fixed">{t('finance.fixed_amount')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {form.allocation_type === 'percentage' ? `${t('common.amount')} (%)` : `${t('common.amount')} ($)`}
                </label>
                <input type="number" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={form.allocation_type === 'percentage' ? '25' : '500'} required
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                <span className="text-sm text-slate-300">{t('common.active')}</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-slate-400"
                  style={{ border: '1px solid var(--border)' }}>{t('common.cancel')}</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: '#004AFF', color: '#fff' }}>
                  {saving ? t('common.saving') : editing ? t('common.update') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
