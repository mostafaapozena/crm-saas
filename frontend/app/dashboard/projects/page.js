'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '../../../lib/api'
import { StatCard, Spinner } from '../../../components/ui'
import Navbar from '../../../components/Navbar'
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useLocale } from '../../../hooks/useLocale'

const STATUS_COLORS = {
  PLANNING: '#64748b', IN_PROGRESS: '#0ea5e9', REVIEW: '#f59e0b',
  COMPLETED: '#10b981', ON_HOLD: '#f97316',
}
const TYPE_COLORS = {
  ICT: '#8b5cf6', MARKETING_CAMPAIGN: '#ec4899', HYBRID: '#06b6d4',
}

function MiniProgressBar({ value, color = 'bg-sky-500' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{value}%</span>
    </div>
  )
}

export default function ProjectsDashboardPage() {
  const { t } = useLocale()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/projects-summary')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const { overview, projectsByStatus, projectsByType, recentProjects, teamWorkload } = data || {}

  const pieStatusData = (projectsByStatus || []).map(s => ({
    name: s.status.replace('_', ' '), value: s.count, color: STATUS_COLORS[s.status] || '#64748b',
  }))
  const pieTypeData = (projectsByType || []).map(t => ({
    name: t.type.replace('_', ' '), value: t.count, color: TYPE_COLORS[t.type] || '#64748b',
  }))

  return (
    <div>
      <Navbar
        title={t('dashboard.operations_title')}
        subtitle={t('dashboard.ops_subtitle')}
        action={
          <Link href="/projects">
            <button className="bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:from-sky-400 hover:to-blue-500 transition flex items-center gap-2">
              {t('nav.projects')} <ArrowRight size={14} />
            </button>
          </Link>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t('dashboard.total_projects')} value={overview?.totalProjects ?? 0} color="sky"
          sub={`${overview?.activeProjects} ${t('common.active')}`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>}
        />
        <StatCard label={t('dashboard.completed')} value={overview?.completedProjects ?? 0} color="emerald"
          sub={`${overview?.avgProgress}% ${t('dashboard.avg_progress')}`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label={t('dashboard.total_tasks')} value={overview?.totalTasks ?? 0} color="violet"
          sub={`${overview?.taskCompletionRate}% ${t('dashboard.complete_suffix')}`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        />
        <StatCard label={t('dashboard.overdue_tasks')} value={overview?.overdueTasks ?? 0} color={overview?.overdueTasks > 0 ? 'red' : 'emerald'}
          sub={`${overview?.doneTasks} ${t('team.done')}`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>{t('dashboard.by_status')}</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieStatusData.map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-slate-400">{s.name}</span>
                </div>
                <span className="font-medium" style={{ color: 'var(--text)' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>{t('dashboard.by_type')}</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieTypeData.map(t => (
              <div key={t.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                  <span className="text-slate-400">{t.name}</span>
                </div>
                <span className="font-medium" style={{ color: 'var(--text)' }}>{t.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border p-6 flex flex-col items-center justify-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4 self-start" style={{ color: 'var(--text)' }}>{t('dashboard.task_completion')}</h2>
          <div className="relative w-32 h-32 flex items-center justify-center mb-3">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#0ea5e9" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - (overview?.taskCompletionRate || 0) / 100)}`}
                strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{overview?.taskCompletionRate || 0}%</p>
              <p className="text-xs text-slate-500">{t('dashboard.complete_suffix')}</p>
            </div>
          </div>
          <div className="w-full space-y-1 text-xs text-center">
            <p className="text-slate-400">{overview?.doneTasks} {t('team.done')} · {overview?.totalTasks - overview?.doneTasks} {t('dashboard.remaining')}</p>
            {overview?.overdueTasks > 0 && (
              <p className="text-red-400 font-medium flex items-center justify-center gap-1">
                {overview?.overdueTasks} {t('tasks.overdue')} <AlertTriangle size={12} />
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Projects + Team Workload */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t('dashboard.recent_projects')}</h2>
            <Link href="/projects" className="text-xs text-sky-400 hover:text-sky-300 transition inline-flex items-center gap-1">
              {t('common.view_all')} <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-4">
            {(recentProjects || []).map(proj => (
              <div key={proj.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <Link href={`/projects/${proj.id}`} className="text-sm font-medium hover:text-sky-400 transition" style={{ color: 'var(--text)' }}>{proj.title}</Link>
                    {proj.client && <span className="text-xs text-slate-500 ml-2">{proj.client.company || proj.client.name}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{proj._count?.tasks || 0} {t('projects.tasks_suffix')}</span>
                  </div>
                </div>
                <MiniProgressBar
                  value={proj.progress_percentage}
                  color={proj.progress_percentage >= 80 ? 'bg-emerald-500' : proj.progress_percentage >= 40 ? 'bg-sky-500' : 'bg-amber-500'}
                />
              </div>
            ))}
            {(!recentProjects || recentProjects.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-4">{t('projects.no_projects')}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t('dashboard.team_workload')}</h2>
            <Link href="/team" className="text-xs text-sky-400 hover:text-sky-300 transition inline-flex items-center gap-1">
              {t('dashboard.view_team')} <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {(teamWorkload || []).slice(0, 7).map(member => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {member.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{member.name}</p>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {member.highPriority > 0 && (
                        <span className="text-xs text-red-400">{member.highPriority} {t('dashboard.high_priority')}</span>
                      )}
                      <span className="text-xs text-slate-400">{member.activeTasks} {t('projects.tasks_suffix')}</span>
                    </div>
                  </div>
                  <MiniProgressBar
                    value={Math.min((member.activeTasks / 10) * 100, 100)}
                    color={member.activeTasks >= 8 ? 'bg-red-500' : member.activeTasks >= 5 ? 'bg-amber-500' : 'bg-emerald-500'}
                  />
                </div>
              </div>
            ))}
            {(!teamWorkload || teamWorkload.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-4">{t('team.no_members')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
