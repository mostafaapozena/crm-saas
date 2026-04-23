'use client'
import { useEffect, useState } from 'react'
import api from '../../../lib/api'
import Navbar from '../../../components/Navbar'
import { Modal, Input, Select, Btn, Empty, Spinner } from '../../../components/ui'
import { Hourglass, RefreshCw, CheckCircle, XCircle, Folder, Calendar } from 'lucide-react'
import { fmtDate } from '../../../lib/utils'
import { useLocale } from '../../../hooks/useLocale'

const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'MISSED']

const STATUS_CFG = {
  PENDING:     { bg: '#1e2640',              text: '#64748b', icon: <Hourglass size={16} className="inline mr-1 align-text-bottom" /> },
  IN_PROGRESS: { bg: 'rgba(0,74,255,0.12)',  text: '#004AFF', icon: <RefreshCw size={16} className="inline mr-1 align-text-bottom" /> },
  COMPLETED:   { bg: 'rgba(16,185,129,0.12)', text: '#10b981', icon: <CheckCircle size={16} className="inline mr-1 align-text-bottom" /> },
  MISSED:      { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', icon: <XCircle size={16} className="inline mr-1 align-text-bottom" /> },
}

const EMPTY = { title: '', description: '', project_id: '', status: 'PENDING', due_date: '' }

export default function MilestonesPage() {
  const { t } = useLocale()
  const [milestones, setMilestones] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setFilter] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const { data } = await api.get('/milestones', { params })
      setMilestones(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects?limit=100')
      setProjects(data.projects || [])
    } catch { setProjects([]) }
  }

  useEffect(() => { fetchData(); fetchProjects() }, [statusFilter])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (m) => {
    setEditing(m)
    setForm({ title: m.title, description: m.description || '', project_id: m.project_id || '', status: m.status, due_date: m.due_date ? m.due_date.split('T')[0] : '' })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) await api.put(`/milestones/${editing.id}`, form)
      else await api.post('/milestones', form)
      setModal(false); fetchData()
    } catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const quickComplete = async (id) => {
    try {
      await api.put(`/milestones/${id}`, { status: 'COMPLETED', completed_date: new Date().toISOString() })
      fetchData()
    } catch (e) { console.error(e) }
  }

  const isOverdue = (m) => m.status !== 'COMPLETED' && m.due_date && new Date(m.due_date) < new Date()

  return (
    <div>
      <Navbar
        title={t('milestones.title')}
        subtitle={`${milestones.length} ${t('milestones.subtitle')}`}
        action={
          <button onClick={openCreate} className="px-4 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: '#004AFF' }}>
            {t('milestones.new_milestone')}
          </button>
        }
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilter('')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={!statusFilter ? { background: '#004AFF', color: '#fff' } : { background: 'var(--surface)', color: 'var(--text-secondary)' }}>
          {t('common.all')}
        </button>
        {STATUSES.map((s) => {
          const cfg = STATUS_CFG[s]
          return (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={statusFilter === s ? { background: cfg.bg, color: cfg.text } : { background: 'var(--surface)', color: 'var(--text-secondary)' }}>
              {cfg.icon} {t(`milestones.status_${s.toLowerCase()}`)}
            </button>
          )
        })}
      </div>

      {loading ? <Spinner /> : milestones.length === 0 ? <Empty message={t('milestones.no_milestones')} /> : (
        <div className="space-y-3">
          {milestones.map((m) => {
            const cfg = STATUS_CFG[m.status] || STATUS_CFG.PENDING
            const overdue = isOverdue(m)
            return (
              <div key={m.id} className="flex items-start gap-4 p-5 rounded-2xl border group hover:border-slate-600 transition"
                style={{ background: 'var(--surface)', borderColor: overdue ? 'rgba(239,68,68,0.4)' : 'var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: cfg.bg }}>
                  {cfg.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{m.title}</h3>
                  {m.description && <p className="text-xs text-slate-400">{m.description}</p>}
                  <div className="flex items-center text-xs text-slate-500 mt-1">
                    {m.project?.title && <span className="flex items-center gap-1"><Folder size={12} /> {m.project.title}</span>}
                    {m.due_date && <span className="flex items-center gap-1 ml-3"><Calendar size={12} /> {fmtDate(m.due_date)}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {m.status !== 'COMPLETED' && (
                    <button onClick={() => quickComplete(m.id)} className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                      {t('milestones.complete')}
                    </button>
                  )}
                  <button onClick={() => openEdit(m)} className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>
                    {t('common.edit')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? t('milestones.edit_milestone') : t('milestones.new_milestone')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={t('common.name')} value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          <Select label={t('milestones.project')} value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}>
            <option value="">{t('milestones.select_project')}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Input label={t('milestones.due_date')} type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
          <Select label={t('common.status')} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            {STATUSES.map(s => <option key={s} value={s}>{t(`milestones.status_${s.toLowerCase()}`)}</option>)}
          </Select>
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? t('common.saving') : t('common.save')}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setModal(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
