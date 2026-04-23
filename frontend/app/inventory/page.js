'use client'
import { useEffect, useState } from 'react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Modal, Input, Select, Btn, Empty, Spinner, StatCard } from '../../components/ui'
import { useLocale } from '../../hooks/useLocale'

const EMPTY_ADJUST = { product_id: '', warehouse_id: '', quantity_change: '', reason: '' }
const EMPTY_TRANSFER = { product_id: '', from_warehouse_id: '', to_warehouse_id: '', quantity: '' }
const EMPTY_WAREHOUSE = { name: '', location: '' }

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(Number(n) || 0)

function QtyDisplay({ quantity, minQuantity }) {
  const qty = Number(quantity)
  const min = Number(minQuantity)
  let color
  if (qty === 0) color = '#ef4444'
  else if (qty <= min) color = '#f59e0b'
  else color = '#10b981'
  return <span style={{ color, fontWeight: 700, fontSize: 14 }}>{qty}</span>
}

function StockStatusBadge({ isLowStock }) {
  const { t } = useLocale()
  return isLowStock
    ? <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{t('pos.stock_status_low')}</span>
    : <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{t('pos.stock_status_ok')}</span>
}

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-2.5 rounded-xl text-sm font-medium transition"
      style={{
        background: active ? '#004AFF' : 'transparent',
        color: active ? '#ffffff' : '#64748b',
        border: active ? 'none' : '1px solid transparent',
      }}
    >
      {label}
    </button>
  )
}

