'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Modal, Input, Select, Btn, Empty, Spinner } from '../../components/ui'
import {
  Globe, Smartphone, Mail, MessageSquare, Ticket, Printer, ClipboardList,
  TrendingUp, TrendingDown, Zap, Target, DollarSign, BarChart2,
} from 'lucide-react'
import { useLocale } from '../../hooks/useLocale'

const TYPES     = ['DIGITAL', 'SOCIAL', 'EMAIL', 'SMS', 'EVENT', 'PRINT', 'OTHER']
const STATUSES  = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']
const PLATFORMS = ['ALL', 'META', 'GOOGLE']

const fmtMoney = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(n || 0)
const fmtNum   = (n) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n || 0)

const STATUS_CFG = {
  DRAFT:     { bg: '#1e2640',               text: '#64748b' },
  ACTIVE:    { bg: 'rgba(201,252,13,0.12)', text: '#C9FC0D' },
  PAUSED:    { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  COMPLETED: { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
  CANCELLED: { bg: 'rgba(239,68,68,0.12)',  text: '#ef4444' },
}

const PLATFORM_CFG = {
  META:   { bg: 'rgba(24,119,242,0.15)',  text: '#1877F2', label: 'Meta' },
  GOOGLE: { bg: 'rgba(234,67,53,0.15)',   text: '#EA4335', label: 'Google' },
  ALL:    { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8', label: 'All Platforms' },
}

const TYPE_ICONS = {
  DIGITAL: <Globe size={16} />, SOCIAL: <Smartphone size={16} />,
  EMAIL: <Mail size={16} />,    SMS: <MessageSquare size={16} />,
  EVENT: <Ticket size={16} />,  PRINT: <Printer size={16} />,
  OTHER: <ClipboardList size={16} />,
}

const EMPTY_FORM = {
  title: '', description: '', type: 'DIGITAL', platform: 'ALL',
  status: 'DRAFT', budget: '', daily_budget: '',
  start_date: '', end_date: '', client_id: '', project_id: '', external_id: '',
}

export default function MarketingPage() {
  const { t } = useLocale()
  const [campaigns, setCampaigns]   = useState([])
  const [clients, setClients]       = useState([])
  const [projects, setProjects]     = useState([])
  const [summary, setSummary]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [pagination, setPagination] = useState({})
  const [filters, setFilters]       = useState({ platform: '', status: '' })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.platform) params.set('platform', filters.platform)
      if (filters.status)   params.set('status',   filters.status)
      const [cRes, clRes, prRes, sRes] = await Promise.all([
        api.get(`/campaigns?${params}`),
        api.get('/clients'),
        api.get('/projects'),
        api.get('/campaigns/summary').catch(() => ({ data: null })),
      ])
      setCampaigns(cRes.data.campaigns)
      setPagination(cRes.data.pagination)
      setClients(clRes.data.clients || clRes.data || [])
      setProjects(prRes.data.projects || prRes.data || [])
      setSummary(sRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({
      title: c.title, description: c.description || '',
      type: c.type, platform: c.platform || 'ALL', status: c.status,
      budget: c.budget || '', daily_budget: c.daily_budget || '',
      start_date: c.start_date?.split('T')[0] || '',
      end_date:   c.end_date?.split('T')[0]   || '',
      client_id:  c.client_id  || '',
      project_id: c.project_id || '',
      external_id: c.external_id || '',
    })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.client_id) { alert(t('marketing.client_required')); setSaving(false); return }
      if (editing) await api.put(`/campaigns/${editing.id}`, payload)
      else         await api.post('/campaigns', payload)
      setModal(false); fetchAll()
    } catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('marketing.delete_confirm'))) return
    try { await api.delete(`/campaigns/${id}`); fetchAll() }
    catch { alert(t('errors.delete_error')) }
  }

  const ov = summary?.overview

  return (
    <div>
      <Navbar
        title={t('dashboard.marketing_intelligence')}
        subtitle={`${pagination.total ?? 0} ${t('marketing.subtitle')}`}
        action={
          <button onClick={openCreate}
            className="px-4 py-2.5 rounded-xl text-white text-sm font-bold"
            style={{ background: '#004AFF' }}>
            {t('marketing.new_campaign')}
          </button>
        }
      />

      {ov && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: t('marketing.total_spend'),    val: fmtMoney(ov.totalSpent),       icon: <DollarSign size={16} />, color: '#ef4444' },
            { label: t('marketing.total_revenue'),  val: fmtMoney(ov.totalRevenue),     icon: <TrendingUp size={16} />, color: '#10b981' },
            { label: t('marketing.overall_roi'),    val: `${ov.overallROI}%`,           icon: <BarChart2 size={16} />,  color: ov.overallROI >= 0 ? '#C9FC0D' : '#ef4444' },
            { label: t('marketing.conversions'),    val: fmtNum(ov.totalConversions),   icon: <Target size={16} />,     color: '#8b5cf6' },
            { label: t('marketing.best_platform'),  val: ov.bestPlatform,               icon: <Zap size={16} />,        color: '#004AFF' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-slate-500">{s.label}</p>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mb-5 flex-wrap">
        {['', 'META', 'GOOGLE', 'ALL'].map(p => (
          <button key={p || 'all'}
            onClick={() => setFilters(f => ({ ...f, platform: p }))}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
            style={filters.platform === p
              ? { background: '#004AFF', color: '#fff', borderColor: '#004AFF' }
              : { background: 'var(--surface)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
            {p || t('marketing.all_platforms')}
          </button>
        ))}
        <div className="ml-auto">
          <select value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="text-xs rounded-lg px-3 py-1.5 text-slate-300 border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <option value="">{t('marketing.all_statuses')}</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? <Spinner /> : campaigns.length === 0 ? <Empty message={t('marketing.no_campaigns')} /> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map(c => {
            const sc  = STATUS_CFG[c.status]  || STATUS_CFG.DRAFT
            const plc = PLATFORM_CFG[c.platform || 'ALL']
            const budget = parseFloat(c.budget || 0)
            const spent  = parseFloat(c.spent  || 0)
            const pct    = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
            const roi    = c.roi ?? 0
            const roiPositive = roi >= 0
            return (
              <div key={c.id}
                className="rounded-2xl border p-5 hover:border-slate-600 transition group flex flex-col"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-slate-400">{TYPE_ICONS[c.type]}</span>
                      <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{c.title}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                        style={{ background: sc.bg, color: sc.text }}>{c.status}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                        style={{ background: plc.bg, color: plc.text }}>{plc.label}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2 text-center">
                    <div className="flex items-center gap-0.5 text-xs font-bold"
                      style={{ color: roiPositive ? '#C9FC0D' : '#ef4444' }}>
                      {roiPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {roi}%
                    </div>
                    <p className="text-[9px] text-slate-500">{t('marketing.roi')}</p>
                  </div>
                </div>

                {(c.client || c.project) && (
                  <div className="mb-3 text-[11px] text-slate-500 space-y-0.5">
                    {c.client  && <p>{t('marketing.client_label')}: <span className="text-slate-300">{c.client.name}</span></p>}
                    {c.project && <p>{t('marketing.project_label')}: <span className="text-slate-300">{c.project.title}</span></p>}
                  </div>
                )}

                <div className="space-y-2 text-xs text-slate-400 mb-4">
                  <div className="flex justify-between">
                    <span>{t('marketing.budget')}</span>
                    <span className="font-medium" style={{ color: 'var(--text)' }}>{fmtMoney(budget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('marketing.spent')}</span>
                    <span style={{ color: '#ef4444' }} className="font-medium">{fmtMoney(spent)}</span>
                  </div>
                  <div className="bg-slate-800 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: pct > 90 ? '#ef4444' : '#004AFF' }} />
                  </div>
                  <div className="flex justify-between">
                    <span>{t('marketing.conversions')}</span>
                    <span style={{ color: '#8b5cf6' }} className="font-bold">{fmtNum(c.totalConversions || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('marketing.leads_label')}</span>
                    <span style={{ color: '#C9FC0D' }} className="font-bold">{c._count?.leads || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto opacity-0 group-hover:opacity-100 transition">
                  <Link href={`/marketing/${c.id}`}
                    className="flex-1 text-center text-xs py-2 rounded-lg transition font-medium"
                    style={{ background: '#004AFF', color: '#fff' }}>
                    {t('common.details')}
                  </Link>
                  <button onClick={() => openEdit(c)}
                    className="px-3 text-xs py-2 rounded-lg text-slate-300 hover:text-white transition"
                    style={{ background: 'var(--surface-2)' }}>{t('common.edit')}</button>
                  <button onClick={() => handleDelete(c.id)}
                    className="px-3 text-xs py-2 rounded-lg text-red-400 hover:text-red-300 transition"
                    style={{ background: 'var(--surface-2)' }}>{t('common.delete')}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? t('marketing.edit_campaign') : t('marketing.new_campaign')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={t('marketing.campaign_title')} value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} required placeholder={t('marketing.title_ph')} />
          <Select label={t('marketing.client_required_label')} value={form.client_id}
            onChange={e => setForm({ ...form, client_id: e.target.value })} required>
            <option value="">{t('marketing.select_client')}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
          </Select>
          <Select label={t('marketing.project_optional')} value={form.project_id}
            onChange={e => setForm({ ...form, project_id: e.target.value })}>
            <option value="">{t('marketing.no_project')}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('common.description')}</label>
            <textarea value={form.description} rows={2} placeholder={t('marketing.desc_ph')}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select label={t('common.type')} value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}>
              {TYPES.map(tp => <option key={tp} value={tp}>{tp}</option>)}
            </Select>
            <Select label={t('marketing.platform')} value={form.platform}
              onChange={e => setForm({ ...form, platform: e.target.value })}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Select label={t('common.status')} value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('marketing.budget_label')} type="number" value={form.budget}
              onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="10000" />
            <Input label={t('marketing.daily_budget')} type="number" value={form.daily_budget}
              onChange={e => setForm({ ...form, daily_budget: e.target.value })} placeholder="500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('projects.start_date')} type="date" value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })} />
            <Input label={t('projects.end_date')} type="date" value={form.end_date}
              onChange={e => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <Input label={t('marketing.external_id')} value={form.external_id}
            onChange={e => setForm({ ...form, external_id: e.target.value })}
            placeholder={t('marketing.external_id_ph')} />
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">
              {saving ? t('common.saving') : editing ? t('marketing.update_campaign') : t('marketing.create_campaign')}
            </Btn>
            <Btn type="button" variant="ghost" onClick={() => setModal(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
