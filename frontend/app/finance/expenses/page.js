'use client'
import { useEffect, useState } from 'react'
import api from '../../../lib/api'
import Navbar from '../../../components/Navbar'
import { Modal, Input, Select, Btn, Empty, Spinner } from '../../../components/ui'
import { Megaphone, Store, User, Wrench, Plane, Zap, Package, X } from 'lucide-react'
import { fmtDate } from '../../../lib/utils'
import { useLocale } from '../../../hooks/useLocale'

const CATEGORIES = ['ADS', 'VENDOR', 'SALARY', 'TOOLS', 'TRAVEL', 'UTILITIES', 'OTHER']
const CAT_CFG = {
  ADS:       { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b', icon: <Megaphone size={14} className="inline mr-1 mb-[2px]" /> },
  VENDOR:    { bg: 'rgba(139,92,246,0.15)',   text: '#8b5cf6', icon: <Store size={14} className="inline mr-1 mb-[2px]" /> },
  SALARY:    { bg: 'rgba(239,68,68,0.15)',    text: '#ef4444', icon: <User size={14} className="inline mr-1 mb-[2px]" /> },
  TOOLS:     { bg: 'rgba(6,182,212,0.15)',    text: '#06b6d4', icon: <Wrench size={14} className="inline mr-1 mb-[2px]" /> },
  TRAVEL:    { bg: 'rgba(16,185,129,0.15)',   text: '#10b981', icon: <Plane size={14} className="inline mr-1 mb-[2px]" /> },
  UTILITIES: { bg: 'rgba(100,116,139,0.15)', text: '#64748b', icon: <Zap size={14} className="inline mr-1 mb-[2px]" /> },
  OTHER:     { bg: 'rgba(51,65,85,0.4)',      text: '#475569', icon: <Package size={14} className="inline mr-1 mb-[2px]" /> },
}
const fmtMoney = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
const EMPTY = { title: '', category: 'OTHER', amount: '', project_id: '', date: '', notes: '' }

export default function ExpensesPage() {
  const { t } = useLocale()
  const [expenses, setExpenses] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [catFilter, setCatFilter] = useState('')
  const [pagination, setPagination] = useState({})
  const [totalAmount, setTotalAmount] = useState(0)

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const params = {}
      if (catFilter) params.category = catFilter
      const { data } = await api.get('/expenses', { params })
      setExpenses(data.expenses); setPagination(data.pagination); setTotalAmount(data.totalAmount || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchProjects = async () => {
    const { data } = await api.get('/projects?limit=100').catch(() => ({ data: { projects: [] } }))
    setProjects(data.projects)
  }

  useEffect(() => { fetchExpenses() }, [catFilter])
  useEffect(() => { fetchProjects() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit   = (e) => {
    setEditing(e)
    setForm({ title: e.title, category: e.category, amount: e.amount, project_id: e.project_id || '', date: e.date?.split('T')[0] || '', notes: e.notes || '' })
    setModalOpen(true)
  }

  const handleSave = async (ev) => {
    ev.preventDefault(); setSaving(true)
    try {
      if (editing) await api.put(`/expenses/${editing.id}`, form)
      else await api.post('/expenses', form)
      setModalOpen(false); fetchExpenses()
    } catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('finance.delete_expense_confirm'))) return
    try { await api.delete(`/expenses/${id}`); fetchExpenses() }
    catch (err) { alert(err.response?.data?.error || t('errors.delete_error')) }
  }

  const catTotals = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + parseFloat(e.amount || 0), 0),
  })).filter(c => c.total > 0)

  return (
    <div>
      <Navbar title={t('finance.expenses_title')} subtitle={`${pagination.total ?? 0} ${t('finance.entries')} · ${fmtMoney(totalAmount)} ${t('common.total')}`}
        action={<button onClick={openCreate} className="px-4 py-2.5 rounded-xl text-white text-sm font-bold"
          style={{ background: '#004AFF' }}>{t('finance.add_expense')}</button>}
      />

      {/* Category breakdown */}
      {catTotals.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {catTotals.map(c => {
            const cfg = CAT_CFG[c.cat]
            return (
              <button key={c.cat} onClick={() => setCatFilter(catFilter === c.cat ? '' : c.cat)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 transition border"
                style={{
                  background: catFilter === c.cat ? cfg.bg : 'rgba(26,32,53,0.5)',
                  color: cfg.text,
                  borderColor: catFilter === c.cat ? cfg.text : '#334155',
                }}>
                {cfg.icon} {t(`finance.cat_${c.cat.toLowerCase()}`)} <span className="font-bold">{fmtMoney(c.total)}</span>
              </button>
            )
          })}
          {catFilter && (
            <button onClick={() => setCatFilter('')} className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition border flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
              {t('tasks.clear')} <X size={12} className="inline-block" />
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[t('common.name'), t('procurement.category'), t('nav.projects'), t('common.amount'), t('common.date'), t('finance.added_by'), t('common.actions')].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><Spinner /></td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={7}><Empty message={t('finance.no_expenses')} /></td></tr>
            ) : expenses.map(exp => {
              const cfg = CAT_CFG[exp.category] || CAT_CFG.OTHER
              return (
                <tr key={exp.id} className="group hover:bg-white/5 transition" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{exp.title}</p>
                    {exp.notes && <p className="text-xs text-slate-500 truncate max-w-[160px]">{exp.notes}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: cfg.bg, color: cfg.text }}>
                      {cfg.icon} {t(`finance.cat_${exp.category.toLowerCase()}`)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-400">{exp.project?.title || '—'}</td>
                  <td className="px-5 py-3.5 text-sm font-bold text-red-400">−{fmtMoney(exp.amount)}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-400">{fmtDate(exp.date)}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-400">{exp.creator?.name || '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEdit(exp)} className="text-xs" style={{ color: '#004AFF' }}>{t('common.edit')}</button>
                      <button onClick={() => handleDelete(exp.id)} className="text-xs text-red-400">{t('common.delete')}</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('finance.edit_expense') : t('finance.add_expense')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={`${t('common.name')} *`} value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="Google Ads — April" />
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('procurement.category')} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {CATEGORIES.map(c => <option key={c} value={c}>{t(`finance.cat_${c.toLowerCase()}`)}</option>)}
            </Select>
            <Input label={`${t('common.amount')} ($) *`} type="number" step="0.01" value={form.amount}
              onChange={e => setForm({...form, amount: e.target.value})} required placeholder="1200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('finance.project_optional_label')} value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}>
              <option value="">{t('finance.no_project')}</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
            <Input label={t('common.date')} type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('common.notes')}</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? t('common.saving') : editing ? t('common.update') : t('finance.add_expense')}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
