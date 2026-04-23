'use client'
import { useEffect, useState } from 'react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Badge, Modal, Input, Select, Btn, Empty, Spinner } from '../../components/ui'
import { useLocale } from '../../hooks/useLocale'

const STATUSES = ['ACTIVE', 'WON', 'LOST', 'ON_HOLD']
const EMPTY_FORM = { lead_id: '', client_id: '', value: '', status: 'ACTIVE', expected_close_date: '' }
const fmt = (n) => n ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default function DealsPage() {
  const { t } = useLocale()
  const [deals, setDeals] = useState([])
  const [leads, setLeads] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({})

  const fetchDeals = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/deals', { params })
      setDeals(data.deals)
      setPagination(data.pagination)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchOptions = async () => {
    const [l, c] = await Promise.all([
      api.get('/leads?limit=100').catch(() => ({ data: { leads: [] } })),
      api.get('/clients?limit=100').catch(() => ({ data: { clients: [] } })),
    ])
    setLeads(l.data.leads)
    setClients(c.data.clients)
  }

  useEffect(() => { fetchDeals(); fetchOptions() }, [statusFilter])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (d) => {
    setEditing(d)
    setForm({
      lead_id: d.lead_id || '', client_id: d.client_id || '', value: d.value || '',
      status: d.status, expected_close_date: d.expected_close_date ? d.expected_close_date.split('T')[0] : '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) await api.put(`/deals/${editing.id}`, form)
      else await api.post('/deals', form)
      setModalOpen(false); fetchDeals()
    } catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const totalPipeline = deals.filter(d => d.status === 'ACTIVE').reduce((s, d) => s + parseFloat(d.value || 0), 0)
  const totalWon = deals.filter(d => d.status === 'WON').reduce((s, d) => s + parseFloat(d.value || 0), 0)

  const HEADERS = [t('deals.lead'), t('deals.client'), t('deals.value'), t('common.status'), t('deals.close_date'), t('common.actions')]

  return (
    <div>
      <Navbar title={t('deals.title')} subtitle={`${pagination.total ?? 0} ${t('deals.subtitle')}`}
        action={<Btn onClick={openCreate}>{t('deals.new_deal')}</Btn>}
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: t('deals.active_pipeline'), value: fmt(totalPipeline), color: 'text-sky-400' },
          { label: t('deals.won_revenue'), value: fmt(totalWon), color: 'text-emerald-400' },
          { label: t('deals.total_deals'), value: deals.length, color: 'var(--text)' },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#111827] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-sky-500 text-sm">
          <option value="">{t('deals.all_statuses')}</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {HEADERS.map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={6}><Spinner /></td></tr>
              ) : deals.length === 0 ? (
                <tr><td colSpan={6}><Empty message={t('deals.no_deals')} /></td></tr>
              ) : deals.map(deal => (
                <tr key={deal.id} className="hover:bg-slate-800/30 transition group">
                  <td className="px-5 py-4 text-sm" style={{ color: 'var(--text)' }}>{deal.lead?.name || '—'}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm" style={{ color: 'var(--text)' }}>{deal.client?.name || '—'}</p>
                    {deal.client?.company && <p className="text-xs text-slate-500">{deal.client.company}</p>}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-emerald-400">{fmt(deal.value)}</td>
                  <td className="px-5 py-4"><Badge value={deal.status} /></td>
                  <td className="px-5 py-4 text-sm text-slate-400">{fmtDate(deal.expected_close_date)}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => openEdit(deal)}
                      className="text-slate-400 hover:text-sky-400 transition text-xs opacity-0 group-hover:opacity-100">{t('common.edit')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('deals.edit_deal') : t('deals.new_deal')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Select label={t('deals.lead')} value={form.lead_id} onChange={e => setForm({...form, lead_id: e.target.value})}>
            <option value="">{t('deals.no_lead')}</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Select label={t('deals.client')} value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}>
            <option value="">{t('deals.no_client')}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('deals.value_label')} type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="50000" />
            <Select label={t('common.status')} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </Select>
          </div>
          <Input label={t('deals.close_date')} type="date" value={form.expected_close_date} onChange={e => setForm({...form, expected_close_date: e.target.value})} />
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? t('common.saving') : editing ? t('deals.update_deal') : t('deals.create_deal')}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
