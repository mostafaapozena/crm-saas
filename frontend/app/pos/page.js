'use client'
import { useState, useEffect, useMemo } from 'react'
import api from '../../lib/api'
import { Modal, Btn, Input, Select, Spinner, Badge, Empty } from '../../components/ui'
import { X } from 'lucide-react'
import Navbar from '../../components/Navbar'
import { useLocale } from '../../hooks/useLocale'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

const TAX_OPTIONS = [
  { label: '0%', value: 0 },
  { label: '5%', value: 0.05 },
  { label: '10%', value: 0.1 },
  { label: '15%', value: 0.15 },
  { label: '20%', value: 0.2 },
]

const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'WALLET']

function StockBadge({ qty, t }) {
  if (qty === 0)
    return (
      <span
        style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
        className="text-xs px-1.5 py-0.5 rounded-md font-medium"
      >
        {t('pos.out_of_stock')}
      </span>
    )
  if (qty <= 10)
    return (
      <span
        style={{ background: 'rgba(234,179,8,0.15)', color: '#facc15' }}
        className="text-xs px-1.5 py-0.5 rounded-md font-medium"
      >
        {t('pos.low_stock', { qty })}
      </span>
    )
  return (
    <span
      style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}
      className="text-xs px-1.5 py-0.5 rounded-md font-medium"
    >
      {t('pos.in_stock', { qty })}
    </span>
  )
}

