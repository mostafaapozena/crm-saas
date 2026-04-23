'use client'
import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { StatCard, Badge, Spinner } from '../../components/ui'
import Navbar from '../../components/Navbar'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ArrowRight } from 'lucide-react'
import { useLocale } from '../../hooks/useLocale'

const fmtCompact = (n) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n || 0)
const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(n)
const STAGE_COLORS = { LEAD: '#64748b', QUALIFIED: '#3b82f6', PROPOSAL_SENT: '#8b5cf6', NEGOTIATION: '#f59e0b', WON: '#10b981', LOST: '#ef4444' }

function MiniStat({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-slate-800/40 rounded-xl p-3 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { t } = useLocale()
  const [crmData, setCrmData] = useState(null)
  const [opsData, setOpsData] = useState(null)
  const [mktData, setMktData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary').catch(() => ({ data: null })),
      api.get('/dashboard/projects-summary').catch(() => ({ data: null })),
      api.get('/campaigns/summary').catch(() => ({ data: null })),
    ]).then(([crm, ops, mkt]) => {
      setCrmData(crm.data)
      setOpsData(ops.data)
      setMktData(mkt.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  const { overview, revenue, leadsByStage, recentLeads } = crmData || {}
  const opsOverview = opsData?.overview
  const mkt         = mktData?.overview

  return (
    <div>
      <Navbar title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />

      <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">{t('dashboard.sales_crm')}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('dashboard.total_leads')} value={overview?.totalLeads ?? 0} color="sky" sub={`${overview?.leadsThisMonth} ${t('common.this_month')}`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        <StatCard label={t('dashboard.active_deals')} value={overview?.activeDeals ?? 0} color="violet"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
        <StatCard label={t('dashboard.won_revenue')} value={fmt(revenue?.wonRevenue ?? 0)} color="emerald" sub={`${revenue?.wonDealsCount} ${t('dashboard.deals_suffix')}`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard label={t('dashboard.win_rate')} value={`${overview?.wonRate ?? 0}%`} color="amber" sub={`${t('dashboard.pipeline')}: ${fmt(revenue?.totalPipeline ?? 0)}`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>} />
      </div>

      {opsOverview && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">{t('dashboard.operations')}</p>
            <Link href="/dashboard/projects" className="text-xs text-sky-400 hover:text-sky-300 transition inline-flex items-center gap-1">{t('dashboard.full_ops')} <ArrowRight size={12} /></Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MiniStat label={t('dashboard.active_projects')} value={opsOverview.activeProjects} color="text-sky-400" />
            <MiniStat label={t('dashboard.completed')} value={opsOverview.completedProjects} color="text-emerald-400" />
            <MiniStat label={t('dashboard.task_completion')} value={`${opsOverview.taskCompletionRate}%`} color="text-violet-400" />
            <MiniStat label={t('dashboard.overdue_tasks')} value={opsOverview.overdueTasks} color={opsOverview.overdueTasks > 0 ? 'text-red-400' : 'text-slate-500'} />
          </div>
        </>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>{t('dashboard.lead_pipeline')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={leadsByStage} barSize={28}>
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={s => s.replace('_', ' ')} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {(leadsByStage || []).map((e, i) => <Cell key={i} fill={STAGE_COLORS[e.stage] || '#64748b'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>{t('dashboard.key_metrics')}</h2>
          <div className="space-y-2.5">
            {[
              { label: t('dashboard.total_clients'),   value: overview?.totalClients ?? 0,       color: 'text-sky-400' },
              { label: t('dashboard.total_deals'),     value: overview?.totalDeals ?? 0,         color: 'text-violet-400' },
              { label: t('dashboard.won_deals'),       value: revenue?.wonDealsCount ?? 0,       color: 'text-emerald-400' },
              { label: t('dashboard.lost_deals'),      value: overview?.lostDeals ?? 0,          color: 'text-red-400' },
              ...(opsOverview ? [
                { label: t('dashboard.total_projects'),  value: opsOverview.totalProjects,       color: 'text-sky-300' },
                { label: t('dashboard.avg_progress'),    value: `${opsOverview.avgProgress}%`,   color: 'text-amber-400' },
              ] : []),
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0 text-sm">
                <span className="text-slate-400">{row.label}</span>
                <span className={`font-semibold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {mkt && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">{t('dashboard.marketing_intelligence')}</p>
            <Link href="/marketing" className="text-xs text-sky-400 hover:text-sky-300 transition inline-flex items-center gap-1">{t('dashboard.all_campaigns')} <ArrowRight size={12} /></Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
            {[
              { label: t('dashboard.active_campaigns'), value: mkt.activeCampaigns,              color: 'text-sky-400' },
              { label: t('dashboard.total_spend'),      value: fmt(mkt.totalSpent),              color: 'text-red-400' },
              { label: t('dashboard.total_revenue'),    value: fmt(mkt.totalRevenue),            color: 'text-emerald-400' },
              { label: t('dashboard.overall_roi'),      value: `${mkt.overallROI}%`,             color: mkt.overallROI >= 0 ? 'text-yellow-300' : 'text-red-400' },
              { label: t('dashboard.conversions'),      value: fmtCompact(mkt.totalConversions), color: 'text-violet-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/40 rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {mktData?.platforms && (
            <div className="grid lg:grid-cols-2 gap-4 mb-8">
              {['META', 'GOOGLE'].map(p => {
                const pd = mktData.platforms[p]
                const roi = pd?.roi ?? 0
                return (
                  <div key={p} className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{p === 'META' ? t('dashboard.meta_ads') : t('dashboard.google_ads')}</p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ color: roi >= 0 ? '#C9FC0D' : '#ef4444', background: roi >= 0 ? 'rgba(201,252,13,0.1)' : 'rgba(239,68,68,0.1)' }}>
                        {t('dashboard.roi')} {roi}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><p className="text-slate-500">{t('dashboard.spend')}</p><p className="font-medium mt-0.5" style={{ color: 'var(--text)' }}>{fmt(pd?.spend || 0)}</p></div>
                      <div><p className="text-slate-500">{t('dashboard.revenue')}</p><p className="text-emerald-400 font-medium mt-0.5">{fmt(pd?.revenue || 0)}</p></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t('dashboard.recent_leads')}</h2>
          <Link href="/leads" className="text-xs text-sky-400 hover:text-sky-300 transition inline-flex items-center gap-1">{t('dashboard.view_all')} <ArrowRight size={12} /></Link>
        </div>
        <div className="space-y-3">
          {(recentLeads || []).map((lead) => (
            <div key={lead.id} className="flex items-center gap-4 py-1.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{lead.name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{lead.name}</p>
                <p className="text-xs text-slate-500">{lead.email || lead.phone || t('common.no_contact')}</p>
              </div>
              <Badge value={lead.stage} />
              <span className="text-sm font-medium text-emerald-400 w-20 text-right">{lead.deal_value ? fmt(lead.deal_value) : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
