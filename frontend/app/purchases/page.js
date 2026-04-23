'use client'
import { useState, useEffect } from 'react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Modal, Btn, Input, Select, Spinner, StatCard, Badge, Empty } from '../../components/ui'
import { useLocale } from '../../hooks/useLocale'

const STATUS_COLORS = {
  PENDING: 'yellow',
  RECEIVED: 'green',
  CANCELLED: 'red',
}

const TAX_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '10', label: '10%' },
  { value: '15', label: '15%' },
]

const EMPTY_ITEM = { product_id: '', quantity: '', cost: '' }

export default function PurchasesPage() {
  const { t } = useLocale()
  const [purchases, setPurchases] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    warehouse_id: '',
    tax_rate: '0',
    notes: '',
    items: [{ ...EMPTY_ITEM }],
  })

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [pRes, wRes, prodRes] = await Promise.all([
        api.get('/pos-purchases'),
        api.get('/inventory/warehouses'),
        api.get('/products'),
      ])
      setPurchases(pRes.data || [])
      setWarehouses(wRes.data || [])
      setProducts(prodRes.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const filtered = statusFilter === 'ALL'
    ? purchases
    : purchases.filter(p => p.status === statusFilter)

  const stats = {
    total: purchases.length,
    pending: purchases.filter(p => p.status === 'PENDING').length,
    received: purchases.filter(p => p.status === 'RECEIVED').length,
    value: purchases.reduce((s, p) => s + (p.total || 0), 0),
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setItem = (i, k, v) => setForm(f => {
    const items = [...f.items]
    items[i] = { ...items[i], [k]: v }
    return { ...f, items }
  })
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const subtotal = form.items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.cost) || 0), 0)
  const taxAmt = subtotal * (parseFloat(form.tax_rate) / 100)
  const total = subtotal + taxAmt

  const openCreate = () => {
    setForm({ warehouse_id: '', tax_rate: '0', notes: '', items: [{ ...EMPTY_ITEM }] })
    setModal('create')
  }
  const openView = (p) => { setSelected(p); setModal('view') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleCreate = async () => {
    if (!form.warehouse_id) return alert(t('pos.select_warehouse_alert'))
    if (form.items.length === 0) return alert(t('pos.add_item_alert'))
    setSaving(true)
    try {
      await api.post('/pos-purchases', {
        warehouse_id: form.warehouse_id,
        tax_rate: parseFloat(form.tax_rate),
        notes: form.notes,
        items: form.items.map(it => ({
          product_id: it.product_id,
          quantity: parseFloat(it.quantity) || 0,
          cost: parseFloat(it.cost) || 0,
        })),
      })
      closeModal()
      fetchAll()
    } catch (e) {
      alert(e?.response?.data?.error || t('errors.save_error'))
    } finally {
      setSaving(false)
    }
  }

  const handleReceive = async (id) => {
    if (!confirm(t('pos.receive_confirm'))) return
    setSaving(true)
    try {
      await api.post(`/pos-purchases/${id}/receive`)
      closeModal()
      fetchAll()
    } catch (e) {
      alert(e?.response?.data?.error || t('errors.save_error'))
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const statusLabel = (s) => {
    if (s === 'ALL') return t('common.all')
    const map = { PENDING: t('pos.status_pending'), RECEIVED: t('pos.status_received'), CANCELLED: t('pos.status_cancelled') }
    return map[s] || s
  }

  const itemsLabel = (count) => {
    if (count === 1) return t('pos.items_count_one', { count })
    return t('pos.items_count_other', { count })
  }

  return (
    <div>
      <Navbar
        title={t('pos.purchases_title')}
        subtitle={t('pos.purchase_manage_subtitle')}
        action={
          <Btn onClick={openCreate} style={{ background: '#004AFF', color: '#fff' }}>
            {t('pos.new_purchase')}
          </Btn>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('pos.stat_total_purchases')} value={stats.total} />
        <StatCard label={t('pos.stat_pending')} value={stats.pending} />
        <StatCard label={t('pos.stat_received')} value={stats.received} />
        <StatCard label={t('pos.stat_total_value')} value={`$${fmt(stats.value)}`} />
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {['ALL', 'PENDING', 'RECEIVED', 'CANCELLED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={statusFilter === s
              ? { background: '#004AFF', color: '#fff' }
              : { background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            {statusLabel(s)}
          </button>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <Empty message={t('pos.no_purchases')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[
                    t('pos.col_purchase_num'),
                    t('pos.col_warehouse'),
                    t('pos.col_items'),
                    t('common.total'),
                    t('common.status'),
                    t('pos.col_created'),
                    t('common.actions'),
                  ].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => (
                  <tr key={p.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                    className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#C9FC0D' }}>{p.purchase_number}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{p.warehouse?.name || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{itemsLabel(p.items?.length || 0)}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text)' }}>${fmt(p.total)}</td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLORS[p.status] || 'gray'}>{statusLabel(p.status)}</Badge>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openView(p)}
                          className="text-xs px-3 py-1 rounded-lg font-medium transition"
                          style={{ background: 'rgba(0,74,255,0.15)', color: '#60a5fa' }}>
                          {t('pos.view')}
                        </button>
                        {p.status === 'PENDING' && (
                          <button onClick={() => handleReceive(p.id)}
                            className="text-xs px-3 py-1 rounded-lg font-medium transition"
                            style={{ background: 'rgba(201,252,13,0.12)', color: '#C9FC0D' }}>
                            {t('pos.receive')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={modal === 'create'} onClose={closeModal} title={t('pos.modal_new_purchase')}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('pos.warehouse_required_label')}</label>
            <Select value={form.warehouse_id} onChange={e => setField('warehouse_id', e.target.value)}>
              <option value="">— {t('pos.select_warehouse_opt')} —</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('pos.tax_rate')}</label>
            <Select value={form.tax_rate} onChange={e => setField('tax_rate', e.target.value)}>
              {TAX_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('common.notes')}</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder={t('pos.optional_notes_placeholder')}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('pos.col_items')}</label>
              <button onClick={addItem}
                className="text-xs px-3 py-1 rounded-lg font-medium"
                style={{ background: 'rgba(0,74,255,0.15)', color: '#60a5fa' }}>
                {t('pos.add_item')}
              </button>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center p-2 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <Select
                    value={item.product_id}
                    onChange={e => setItem(i, 'product_id', e.target.value)}
                    style={{ flex: 2, minWidth: 0 }}>
                    <option value="">— {t('pos.select_product_opt')} —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                  <input
                    type="number"
                    min="0"
                    placeholder={t('pos.qty_placeholder')}
                    value={item.quantity}
                    onChange={e => setItem(i, 'quantity', e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-lg text-sm text-center"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={t('pos.cost_placeholder_lbl')}
                    value={item.cost}
                    onChange={e => setItem(i, 'cost', e.target.value)}
                    className="w-20 px-2 py-1.5 rounded-lg text-sm text-center"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                  />
                  <button onClick={() => removeItem(i)}
                    className="text-lg leading-none flex-shrink-0"
                    style={{ color: 'var(--text-secondary)' }}>×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg p-3 space-y-1 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
              <span>{t('pos.subtotal')}</span><span style={{ color: 'var(--text)' }}>${fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
              <span>{t('pos.tax_label')} ({form.tax_rate}%)</span><span style={{ color: 'var(--text)' }}>${fmt(taxAmt)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-1 mt-1" style={{ borderColor: 'var(--border)', color: '#C9FC0D' }}>
              <span>{t('pos.total')}</span><span>${fmt(total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Btn onClick={closeModal} style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{t('common.cancel')}</Btn>
            <Btn onClick={handleCreate} disabled={saving} style={{ background: '#004AFF', color: '#fff' }}>
              {saving ? t('pos.creating_purchase') : t('pos.create_purchase_btn')}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={modal === 'view' && !!selected} onClose={closeModal} title={`${t('pos.purchases_title')} ${selected?.purchase_number || ''}`}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t('common.status')}</p>
                <Badge color={STATUS_COLORS[selected.status] || 'gray'}>{statusLabel(selected.status)}</Badge>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t('pos.col_warehouse')}</p>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{selected.warehouse?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t('pos.supplier')}</p>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{selected.supplier?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t('pos.col_created')}</p>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : '—'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>{t('pos.col_items')}</p>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      <th className="text-left px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{t('pos.col_product')}</th>
                      <th className="text-right px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{t('pos.col_quantity')}</th>
                      <th className="text-right px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{t('pos.col_cost')}</th>
                      <th className="text-right px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{t('pos.subtotal')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.items || []).map((it, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td className="px-3 py-2" style={{ color: 'var(--text)' }}>{it.product?.name || '—'}</td>
                        <td className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{it.quantity}</td>
                        <td className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>${fmt(it.cost)}</td>
                        <td className="px-3 py-2 text-right" style={{ color: 'var(--text)' }}>${fmt((it.quantity || 0) * (it.cost || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg p-3 space-y-1 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                <span>{t('pos.subtotal')}</span><span style={{ color: 'var(--text)' }}>${fmt(selected.subtotal)}</span>
              </div>
              <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                <span>{t('pos.tax_label')}</span><span style={{ color: 'var(--text)' }}>${fmt(selected.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-1 mt-1" style={{ borderColor: 'var(--border)', color: '#C9FC0D' }}>
                <span>{t('pos.total')}</span><span>${fmt(selected.total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Btn onClick={closeModal} style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{t('common.close')}</Btn>
              {selected.status === 'PENDING' && (
                <Btn onClick={() => handleReceive(selected.id)} disabled={saving}
                  style={{ background: 'rgba(201,252,13,0.15)', color: '#C9FC0D', border: '1px solid rgba(201,252,13,0.3)' }}>
                  {saving ? t('pos.processing') : t('pos.mark_received')}
                </Btn>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
