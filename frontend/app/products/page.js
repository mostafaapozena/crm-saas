'use client'
import { useEffect, useState } from 'react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Modal, Input, Select, Btn, Empty, Spinner, StatCard, Badge } from '../../components/ui'
import { useLocale } from '../../hooks/useLocale'

const EMPTY_PRODUCT = { name: '', sku: '', barcode: '', price: '', cost: '', category_id: '' }
const EMPTY_CATEGORY = { name: '' }

function StockBadge({ qty }) {
  if (qty === null || qty === undefined) {
    return <span style={{ background: 'var(--surface)', color: 'var(--text-secondary)', padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>N/A</span>
  }
  const n = Number(qty)
  let bg, color
  if (n === 0) { bg = 'rgba(239,68,68,0.15)'; color = '#ef4444' }
  else if (n <= 10) { bg = 'rgba(245,158,11,0.15)'; color = '#f59e0b' }
  else { bg = 'rgba(16,185,129,0.15)'; color = '#10b981' }
  return (
    <span style={{ background: bg, color, padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
      {n}
    </span>
  )
}

function StatusBadge({ active }) {
  const { t } = useLocale()
  return active
    ? <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{t('common.active')}</span>
    : <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{t('common.inactive')}</span>
}

const fmt = (n) => n !== undefined && n !== null && n !== ''
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n))
  : '—'

export default function ProductsPage() {
  const { t } = useLocale()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals: null | 'add' | 'edit' | 'category'
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)

  // Form state
  const [form, setForm] = useState(EMPTY_PRODUCT)
  const [catForm, setCatForm] = useState(EMPTY_CATEGORY)
  const [formError, setFormError] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/categories'),
      ])
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.products || [])
      setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data.categories || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  // Derived stats
  const totalProducts = products.length
  const activeProducts = products.filter(p => p.is_active).length
  const totalCategories = categories.length

  // Filtered list
  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)
    const matchCat = !categoryFilter || String(p.category?.id) === categoryFilter
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' && p.is_active) || (statusFilter === 'inactive' && !p.is_active)
    return matchSearch && matchCat && matchStatus
  })

  // Handlers
  const openAdd = () => {
    setSelected(null)
    setForm(EMPTY_PRODUCT)
    setFormError('')
    setModal('add')
  }

  const openEdit = (product) => {
    setSelected(product)
    setForm({
      name: product.name || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      price: product.price ?? '',
      cost: product.cost ?? '',
      category_id: product.category?.id ? String(product.category.id) : '',
    })
    setFormError('')
    setModal('edit')
  }

  const openCategory = () => {
    setCatForm(EMPTY_CATEGORY)
    setModal('category')
  }

  const closeModal = () => { setModal(null); setSelected(null) }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError(t('pos.product_name_required_err')); return }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        price: form.price !== '' ? Number(form.price) : undefined,
        cost: form.cost !== '' ? Number(form.cost) : undefined,
        category_id: form.category_id ? Number(form.category_id) : undefined,
      }
      if (modal === 'edit' && selected) {
        await api.put(`/products/${selected.id}`, payload)
      } else {
        await api.post('/products', payload)
      }
      closeModal()
      fetchAll()
    } catch (err) {
      setFormError(err.response?.data?.error || t('pos.product_save_error'))
    } finally { setSaving(false) }
  }

  const handleSaveCategory = async (e) => {
    e.preventDefault()
    if (!catForm.name.trim()) { setFormError(t('pos.category_name_required_err')); return }
    setSaving(true)
    setFormError('')
    try {
      await api.post('/products/categories', { name: catForm.name.trim() })
      closeModal()
      fetchAll()
    } catch (err) {
      setFormError(err.response?.data?.error || t('pos.category_save_error'))
    } finally { setSaving(false) }
  }

  const handleDelete = async (product) => {
    if (!confirm(t('pos.delete_product_confirm', { name: product.name }))) return
    try {
      await api.delete(`/products/${product.id}`)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.error || t('errors.delete_error'))
    }
  }

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div>
      <Navbar
        title={t('pos.products_title')}
        subtitle={t('pos.products_subtitle')}
        action={
          <div className="flex gap-2">
            <Btn onClick={openCategory} variant="ghost">{t('pos.add_category')}</Btn>
            <Btn onClick={openAdd}>{t('pos.add_product')}</Btn>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t('pos.total_products_label')}
          value={totalProducts}
          color="sky"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
            </svg>
          }
        />
        <StatCard
          label={t('pos.active_products_label')}
          value={activeProducts}
          color="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t('pos.inactive_products_label')}
          value={totalProducts - activeProducts}
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
        />
        <StatCard
          label={t('pos.categories_label')}
          value={totalCategories}
          color="violet"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('pos.search_sku_barcode')}
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          className="flex-1 min-w-48 rounded-xl px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          className="rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition min-w-40"
        >
          <option value="">{t('pos.all_categories')}</option>
          {categories.map(c => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          className="rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition"
        >
          <option value="all">{t('pos.all_status')}</option>
          <option value="active">{t('common.active')}</option>
          <option value="inactive">{t('common.inactive')}</option>
        </select>
      </div>

      {/* Products Table */}
      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty message={t('pos.no_products_empty')} />
      ) : (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  {[t('common.name'), t('pos.col_sku'), t('pos.col_barcode'), t('pos.category_label'), t('pos.col_price'), t('pos.col_cost'), t('pos.col_stock'), t('common.status'), t('common.actions')].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #0f172a' : 'none' }}
                    className="hover:bg-slate-800/20 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(0,74,255,0.2)', color: '#004AFF' }}
                        >
                          {p.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="font-medium" style={{ color: 'var(--text)' }}>{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.sku || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.barcode || '—'}</td>
                    <td className="px-4 py-3">
                      {p.category ? (
                        <span
                          className="px-2 py-0.5 rounded-lg text-xs font-medium"
                          style={{ background: 'rgba(201,252,13,0.1)', color: '#C9FC0D' }}
                        >
                          {p.category.name}
                        </span>
                      ) : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: '#10b981' }}>{fmt(p.price)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{fmt(p.cost)}</td>
                    <td className="px-4 py-3">
                      <StockBadge qty={p.inventory_total} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={p.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          style={{ background: 'rgba(0,74,255,0.15)', color: '#004AFF', border: '1px solid rgba(0,74,255,0.3)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,74,255,0.25)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,74,255,0.15)'}
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'edit' ? t('pos.edit_product_title') : t('pos.add_product_title')}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <Input
            label={t('pos.product_name_required')}
            value={form.name}
            onChange={e => setF('name', e.target.value)}
            placeholder={t('pos.product_name_placeholder')}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('pos.sku_label_input')}
              value={form.sku}
              onChange={e => setF('sku', e.target.value)}
              placeholder={t('pos.sku_placeholder')}
            />
            <Input
              label={t('pos.barcode_label')}
              value={form.barcode}
              onChange={e => setF('barcode', e.target.value)}
              placeholder={t('pos.barcode_placeholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('pos.price_label')}
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => setF('price', e.target.value)}
              placeholder="0.00"
            />
            <Input
              label={t('pos.cost_label')}
              type="number"
              min="0"
              step="0.01"
              value={form.cost}
              onChange={e => setF('cost', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <Select
            label={t('pos.category_label')}
            value={form.category_id}
            onChange={e => setF('category_id', e.target.value)}
          >
            <option value="">{t('pos.no_category')}</option>
            {categories.map(c => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </Select>

          {formError && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">
              {saving ? t('pos.saving_product') : modal === 'edit' ? t('pos.update_product_btn') : t('pos.create_product_btn')}
            </Btn>
            <Btn type="button" variant="ghost" onClick={closeModal}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal open={modal === 'category'} onClose={closeModal} title={t('pos.add_category_title')}>
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input
            label={t('pos.category_name_required')}
            value={catForm.name}
            onChange={e => setCatForm({ name: e.target.value })}
            placeholder={t('pos.category_name_placeholder')}
            required
          />
          {formError && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              {formError}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">
              {saving ? t('common.saving') : t('pos.create_category_btn')}
            </Btn>
            <Btn type="button" variant="ghost" onClick={closeModal}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
