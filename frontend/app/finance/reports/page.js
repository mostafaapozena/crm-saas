'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '../../../lib/api'
import Navbar from '../../../components/Navbar'
import { Spinner, Empty } from '../../../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useLocale } from '../../../hooks/useLocale'

const fmtMoney = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n || 0)
const fmtFull  = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

function ProfitBadge({ margin }) {
  const color = margin >= 50 ? '#10b981' : margin >= 20 ? '#C9FC0D' : margin >= 0 ? '#f59e0b' : '#ef4444'
  return (
    <span className="text-xs px-2 py-0.5 rounded-md font-bold" style={{ background: `${color}20`, color }}>
      {margin}%
    </span>
  )
}

export default function ReportsPage() {
  const { t } = useLocale()
  const [profitData, setProfitData] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('profit')

  useEffect(() => {
    api.get('/finance/reports/profit')
      .then(r => setProfitData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const { global: g, byProject } = profitData || {}
  const isProfit = (g?.profit || 0) >= 0

  const chartData = (byProject || []).slice(0, 8).map(p => ({
    name: p.title.length > 14 ? p.title.slice(0, 14) + '…' : p.title,
    revenue: p.revenue,
    expenses: p.expenses,
    profit: p.profit,
  }))

  const tabs = [
    { key: 'profit', label: t('finance.pnl_title') },
    { key: 'projects', label: t('finance.tab_by_project') },
  ]

  return (
    <div>
      <Navbar title={t('finance.reports_title')} subtitle={t('finance.reports_subtitle')} />

      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('finance.total_revenue'), value: fmtFull(g?.revenue), color: '#004AFF', sub: t('finance.all_payments_received') },
          { label: t('finance.total_expenses'), value: fmtFull(g?.expenses), color: '#ef4444', sub: t('finance.all_costs_incurred') },
          { label: t('finance.net_profit'), value: fmtFull(g?.profit), color: isProfit ? '#C9FC0D' : '#ef4444', sub: `${g?.margin || 0}% ${t('finance.margin')}` },
          { label: t('finance.profit_margin_label'), value: `${g?.margin || 0}%`, color: isProfit ? '#10b981' : '#ef4444', sub: isProfit ? t('marketing.profitable') : t('finance.loss_making') },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{kpi.label}</p>
            <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition"
            style={activeTab === tab.key
              ? { background: '#004AFF', color: '#fff' }
              : { color: 'var(--muted)' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profit' && (
        <div className="space-y-6">
          <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold mb-6" style={{ color: 'var(--text)' }}>{t('finance.pnl_statement')}</h2>
            <div className="space-y-0 divide-y" style={{ divideColor: 'var(--border)' }}>
              {[
                { label: t('finance.gross_revenue'), value: g?.revenue, color: '#004AFF', bold: false },
                { label: t('finance.total_expenses'), value: -Math.abs(g?.expenses || 0), color: '#ef4444', bold: false },
                { label: t('finance.net_profit_loss'), value: g?.profit, color: isProfit ? '#C9FC0D' : '#ef4444', bold: true },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-4">
                  <span className={`text-sm ${row.bold ? 'font-bold' : 'text-slate-300'}`} style={row.bold ? { color: 'var(--text)' } : {}}>{row.label}</span>
                  <span className={`text-base ${row.bold ? 'font-black' : 'font-semibold'}`} style={{ color: row.color }}>
                    {row.value >= 0 ? '+' : ''}{fmtFull(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>{t('finance.revenue_vs_expenses')}</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmtMoney(v)} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                    formatter={(v, name) => [fmtFull(v), name]} />
                  <Bar dataKey="revenue" name={t('finance.revenue')} fill="#004AFF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name={t('finance.total_expenses')} fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[t('nav.projects'), t('clients.title'), t('finance.revenue'), t('finance.total_expenses'), t('finance.net_profit'), t('finance.margin'), t('common.status')].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!byProject || byProject.length === 0) ? (
                <tr><td colSpan={7}><Empty message={t('finance.no_project_data')} /></td></tr>
              ) : byProject.map(p => (
                <tr key={p.id} className="hover:bg-white/5 transition" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3.5">
                    <Link href={`/projects/${p.id}`} className="text-sm font-medium hover:opacity-80 transition" style={{ color: 'var(--text)' }}>{p.title}</Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-400">{p.client?.company || p.client?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: '#004AFF' }}>{fmtFull(p.revenue)}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-red-400">−{fmtFull(p.expenses)}</td>
                  <td className="px-5 py-3.5 text-sm font-bold" style={{ color: p.profit >= 0 ? '#C9FC0D' : '#ef4444' }}>
                    {p.profit >= 0 ? '+' : ''}{fmtFull(p.profit)}
                  </td>
                  <td className="px-5 py-3.5"><ProfitBadge margin={p.margin} /></td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-md text-slate-400" style={{ background: 'var(--surface-2)' }}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
