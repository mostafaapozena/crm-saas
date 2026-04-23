'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '../../lib/api'
import { getUser } from '../../lib/auth'
import Navbar from '../../components/Navbar'
import { Modal, Input, Select, Btn, Empty, Spinner } from '../../components/ui'
import { AlertTriangle } from 'lucide-react'
import { fmtDate } from '../../lib/utils'
import { useLocale } from '../../hooks/useLocale'

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']

const STATUS_COLORS = {
  TODO: 'bg-slate-700 text-slate-300',
  IN_PROGRESS: 'bg-sky-500/20 text-sky-400',
  IN_REVIEW: 'bg-amber-500/20 text-amber-400',
  DONE: 'bg-emerald-500/20 text-emerald-400',
}

const PRIORITY_COLORS = {
  HIGH: 'text-red-400',
  MEDIUM: 'text-amber-400',
  LOW: 'text-slate-500',
}

const PRIORITY_ICONS = { HIGH: '▲▲', MEDIUM: '▲', LOW: '▽' }

export default function TasksPage() {
  const { t } = useLocale()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', project_id: '', assigned_to: '', priority: 'MEDIUM', due_date: '', status: 'TODO' })
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState({ status: '', priority: '', project_id: '', assigned_to: '' })
  const [pagination, setPagination] = useState({})
  const me = getUser()

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = {}
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const { data } = await api.get('/tasks', { params })
      setTasks(data.tasks)
      setPagination(data.pagination)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchOptions = async () => {
    const [p, u] = await Promise.all([
      api.get('/projects?limit=100').catch(() => ({ data: { projects: [] } })),
      api.get('/team').catch(() => ({ data: [] })),
    ])
    setProjects(p.data.projects)
    setUsers(u.data)
  }

  useEffect(() => { fetchTasks() }, [filters])
  useEffect(() => { fetchOptions() }, [])

  const openCreate = () => {
    setEditingTask(null)
    setForm({ title: '', description: '', project_id: '', assigned_to: '', priority: 'MEDIUM', due_date: '', status: 'TODO' })
    setModalOpen(true)
  }

  const openEdit = (task) => {
    setEditingTask(task)
    setForm({ title: task.title, description: task.description || '', project_id: task.project_id, assigned_to: task.assigned_to || '', priority: task.priority, due_date: task.due_date ? task.due_date.split('T')[0] : '', status: task.status })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editingTask) await api.put(`/tasks/${editingTask.id}`, form)
      else await api.post('/tasks', form)
      setModalOpen(false); fetchTasks()
    } catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const quickStatus = async (id, status) => {
    try { await api.put(`/tasks/${id}`, { status }); fetchTasks() }
    catch (e) { console.error(e) }
  }

  const isOverdue = (task) => task.due_date && task.status !== 'DONE' && new Date(task.due_date) < new Date()

  const HEADERS = [t('tasks.task_col'), t('tasks.project'), t('tasks.assigned_to'), t('tasks.priority'), t('common.status'), t('tasks.due_date'), t('common.actions')]

  return (
    <div>
      <Navbar title={t('tasks.title')} subtitle={`${pagination.total ?? 0} ${t('tasks.subtitle')}`}
        action={<Btn onClick={openCreate}>{t('tasks.new_task')}</Btn>}
      />

      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { key: 'status', label: t('tasks.all_statuses'), opts: STATUSES },
          { key: 'priority', label: t('tasks.all_priorities'), opts: PRIORITIES },
        ].map(f => (
          <select key={f.key} value={filters[f.key]} onChange={e => setFilters({...filters, [f.key]: e.target.value})}
            className="bg-[#111827] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-sky-500 text-sm">
            <option value="">{f.label}</option>
            {f.opts.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
          </select>
        ))}
        <select value={filters.project_id} onChange={e => setFilters({...filters, project_id: e.target.value})}
          className="bg-[#111827] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-sky-500 text-sm">
          <option value="">{t('tasks.all_projects')}</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <button onClick={() => setFilters({ status: '', priority: '', project_id: '', assigned_to: me?.id?.toString() })}
          className="bg-[#111827] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 hover:text-sky-400 text-sm transition">
          {t('tasks.my_tasks')}
        </button>
        <button onClick={() => setFilters({ status: '', priority: '', project_id: '', assigned_to: '' })}
          className="text-xs text-slate-500 hover:text-white transition px-2">{t('tasks.clear')}</button>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
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
            ) : tasks.length === 0 ? (
              <tr><td colSpan={7}><Empty message={t('tasks.no_tasks')} /></td></tr>
            ) : tasks.map(task => (
              <tr key={task.id} className={`hover:bg-slate-800/30 transition group ${isOverdue(task) ? 'bg-red-500/5' : ''}`}>
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{task.title}</p>
                  {isOverdue(task) && <span className="flex items-center gap-1 mt-1 text-xs text-red-400"><AlertTriangle size={12} /> {t('tasks.overdue')}</span>}
                </td>
                <td className="px-5 py-3.5">
                  {task.project ? (
                    <Link href={`/projects/${task.project.id}`} className="text-sm text-sky-400 hover:text-sky-300 transition">
                      {task.project.title}
                    </Link>
                  ) : <span className="text-slate-500 text-sm">—</span>}
                </td>
                <td className="px-5 py-3.5">
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {task.assignee.name[0]}
                      </div>
                      <span className="text-sm text-slate-300">{task.assignee.name}</span>
                    </div>
                  ) : <span className="text-slate-500 text-sm">{t('tasks.unassigned')}</span>}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-sm font-medium ${PRIORITY_COLORS[task.priority]}`}>
                    {PRIORITY_ICONS[task.priority]} {task.priority}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <select value={task.status}
                    onChange={e => quickStatus(task.id, e.target.value)}
                    className={`text-xs px-2.5 py-1 rounded-lg border-0 font-medium cursor-pointer focus:outline-none ${STATUS_COLORS[task.status]} bg-transparent`}>
                    {STATUSES.map(s => <option key={s} value={s} className="bg-slate-800 text-white">{s.replace('_', ' ')}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-sm ${isOverdue(task) ? 'text-red-400 font-medium' : 'text-slate-400'}`}>
                    {fmtDate(task.due_date)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <button onClick={() => openEdit(task)}
                    className="text-xs text-slate-400 hover:text-sky-400 transition opacity-0 group-hover:opacity-100">
                    {t('common.edit')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingTask ? t('tasks.edit_task') : t('tasks.new_task')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={t('tasks.title_label')} value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder={t('tasks.title_ph')} />
          <Select label={t('tasks.project')} value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})} required>
            <option value="">{t('tasks.select_project')}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('tasks.priority')} value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Select label={t('common.status')} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('tasks.assign_to')} value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})}>
              <option value="">{t('tasks.unassigned')}</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
            <Input label={t('tasks.due_date')} type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? t('common.saving') : editingTask ? t('tasks.update_task') : t('tasks.create_task')}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
