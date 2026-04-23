'use client'
import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Modal, Input, Btn, Empty, Spinner } from '../../components/ui'
import { useLocale } from '../../hooks/useLocale'

const EMPTY = { name: '', contact_name: '', email: '', phone: '', address: '', category: '', notes: '' }

function StarRating({ rating = 1 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={12} fill={i < rating ? '#f59e0b' : 'none'} stroke={i < rating ? '#f59e0b' : '#475569'} />
      ))}
    </div>
  )
}

export default function ProcurementPage() {
  const { t } = useLocale()
  const [vendors, setVendors] = useState([])
  const [rfqs, setRfqs]       = useState([])
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('vendors')
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [v, r, o] = await Promise.all([
        api.get('/procurement/vendors').catch(() => ({ data: [] })),
        api.get('/procurement/rfqs').catch(() => ({ data: [] })),
        api.get('/procurement/orders').catch(() => ({ data: [] })),
      ])
      setVendors(Array.isArray(v.data) ? v.data : [])
      setRfqs(Array.isArray(r.data) ? r.data : [])
      setOrders(Array.isArray(o.data) ? o.data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/procurement/vendors', form); setModal(false); fetchAll() }
    catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const fmtMoney = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
  const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  const tabs = [
    { key: 'vendors', label: `${t('procurement.tab_vendors')} (${vendors.length})` },
    { key: 'rfqs',    label: `${t('procurement.tab_rfqs')} (${rfqs.length})` },
    { key: 'orders',  label: `${t('procurement.tab_orders')} (${orders.length})` },
  ]

  const VENDOR_HEADERS  = [t('procurement.vendor'), t('procurement.category'), t('procurement.contact'), t('procurement.tab_rfqs'), t('procurement.rating'), t('common.status')]
  const RFQ_HEADERS     = [t('common.name'), t('procurement.vendor'), t('procurement.deadline'), t('procurement.quotations'), t('common.status')]
  const ORDER_HEADERS   = [t('procurement.po_number'), t('procurement.vendor'), t('common.amount'), t('procurement.delivery'), t('common.status')]

  return (
    <div>
      <Navbar
        title={t('procurement.title')}
        subtitle={t('procurement.subtitle')}
        action={tab === 'vendors' && (
          <button onClick={() => { setForm(EMPTY); setModal(true) }}
            className="px-4 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: '#004AFF' }}>
            {t('procurement.new_vendor')}
          </button>
        )}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {tabs.map(tabItem => (
          <button key={tabItem.key} onClick={() => setTab(tabItem.key)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition"
            style={tab === tabItem.key ? { background: '#004AFF', color: '#fff' } : { color: 'var(--muted)' }}>
            {tabItem.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {tab === 'vendors' && (
            <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {VENDOR_HEADERS.map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendors.length === 0 ? (
                    <tr><td colSpan={6}><Empty message={t('procurement.no_vendors')} /></td></tr>
                  ) : vendors.map(v => (
                    <tr key={v.id} className="hover:bg-white/5 transition" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{v.name}</p>
                        <p className="text-xs text-slate-500">{v.email || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{v.category || '—'}</td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-300">{v.contact_name || '—'}</p>
                        <p className="text-xs text-slate-500">{v.phone || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-300">{v._count?.rfqs || 0}</td>
                      <td className="px-5 py-3.5"><StarRating rating={v.rating || 1} /></td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium"
                          style={{ background: v.status === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : v.status === 'BLACKLISTED' ? 'rgba(239,68,68,0.12)' : 'var(--surface-2)',
                            color: v.status === 'ACTIVE' ? '#10b981' : v.status === 'BLACKLISTED' ? '#ef4444' : 'var(--text-secondary)' }}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'rfqs' && (
            <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {RFQ_HEADERS.map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rfqs.length === 0 ? (
                    <tr><td colSpan={5}><Empty message={t('procurement.no_rfqs')} /></td></tr>
                  ) : rfqs.map(r => (
                    <tr key={r.id} className="hover:bg-white/5 transition" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-5 py-3.5 text-sm font-medium" style={{ color: 'var(--text)' }}>{r.title}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{r.vendor?.name}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{fmtDate(r.deadline)}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-300">{r.quotations?.length || 0}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'orders' && (
            <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {ORDER_HEADERS.map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={5}><Empty message={t('procurement.no_orders')} /></td></tr>
                  ) : orders.map(o => (
                    <tr key={o.id} className="hover:bg-white/5 transition" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-5 py-3.5 text-sm font-mono font-semibold" style={{ color: '#004AFF' }}>{o.po_number}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-300">{o.quotation?.rfq?.vendor?.name || '—'}</td>
                      <td className="px-5 py-3.5 text-sm font-bold" style={{ color: 'var(--text)' }}>{fmtMoney(o.amount)}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{fmtDate(o.delivery_date)}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium"
                          style={{ background: o.status === 'DELIVERED' ? 'rgba(16,185,129,0.12)' : 'var(--surface-2)',
                            color: o.status === 'DELIVERED' ? '#10b981' : 'var(--text-secondary)' }}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={t('procurement.add_vendor_modal')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={t('procurement.vendor_name')} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder={t('procurement.vendor_ph')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('procurement.contact_name')} value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} placeholder={t('procurement.contact_ph')} />
            <Input label={t('procurement.category')} value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder={t('procurement.category_ph')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('common.email')} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="vendor@company.com" />
            <Input label={t('common.phone')} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+1-555-0100" />
          </div>
          <Input label={t('procurement.address')} value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder={t('procurement.address_ph')} />
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? t('common.saving') : t('procurement.add_vendor_modal')}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setModal(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
