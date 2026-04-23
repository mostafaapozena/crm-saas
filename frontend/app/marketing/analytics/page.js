'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '../../../lib/api'
import Navbar from '../../../components/Navbar'
import { Spinner, Empty } from '../../../components/ui'
import { useLocale } from '../../../hooks/useLocale'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Target, ChevronLeft, ArrowRight } from 'lucide-react'

const fmtMoney   = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(n || 0)
const fmtNum     = (n) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n || 0)
const TooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 11 }

const PLATFORM_COLORS = { META: '#1877F2', GOOGLE: '#EA4335', ALL: '#94a3b8' }
const STATUS_COLORS   = { ACTIVE: '#C9FC0D', PAUSED: '#f59e0b', COMPLETED: '#10b981', DRAFT: '#64748b', CANCELLED: '#ef4444' }

export default function MarketingAnalyticsPage() {
  const { t } = useLocale()
  const [summary, setSummary]     = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/campaigns/summary'),
      api.get('/campaigns?limit=50'),
    ]).then(([s, c]) => {
      setSummary(s.data)
      setCampaigns(c.data.campaigns || [])
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const ov = summary?.overview
  const platforms = summary?.platforms || {}

  const statusDist = Object.entries(
    campaigns.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value }))

  const platformData = ['META', 'GOOGLE'].map(p => ({
    platform: p,
    Spend: parseFloat((platforms[p]?.spend || 0).toFixed(2)),
    Revenue: parseFloat((platforms[p]?.revenue || 0).toFixed(2)),
    ROI: platforms[p]?.roi || 0,
  }))

  const topByROI = [...campaigns]
    .filter(c => (c.roi || 0) !== 0)
    .sort((a, b) => (b.roi || 0) - (a.roi || 0))
    .slice(0, 8)

  const TABLE_HEADERS = [
    t('marketing.campaign_col'), t('marketing.platform'), t('common.company'),
    t('marketing.spend_col'), t('marketing.revenue_col'), t('marketing.conversions'),
    t('marketing.roi'), t('marketing.cpa'),
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <Navbar title={t('marketing.analytics_title')} subtitle={t('marketing.analytics_subtitle')}
        action={
          <Link href="/marketing" className="px-4 py-2.5 rounded-xl text-white text-sm font-bold inline-flex items-center gap-2"
            style={{ background: '#004AFF' }}><ChevronLeft size={16} /> {t('nav.campaigns')}</Link>
        }
      />

      {/* KPI Row */}
      {ov && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('marketing.total_spend'),       val: fmtMoney(ov.totalSpent),         color: '#ef4444',  icon: <DollarSign size={18} /> },
            { label: t('marketing.total_revenue'),      val: fmtMoney(ov.totalRevenue),        color: '#10b981',  icon: <TrendingUp size={18} /> },
            { label: t('marketing.overall_roi'),        val: `${ov.overallROI}%`,              color: ov.overallROI >= 0 ? '#C9FC0D' : '#ef4444', icon: ov.overallROI >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} /> },
            { label: t('marketing.total_conversions'),  val: fmtNum(ov.totalConversions),      color: '#8b5cf6',  icon: <Target size={18} /> },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-2xl border p-5 flex items-center gap-4"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="p-2.5 rounded-xl" style={{ background: `${kpi.color}18`, color: kpi.color }}>{kpi.icon}</div>
              <div>
                <p className="text-xs text-slate-400">{kpi.label}</p>
                <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.val}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Secondary KPIs */}
      {ov && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('marketing.best_platform'),          val: ov.bestPlatform,           color: '#004AFF' },
            { label: t('marketing.overall_cpa'),            val: fmtMoney(ov.overallCPA),  color: '#f59e0b' },
            { label: t('marketing.budget_utilisation'),     val: `${ov.budgetUtilization}%`, color: ov.budgetUtilization > 80 ? '#ef4444' : '#10b981' },
            { label: t('dashboard.active_campaigns'),       val: ov.activeCampaigns,       color: '#C9FC0D' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-2xl border p-4 text-center"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
              <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.val}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Platform comparison */}
        <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>{t('marketing.platform_performance')}</h2>
          {platformData.some(p => p.Spend > 0 || p.Revenue > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={platformData} barSize={32}>
                <XAxis dataKey="platform" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={TooltipStyle} formatter={(v, n) => n === 'ROI' ? `${v}%` : fmtMoney(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Spend"   fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
              {t('marketing.no_platform_data')}
            </div>
          )}
        </div>

        {/* Status distribution */}
        <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>{t('marketing.status_distribution')}</h2>
          {statusDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#334155' }}>
                  {statusDist.map((s) => (
                    <Cell key={s.name} fill={STATUS_COLORS[s.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty message={t('marketing.no_campaigns')} />
          )}
        </div>
      </div>

      {/* Top campaigns by ROI */}
      {topByROI.length > 0 && (
        <div className="rounded-2xl border overflow-hidden mb-6" style={{ borderColor: 'var(--border)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t('marketing.top_by_roi')}</h2>
            <Link href="/marketing" className="text-xs text-sky-400 hover:text-sky-300 transition inline-flex items-center gap-1">
              {t('common.view_all')} <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-400">
              <thead>
                <tr className="border-b" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                  {TABLE_HEADERS.map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topByROI.map(c => {
                  const roiPos = (c.roi || 0) >= 0
                  return (
                    <tr key={c.id} className="border-b hover:bg-white/2 transition" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3">
                        <Link href={`/marketing/${c.id}`} className="font-medium hover:text-blue-400 transition" style={{ color: 'var(--text)' }}>
                          {c.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                          style={{ color: PLATFORM_COLORS[c.platform || 'ALL'], background: `${PLATFORM_COLORS[c.platform || 'ALL']}18` }}>
                          {c.platform || 'ALL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{c.client?.name || '—'}</td>
                      <td className="px-4 py-3 text-red-400">{fmtMoney(c.totalSpend)}</td>
                      <td className="px-4 py-3 text-emerald-400">{fmtMoney(c.totalRevenue)}</td>
                      <td className="px-4 py-3 text-violet-400">{fmtNum(c.totalConversions)}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: roiPos ? '#C9FC0D' : '#ef4444' }}>
                        {c.roi}%
                      </td>
                      <td className="px-4 py-3 text-amber-400">{fmtMoney(c.cpa)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
