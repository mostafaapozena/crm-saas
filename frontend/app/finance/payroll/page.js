'use client'
import { useEffect, useState } from 'react'
import api from '../../../lib/api'
import Navbar from '../../../components/Navbar'
import { Modal, Input, Select, Btn, Empty, Spinner } from '../../../components/ui'
import { useLocale } from '../../../hooks/useLocale'

const fmtMoney = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
const MONTHS = ['2024-01','2024-02','2024-03','2024-04','2024-05','2024-06','2024-07','2024-08','2024-09','2024-10','2024-11','2024-12','2025-01','2025-02','2025-03','2025-04']
const EMPTY = { user_id: '', period: '', basic_salary: '', bonuses: '0', deductions: '0' }
const STATUS_CFG = {
  PENDING:   { bg: '#1e2640', text: '#64748b' },
  PROCESSED: { bg: 'rgba(0,74,255,0.12)', text: '#004AFF' },
  PAID:      { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
}

export default function PayrollPage() {
  const { t } = useLocale()
  const [payrolls, setPayrolls] = useState([])
  const [users, setUsers]       = useState([])
  const [totals, setTotals]     = useState({})
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [period, setPeriod]     = useState('')

  const fetch = async () => {
    setLoading(true)
    try {
      const params = period ? { period } : {}
      const { data } = await api.get('/payroll', { params })
      setPayrolls(data.payrolls); setTotals(data.totals || {})
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchUsers = async () => {
    const { data } = await api.get('/team').catch(() => ({ data: [] }))
    setUsers(Array.isArray(data) ? data : [])
  }

  useEffect(() => { fetch(); fetchUsers() }, [period])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/payroll', form); setModal(false); fetch() }
    catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const updateStatus = async (id, status) => {
    try { await api.put(`/payroll/${id}`, { status, paid_date: status === 'PAID' ? new Date().toISOString() : undefined }); fetch() }
    catch (e) { console.error(e) }
  }

  const net = parseFloat(form.basic_salary || 0) + parseFloat(form.bonuses || 0) - parseFloat(form.deductions || 0)

  return (
    <div>
      <Navbar title={t('finance.payroll_title')} subtitle={`${payrolls.length} ${t('finance.entries')}`}
        action={<button onClick={() => { setForm(EMPTY); setModal(true) }}
          className="px-4 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: '#004AFF' }}>{t('finance.new_payroll_entry')}</button>}
      />

      {/* Totals */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: t('finance.total_net'), val: fmtMoney(totals.totalNet), color: '#C9FC0D' },
          { label: t('finance.basic'), val: fmtMoney(totals.totalBasic), color: '#004AFF' },
          { label: t('finance.bonuses'), val: fmtMoney(totals.totalBonuses), color: '#10b981' },
          { label: t('finance.deductions'), val: fmtMoney(totals.totalDeductions), color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-6">
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-slate-300 text-sm focus:outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <option value="">{t('finance.all_periods')}</option>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[t('finance.employee'), t('common.period'), t('finance.basic'), t('finance.bonuses'), t('finance.deductions'), t('finance.net_salary'), t('common.status'), t('common.actions')].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><Spinner /></td></tr>
            ) : payrolls.length === 0 ? (
              <tr><td colSpan={8}><Empty message={t('finance.no_payroll')} /></td></tr>
            ) : payrolls.map(p => {
              const sc = STATUS_CFG[p.status] || STATUS_CFG.PENDING
              return (
                <tr key={p.id} className="hover:bg-white/5 transition" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{p.employee?.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{p.employee?.role?.toLowerCase().replace(/_/g, ' ')}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-mono text-slate-300">{p.period}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text)' }}>{fmtMoney(p.basic_salary)}</td>
                  <td className="px-5 py-3.5 text-sm text-green-400">+{fmtMoney(p.bonuses)}</td>
                  <td className="px-5 py-3.5 text-sm text-red-400">−{fmtMoney(p.deductions)}</td>
                  <td className="px-5 py-3.5 text-sm font-bold" style={{ color: '#C9FC0D' }}>{fmtMoney(p.net_salary)}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: sc.bg, color: sc.text }}>{t(`finance.payroll_${p.status.toLowerCase()}`)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {p.status === 'PENDING' && (
                      <button onClick={() => updateStatus(p.id, 'PAID')}
                        className="text-xs px-2 py-1 rounded-lg font-semibold transition"
                        style={{ background: 'rgba(201,252,13,0.12)', color: '#C9FC0D' }}>
                        {t('finance.mark_paid')}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={t('finance.add_payroll_modal')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Select label={`${t('finance.employee')} *`} value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} required>
            <option value="">{t('finance.select_employee')}</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role?.replace(/_/g, ' ')})</option>)}
          </Select>
          <Select label={`${t('common.period')} *`} value={form.period} onChange={e => setForm({...form, period: e.target.value})} required>
            <option value="">{t('finance.select_period')}</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
          <div className="grid grid-cols-3 gap-3">
            <Input label={`${t('finance.basic_salary')} *`} type="number" step="0.01" value={form.basic_salary}
              onChange={e => setForm({...form, basic_salary: e.target.value})} required placeholder="5000" />
            <Input label={t('finance.bonuses')} type="number" step="0.01" value={form.bonuses}
              onChange={e => setForm({...form, bonuses: e.target.value})} placeholder="0" />
            <Input label={t('finance.deductions')} type="number" step="0.01" value={form.deductions}
              onChange={e => setForm({...form, deductions: e.target.value})} placeholder="0" />
          </div>
          {form.basic_salary && (
            <div className="px-3 py-2 rounded-lg text-sm font-bold" style={{ background: 'rgba(201,252,13,0.1)', color: '#C9FC0D' }}>
              {t('finance.net_salary')}: {fmtMoney(net)}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? t('common.saving') : t('finance.add_entry')}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setModal(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