export default function InventoryPage() {
  const { t } = useLocale()
  const [inventory, setInventory] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [alerts, setAlerts] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [activeTab, setActiveTab] = useState('inventory')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [showLowOnly, setShowLowOnly] = useState(false)

  // Modals: null | 'adjust' | 'transfer' | 'warehouse'
  const [modal, setModal] = useState(null)
  const [adjustForm, setAdjustForm] = useState(EMPTY_ADJUST)
  const [transferForm, setTransferForm] = useState(EMPTY_TRANSFER)
  const [warehouseForm, setWarehouseForm] = useState(EMPTY_WAREHOUSE)
  const [formError, setFormError] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [invRes, whRes, alertRes, prodRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/inventory/warehouses'),
        api.get('/inventory/alerts').catch(() => ({ data: [] })),
        api.get('/products').catch(() => ({ data: [] })),
      ])
      setInventory(Array.isArray(invRes.data) ? invRes.data : invRes.data.inventory || [])
      setWarehouses(Array.isArray(whRes.data) ? whRes.data : whRes.data.warehouses || [])
      setAlerts(Array.isArray(alertRes.data) ? alertRes.data : alertRes.data.alerts || [])
      const prodData = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.products || []
      setProducts(prodData)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  // Derived stats
  const uniqueProducts = new Set(inventory.map(i => i.product_id)).size
  const lowStockCount = inventory.filter(i => i.is_low_stock).length
  const totalStockValue = inventory.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.product?.cost || 0)), 0)

  // Filtered inventory
  const filteredInventory = inventory.filter(i => {
    const matchWH = !warehouseFilter || String(i.warehouse_id) === warehouseFilter
    const matchLow = !showLowOnly || i.is_low_stock
    return matchWH && matchLow
  })

  const closeModal = () => { setModal(null); setFormError('') }

  const openAdjust = (item) => {
    setAdjustForm({
      product_id: item ? String(item.product_id) : '',
      warehouse_id: item ? String(item.warehouse_id) : '',
      quantity_change: '',
      reason: '',
    })
    setFormError('')
    setModal('adjust')
  }

  const openTransfer = () => {
    setTransferForm(EMPTY_TRANSFER)
    setFormError('')
    setModal('transfer')
  }

  const openWarehouse = () => {
    setWarehouseForm(EMPTY_WAREHOUSE)
    setFormError('')
    setModal('warehouse')
  }

  const handleAdjust = async (e) => {
    e.preventDefault()
    if (!adjustForm.product_id || !adjustForm.warehouse_id || adjustForm.quantity_change === '') {
      setFormError(t('pos.adjust_fields_required'))
      return
    }
    setSaving(true)
    setFormError('')
    try {
      await api.post('/inventory/adjust', {
        product_id: Number(adjustForm.product_id),
        warehouse_id: Number(adjustForm.warehouse_id),
        quantity_change: Number(adjustForm.quantity_change),
        reason: adjustForm.reason || undefined,
      })
      closeModal()
      fetchAll()
    } catch (err) {
      setFormError(err.response?.data?.error || t('pos.adjust_error'))
    } finally { setSaving(false) }
  }

  const handleTransfer = async (e) => {
    e.preventDefault()
    if (!transferForm.product_id || !transferForm.from_warehouse_id || !transferForm.to_warehouse_id || !transferForm.quantity) {
      setFormError(t('pos.transfer_fields_required'))
      return
    }
    if (transferForm.from_warehouse_id === transferForm.to_warehouse_id) {
      setFormError(t('pos.transfer_same_warehouse'))
      return
    }
    setSaving(true)
    setFormError('')
    try {
      await api.post('/inventory/transfer', {
        product_id: Number(transferForm.product_id),
        from_warehouse_id: Number(transferForm.from_warehouse_id),
        to_warehouse_id: Number(transferForm.to_warehouse_id),
        quantity: Number(transferForm.quantity),
      })
      closeModal()
      fetchAll()
    } catch (err) {
      setFormError(err.response?.data?.error || t('pos.transfer_error'))
    } finally { setSaving(false) }
  }

  const handleAddWarehouse = async (e) => {
    e.preventDefault()
    if (!warehouseForm.name.trim()) { setFormError(t('pos.warehouse_name_required_err')); return }
    setSaving(true)
    setFormError('')
    try {
      await api.post('/inventory/warehouses', {
        name: warehouseForm.name.trim(),
        location: warehouseForm.location.trim() || undefined,
      })
      closeModal()
      fetchAll()
    } catch (err) {
      setFormError(err.response?.data?.error || t('pos.add_warehouse_error'))
    } finally { setSaving(false) }
  }

  const setAF = (key, val) => setAdjustForm(f => ({ ...f, [key]: val }))
  const setTF = (key, val) => setTransferForm(f => ({ ...f, [key]: val }))
  const setWF = (key, val) => setWarehouseForm(f => ({ ...f, [key]: val }))

  // Warehouse product count helper
  const warehouseProductCount = (warehouseId) =>
    inventory.filter(i => i.warehouse_id === warehouseId).length

  return (
    <div>
      <Navbar
        title={t('pos.inventory_title')}
        subtitle={t('pos.inventory_subtitle')}
        action={
          <div className="flex gap-2 flex-wrap">
            <Btn onClick={openWarehouse} variant="ghost">{t('pos.add_warehouse')}</Btn>
            <Btn onClick={() => openAdjust(null)} variant="ghost">{t('pos.adjust_stock')}</Btn>
            <Btn onClick={openTransfer}>{t('pos.transfer_stock')}</Btn>
          </div>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t('pos.total_products_label')}
          value={uniqueProducts}
          color="sky"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
            </svg>
          }
        />
        <StatCard
          label={t('pos.low_stock_alerts_label')}
          value={lowStockCount}
          color={lowStockCount > 0 ? 'red' : 'emerald'}
          sub={lowStockCount > 0 ? t('pos.needs_attention_sub') : t('pos.all_stocked_up_sub')}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          label={t('pos.total_warehouses_label')}
          value={warehouses.length}
          color="violet"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          label={t('pos.total_stock_value_label')}
          value={fmt(totalStockValue)}
          color="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <TabBtn label={t('pos.tab_inventory')} active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
        <TabBtn label={t('pos.tab_warehouses')} active={activeTab === 'warehouses'} onClick={() => setActiveTab('warehouses')} />
        <TabBtn
          label={`${t('pos.tab_alerts')}${lowStockCount > 0 ? ` (${lowStockCount})` : ''}`}
          active={activeTab === 'alerts'}
          onClick={() => setActiveTab('alerts')}
        />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-5">
                <select
                  value={warehouseFilter}
                  onChange={e => setWarehouseFilter(e.target.value)}
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  className="rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition min-w-44"
                >
                  <option value="">{t('pos.all_warehouses')}</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={String(w.id)}>{w.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowLowOnly(v => !v)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2"
                  style={{
                    background: showLowOnly ? 'rgba(239,68,68,0.15)' : '#111827',
                    color: showLowOnly ? '#ef4444' : '#64748b',
                    border: `1px solid ${showLowOnly ? 'rgba(239,68,68,0.4)' : '#1e293b'}`,
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {t('pos.low_stock_only')}
                </button>
              </div>

              {filteredInventory.length === 0 ? (
                <Empty message={t('pos.no_inventory')} />
              ) : (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1e293b' }}>
                          {[t('pos.col_product'), t('pos.col_sku'), t('pos.warehouse_col'), t('pos.col_quantity'), t('pos.col_min_qty'), t('common.status'), t('common.actions')].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventory.map((item, i) => (
                          <tr
                            key={item.id}
                            style={{ borderBottom: i < filteredInventory.length - 1 ? '1px solid #0f172a' : 'none' }}
                            className="hover:bg-slate-800/20 transition"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                  style={{ background: 'rgba(0,74,255,0.15)', color: '#004AFF' }}
                                >
                                  {item.product?.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="font-medium" style={{ color: 'var(--text)' }}>{item.product?.name || '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{item.product?.sku || '—'}</td>
                            <td className="px-4 py-3">
                              <span
                                className="px-2 py-0.5 rounded-lg text-xs font-medium"
                                style={{ background: 'rgba(201,252,13,0.08)', color: '#C9FC0D' }}
                              >
                                {item.warehouse?.name || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <QtyDisplay quantity={item.quantity} minQuantity={item.min_quantity} />
                            </td>
                            <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{item.min_quantity ?? '—'}</td>
                            <td className="px-4 py-3">
                              <StockStatusBadge isLowStock={item.is_low_stock} />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => openAdjust(item)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                                style={{ background: 'rgba(0,74,255,0.15)', color: '#004AFF', border: '1px solid rgba(0,74,255,0.3)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,74,255,0.25)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,74,255,0.15)'}
                              >
                                {t('pos.adjust_btn')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* WAREHOUSES TAB */}
          {activeTab === 'warehouses' && (
            <>
              <div className="flex justify-end mb-5">
                <Btn onClick={openWarehouse}>{t('pos.add_warehouse')}</Btn>
              </div>
              {warehouses.length === 0 ? (
                <Empty message={t('pos.no_warehouses')} />
              ) : (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1e293b' }}>
                        {[t('common.name'), t('pos.col_location'), t('common.status'), t('nav.products')].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {warehouses.map((wh, i) => (
                        <tr
                          key={wh.id}
                          style={{ borderBottom: i < warehouses.length - 1 ? '1px solid #0f172a' : 'none' }}
                          className="hover:bg-slate-800/20 transition"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(201,252,13,0.1)', color: '#C9FC0D' }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <span className="font-medium" style={{ color: 'var(--text)' }}>{wh.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{wh.location || '—'}</td>
                          <td className="px-4 py-3">
                            {wh.is_active !== false
                              ? <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{t('common.active')}</span>
                              : <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{t('common.inactive')}</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="px-2 py-0.5 rounded-lg text-xs font-semibold"
                              style={{ background: 'rgba(0,74,255,0.12)', color: '#004AFF' }}
                            >
                              {warehouseProductCount(wh.id)} {t('pos.products_count_suffix_wh')}
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

          {/* ALERTS TAB */}
          {activeTab === 'alerts' && (
            <>
              {alerts.length > 0 && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>
                    {alerts.length === 1
                      ? t('pos.items_running_low_one', { count: 1 })
                      : t('pos.items_running_low_other', { count: alerts.length })}
                  </span>
                </div>
              )}
              {alerts.length === 0 ? (
                <div
                  className="flex items-center gap-3 px-4 py-4 rounded-xl"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <svg className="w-5 h-5" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span style={{ color: '#10b981', fontSize: 14, fontWeight: 600 }}>{t('pos.all_stocked_message')}</span>
                </div>
              ) : (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1e293b' }}>
                        {[t('pos.col_product'), t('pos.warehouse_col'), t('pos.col_current_stock'), t('pos.col_min_stock'), t('pos.col_deficit')].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map((alert, i) => {
                        const deficit = Number(alert.min_quantity) - Number(alert.quantity)
                        return (
                          <tr
                            key={alert.id}
                            style={{ borderBottom: i < alerts.length - 1 ? '1px solid #0f172a' : 'none' }}
                            className="hover:bg-slate-800/20 transition"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                  style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                                >
                                  {alert.product?.name?.[0]?.toUpperCase() || '!'}
                                </div>
                                <div>
                                  <p className="font-medium" style={{ color: 'var(--text)' }}>{alert.product?.name || '—'}</p>
                                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{alert.product?.sku || ''}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(201,252,13,0.08)', color: '#C9FC0D' }}>
                                {alert.warehouse?.name || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold" style={{ color: '#ef4444' }}>{alert.quantity}</td>
                            <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{alert.min_quantity}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                                -{deficit} {t('pos.units_suffix')}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Adjust Stock Modal */}
      <Modal open={modal === 'adjust'} onClose={closeModal} title={t('pos.adjust_stock_title')}>
        <form onSubmit={handleAdjust} className="space-y-4">
          <Select
            label={t('pos.product_required_label')}
            value={adjustForm.product_id}
            onChange={e => setAF('product_id', e.target.value)}
            required
          >
            <option value="">{t('pos.select_product_label')}</option>
            {products.map(p => (
              <option key={p.id} value={String(p.id)}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
            ))}
          </Select>
          <Select
            label={t('pos.warehouse_required_select')}
            value={adjustForm.warehouse_id}
            onChange={e => setAF('warehouse_id', e.target.value)}
            required
          >
            <option value="">{t('pos.select_warehouse_input')}</option>
            {warehouses.map(w => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </Select>
          <Input
            label={t('pos.quantity_change_label')}
            type="number"
            value={adjustForm.quantity_change}
            onChange={e => setAF('quantity_change', e.target.value)}
            placeholder={t('pos.qty_change_placeholder')}
          />
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#cbd5e1' }}>{t('pos.reason_label')}</label>
            <textarea
              value={adjustForm.reason}
              onChange={e => setAF('reason', e.target.value)}
              placeholder={t('pos.reason_placeholder')}
              rows={3}
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none transition"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
          {formError && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              {formError}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">
              {saving ? t('pos.adjusting_btn') : t('pos.apply_adjustment_btn')}
            </Btn>
            <Btn type="button" variant="ghost" onClick={closeModal}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>

      {/* Transfer Stock Modal */}
      <Modal open={modal === 'transfer'} onClose={closeModal} title={t('pos.transfer_stock_title')}>
        <form onSubmit={handleTransfer} className="space-y-4">
          <Select
            label={t('pos.product_required_label')}
            value={transferForm.product_id}
            onChange={e => setTF('product_id', e.target.value)}
            required
          >
            <option value="">{t('pos.select_product_label')}</option>
            {products.map(p => (
              <option key={p.id} value={String(p.id)}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
            ))}
          </Select>
          <Select
            label={t('pos.from_warehouse_label')}
            value={transferForm.from_warehouse_id}
            onChange={e => setTF('from_warehouse_id', e.target.value)}
            required
          >
            <option value="">{t('pos.select_source_warehouse')}</option>
            {warehouses.map(w => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </Select>
          <Select
            label={t('pos.to_warehouse_label')}
            value={transferForm.to_warehouse_id}
            onChange={e => setTF('to_warehouse_id', e.target.value)}
            required
          >
            <option value="">{t('pos.select_dest_warehouse')}</option>
            {warehouses.map(w => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </Select>
          <Input
            label={t('pos.quantity_required_label')}
            type="number"
            min="1"
            value={transferForm.quantity}
            onChange={e => setTF('quantity', e.target.value)}
            placeholder={t('pos.qty_num_placeholder')}
            required
          />
          {formError && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              {formError}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">
              {saving ? t('pos.transferring_btn') : t('pos.transfer_stock_btn')}
            </Btn>
            <Btn type="button" variant="ghost" onClick={closeModal}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>

      {/* Add Warehouse Modal */}
      <Modal open={modal === 'warehouse'} onClose={closeModal} title={t('pos.add_warehouse_title')}>
        <form onSubmit={handleAddWarehouse} className="space-y-4">
          <Input
            label={t('pos.warehouse_name_label')}
            value={warehouseForm.name}
            onChange={e => setWF('name', e.target.value)}
            placeholder={t('pos.warehouse_name_placeholder')}
            required
          />
          <Input
            label={t('pos.location_label')}
            value={warehouseForm.location}
            onChange={e => setWF('location', e.target.value)}
            placeholder={t('pos.location_placeholder')}
          />
          {formError && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              {formError}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">
              {saving ? t('pos.creating_warehouse_btn') : t('pos.create_warehouse_btn')}
            </Btn>
            <Btn type="button" variant="ghost" onClick={closeModal}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
