'use client'
import { useEffect, useState } from 'react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Modal, Input, Select, Btn, Empty, Spinner } from '../../components/ui'
import { useLocale } from '../../hooks/useLocale'

const ROLES = ['SUPER_ADMIN', 'SALES', 'MARKETING', 'FINANCE', 'DESIGNER', 'PROJECT_MANAGER', 'ENGINEER']

const ROLE_COLORS = {
  SUPER_ADMIN: 'from-violet-500 to-purple-700',
  PROJECT_MANAGER: 'from-sky-500 to-blue-700',
  ENGINEER: 'from-emerald-500 to-green-700',
  DESIGNER: 'from-pink-500 to-rose-700',
  SALES: 'from-amber-500 to-orange-700',
  MARKETING: 'from-cyan-500 to-teal-700',
  FINANCE: 'from-slate-500 to-slate-700',
}

function WorkloadBar({ count, max = 10 }) {
  const pct = Math.min((count / max) * 100, 100)
  const color = count >= 8 ? 'bg-red-500' : count >= 5 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium w-4 ${count >= 8 ? 'text-red-400' : count >= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
        {count}
      </span>
    </div>
  )
}

export default function TeamPage() {
  const { t } = useLocale()
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', role: '', department: '', status: '' })
  const [saving, setSaving] = useState(false)
  const [roleFilter, setRoleFilter] = useState('')
  const [view, setView] = useState('grid')

  const fetchTeam = async () => {
    setLoading(true)
    try {
      const params = {}
      if (roleFilter) params.role = roleFilter
      const { data } = await api.get('/team', { params })
      setTeam(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTeam() }, [roleFilter])

  const openEdit = (m) => {
    setEditing(m)
    setForm({ name: m.name, role: m.role, department: m.department || '', status: m.status })
    setEditModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.put(`/team/${editing.id}`, form)
      setEditModal(false); fetchTeam()
    } catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const maxWorkload = Math.max(...team.map(u => u.workload_count), 1)

  const TABLE_HEADERS = [t('team.member'), t('team.role'), t('team.department'), t('team.active_tasks'), t('team.done'), t('team.overdue'), t('common.status'), t('common.actions')]

  return (
    <div>
      <Navbar title={t('team.title')} subtitle={`${team.length} ${t('team.subtitle')}`}
        action={
          <div className="flex gap-2">
            <button onClick={() => setView('grid')} className={`px-3 py-2 rounded-xl text-sm transition ${view === 'grid' ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {t('team.grid')}
            </button>
            <button onClick={() => setView('table')} className={`px-3 py-2 rounded-xl text-sm transition ${view === 'table' ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {t('team.table')}
            </button>
          </div>
        }
      />

      <div className="flex gap-3 mb-6">
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="bg-[#111827] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-sky-500 text-sm">
          <option value="">{t('team.all_roles')}</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : team.length === 0 ? <Empty message={t('team.no_members')} /> : view === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {team.map(member => (
            <div key={member.id} className="bg-[#111827] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition group">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ROLE_COLORS[member.role] || 'from-slate-500 to-slate-700'} flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-lg`}>
                  {member.name[0]}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${member.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                  {member.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                </span>
              </div>
              <h3 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{member.name}</h3>
              <p className="text-xs text-slate-500 mb-1">{member.role.replace('_', ' ')}</p>
              {member.department && <p className="text-xs text-slate-600 mb-4">{member.department}</p>}

              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{t('team.active_tasks')}</span>
                  <div className="flex gap-3">
                    <span className="text-emerald-400">{member.tasks_done} {t('team.done')}</span>
                    {member.tasks_overdue > 0 && <span className="text-red-400">{member.tasks_overdue} {t('team.overdue')}</span>}
                  </div>
                </div>
                <WorkloadBar count={member.workload_count} max={Math.max(maxWorkload, 5)} />
              </div>

              <button onClick={() => openEdit(member)}
                className="w-full mt-4 text-xs py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition opacity-0 group-hover:opacity-100">
                {t('team.edit_member')}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {TABLE_HEADERS.map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {team.map(member => (
                <tr key={member.id} className="hover:bg-slate-800/30 transition group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${ROLE_COLORS[member.role] || 'from-slate-500 to-slate-700'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {member.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-300">{member.role.replace('_', ' ')}</td>
                  <td className="px-5 py-4 text-sm text-slate-400">{member.department || '—'}</td>
                  <td className="px-5 py-4"><WorkloadBar count={member.workload_count} max={Math.max(maxWorkload, 5)} /></td>
                  <td className="px-5 py-4 text-sm text-emerald-400">{member.tasks_done}</td>
                  <td className="px-5 py-4 text-sm">
                    {member.tasks_overdue > 0
                      ? <span className="text-red-400 font-medium">{member.tasks_overdue}</span>
                      : <span className="text-slate-600">0</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-0.5 rounded-lg font-medium ${member.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                      {member.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => openEdit(member)}
                      className="text-xs text-slate-400 hover:text-sky-400 transition opacity-0 group-hover:opacity-100">
                      {t('common.edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={editModal} onClose={() => setEditModal(false)} title={t('team.edit_member')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={t('common.name')} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <Select label={t('team.role')} value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
            {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </Select>
          <Input label={t('team.department')} value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="Engineering" />
          <Select label={t('common.status')} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="ACTIVE">{t('common.active')}</option>
            <option value="INACTIVE">{t('common.inactive')}</option>
          </Select>
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? t('common.saving') : t('team.update_member')}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setEditModal(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
