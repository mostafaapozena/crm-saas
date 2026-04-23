'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import api from '../../../lib/api'
import Navbar from '../../../components/Navbar'
import { Spinner } from '../../../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useLocale } from '../../../hooks/useLocale'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
const pct = (n) => `${parseFloat(n || 0).toFixed(1)}%`

function getPeriods(count = 6) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

function Row({ label, value, accent, bold, indent, border }) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-4 ${border ? 'border-t' : ''}`}
      style={{ borderColor: 'var(--border)' }}>
      <span className={`text-sm ${indent ? 'pl-4' : ''}`}
        style={{ color: bold ? 'var(--text)' : 'var(--muted)', fontWeight: bold ? 700 : 400 }}>
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums"
        style={{ color: accent || (bold ? 'var(--text)' : 'var(--text-secondary)') }}>
        {fmt(value)}
      </span>
    </div>
  )
}

export default function PnLPage() {
  const { t } = useLocale()
  const periods = getPeriods(6)
  const [period, setPeriod] = useState(periods[periods.length - 1])
  const [pnl, setPnl] = useState(null)
  const [comparison, setComparison] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/pnl?period=${period}`),
      api.get('/pnl/comparison?months=6'),
    ]).then(([p, c]) => {
      setPnl(p.data)
      setComparison(c.data)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [period])

  const chartData = comparison.map(p => ({
    period: p.period,
    Revenue: parseFloat(p.revenue?.total || 0).toFixed(2),
    'Gross Profit': parseFloat(p.grossProfit || 0).toFixed(2),
    'Net Profit': parseFloat(p.netProfit || 0).toFixed(2),
  }))

  const isProfit = (pnl?.netProfit || 0) >= 0

  return (
    <div>
      <Navbar title={t('finance.pnl_title')} subtitle={t('finance.pnl_subtitle')}
        action={
          <div className="flex items-center gap-2">
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        }
      />

      {loading ? <Spinner /> : !pnl ? null : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* P&L Statement */}
          <div className="lg:col-span-2 rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t('finance.pnl_statement')}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t('finance.period_label')} {period}</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: isProfit ? 'rgba(201,252,13,0.1)' : 'rgba(239,68,68,0.1)',
                  color: isProfit ? '#C9FC0D' : '#ef4444',
                  border: `1px solid ${isProfit ? 'rgba(201,252,13,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {isProfit ? t('marketing.profitable') : t('marketing.operating_loss')}
              </div>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              <div className="py-2" style={{ background: 'rgba(0,74,255,0.04)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest px-4 py-1" style={{ color: '#004AFF' }}>{t('finance.revenue')}</p>
                <Row label={t('finance.invoice_revenue')} value={pnl.revenue?.invoice} indent />
                <Row label={t('finance.pos_revenue')} value={pnl.revenue?.pos} indent />
                <Row label={t('finance.total_revenue')} value={pnl.revenue?.total} bold accent="#004AFF" border />
              </div>

              <div className="py-2" style={{ background: 'rgba(239,68,68,0.03)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest px-4 py-1" style={{ color: '#ef4444' }}>{t('finance.cogs_section')}</p>
                <Row label={t('finance.stock_purchase_cogs')} value={pnl.cogs?.entries} indent />
                <Row label={t('finance.pos_item_costs')} value={pnl.cogs?.posItems} indent />
                <Row label={t('finance.total_cogs')} value={pnl.cogs?.total} bold accent="#ef4444" border />
              </div>

              <div className="py-1" style={{ background: 'rgba(16,185,129,0.05)' }}>
                <Row label={`${t('finance.gross_profit')} (${pct(pnl.grossMargin)} ${t('finance.margin')})`} value={pnl.grossProfit} bold accent="#10b981" border />
              </div>

              <div className="py-2" style={{ background: 'rgba(245,158,11,0.03)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest px-4 py-1" style={{ color: '#f59e0b' }}>{t('finance.operating_expenses')}</p>
                <Row label={t('finance.operating_expenses')} value={pnl.expenses?.operating} indent />
                <Row label={t('finance.fixed_costs')} value={pnl.expenses?.fixed} indent />
                <Row label={t('finance.payroll_label')} value={pnl.expenses?.payroll} indent />
                <Row label={t('finance.total_expenses_row')} value={pnl.expenses?.total} bold accent="#f59e0b" border />
              </div>

              <div className="py-1" style={{ background: isProfit ? 'rgba(201,252,13,0.05)' : 'rgba(239,68,68,0.05)' }}>
                <Row label={`${t('finance.net_profit')} (${pct(pnl.netMargin)} ${t('finance.margin')})`} value={pnl.netProfit} bold accent={isProfit ? '#C9FC0D' : '#ef4444'} border />
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="space-y-4">
            {[
              { label: t('finance.total_revenue'), value: pnl.revenue?.total, accent: '#004AFF' },
              { label: t('finance.gross_profit'), value: pnl.grossProfit, accent: '#10b981', sub: `${pct(pnl.grossMargin)} ${t('finance.margin')}` },
              { label: t('finance.total_expenses'), value: pnl.expenses?.total, accent: '#ef4444' },
              { label: t('finance.net_profit'), value: pnl.netProfit, accent: isProfit ? '#C9FC0D' : '#ef4444', sub: `${pct(pnl.netMargin)} ${t('finance.margin')}`, large: true },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-2xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{kpi.label}</p>
                <p className="text-2xl font-black" style={{ color: kpi.accent }}>{fmt(kpi.value)}</p>
                {kpi.sub && <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6-Month Trend Chart */}
      {comparison.length > 0 && (
        <div className="mt-6 rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>{t('finance.pnl_6month')}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={18}>
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                formatter={(v) => [fmt(v)]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Revenue" fill="#004AFF" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gross Profit" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Net Profit" fill="#C9FC0D" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