function QtyBtn({ onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        width: 28,
        height: 28,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

export default function POSPage() {
  const { t, dir } = useLocale()
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [cart, setCart] = useState([])
  const [discount, setDiscount] = useState(0)
  const [taxRate, setTaxRate] = useState(0.15)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [notes, setNotes] = useState('')

  const [checkingOut, setCheckingOut] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/products').catch(() => ({ data: [] })),
      api.get('/inventory/warehouses').catch(() => ({ data: [] })),
      api.get('/clients?limit=100').catch(() => ({ data: [] })),
    ]).then(([p, w, c]) => {
      const prods = Array.isArray(p.data) ? p.data : (p.data?.data || [])
      const whs = Array.isArray(w.data) ? w.data : (w.data?.data || [])
      const cls = Array.isArray(c.data) ? c.data : (c.data?.data || [])
      setProducts(prods)
      setWarehouses(whs)
      setClients(cls)
      if (whs.length > 0) setSelectedWarehouse(String(whs[0].id))
    }).finally(() => setLoading(false))
  }, [])

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
    )
  }, [products, search])

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients
    const q = clientSearch.toLowerCase()
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
  }, [clients, clientSearch])

  const addToCart = (product) => {
    if (product.inventory_total === 0) return
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id)
      if (idx !== -1) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 }
        return updated
      }
      return [...prev, { product, quantity: 1, price: product.price, discount: 0 }]
    })
  }

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    )
  }

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setDiscount(0)
    setNotes('')
    setSelectedCustomer('')
    setClientSearch('')
    setError('')
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const discountAmt = Math.min(Number(discount) || 0, subtotal)
  const taxable = subtotal - discountAmt
  const taxAmt = taxable * taxRate
  const total = taxable + taxAmt

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedWarehouse) return
    setCheckingOut(true)
    setError('')
    try {
      const body = {
        warehouse_id: Number(selectedWarehouse),
        customer_id: selectedCustomer ? Number(selectedCustomer) : undefined,
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          price: i.price,
          discount: 0,
        })),
        discount: discountAmt,
        tax_rate: taxRate,
        payment_method: paymentMethod,
        notes: notes || undefined,
      }
      const res = await api.post('/pos/sales', body)
      setReceipt(res.data)
    } catch (e) {
      setError(e.response?.data?.message || t('pos.checkout_failed'))
    } finally {
      setCheckingOut(false)
    }
  }

  const handleNewSale = () => {
    setReceipt(null)
    clearCart()
  }

  const formatPaymentMethod = (m) =>
    m === 'BANK_TRANSFER' ? 'Bank Transfer' : m.charAt(0) + m.slice(1).toLowerCase()

  if (loading)
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Navbar title={t('pos.title')} subtitle={t('pos.subtitle')} />
        <Spinner />
      </div>
    )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar title={t('pos.title')} subtitle={t('pos.subtitle')} />

      <div className="flex gap-4 h-[calc(100vh-80px)]" style={{ padding: '0 0 16px 0' }}>
        {/* ── LEFT COLUMN: Product Catalog ── */}
        <div className="flex flex-col flex-1 min-w-0" style={{ overflowY: 'auto' }}>
          {/* Search + Warehouse row */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <svg
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-secondary)', [dir === 'rtl' ? 'right' : 'left']: 12 }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('pos.search_barcode')}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 12,
                  padding: dir === 'rtl' ? '10px 36px 10px 12px' : '10px 12px 10px 36px',
                  width: '100%',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 14,
                minWidth: 180,
                outline: 'none',
              }}
            >
              <option value="">{t('pos.select_warehouse')}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product count */}
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            {filteredProducts.length === 1
              ? t('pos.products_count_one', { count: filteredProducts.length })
              : t('pos.products_count_other', { count: filteredProducts.length })}
            {search && ` ${t('pos.products_for_query', { query: search })}`}
          </p>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <Empty message={search ? t('pos.no_products_search') : t('pos.no_products_available')} />
          ) : (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
            >
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.product.id === product.id)
                const outOfStock = product.inventory_total === 0
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    style={{
                      background: inCart ? 'rgba(0,74,255,0.12)' : 'var(--surface)',
                      border: inCart ? '1px solid rgba(0,74,255,0.5)' : '1px solid var(--border)',
                      borderRadius: 14,
                      padding: '14px 14px 12px',
                      textAlign: dir === 'rtl' ? 'right' : 'left',
                      cursor: outOfStock ? 'not-allowed' : 'pointer',
                      opacity: outOfStock ? 0.5 : 1,
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    {inCart && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 10,
                          [dir === 'rtl' ? 'left' : 'right']: 10,
                          background: '#004AFF',
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {inCart.quantity}
                      </span>
                    )}
                    <p
                      className="font-semibold text-sm leading-tight mb-1"
                      style={{ color: 'var(--text)' }}
                    >
                      {product.name}
                    </p>
                    {product.category?.name && (
                      <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                        {product.category.name}
                      </p>
                    )}
                    <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {t('pos.sku_label')}: {product.sku || '—'}
                    </p>
                    <p
                      className="text-lg font-bold mb-2"
                      style={{ color: '#C9FC0D' }}
                    >
                      {fmt(product.price)}
                    </p>
                    <StockBadge qty={product.inventory_total ?? 0} t={t} />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Cart & Checkout ── */}
        <div
          className="flex flex-col"
          style={{
            width: 380,
            minWidth: 340,
            maxWidth: 420,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {/* Cart Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                style={{ color: '#C9FC0D' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>
                {t('pos.cart')}
              </span>
              {cartCount > 0 && (
                <span
                  style={{
                    background: '#004AFF',
                    color: '#ffffff',
                    borderRadius: 20,
                    padding: '1px 8px',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {cartCount}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                style={{ color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', background: 'none', border: 'none' }}
              >
                {t('pos.clear_all')}
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col px-4 py-3 gap-3" style={{ overflowY: 'auto' }}>
            {/* Cart Items */}
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--text-secondary)' }}>
                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-sm">{t('pos.cart_empty')}</p>
                <p className="text-xs mt-1 opacity-70">{t('pos.cart_empty_hint')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '10px 12px',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text)' }}>
                        {item.product.name}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        style={{
                          color: 'var(--text-secondary)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          flexShrink: 0,
                          padding: 2,
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QtyBtn onClick={() => updateQty(item.product.id, -1)}>−</QtyBtn>
                        <span className="text-sm font-semibold w-6 text-center" style={{ color: 'var(--text)' }}>
                          {item.quantity}
                        </span>
                        <QtyBtn
                          onClick={() => updateQty(item.product.id, 1)}
                          disabled={item.quantity >= (item.product.inventory_total ?? 9999)}
                        >
                          +
                        </QtyBtn>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          × {fmt(item.price)}
                        </span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#C9FC0D' }}>
                        {fmt(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Discount */}
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t('pos.discount_amount')}
              </label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  width: '100%',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            {/* Tax Rate */}
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t('pos.tax_rate')}
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  width: '100%',
                  fontSize: 14,
                  outline: 'none',
                }}
              >
                {TAX_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Totals */}
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '12px 14px',
              }}
            >
              {[
                { label: t('pos.subtotal'), value: fmt(subtotal), color: 'var(--text)' },
                { label: t('pos.discount'), value: `− ${fmt(discountAmt)}`, color: '#f87171' },
                {
                  label: `${t('pos.tax_rate')} (${Math.round(taxRate * 100)}%)`,
                  value: fmt(taxAmt),
                  color: 'var(--text-secondary)',
                },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center mb-2">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {row.label}
                  </span>
                  <span className="text-sm" style={{ color: row.color }}>
                    {row.value}
                  </span>
                </div>
              ))}
              <div
                className="flex justify-between items-center pt-2 mt-1"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                  {t('pos.total')}
                </span>
                <span className="text-xl font-bold" style={{ color: '#C9FC0D' }}>
                  {fmt(total)}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                {t('pos.payment_method')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    style={{
                      background: paymentMethod === m ? 'rgba(0,74,255,0.2)' : 'var(--bg)',
                      border:
                        paymentMethod === m
                          ? '1px solid rgba(0,74,255,0.6)'
                          : '1px solid var(--border)',
                      color: paymentMethod === m ? 'var(--text)' : 'var(--text-secondary)',
                      borderRadius: 10,
                      padding: '8px 10px',
                      fontSize: 12,
                      fontWeight: paymentMethod === m ? 700 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {formatPaymentMethod(m)}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer (optional) */}
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t('pos.customer_optional')}
              </label>
              <input
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value)
                  setSelectedCustomer('')
                }}
                placeholder={t('pos.search_client')}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  width: '100%',
                  fontSize: 14,
                  outline: 'none',
                  marginBottom: 4,
                }}
              />
              {clientSearch && !selectedCustomer && filteredClients.length > 0 && (
                <div
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    maxHeight: 140,
                    overflowY: 'auto',
                  }}
                >
                  {filteredClients.slice(0, 8).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(String(c.id))
                        setClientSearch(c.name)
                      }}
                      style={{
                        width: '100%',
                        textAlign: dir === 'rtl' ? 'right' : 'left',
                        padding: '8px 12px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text)',
                        fontSize: 13,
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <span>{c.name}</span>
                      {c.email && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: 11, marginLeft: dir === 'rtl' ? 0 : 8, marginRight: dir === 'rtl' ? 8 : 0 }}>
                          {c.email}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <div className="flex items-center gap-2 mt-1">
                  <span
                    style={{
                      background: 'rgba(0,74,255,0.15)',
                      color: '#93c5fd',
                      borderRadius: 8,
                      padding: '3px 10px',
                      fontSize: 12,
                    }}
                  >
                    {clientSearch}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedCustomer('')
                      setClientSearch('')
                    }}
                    style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t('pos.notes_optional')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('pos.add_note')}
                rows={2}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  width: '100%',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  textAlign: dir === 'rtl' ? 'right' : 'left',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#f87171',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Checkout Footer */}
          <div
            className="px-4 py-4 flex flex-col gap-2"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {!selectedWarehouse && (
              <p className="text-xs text-center" style={{ color: '#f87171' }}>
                {t('pos.select_warehouse_warning')}
              </p>
            )}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || !selectedWarehouse || checkingOut}
              style={{
                background:
                  cart.length === 0 || !selectedWarehouse
                    ? 'var(--surface-2)'
                    : '#004AFF',
                color:
                  cart.length === 0 || !selectedWarehouse ? 'var(--text-secondary)' : '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '13px 0',
                fontSize: 15,
                fontWeight: 700,
                cursor:
                  cart.length === 0 || !selectedWarehouse || checkingOut
                    ? 'not-allowed'
                    : 'pointer',
                width: '100%',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {checkingOut ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {t('pos.processing')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {t('pos.complete_sale')} · {fmt(total)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Receipt Modal ── */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md flex flex-col"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Receipt Header */}
            <div
              className="px-6 py-5 text-center"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(201,252,13,0.15)' }}
              >
                <svg
                  className="w-7 h-7"
                  style={{ color: '#C9FC0D' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                {t('pos.sale_complete')}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {receipt.sale_number || receipt.id
                  ? `#${receipt.sale_number || receipt.id}`
                  : ''}
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Items */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('pos.items')}
                </p>
                <div className="space-y-2">
                  {(receipt.items || cart).map((item, idx) => {
                    const name = item.product?.name || item.name || `Item ${idx + 1}`
                    const qty = item.quantity
                    const price = item.price
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span style={{ color: 'var(--text)' }}>
                          {name}
                          <span style={{ color: 'var(--text-secondary)' }}> × {qty}</span>
                        </span>
                        <span style={{ color: '#C9FC0D' }}>{fmt(price * qty)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Totals breakdown */}
              <div
                style={{
                  background: 'var(--bg)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  border: '1px solid var(--border)',
                }}
              >
                {[
                  { label: t('pos.subtotal'), value: fmt(receipt.subtotal ?? subtotal) },
                  { label: t('pos.discount'), value: `− ${fmt(receipt.discount ?? discountAmt)}` },
                  {
                    label: `${t('pos.tax_rate')} (${Math.round((receipt.tax_rate ?? taxRate) * 100)}%)`,
                    value: fmt(receipt.tax_amount ?? taxAmt),
                  },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between text-sm mb-2">
                    <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                    <span style={{ color: 'var(--text)' }}>{r.value}</span>
                  </div>
                ))}
                <div
                  className="flex justify-between items-center pt-2 mt-1"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <span className="font-bold" style={{ color: 'var(--text)' }}>
                    {t('pos.total_paid')}
                  </span>
                  <span className="text-xl font-bold" style={{ color: '#C9FC0D' }}>
                    {fmt(receipt.total ?? total)}
                  </span>
                </div>
              </div>

              {/* Payment method */}
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>{t('pos.payment_method')}</span>
                <span
                  style={{
                    background: 'rgba(0,74,255,0.15)',
                    color: '#93c5fd',
                    borderRadius: 8,
                    padding: '3px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {receipt.payment_method || paymentMethod}
                </span>
              </div>

              {receipt.created_at && (
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>{t('pos.date_time')}</span>
                  <span style={{ color: 'var(--text)' }}>
                    {new Date(receipt.created_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div
              className="flex gap-3 px-6 py-4"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 12,
                  padding: '11px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                {t('pos.print')}
              </button>
              <button
                onClick={handleNewSale}
                style={{
                  flex: 2,
                  background: '#004AFF',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: 12,
                  padding: '11px 0',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {t('pos.new_sale')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
