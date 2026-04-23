'use client'
import { useEffect, useState } from 'react'
import api from '../../../lib/api'
import Navbar from '../../../components/Navbar'
import { Modal, Input, Select, Btn, Empty, Spinner } from '../../../components/ui'
import { Landmark, CreditCard, Banknote, FileText, Bitcoin, ArrowRightLeft, Coins } from 'lucide-react'
import { fmtDate } from '../../../lib/utils'
import { useLocale } from '../../../hooks/useLocale'

const METHODS = ['BANK_TRANSFER', 'CREDIT_CARD', 'CASH', 'CHEQUE', 'CRYPTO', 'OTHER']
const METHOD_ICONS = {
  BANK_TRANSFER: <Landmark size={14} className="inline mr-1 mb-[2px]" />,
  CREDIT_CARD: <CreditCard size={14} className="inline mr-1 mb-[2px]" />,
  CASH: <Banknote size={14} className="inline mr-1 mb-[2px]" />,
  CHEQUE: <FileText size={14} className="inline mr-1 mb-[2px]" />,
  CRYPTO: <Bitcoin size={14} className="inline mr-1 mb-[2px]" />,
  OTHER: <ArrowRightLeft size={14} className="inline mr-1 mb-[2px]" />
}
const fmtMoney = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

const EMPTY = { invoice_id: '', amount_paid: '', payment_method: 'BANK_TRANSFER', payment_date: '', reference_number: '', notes: '' }

export default function PaymentsPage() {
  const { t } = useLocale()
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [pagination, setPagination] = useState({})

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/payments')
      setPayments(data.payments); setPagination(data.pagination)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchInvoices = async () => {
    try {
      const { data } = await api.get('/invoices?limit=100')
      setInvoices(data.invoices.filter(i => ['SENT', 'OVERDUE', 'DRAFT'].includes(i.status)))
    } catch (e) { console.error(e) }
  }

  useEffect(() => { fetchPayments(); fetchInvoices() }, [])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/payments', form)
      setModalOpen(false); fetchPayments(); fetchInvoices()
    } catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const totalReceived = payments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0)

  return (
    <div>
      <Navbar title={t('finance.payments_title')} subtitle={`${pagination.total ?? 0} ${t('finance.payments_count')}`}
        action={<button onClick={() => { setForm(EMPTY); setModalOpen(true) }}
          className="px-4 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: '#C9FC0D', color: '#0D0E1A' }}>{t('finance.record_payment')}</button>}
      />

      {/* Total stat */}
      <div className="flex items-center gap-3 mb-6 px-5 py-4 rounded-2xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm" style={{ background: 'rgba(201,252,13,0.1)' }}>
          <Coins size={20} color="#C9FC0D" />
        </div>
        <div>
          <p className="text-xs text-slate-400">{t('finance.total_received')}</p>
          <p className="text-2xl font-bold" style={{ color: '#C9FC0D' }}>{fmtMoney(totalReceived)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[t('clients.title'), t('nav.invoices'), t('finance.amount_paid'), t('finance.payment_method'), t('common.date'), t('finance.reference_num')].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><Spinner /></td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={6}><Empty message={t('finance.no_payments')} /></td></tr>
            ) : payments.map(p => (
              <tr key={p.id} className="hover:bg-white/5 transition" style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{p.invoice?.client?.company || p.invoice?.client?.name || '—'}</p>
                  <p className="text-xs text-slate-500">{p.invoice?.client?.email}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm font-mono" style={{ color: '#004AFF' }}>{p.invoice?.invoice_number}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm font-bold" style={{ color: '#C9FC0D' }}>+{fmtMoney(p.amount_paid)}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-slate-300">{METHOD_ICONS[p.payment_method]} {p.payment_method.replace('_', ' ')}</span>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-400">{fmtDate(p.payment_date)}</td>
                <td className="px-5 py-3.5 text-sm text-slate-500 font-mono">{p.reference_number || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('finance.record_payment')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Select label={`${t('nav.invoices')} *`} value={form.invoice_id} onChange={e => setForm({...form, invoice_id: e.target.value})} required>
            <option value="">{t('finance.select_invoice')}</option>
            {invoices.map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} — {inv.client?.company || inv.client?.name} ({fmtMoney(inv.total_amount)})
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label={`${t('finance.amount_paid')} *`} type="number" step="0.01" value={form.amount_paid}
              onChange={e => setForm({...form, amount_paid: e.target.value})} required placeholder="5000" />
            <Select label={t('finance.payment_method')} value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
              {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('finance.payment_date')} type="date" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} />
            <Input label={t('finance.reference_num')} value={form.reference_number} onChange={e => setForm({...form, reference_number: e.target.value})} placeholder="TXN-00123" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('common.notes')}</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
              style={{ background: '#C9FC0D', color: '#0D0E1A' }}>
              {saving ? t('common.saving') : t('finance.record_payment')}
            </button>
            <Btn type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
