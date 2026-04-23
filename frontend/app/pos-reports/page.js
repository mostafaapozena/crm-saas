'use client'
import { useState, useEffect } from 'react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Spinner, StatCard, Badge, Empty } from '../../components/ui'
import { useLocale } from '../../hooks/useLocale'

const TAB_KEYS = ['Sales', 'Inventory', 'Profit', 'Delivery']

const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>{children}</h3>
)

const DataTable = ({ columns, rows, keyField = 'id' }) => (
  <div className="rounded-xl overflow-hidden border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
    {rows.length === 0 ? (
      <Empty message="No data available" />
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {columns.map(c => (
                <th key={c.key} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)', textAlign: c.align || 'left' }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row[keyField] ?? idx}
                style={{ borderBottom: idx < rows.length - 1 ? '1px solid #1e2640' : 'none' }}
                className="hover:bg-white/5 transition">
                {columns.map(c => (
                  <td key={c.key} className="px-4 py-3"
                    style={{ color: c.accent ? '#C9FC0D' : c.primary ? '#fff' : '#64748b', textAlign: c.align || 'left', fontWeight: c.bold ? 600 : undefined }}>
                    {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtN = (n) => Number(n || 0).toLocaleString()

export default function PosReportsPage() {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState('Sales')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [salesData, setSalesData] = useState(null)
  const [inventoryData, setInventoryData] = useState(null)
  const [profitData, setProfitData] = useState(null)
  const [deliveryData, setDeliveryData] = useState(null)
  const [loading, setLoading] = useState(false)

  const TAB_LABELS = {
    Sales: t('pos.report_sales'),
    Inventory: t('pos.report_inventory'),
    Profit: t('pos.report_profit'),
    Delivery: t('pos.report_delivery'),
  }

  const fetchReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fromDate) params.set('from_date', fromDate)
      if (toDate) params.set('to_date', toDate)
      const qs = params.toString() ? `?${params}` : ''

      if (activeTab === 'Sales') {
        const res = await api.get(`/pos-reports/sales${qs}`)
        setSalesData(res.data)
      } else if (activeTab === 'Inventory') {
        const res = await api.get('/pos-reports/inventory')
        setInventoryData(res.data)
      } else if (activeTab === 'Profit') {
        const res = await api.get(`/pos-reports/profit${qs}`)
        setProfitData(res.data)
      } else if (activeTab === 'Delivery') {
        const res = await api.get('/pos-reports/delivery')
        setDeliveryData(res.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReport() }, [activeTab, fromDate, toDate])

  return (
    <div className="p-6 min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{t('pos.reports_title')}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('pos.reports_full_subtitle')}</p>
      </div>

      {/* Date Range + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        {/* Date pickers */}
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('pos.from_date')}</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', colorScheme: 'dark' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('pos.to_date')}</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 p-1 rounded-xl sm:ml-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {TAB_KEYS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={activeTab === tab
                ? { background: '#004AFF', color: '#fff' }
                : { color: 'var(--text-secondary)' }}>
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : (
        <>
          {/* ─── SALES TAB ─── */}
          {activeTab === 'Sales' && salesData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label={t('pos.total_sales_stat')} value={fmtN(salesData.summary?.total_sales)} />
                <StatCard label={t('pos.total_revenue_stat')} value={`$${fmt(salesData.summary?.total_revenue)}`} />
                <StatCard label={t('pos.total_discount_stat')} value={`$${fmt(salesData.summary?.total_discount)}`} />
                <StatCard label={t('pos.avg_sale_value_stat')} value={`$${fmt(salesData.summary?.avg_sale_value)}`} />
              </div>

              <div>
                <SectionTitle>{t('pos.by_payment_method')}</SectionTitle>
                <DataTable
                  columns={[
                    { key: 'method', label: t('pos.method_col'), primary: true, bold: true },
                    { key: 'count', label: t('pos.count_col'), align: 'right', render: v => fmtN(v) },
                    { key: 'total', label: t('pos.total_revenue_stat'), align: 'right', accent: true, render: v => `$${fmt(v)}` },
                  ]}
                  rows={salesData.by_payment_method || []}
                  keyField="method"
                />
              </div>

              <div>
                <SectionTitle>{t('pos.top_products_section')}</SectionTitle>
                <DataTable
                  columns={[
                    { key: 'name', label: t('pos.product_col'), primary: true, bold: true },
                    { key: 'total_qty', label: t('pos.qty_sold_col'), align: 'right', render: v => fmtN(v) },
                    { key: 'total_revenue', label: t('pos.revenue_col'), align: 'right', accent: true, render: v => `$${fmt(v)}` },
                  ]}
                  rows={salesData.top_products || []}
                  keyField="product_id"
                />
              </div>

              <div>
                <SectionTitle>{t('pos.daily_sales_section')}</SectionTitle>
                <DataTable
                  columns={[
                    { key: 'date', label: t('pos.date_col'), primary: true },
                    { key: 'count', label: t('pos.sales_count_col'), align: 'right', render: v => fmtN(v) },
                    { key: 'total', label: t('pos.revenue_col'), align: 'right', accent: true, render: v => `$${fmt(v)}` },
                  ]}
                  rows={salesData.daily_sales || []}
                  keyField="date"
                />
              </div>
            </div>
          )}

          {activeTab === 'Sales' && !salesData && !loading && (
            <div className="flex justify-center py-24"><Empty message={t('pos.no_sales_data')} /></div>
          )}

          {/* ─── INVENTORY TAB ─── */}
          {activeTab === 'Inventory' && inventoryData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label={t('pos.total_products_stat')} value={fmtN(inventoryData.summary?.total_products)} />
                <StatCard label={t('pos.low_stock_items_stat')} value={fmtN(inventoryData.summary?.low_stock_count)} />
                <StatCard label={t('pos.total_inventory_value_stat')} value={`$${fmt(inventoryData.summary?.total_value)}`} />
              </div>

              <div>
                <SectionTitle>{t('pos.by_warehouse_section')}</SectionTitle>
                <DataTable
                  columns={[
                    { key: 'warehouse_name', label: t('pos.warehouse_col'), primary: true, bold: true },
                    { key: 'products', label: t('pos.products_count_col'), align: 'right', render: v => fmtN(v) },
                    { key: 'total_qty', label: t('pos.total_qty_col'), align: 'right', render: v => fmtN(v) },
                    { key: 'total_value', label: t('pos.total_value_col'), align: 'right', accent: true, render: v => `$${fmt(v)}` },
                  ]}
                  rows={inventoryData.by_warehouse || []}
                  keyField="warehouse_id"
                />
              </div>

              <div>
                <SectionTitle>{t('pos.low_stock_items_stat')}</SectionTitle>
                <DataTable
                  columns={[
                    { key: 'name', label: t('pos.product_col'), primary: true, bold: true },
                    { key: 'sku', label: t('pos.col_sku') },
                    { key: 'warehouse', label: t('pos.warehouse_col') },
                    { key: 'quantity', label: t('pos.col_quantity'), align: 'right', render: (v) => (
                      <span style={{ color: '#f87171', fontWeight: 600 }}>{fmtN(v)}</span>
                    )},
                    { key: 'min_quantity', label: t('pos.col_min_qty'), align: 'right' },
                  ]}
                  rows={inventoryData.low_stock_items || []}
                  keyField="product_id"
                />
              </div>
            </div>
          )}

          {activeTab === 'Inventory' && !inventoryData && !loading && (
            <div className="flex justify-center py-24"><Empty message={t('pos.no_inventory_data')} /></div>
          )}

          {/* ─── PROFIT TAB ─── */}
          {activeTab === 'Profit' && profitData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label={t('pos.total_revenue_stat')} value={`$${fmt(profitData.total_revenue)}`} />
                <StatCard label={t('finance.total_cogs')} value={`$${fmt(profitData.total_cogs)}`} />
                <StatCard label={t('finance.gross_profit')} value={`$${fmt(profitData.gross_profit)}`} />
              </div>

              {/* Gross Margin % prominently */}
              <div className="rounded-xl p-6 flex items-center gap-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>{t('pos.gross_margin_label')}</p>
                  <p className="text-6xl font-extrabold leading-none" style={{ color: '#C9FC0D' }}>
                    {Number(profitData.gross_margin_pct || 0).toFixed(1)}
                    <span className="text-3xl ml-1" style={{ color: 'var(--text-secondary)' }}>%</span>
                  </p>
                </div>
                <div className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <p>{t('pos.revenue_label_small')} <span className="text-white font-medium">${fmt(profitData.total_revenue)}</span></p>
                  <p className="mt-1">{t('pos.cogs_label_small')} <span className="text-white font-medium">${fmt(profitData.total_cogs)}</span></p>
                  <p className="mt-1">{t('pos.profit_label_small')} <span style={{ color: '#C9FC0D', fontWeight: 600 }}>${fmt(profitData.gross_profit)}</span></p>
                </div>
              </div>

              <div>
                <SectionTitle>{t('pos.by_product_section')}</SectionTitle>
                <DataTable
                  columns={[
                    { key: 'name', label: t('pos.product_col'), primary: true, bold: true },
                    { key: 'revenue', label: t('pos.revenue_col'), align: 'right', render: v => `$${fmt(v)}` },
                    { key: 'cogs', label: t('pos.cogs_col'), align: 'right', render: v => `$${fmt(v)}` },
                    { key: 'profit', label: t('pos.profit_col'), align: 'right', accent: true, render: v => `$${fmt(v)}` },
                    { key: 'margin_pct', label: t('pos.margin_pct_col'), align: 'right', render: v => (
                      <span style={{ color: Number(v) >= 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                        {Number(v || 0).toFixed(1)}%
                      </span>
                    )},
                  ]}
                  rows={profitData.by_product || []}
                  keyField="product_id"
                />
              </div>
            </div>
          )}

          {activeTab === 'Profit' && !profitData && !loading && (
            <div className="flex justify-center py-24"><Empty message={t('pos.no_profit_data')} /></div>
          )}

          {/* ─── DELIVERY TAB ─── */}
          {activeTab === 'Delivery' && deliveryData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label={t('pos.total_deliveries_stat')} value={fmtN(deliveryData.summary?.total)} />
                <StatCard label={t('pos.stat_delivered')} value={fmtN(deliveryData.summary?.delivered)} />
                <StatCard label={t('pos.stat_pending')} value={fmtN(deliveryData.summary?.pending)} />
                <StatCard label={t('pos.stat_failed')} value={fmtN(deliveryData.summary?.failed)} />
              </div>

              {/* Avg Delivery Time */}
              {deliveryData.avg_delivery_time_hours != null && (
                <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>{t('pos.avg_delivery_time_label')}</p>
                    <p className="text-4xl font-extrabold" style={{ color: '#C9FC0D' }}>
                      {Number(deliveryData.avg_delivery_time_hours || 0).toFixed(1)}
                      <span className="text-xl ml-1.5" style={{ color: 'var(--text-secondary)' }}>{t('pos.hrs_suffix')}</span>
                    </p>
                  </div>
                </div>
              )}

              <div>
                <SectionTitle>{t('pos.by_status_section')}</SectionTitle>
                <DataTable
                  columns={[
                    { key: 'status', label: t('common.status'), primary: true, bold: true, render: v => (
                      <Badge color={{ PENDING: 'yellow', ASSIGNED: 'blue', IN_TRANSIT: 'purple', DELIVERED: 'green', FAILED: 'red' }[v] || 'gray'}>
                        {String(v || '').replace('_', ' ')}
                      </Badge>
                    )},
                    { key: 'count', label: t('pos.count_col'), align: 'right', accent: true, render: v => fmtN(v) },
                  ]}
                  rows={deliveryData.by_status || []}
                  keyField="status"
                />
              </div>
            </div>
          )}

          {activeTab === 'Delivery' && !deliveryData && !loading && (
            <div className="flex justify-center py-24"><Empty message={t('pos.no_delivery_data')} /></div>
          )}
        </>
      )}
    </div>
  )
}
