'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Building2, CheckCircle, XCircle } from 'lucide-react'
import api from '../../../lib/api'
import Navbar from '../../../components/Navbar'
import { Spinner } from '../../../components/ui'
import { useLocale } from '../../../hooks/useLocale'

export default function BusinessUnitsPage() {
  const { t } = useLocale()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', description: '', is_active: true })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/business-units').then(r => setUnits(r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', code: '', description: '', is_active: true })
    setShowForm(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({ name: u.name, code: u.code, description: u.description || '', is_active: u.is_active })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) await api.put(`/business-units/${editing.id}`, form)
      else await api.post('/business-units', form)
      setShowForm(false)
      load()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('finance.delete_unit_confirm'))) return
    await api.delete(`/business-units/${id}`)
    load()
  }

  return (
    <div>
      <Navbar title={t('nav.business_units')} subtitle={t('finance.business_units_subtitle')}
        action={
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#004AFF', color: '#fff' }}>
            <Plus size={16} /> {t('finance.new_unit')}
          </button>
        }
      />

      {loading ? <Spinner /> : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {units.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Building2 size={32} className="text-slate-600" />
              <p className="text-slate-500 text-sm">{t('finance.no_units')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {[t('common.name'), t('finance.code_col'), t('common.description'), t('common.status'), t('nav.fixed_costs'), t('finance.rules_col'), ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {units.map(u => (
                  <tr key={u.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text)' }}>{u.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                        style={{ background: 'rgba(0,74,255,0.15)', color: '#004AFF' }}>{u.code}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{u.description || '—'}</td>
                    <td className="px-4 py-3">
                      {u.is_active
                        ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={12} /> {t('common.active')}</span>
                        : <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={12} /> {t('common.inactive')}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 tabular-nums">{u._count?.fixedCosts ?? 0}</td>
                    <td className="px-4 py-3 text-slate-400 tabular-nums">{u._count?.allocationRules ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(u)} className="text-slate-500 hover:text-blue-400 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(u.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
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
            <h2 className="text-base font-bold mb-5" style={{ color: 'var(--text)' }}>{editing ? t('finance.edit_unit') : t('finance.new_unit_modal')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: t('common.name'), field: 'name', placeholder: 'e.g. Marketing Department' },
                { label: t('finance.code_col'), field: 'code', placeholder: 'e.g. MKT' },
                { label: t('common.description'), field: 'description', placeholder: '' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
                  <input type="text" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder} required={field !== 'description'}
                    className="w-full px-3 py-2 rounded-xl text-sm"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
              ))}
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
