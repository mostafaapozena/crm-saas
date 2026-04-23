'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, RefreshCw, Database } from 'lucide-react'
import api from '../../../lib/api'
import Navbar from '../../../components/Navbar'
import { Spinner } from '../../../components/ui'
import { useLocale } from '../../../hooks/useLocale'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

function getPeriods(count = 6) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

const SOURCE_COLORS = {
  STOCK_PURCHASE: '#004AFF', MANUAL: '#f59e0b', pos: '#10b981',
}

export default function CogsPage() {
  const { t } = useLocale()
  const periods = getPeriods(6)
  const [period, setPeriod] = useState(periods[periods.length - 1])
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', source: 'manual', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.get(`/cogs?period=${period}`).then(r => {
      setEntries(r.data.entries || r.data)
      setTotal(r.data.total || 0)
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [period])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const r = await api.post('/cogs/sync', { period })
      alert(t('finance.cogs_synced', { count: r.data.synced || 0 }))
      load()
    } catch (err) { console.error(err) }
    finally { setSyncing(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/cogs', { ...form, amount: parseFloat(form.amount), period })
      setShowForm(false)
      setForm({ description: '', amount: '', source: 'manual', notes: '' })
      load()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('finance.delete_cogs_confirm'))) return
    await api.delete(`/cogs/${id}`)
    load()
  }

  return (
    <div>
      <Navbar title={t('nav.cogs')} subtitle={t('finance.cogs_subtitle')}
        action={
          <div className="flex items-center gap-2">
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? t('common.saving') : t('finance.sync_purchases')}
            </button>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#004AFF', color: '#fff' }}>
              <Plus size={16} /> {t('finance.manual_entry')}
            </button>
          </div>
        }
      />

      {/* Total Card */}
      <div className="mb-6 rounded-2xl border p-5 flex items-center gap-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Database size={24} className="text-red-400" />
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('finance.total_cogs_period', { period })}</p>
          <p className="text-3xl font-black text-red-400">{fmt(total)}</p>
        </div>
        <p className="ml-auto text-xs text-slate-500">{entries.length} {t('finance.entries')}</p>
      </div>

      {loading ? <Spinner /> : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Database size={32} className="text-slate-600" />
              <p className="text-slate-500 text-sm">{t('finance.no_cogs_entries')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {[t('finance.source_col'), t('common.description'), t('finance.product_col'), t('common.amount'), t('common.notes'), ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: `${SOURCE_COLORS[e.source] || '#64748b'}20`, color: SOURCE_COLORS[e.source] || '#64748b' }}>
                        {e.source === 'STOCK_PURCHASE' ? 'Purchase' : e.source === 'MANUAL' ? t('finance.manual_entry') : e.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{e.description}</td>
                    <td className="px-4 py-3 text-slate-400">{e.product?.name || '—'}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-red-400">{fmt(e.amount)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{e.notes || '—'}</td>
                    <td className="px-4 py-3">
                      {e.source === 'MANUAL' && (
                        <button onClick={() => handleDelete(e.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-bold mb-5" style={{ color: 'var(--text)' }}>{t('finance.manual_cogs_modal')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('common.description')}</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Direct materials cost" required
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('common.amount')}</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00" required
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('common.notes')}</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
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
