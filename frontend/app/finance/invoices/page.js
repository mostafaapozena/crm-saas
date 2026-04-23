'use client'
import { useEffect, useState } from 'react'
import api from '../../../lib/api'
import Navbar from '../../../components/Navbar'
import { Modal, Input, Select, Btn, Empty, Spinner } from '../../../components/ui'
import { AlertTriangle } from 'lucide-react'
import { fmtDate } from '../../../lib/utils'
import { useLocale } from '../../../hooks/useLocale'

const STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']
const fmtMoney = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
const STATUS_CFG = {
  DRAFT:     { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' },
  SENT:      { bg: 'rgba(0,74,255,0.15)',    text: '#004AFF' },
  PAID:      { bg: 'rgba(16,185,129,0.15)',  text: '#10b981' },
  OVERDUE:   { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444' },
  CANCELLED: { bg: 'rgba(51,65,85,0.4)',     text: '#475569' },
}

const EMPTY = { client_id: '', project_id: '', deal_id: '', amount: '', tax: '0', status: 'DRAFT', issued_date: '', due_date: '', notes: '' }

export default function InvoicesPage() {
  const { t } = useLocale()
  const [invoices, setInvoices]   = useState([])
  const [clients, setClients]     = useState([])
  const [projects, setProjects]   = useState([])
  const [deals, setDeals]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination]     = useState({})

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/invoices', { params })
      setInvoices(data.invoices); setPagination(data.pagination)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchOptions = async () => {
    const [c, p, d] = await Promise.all([
      api.get('/clients?limit=100').catch(() => ({ data: { clients: [] } })),
      api.get('/projects?limit=100').catch(() => ({ data: { projects: [] } })),
      api.get('/deals?limit=100').catch(() => ({ data: { deals: [] } })),
    ])
    setClients(c.data.clients); setProjects(p.data.projects); setDeals(d.data.deals)
  }

  useEffect(() => { fetchInvoices() }, [statusFilter])
  useEffect(() => { fetchOptions() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit   = (inv) => {
    setEditing(inv)
    setForm({
      client_id: inv.client_id, project_id: inv.project_id || '',
      deal_id: inv.deal_id || '', amount: inv.amount, tax: inv.tax,
      status: inv.status,
      issued_date: inv.issued_date?.split('T')[0] || '',
      due_date: inv.due_date?.split('T')[0] || '',
      notes: inv.notes || '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) await api.put(`/invoices/${editing.id}`, form)
      else await api.post('/invoices', form)
      setModalOpen(false); fetchInvoices()
    } catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('finance.delete_invoice_confirm'))) return
    try { await api.delete(`/invoices/${id}`); fetchInvoices() }
    catch (err) { alert(err.response?.data?.error || t('errors.delete_error')) }
  }

  const quickStatus = async (id, status) => {
    try { await api.put(`/invoices/${id}`, { status }); fetchInvoices() }
    catch (e) { console.error(e) }
  }

  const totalValue = invoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)
  const paidValue  = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)

  return (
    <div>
      <Navbar title={t('finance.invoices_title')} subtitle={`${pagination.total ?? 0} ${t('finance.invoices_suffix')}`}
        action={<button onClick={openCreate} className="px-4 py-2.5 rounded-xl text-white text-sm font-bold transition"
          style={{ background: '#004AFF' }}>{t('finance.new_invoice')}</button>}
      />

      {/* Summary pills */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { label: t('finance.total_invoiced'), val: fmtMoney(totalValue), color: '#004AFF' },
          { label: t('finance.collected'), val: fmtMoney(paidValue), color: '#10b981' },
          { label: t('finance.outstanding'), val: fmtMoney(totalValue - paidValue), color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-400">{s.label}:</span>
            <span className="font-bold" style={{ color: 'var(--text)' }}>{s.val}</span>
          </div>
        ))}

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="ml-auto px-4 py-2.5 rounded-xl text-slate-300 text-sm focus:outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <option value="">{t('deals.all_statuses')}</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[t('finance.invoice_num'), t('clients.title'), t('nav.projects'), t('common.amount'), t('finance.tax'), t('common.total'), t('common.status'), t('finance.due_date'), t('common.actions')].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><Spinner /></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={9}><Empty message={t('finance.no_invoices')} /></td></tr>
              ) : invoices.map(inv => {
                const sc = STATUS_CFG[inv.status] || STATUS_CFG.DRAFT
                const isOverdue = inv.status !== 'PAID' && inv.due_date && new Date(inv.due_date) < new Date()
                return (
                  <tr key={inv.id} className="group transition hover:bg-white/5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-mono font-semibold" style={{ color: '#004AFF' }}>{inv.invoice_number}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{inv.client?.company || inv.client?.name}</p>
                      <p className="text-xs text-slate-500">{inv.client?.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{inv.project?.title || '—'}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text)' }}>{fmtMoney(inv.amount)}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{parseFloat(inv.tax || 0)}%</td>
                    <td className="px-5 py-3.5 text-sm font-bold" style={{ color: 'var(--text)' }}>{fmtMoney(inv.total_amount)}</td>
                    <td className="px-5 py-3.5">
                      <select value={inv.status} onChange={e => quickStatus(inv.id, e.target.value)}
                        className="text-xs px-2.5 py-1 rounded-lg cursor-pointer focus:outline-none font-semibold"
                        style={{ background: sc.bg, color: sc.text, border: 'none' }}>
                        {STATUSES.map(s => <option key={s} value={s} className="bg-slate-800 text-white">{s}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm flex items-center ${isOverdue ? 'font-semibold' : ''}`}
                        style={{ color: isOverdue ? '#ef4444' : '#94a3b8' }}>
                        {isOverdue && <AlertTriangle size={14} className="mr-1" />}
                        {fmtDate(inv.due_date)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => openEdit(inv)} className="text-xs hover:opacity-80" style={{ color: '#004AFF' }}>{t('common.edit')}</button>
                        <button onClick={() => handleDelete(inv.id)} className="text-xs text-red-400 hover:text-red-300">{t('common.delete')}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('finance.edit_invoice') : t('finance.new_invoice_modal')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Select label={`${t('clients.title')} *`} value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} required>
            <option value="">{t('marketing.select_client')}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('nav.projects')} value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}>
              <option value="">{t('finance.no_project')}</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
            <Select label={t('nav.deals')} value={form.deal_id} onChange={e => setForm({...form, deal_id: e.target.value})}>
              <option value="">{t('deals.no_client')}</option>
              {deals.map(d => <option key={d.id} value={d.id}>{d.lead?.name || `Deal #${d.id}`} — ${d.value || 0}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={`${t('common.amount')} ($) *`} type="number" step="0.01" value={form.amount}
              onChange={e => setForm({...form, amount: e.target.value})} required placeholder="5000" />
            <Input label={t('finance.tax')} type="number" step="0.01" min="0" max="100" value={form.tax}
              onChange={e => setForm({...form, tax: e.target.value})} placeholder="15" />
          </div>
          {form.amount && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(0,74,255,0.1)', color: '#93c5fd' }}>
              {t('common.total')}: {fmtMoney(parseFloat(form.amount || 0) * (1 + parseFloat(form.tax || 0) / 100))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('finance.issue_date')} type="date" value={form.issued_date} onChange={e => setForm({...form, issued_date: e.target.value})} />
            <Input label={t('finance.due_date')} type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
          </div>
          <Select label={t('common.status')} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('common.notes')}</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? t('common.saving') : editing ? t('finance.update_invoice') : t('finance.create_invoice')}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
