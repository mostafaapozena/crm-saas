'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '../../lib/api'
import { Spinner } from '../../components/ui'
import Navbar from '../../components/Navbar'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ArrowRight } from 'lucide-react'
import { useLocale } from '../../hooks/useLocale'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n || 0)
const fmtFull = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

const CAT_COLORS = { ADS: '#f59e0b', VENDOR: '#8b5cf6', SALARY: '#ef4444', TOOLS: '#06b6d4', TRAVEL: '#10b981', UTILITIES: '#64748b', OTHER: '#334155' }

function KpiCard({ label, value, sub, accent = '#004AFF', icon }) {
  return (
    <div className="rounded-2xl p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div style={{ color: accent }}>{icon}</div>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = {
    DRAFT: { bg: '#1e293b', text: '#64748b' },
    SENT: { bg: 'rgba(0,74,255,0.15)', text: '#004AFF' },
    PAID: { bg: 'rgba(16,185,129,0.15)', text: '#10b981' },
    OVERDUE: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
    CANCELLED: { bg: '#1e293b', text: '#475569' },
  }
  const c = cfg[status] || cfg.DRAFT
  return (
    <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: c.bg, color: c.text }}>
      {status}
    </span>
  )
}

export default function FinancePage() {
  const { t } = useLocale()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/finance/summary')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const { summary, recentPayments, expenseByCategory, topClients, monthlyRevenue } = data || {}
  const isProfit = (summary?.netProfit || 0) >= 0

  const pieData = (expenseByCategory || []).map(e => ({
    name: e.category, value: e.total, color: CAT_COLORS[e.category] || '#334155'
  }))

  return (
    <div>
      <Navbar title={t('finance.overview')} subtitle={t('finance.overview_subtitle')}
        action={
          <div className="flex gap-2">
            <Link href="/finance/invoices">
              <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition"
                style={{ background: '#004AFF' }}>{t('finance.new_invoice')}</button>
            </Link>
          </div>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label={t('finance.total_revenue')} value={fmt(summary?.totalRevenue)} sub={`${fmt(summary?.monthRevenue)} ${t('common.this_month')}`} accent="#004AFF"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <KpiCard label={t('finance.total_expenses')} value={fmt(summary?.totalExpenses)} sub={`${fmt(summary?.monthExpenses)} ${t('common.this_month')}`} accent="#ef4444"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
        <KpiCard label={t('finance.net_profit')} value={fmt(summary?.netProfit)} sub={`${summary?.profitMargin}% ${t('finance.margin')}`} accent={isProfit ? '#C9FC0D' : '#ef4444'}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
        <KpiCard label={t('finance.outstanding')} value={fmt(summary?.outstandingAmount)} sub={`${summary?.overdueInvoices} ${t('finance.overdue_label')}`} accent={summary?.overdueInvoices > 0 ? '#f59e0b' : '#64748b'}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
      </div>

      {/* Invoice status pills */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {[
          { label: t('finance.paid'), value: summary?.paidInvoices, color: '#10b981' },
          { label: t('finance.draft'), value: summary?.draftInvoices, color: 'var(--text-secondary)' },
          { label: t('finance.overdue_status'), value: summary?.overdueInvoices, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-400">{s.label}:</span>
            <span className="font-bold" style={{ color: 'var(--text)' }}>{s.value || 0}</span>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>{t('finance.revenue_6months')}</h2>
          {monthlyRevenue && monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#004AFF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#004AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmt(v)} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => [fmtFull(v), t('finance.revenue')]} />
                <Area type="monotone" dataKey="revenue" stroke="#004AFF" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-500 text-sm">{t('finance.no_revenue_data')}</div>
          )}
        </div>

        {/* Expense breakdown */}
        <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>{t('finance.expenses_by_category')}</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v) => fmtFull(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map(e => (
                  <div key={e.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
                      <span className="text-slate-400">{e.name}</span>
                    </div>
                    <span className="font-medium" style={{ color: 'var(--text)' }}>{fmt(e.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-500 text-sm">{t('finance.no_expenses_yet')}</div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t('finance.recent_payments')}</h2>
            <Link href="/finance/payments" className="text-xs hover:opacity-80 transition inline-flex items-center gap-1" style={{ color: '#004AFF' }}>{t('common.view_all')} <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-3">
            {(recentPayments || []).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{p.invoice?.client?.company || p.invoice?.client?.name || '—'}</p>
                  <p className="text-xs text-slate-500">{fmtDate(p.payment_date)} · {p.payment_method.replace('_', ' ')}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: '#C9FC0D' }}>+{fmtFull(p.amount_paid)}</span>
              </div>
            ))}
            {(!recentPayments || recentPayments.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-4">{t('finance.no_payments_yet')}</p>
            )}
          </div>
        </div>

        {/* Top Clients */}
        <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>{t('finance.top_clients')}</h2>
          <div className="space-y-3">
            {(topClients || []).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="text-xs font-bold w-5 text-slate-600">#{i + 1}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#004AFF,#0035cc)' }}>
                  {(c.company || c.name || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{c.company || c.name}</p>
                  <p className="text-xs text-slate-500">{c.invoices} {t('finance.invoices_suffix')}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: '#C9FC0D' }}>{fmt(c.revenue)}</span>
              </div>
            ))}
            {(!topClients || topClients.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-4">{t('finance.no_revenue_data')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
