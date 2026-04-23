'use client'
import { useEffect, useState } from 'react'
import { Users, TrendingUp, Building2, FolderOpen, CheckSquare, DollarSign, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Spinner, Empty } from '../../components/ui'
import { useLocale } from '../../hooks/useLocale'

const MODULE_CFG = {
  leads:    { color: '#004AFF',  Icon: Users },
  deals:    { color: '#C9FC0D', Icon: TrendingUp },
  clients:  { color: '#10b981',  Icon: Building2 },
  projects: { color: '#8b5cf6', Icon: FolderOpen },
  tasks:    { color: '#06b6d4', Icon: CheckSquare },
  finance:  { color: '#f59e0b', Icon: DollarSign },
  default:  { color: 'var(--text-secondary)', Icon: ClipboardList },
}

const fmtTime = (d) => new Date(d).toLocaleString('en-US', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
})

export default function ActivityPage() {
  const { t } = useLocale()
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [pagination, setPagination] = useState({})
  const [module, setModule]     = useState('')
  const [page, setPage]         = useState(1)

  const MODULES = ['leads', 'deals', 'clients', 'projects', 'tasks', 'finance']

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 30 }
      if (module) params.module = module
      const { data } = await api.get('/notifications/activity', { params })
      setLogs(data.logs); setPagination(data.pagination)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadLogs() }, [module, page])

  return (
    <div>
      <Navbar title={t('activity.title')} subtitle={`${pagination.total ?? 0} ${t('activity.subtitle')}`} />

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setModule('')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          style={!module ? { background: '#004AFF', color: '#fff' } : { background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          {t('activity.all_modules')}
        </button>
        {MODULES.map(m => {
          const cfg = MODULE_CFG[m] || MODULE_CFG.default
          return (
            <button key={m} onClick={() => setModule(m)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              style={module === m
                ? { background: cfg.color + '20', color: cfg.color, border: `1px solid ${cfg.color}40` }
                : { background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <cfg.Icon size={12} className="inline-block align-middle" /> {t(`activity.module_${m}`)}
            </button>
          )
        })}
      </div>

      {loading ? <Spinner /> : logs.length === 0 ? <Empty message={t('activity.no_activity')} /> : (
        <div className="relative">
          <div className="absolute left-[23px] top-0 bottom-0 w-px" style={{ background: 'var(--surface-2)' }} />
          <div className="space-y-1">
            {logs.map((log, i) => {
              const cfg = MODULE_CFG[log.module] || MODULE_CFG.default
              return (
                <div key={log.id} className="flex items-start gap-4 pl-2 group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 z-10 border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: cfg.color }}>
                    <cfg.Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0 py-2 px-4 rounded-xl mb-1 transition hover:bg-white/3"
                    style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-sm leading-snug" style={{ color: 'var(--text)' }}>{log.description}</p>
                      <span className="text-[10px] text-slate-500 flex-shrink-0 mt-0.5">{fmtTime(log.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{t(`activity.module_${log.module}`)}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-[11px] text-slate-500">{log.user?.name}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-[11px] text-slate-500 font-mono">{log.action}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white disabled:opacity-40 transition"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <ChevronLeft size={14} className="inline-block" /> {t('activity.prev')}
          </button>
          <span className="text-sm text-slate-400">{t('activity.page_of', { page, pages: pagination.pages })}</span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
            className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white disabled:opacity-40 transition"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {t('activity.next')} <ChevronRight size={14} className="inline-block" />
          </button>
        </div>
      )}
    </div>
  )
}
