'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Modal, Input, Select, Btn, Empty, Spinner } from '../../components/ui'
import { fmtCurrency, fmtDate } from '../../lib/utils'
import { useLocale } from '../../hooks/useLocale'

const STATUSES = ['PLANNING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ON_HOLD']
const TYPES = ['ICT', 'MARKETING_CAMPAIGN', 'HYBRID']
const EMPTY_FORM = { title: '', description: '', client_id: '', deal_id: '', type: 'ICT', status: 'PLANNING', budget: '', progress_percentage: 0, start_date: '', end_date: '' }

const STATUS_COLORS = {
  PLANNING: 'bg-slate-500/20 text-slate-400',
  IN_PROGRESS: 'bg-sky-500/20 text-sky-400',
  REVIEW: 'bg-amber-500/20 text-amber-400',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400',
  ON_HOLD: 'bg-orange-500/20 text-orange-400',
}

const TYPE_COLORS = {
  ICT: 'bg-violet-500/20 text-violet-400',
  MARKETING_CAMPAIGN: 'bg-pink-500/20 text-pink-400',
  HYBRID: 'bg-cyan-500/20 text-cyan-400',
}

function ProgressBar({ value }) {
  const color = value >= 100 ? 'bg-emerald-500' : value >= 60 ? 'bg-sky-500' : value >= 30 ? 'bg-amber-500' : 'bg-slate-600'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{value}%</span>
    </div>
  )
}

export default function ProjectsPage() {
  const { t } = useLocale()
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [pagination, setPagination] = useState({})

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      const { data } = await api.get('/projects', { params })
      setProjects(data.projects)
      setPagination(data.pagination)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchOptions = async () => {
    const [c, d] = await Promise.all([
      api.get('/clients?limit=100').catch(() => ({ data: { clients: [] } })),
      api.get('/deals?limit=100').catch(() => ({ data: { deals: [] } })),
    ])
    setClients(c.data.clients)
    setDeals(d.data.deals)
  }

  useEffect(() => { fetchProjects() }, [statusFilter, typeFilter])
  useEffect(() => { fetchOptions() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({
      title: p.title, description: p.description || '',
      client_id: p.client_id || '', deal_id: p.deal_id || '',
      type: p.type, status: p.status, budget: p.budget || '',
      progress_percentage: p.progress_percentage,
      start_date: p.start_date ? p.start_date.split('T')[0] : '',
      end_date: p.end_date ? p.end_date.split('T')[0] : '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) await api.put(`/projects/${editing.id}`, form)
      else await api.post('/projects', form)
      setModalOpen(false); fetchProjects()
    } catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('projects.delete_confirm'))) return
    try { await api.delete(`/projects/${id}`); fetchProjects() }
    catch (err) { alert(err.response?.data?.error || t('errors.delete_error')) }
  }

  return (
    <div>
      <Navbar title={t('projects.title')} subtitle={`${pagination.total ?? 0} ${t('projects.subtitle')}`}
        action={<Btn onClick={openCreate}>{t('projects.new_project')}</Btn>}
      />

      <div className="flex gap-3 mb-6 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#111827] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-sky-500 text-sm">
          <option value="">{t('projects.all_statuses')}</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-[#111827] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-sky-500 text-sm">
          <option value="">{t('projects.all_types')}</option>
          {TYPES.map(tp => <option key={tp} value={tp}>{tp.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : projects.length === 0 ? <Empty message={t('projects.no_projects')} /> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map(proj => (
            <div key={proj.id} className="bg-[#111827] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/projects/${proj.id}`} className="text-sm font-semibold hover:text-sky-400 transition line-clamp-1" style={{ color: 'var(--text)' }}>
                    {proj.title}
                  </Link>
                  {proj.client && <p className="text-xs text-slate-500 mt-0.5">{proj.client.company || proj.client.name}</p>}
                </div>
                <div className="flex gap-1.5 ml-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${TYPE_COLORS[proj.type]}`}>
                    {proj.type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs px-2.5 py-0.5 rounded-lg font-medium ${STATUS_COLORS[proj.status]}`}>
                  {proj.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-500">
                  {proj.tasks?.length || 0} {t('projects.tasks_suffix')}
                </span>
              </div>

              <div className="mb-4">
                <ProgressBar value={proj.progress_percentage} />
              </div>

              <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="text-slate-500">
                  {proj.budget ? fmtCurrency(proj.budget, false) : '—'}
                </div>
                <div className="text-slate-500">
                  {proj.end_date ? `${t('projects.due')} ${fmtDate(proj.end_date)}` : t('projects.no_deadline')}
                </div>
              </div>

              <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition">
                <Link href={`/projects/${proj.id}`}
                  className="flex-1 text-center text-xs py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
                  {t('common.details')}
                </Link>
                <button onClick={() => openEdit(proj)}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
                  {t('common.edit')}
                </button>
                <button onClick={() => handleDelete(proj.id)}
                  className="text-xs py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition">
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('projects.edit_project') : t('projects.new_project')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={t('projects.title_label')} value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder={t('projects.title_ph')} />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('common.description')}</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              rows={3} placeholder={t('projects.desc_ph')}
              className="w-full bg-[#1a2035] border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('common.type')} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              {TYPES.map(tp => <option key={tp} value={tp}>{tp.replace('_', ' ')}</option>)}
            </Select>
            <Select label={t('common.status')} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('common.company')} value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}>
              <option value="">{t('projects.no_client')}</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label={t('projects.deal_label')} value={form.deal_id} onChange={e => setForm({...form, deal_id: e.target.value})}>
              <option value="">{t('projects.no_deal')}</option>
              {deals.map(d => <option key={d.id} value={d.id}>{d.lead?.name || `Deal #${d.id}`}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('projects.budget_label')} type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} placeholder="50000" />
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('projects.progress')} ({form.progress_percentage}%)</label>
              <input type="range" min="0" max="100" value={form.progress_percentage}
                onChange={e => setForm({...form, progress_percentage: parseInt(e.target.value)})}
                className="w-full accent-sky-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('projects.start_date')} type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
            <Input label={t('projects.end_date')} type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? t('common.saving') : editing ? t('projects.update_project') : t('projects.create_project')}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
