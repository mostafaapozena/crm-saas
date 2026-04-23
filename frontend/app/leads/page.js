'use client'
import { useEffect, useState } from 'react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Badge, Modal, Input, Select, Btn, Empty, Spinner } from '../../components/ui'
import { useLocale } from '../../hooks/useLocale'

const STAGES = ['LEAD', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']
const SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Event', 'Other']
const EMPTY_FORM = { name: '', phone: '', email: '', source: '', stage: 'LEAD', deal_value: '', probability: '' }

const fmt = (n) => n ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(n) : '—'

export default function LeadsPage() {
  const { t } = useLocale()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [pagination, setPagination] = useState({})

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (stageFilter) params.stage = stageFilter
      const { data } = await api.get('/leads', { params })
      setLeads(data.leads)
      setPagination(data.pagination)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLeads() }, [search, stageFilter])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (lead) => {
    setEditing(lead)
    setForm({ name: lead.name, phone: lead.phone || '', email: lead.email || '', source: lead.source || '', stage: lead.stage, deal_value: lead.deal_value || '', probability: lead.probability || '' })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) await api.put(`/leads/${editing.id}`, form)
      else await api.post('/leads', form)
      setModalOpen(false)
      fetchLeads()
    } catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('leads.delete_confirm'))) return
    try { await api.delete(`/leads/${id}`); fetchLeads() }
    catch (err) { alert(err.response?.data?.error || t('errors.delete_error')) }
  }

  const HEADERS = [t('common.name'), t('leads.contact'), t('leads.source_label'), t('common.status'), t('leads.deal_value'), t('leads.probability_label'), t('common.actions')]

  return (
    <div>
      <Navbar title={t('leads.title')} subtitle={`${pagination.total ?? 0} ${t('leads.subtitle')}`}
        action={<Btn onClick={openCreate}>{t('leads.new_lead')}</Btn>}
      />

      <div className="flex gap-3 mb-6">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('leads.search')}
          className="flex-1 bg-[#111827] border border-slate-800 rounded-xl px-4 py-2.5 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
          style={{ color: 'var(--text)' }}
        />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="bg-[#111827] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-sky-500 text-sm">
          <option value="">{t('leads.all_stages')}</option>
          {STAGES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
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
                <tr><td colSpan={7}><Spinner /></td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={7}><Empty message={t('leads.no_leads')} /></td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-800/30 transition group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {lead.name[0]}
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-300">{lead.email || '—'}</p>
                    <p className="text-xs text-slate-500">{lead.phone || '—'}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-400">{lead.source || '—'}</td>
                  <td className="px-5 py-4"><Badge value={lead.stage} /></td>
                  <td className="px-5 py-4 text-sm font-medium text-emerald-400">{fmt(lead.deal_value)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 rounded-full h-1.5 w-16">
                        <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${lead.probability || 0}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{lead.probability || 0}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEdit(lead)} className="text-slate-400 hover:text-sky-400 transition text-xs">{t('common.edit')}</button>
                      <button onClick={() => handleDelete(lead.id)} className="text-slate-400 hover:text-red-400 transition text-xs">{t('common.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('leads.edit_lead') : t('leads.new_lead')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={t('leads.full_name')} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder={t('leads.name_ph')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('leads.email')} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder={t('leads.email_ph')} />
            <Input label={t('leads.phone')} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder={t('leads.phone_ph')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('leads.source_label')} value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
              <option value="">{t('leads.select_source')}</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select label={t('leads.stage_label')} value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}>
              {STAGES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('leads.deal_value_label')} type="number" value={form.deal_value} onChange={e => setForm({...form, deal_value: e.target.value})} placeholder={t('leads.deal_ph')} />
            <Input label={t('leads.probability_label')} type="number" min="0" max="100" value={form.probability} onChange={e => setForm({...form, probability: e.target.value})} placeholder="60" />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? t('common.saving') : editing ? t('leads.update_lead') : t('leads.create_lead')}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
