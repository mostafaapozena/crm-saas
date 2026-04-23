'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DollarSign, BarChart2, Settings2, Zap, ClipboardList, ArrowRight } from 'lucide-react'
import api from '../../../lib/api'
import { Spinner } from '../../../components/ui'
import { useLocale } from '../../../hooks/useLocale'

const fmt = (n, compact = true) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: 1
  }).format(n || 0)

function KPI({ label, value, sub, accent = '#004AFF', large = false }) {
  return (
    <div className="rounded-2xl border p-5 flex flex-col" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</p>
      <p className={`font-black ${large ? 'text-3xl' : 'text-2xl'}`} style={{ color: accent }}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function Section({ title, link, linkLabel, children }) {
  return (
    <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{title}</h2>
        {link && (
          <Link href={link} className="text-xs hover:opacity-80 transition" style={{ color: '#004AFF' }}>
            {linkLabel} <ArrowRight size={12} className="inline-block" />
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

export default function CEODashboardPage() {
  const { t } = useLocale()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/ceo')
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const { kpis: k, recentActivity, topDeals } = data || {}
  const isProfit = (k?.netProfit || 0) >= 0

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{t('ceo.title')}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{t('ceo.full_overview')}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(201,252,13,0.1)', color: '#C9FC0D', border: '1px solid rgba(201,252,13,0.2)' }}>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          {t('ceo.live')}
        </div>
      </div>

      {/* Financial */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3 flex items-center gap-1">
        <DollarSign size={10} /> {t('ceo.financial')}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label={t('finance.total_revenue')} value={fmt(k?.totalRevenue)} accent="#004AFF"
          sub={`${fmt(k?.monthRevenue)} ${t('common.this_month')}`} />
        <KPI label={t('finance.total_expenses')} value={fmt(k?.totalExpenses)} accent="#ef4444"
          sub={`${fmt(k?.monthExpenses)} ${t('common.this_month')}`} />
        <KPI label={t('finance.net_profit')} value={fmt(k?.netProfit)} accent={isProfit ? '#C9FC0D' : '#ef4444'}
          sub={`${k?.profitMargin || 0}% ${t('finance.margin')}`} large />
        <KPI label={t('ceo.outstanding')} value={fmt(k?.outstandingAmount)} accent="#f59e0b"
          sub={t('ceo.unpaid_invoices')} />
      </div>

      {/* CRM */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3 flex items-center gap-1">
        <BarChart2 size={10} /> {t('dashboard.sales_crm')}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label={t('dashboard.total_leads')} value={k?.totalLeads} accent="#004AFF"
          sub={`+${k?.monthLeads} ${t('common.this_month')}`} />
        <KPI label={t('dashboard.active_deals')} value={k?.activeDeals} accent="#8b5cf6" />
        <KPI label={t('dashboard.won_deals')} value={k?.wonDealsCount} accent="#C9FC0D"
          sub={fmt(k?.wonDealsValue)} />
        <KPI label={t('dashboard.win_rate')} value={`${k?.winRate || 0}%`}
          accent={k?.winRate >= 50 ? '#10b981' : '#f59e0b'}
          sub={`${k?.totalClients} ${t('ceo.clients_total')}`} />
      </div>

      {/* Ops */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3 flex items-center gap-1">
        <Settings2 size={10} /> {t('ceo.ops_marketing')}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI label={t('dashboard.active_projects')} value={k?.activeProjects} accent="#004AFF"
          sub={`${k?.completedProjects} ${t('ceo.completed_projects')}`} />
        <KPI label={t('dashboard.task_completion')} value={`${k?.taskCompletionRate || 0}%`} accent="#10b981"
          sub={`${k?.overdueTasks} ${t('ceo.overdue')}`} />
        <KPI label={t('dashboard.active_campaigns')} value={k?.activeCampaigns} accent="#f59e0b"
          sub={`${k?.totalConversions} ${t('dashboard.conversions')}`} />
        <KPI label={t('ceo.campaign_roi')} value={`${k?.campaignROI || 0}%`}
          accent={k?.campaignROI >= 0 ? '#C9FC0D' : '#ef4444'}
          sub={t('ceo.return_on_adspend')} />
      </div>

      {/* Bottom */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title={<span className="inline-flex items-center gap-1.5"><Zap size={14} /> {t('ceo.top_deals')}</span>} link="/deals" linkLabel={t('common.view_all')}>
          <div className="space-y-3">
            {(topDeals || []).map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{d.lead?.name || d.client?.name || `Deal #${d.id}`}</p>
                  <p className="text-xs text-slate-500">{d.client?.name || '—'}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: '#C9FC0D' }}>{fmt(d.value)}</span>
              </div>
            ))}
            {!topDeals?.length && (
              <p className="text-sm text-slate-500 text-center py-4">{t('ceo.no_deals')}</p>
            )}
          </div>
        </Section>

        <Section title={<span className="inline-flex items-center gap-1.5"><ClipboardList size={14} /> {t('ceo.recent_activity')}</span>} link="/activity" linkLabel={t('common.view_all')}>
          <div className="space-y-2.5">
            {(recentActivity || []).map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(0,74,255,0.15)', color: '#004AFF' }}>
                  {a.user?.name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate" style={{ color: 'var(--text)' }}>{a.description}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {a.user?.name} · {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                  {a.module}
                </span>
              </div>
            ))}
            {!recentActivity?.length && (
              <p className="text-sm text-slate-500 text-center py-4">{t('ceo.no_activity')}</p>
            )}
          </div>
        </Section>
      </div>
    </div>
  )
}
