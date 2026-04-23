'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle, TrendingUp } from 'lucide-react'
import api from '../../../lib/api'
import Navbar from '../../../components/Navbar'
import { Spinner } from '../../../components/ui'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useLocale } from '../../../hooks/useLocale'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

function getPeriods(count = 6) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

const ACCOUNTS = ['CASH', 'BANK', 'PETTY_CASH']
const SOURCES = ['manual', 'invoice', 'expense', 'payroll', 'pos', 'purchase']

export default function CashFlowPage() {
  const { t } = useLocale()
  const periods = getPeriods(6)
  const [period, setPeriod] = useState(periods[periods.length - 1])
  const [cashFlow, setCashFlow] = useState(null)
  const [trend, setTrend] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'INFLOW', source: 'manual', amount: '', description: '', account: 'CASH', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/cash-flow?period=${period}`),
      api.get('/cash-flow/trend?months=6'),
      api.get(`/cash-flow/entries?period=${period}`),
    ]).then(([cf, tr, en]) => {
      setCashFlow(cf.data)
      setTrend(tr.data)
      setEntries(en.data)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [period])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/cash-flow/entries', { ...form, amount: parseFloat(form.amount) })
      setShowForm(false)
      setForm({ type: 'INFLOW', source: 'manual', amount: '', description: '', account: 'CASH', date: new Date().toISOString().split('T')[0] })
      load()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('finance.delete_cogs_confirm'))) return
    await api.delete(`/cash-flow/entries/${id}`)
    load()
  }

  const chartData = trend.map(t => ({
    period: t.period,
    Inflows: parseFloat(t.totalInflows || 0).toFixed(2),
    Outflows: parseFloat(t.totalOutflows || 0).toFixed(2),
    Net: parseFloat(t.netCashFlow || 0).toFixed(2),
  }))

  const isPositive = (cashFlow?.netCashFlow || 0) >= 0

  return (
    <div>
      <Navbar title={t('finance.cash_flow_title')} subtitle={t('finance.cash_flow_subtitle')}
        action={
          <div className="flex items-center gap-2">
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#004AFF', color: '#fff' }}>
              <Plus size={16} /> {t('finance.add_entry')}
            </button>
          </div>
        }
      />

      {loading ? <Spinner /> : (
        <>
          {/* Summary Cards */}
          {cashFlow && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: t('finance.total_inflows'), value: cashFlow.inflows?.total, accent: '#10b981', Icon: ArrowDownCircle },
                { label: t('finance.total_outflows'), value: cashFlow.outflows?.total, accent: '#ef4444', Icon: ArrowUpCircle },
                { label: t('finance.net_cash_flow'), value: cashFlow.netCashFlow, accent: isPositive ? '#C9FC0D' : '#ef4444', Icon: TrendingUp },
                { label: t('finance.manual_entries'), value: cashFlow.inflows?.manual + cashFlow.outflows?.manual, accent: '#f59e0b', Icon: Plus },
              ].map(card => (
                <div key={card.label} className="rounded-2xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <card.Icon size={16} style={{ color: card.accent }} />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                  </div>
                  <p className="text-2xl font-black" style={{ color: card.accent }}>{fmt(card.value)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Inflow / Outflow Breakdown */}
          {cashFlow && (
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {[
                { title: t('finance.inflows_breakdown'), accent: '#10b981', bg: 'rgba(16,185,129,0.05)', data: [
                  { label: t('finance.invoice_payments'), value: cashFlow.inflows?.payments },
                  { label: t('finance.pos_sales'), value: cashFlow.inflows?.pos },
                  { label: t('finance.manual_inflows'), value: cashFlow.inflows?.manual },
                ]},
                { title: t('finance.outflows_breakdown'), accent: '#ef4444', bg: 'rgba(239,68,68,0.05)', data: [
                  { label: t('finance.operating_expenses'), value: cashFlow.outflows?.expenses },
                  { label: t('finance.payroll_label'), value: cashFlow.outflows?.payroll },
                  { label: t('finance.stock_purchases'), value: cashFlow.outflows?.purchases },
                  { label: t('finance.fixed_costs'), value: cashFlow.outflows?.fixedCosts },
                  { label: t('finance.manual_outflows'), value: cashFlow.outflows?.manual },
                ]},
              ].map(section => (
                <div key={section.title} className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{section.title}</h2>
                  </div>
                  <div style={{ background: section.bg }}>
                    {section.data.map(row => (
                      <div key={row.label} className="flex items-center justify-between px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-sm text-slate-400">{row.label}</span>
                        <span className="text-sm font-semibold tabular-nums" style={{ color: section.accent }}>{fmt(row.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t('common.total')}</span>
                      <span className="text-sm font-black tabular-nums" style={{ color: section.accent }}>
                        {fmt(section.data.reduce((s, r) => s + (r.value || 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trend Chart */}
          {trend.length > 0 && (
            <div className="rounded-2xl border p-6 mb-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>{t('finance.cashflow_trend')}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                    formatter={(v) => [fmt(v)]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="Inflows" stroke="#10b981" fill="rgba(16,185,129,0.1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Outflows" stroke="#ef4444" fill="rgba(239,68,68,0.1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Net" stroke="#C9FC0D" fill="rgba(201,252,13,0.05)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Entries Table */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t('finance.manual_entries_period', { period })}</h2>
            </div>
            {entries.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-10">{t('finance.no_manual_entries')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    {[t('common.date'), t('common.type'), t('finance.business_unit_col'), t('finance.source_col'), t('common.description'), t('common.amount'), ''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3 text-slate-300">{e.date?.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: e.type === 'INFLOW' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: e.type === 'INFLOW' ? '#10b981' : '#ef4444' }}>
                          {e.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{e.account}</td>
                      <td className="px-4 py-3 text-slate-400">{e.source}</td>
                      <td className="px-4 py-3 text-slate-300">{e.description}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums" style={{ color: e.type === 'INFLOW' ? '#10b981' : '#ef4444' }}>{fmt(e.amount)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(e.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Add Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-bold mb-5" style={{ color: 'var(--text)' }}>{t('finance.add_cashflow_entry')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: t('common.type'), field: 'type', type: 'select', options: ['INFLOW', 'OUTFLOW'] },
                { label: t('finance.business_unit_col'), field: 'account', type: 'select', options: ACCOUNTS },
                { label: t('finance.source_col'), field: 'source', type: 'select', options: SOURCES },
                { label: t('common.date'), field: 'date', type: 'date' },
                { label: t('common.amount'), field: 'amount', type: 'number', placeholder: '0.00' },
                { label: t('common.description'), field: 'description', type: 'text', placeholder: '...' },
              ].map(({ label, field, type, options, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
                  {type === 'select' ? (
                    <select value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      placeholder={placeholder} required={field !== 'description'}
                      className="w-full px-3 py-2 rounded-xl text-sm"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-slate-400"
                  style={{ border: '1px solid var(--border)' }}>{t('common.cancel')}</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: '#004AFF', color: '#fff' }}>
                  {saving ? t('common.saving') : t('finance.add_entry')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
