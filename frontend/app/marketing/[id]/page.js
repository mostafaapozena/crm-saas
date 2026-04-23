'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '../../../lib/api'
import { Modal, Input, Btn, Spinner, Select } from '../../../components/ui'
import { useLocale } from '../../../hooks/useLocale'
import {
  Globe, Smartphone, Mail, MessageSquare, Ticket, Printer, ClipboardList,
  TrendingUp, TrendingDown, RefreshCw, Upload, Trash2, Image as ImageIcon, Film,
  DollarSign, MousePointer, Target, BarChart2,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const fmtMoney  = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
const fmtCompact = (n) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n || 0)
const fmtDate   = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

const STATUS_CFG = {
  DRAFT:     { color: 'var(--text-secondary)' },
  ACTIVE:    { color: '#C9FC0D' },
  PAUSED:    { color: '#f59e0b' },
  COMPLETED: { color: '#10b981' },
  CANCELLED: { color: '#ef4444' },
}

const PLATFORM_CFG = {
  META:   { color: '#1877F2', label: 'Meta Ads' },
  GOOGLE: { color: '#EA4335', label: 'Google Ads' },
  ALL:    { color: 'var(--muted)', label: 'All Platforms' },
}

const TYPE_ICONS = {
  DIGITAL: <Globe size={28} />, SOCIAL: <Smartphone size={28} />,
  EMAIL: <Mail size={28} />,    SMS: <MessageSquare size={28} />,
  EVENT: <Ticket size={28} />, PRINT: <Printer size={28} />,
  OTHER: <ClipboardList size={28} />,
}

const EMPTY_METRIC = { impressions: '', clicks: '', conversions: '', spend: '', revenue: '', date: '' }

const TooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 11 }

export default function CampaignDetailPage() {
  const { id } = useParams()
  const { t } = useLocale()
  const fileInputRef = useRef(null)

  const [campaign, setCampaign]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [metricModal, setMetricModal] = useState(false)
  const [metricForm, setMetricForm]   = useState(EMPTY_METRIC)
  const [saving, setSaving]           = useState(false)
  const [syncing, setSyncing]         = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [adCopy, setAdCopy]           = useState('')
  const [activeTab, setActiveTab]     = useState('analytics')

  const fetchCampaign = async () => {
    try {
      const { data } = await api.get(`/campaigns/${id}`)
      setCampaign(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCampaign() }, [id])

  const handleAddMetric = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/campaigns/metrics', { ...metricForm, campaign_id: id })
      setMetricModal(false); setMetricForm(EMPTY_METRIC); fetchCampaign()
    } catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.post(`/campaigns/${id}/sync`)
      await fetchCampaign()
      alert(t('marketing.sync_complete'))
    } catch { alert(t('errors.sync_failed')) }
    finally { setSyncing(false) }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (adCopy) formData.append('ad_copy', adCopy)
      await api.post(`/campaigns/${id}/creatives`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAdCopy('')
      await fetchCampaign()
    } catch (err) { alert(err.response?.data?.error || t('errors.upload_error')) }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const handleDeleteCreative = async (creativeId) => {
    if (!confirm(t('marketing.delete_creative_confirm'))) return
    try {
      await api.delete(`/campaigns/creatives/${creativeId}`)
      await fetchCampaign()
    } catch { alert(t('marketing.delete_creative_error')) }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
      <Spinner />
    </div>
  )
  if (!campaign) return null

  const { analytics: a, creatives = [], metrics = [] } = campaign
  const statusColor   = STATUS_CFG[campaign.status]?.color  || '#64748b'
  const platformCfg   = PLATFORM_CFG[campaign.platform || 'ALL']
  const budget        = parseFloat(campaign.budget || 0)
  const spent         = parseFloat(campaign.spent  || 0)
  const budgetPct     = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const roiPositive   = (a?.roi || 0) >= 0

  const spendChartData = metrics.slice(-14).map(m => ({
    date: fmtDate(m.date),
    Spend: parseFloat(m.spend),
    Revenue: parseFloat(m.revenue),
    Conversions: m.conversions,
  }))

  const roiChartData = metrics.slice(-14).map(m => {
    const s = parseFloat(m.spend); const r = parseFloat(m.revenue)
    return { date: fmtDate(m.date), ROI: s > 0 ? Math.round(((r - s) / s) * 100) : 0 }
  })

  const TABS = [
    { key: 'analytics',  label: t('marketing.tab_analytics') },
    { key: 'creatives',  label: t('marketing.tab_creatives') },
    { key: 'leads',      label: t('marketing.tab_leads') },
  ]

  const METRIC_HEADERS = [
    t('common.date'), t('marketing.impressions'), t('marketing.clicks'), t('marketing.ctr'),
    t('marketing.conversions'), t('marketing.spend_col'), t('marketing.revenue_col'), t('marketing.roi'),
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link href="/marketing"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition">
        {t('marketing.back_campaigns')}
      </Link>

      {/* Hero Header */}
      <div className="rounded-2xl border p-6 mb-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-slate-400">{TYPE_ICONS[campaign.type]}</span>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{campaign.title}</h1>
              <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                style={{ color: statusColor, background: `${statusColor}20` }}>
                {campaign.status}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                style={{ color: platformCfg.color, background: `${platformCfg.color}20` }}>
                {platformCfg.label}
              </span>
            </div>
            {campaign.description && (
              <p className="text-sm text-slate-400 max-w-2xl mb-3">{campaign.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              {campaign.client  && <span>{t('marketing.client_label')}: <span className="text-slate-300 font-medium">{campaign.client.name}</span></span>}
              {campaign.project && <span>{t('marketing.project_label')}: <span className="text-slate-300 font-medium">{campaign.project.title}</span></span>}
              {campaign.start_date && <span>{t('marketing.start_label')}: <span className="text-slate-300">{fmtDate(campaign.start_date)}</span></span>}
              {campaign.end_date   && <span>{t('marketing.end_label')}: <span className="text-slate-300">{fmtDate(campaign.end_date)}</span></span>}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {campaign.external_id && (
              <button onClick={handleSync} disabled={syncing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition disabled:opacity-50"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}>
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? t('marketing.syncing') : t('marketing.sync_now')}
              </button>
            )}
            <button onClick={() => setMetricModal(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: '#C9FC0D', color: '#0D0E1A' }}>
              {t('marketing.add_metrics')}
            </button>
          </div>
        </div>

        {/* Budget progress */}
        {budget > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>{t('marketing.budget_utilisation')}</span>
              <span>{fmtMoney(spent)} / {fmtMoney(budget)} ({budgetPct.toFixed(1)}%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full transition-all"
                style={{ width: `${budgetPct}%`, background: budgetPct > 90 ? '#ef4444' : '#004AFF' }} />
            </div>
            {budgetPct >= 90 && (
              <p className="text-[11px] text-red-400 mt-1">{t('marketing.budget_exhausted')}</p>
            )}
          </div>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('marketing.total_spend'),   val: fmtMoney(a?.totalSpend),        color: '#ef4444',  icon: <DollarSign size={18} /> },
          { label: t('marketing.total_revenue'),  val: fmtMoney(a?.totalRevenue),      color: '#10b981',  icon: <TrendingUp size={18} /> },
          { label: t('marketing.roi'),             val: `${a?.roi ?? 0}%`,             color: roiPositive ? '#C9FC0D' : '#ef4444', icon: roiPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} /> },
          { label: t('marketing.conversions'),     val: fmtCompact(a?.totalConversions), color: '#8b5cf6', icon: <Target size={18} /> },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl border p-5 flex items-center gap-4"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="p-2 rounded-xl" style={{ background: `${kpi.color}20`, color: kpi.color }}>{kpi.icon}</div>
            <div>
              <p className="text-xs text-slate-400">{kpi.label}</p>
              <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('marketing.impressions'), val: fmtCompact(a?.totalImpressions), color: 'var(--muted)' },
          { label: t('marketing.clicks'),       val: fmtCompact(a?.totalClicks),      color: '#004AFF' },
          { label: t('marketing.ctr'),          val: `${a?.ctr ?? 0}%`,              color: '#8b5cf6' },
          { label: t('marketing.cpc'),          val: fmtMoney(a?.cpc),               color: '#f59e0b' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl border p-4 text-center"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs text-slate-400 mb-1">{kpi.label}</p>
            <p className="text-lg font-bold" style={{ color: kpi.color }}>{kpi.val}</p>
          </div>
        ))}
      </div>

      {/* CPA highlight */}
      {(a?.cpa ?? 0) > 0 && (
        <div className="rounded-2xl border p-4 mb-6 flex items-center gap-4"
          style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.3)' }}>
          <MousePointer size={20} className="text-violet-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-400">{t('marketing.cpa')}</p>
            <p className="text-lg font-bold text-violet-400">{fmtMoney(a.cpa)}</p>
          </div>
          {a.dealRevenue > 0 && (
            <div className="ml-auto text-right">
              <p className="text-xs text-slate-500">{t('marketing.revenue_breakdown')}</p>
              <p className="text-xs text-slate-400">
                Metrics: {fmtMoney(a.metricRevenue)} &nbsp;·&nbsp;
                Deals: {fmtMoney(a.dealRevenue)}
                {a.projectRevenue > 0 && ` · Projects: ${fmtMoney(a.projectRevenue)}`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium capitalize transition border-b-2 -mb-px"
            style={activeTab === tab.key
              ? { color: 'var(--text)', borderColor: 'var(--brand-blue)', fontWeight: 600 }
              : { color: 'var(--text-secondary)', borderColor: 'transparent' }}>
            {tab.label}
            {tab.key === 'creatives' && creatives.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                {creatives.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Analytics Tab ── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {spendChartData.length > 0 ? (
            <>
              <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>{t('marketing.spend_vs_revenue')}</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={spendChartData}>
                    <defs>
                      <linearGradient id="spG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="rvG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={TooltipStyle} formatter={(v) => fmtMoney(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="Spend"   stroke="#ef4444" fill="url(#spG)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Revenue" stroke="#10b981" fill="url(#rvG)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>{t('marketing.conversions_chart')}</h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={spendChartData} barSize={20}>
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                      <Tooltip contentStyle={TooltipStyle} />
                      <Bar dataKey="Conversions" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>{t('marketing.roi_trend')}</h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={roiChartData}>
                      <defs>
                        <linearGradient id="roiG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C9FC0D" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#C9FC0D" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                      <Tooltip contentStyle={TooltipStyle} formatter={(v) => `${v}%`} />
                      <Area type="monotone" dataKey="ROI" stroke="#C9FC0D" fill="url(#roiG)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Metrics table */}
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <div className="px-5 py-4 border-b text-sm font-semibold"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  {t('marketing.metrics_history')}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-400">
                    <thead>
                      <tr className="border-b" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                        {METRIC_HEADERS.map(h => (
                          <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...metrics].reverse().map(m => {
                        const sp = parseFloat(m.spend); const rv = parseFloat(m.revenue)
                        const roi = sp > 0 ? Math.round(((rv - sp) / sp) * 100) : 0
                        const ctr = m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(1) : 0
                        return (
                          <tr key={m.id} className="border-b hover:bg-white/2 transition"
                            style={{ borderColor: 'var(--border)' }}>
                            <td className="px-4 py-3">{fmtDate(m.date)}</td>
                            <td className="px-4 py-3">{fmtCompact(m.impressions)}</td>
                            <td className="px-4 py-3">{fmtCompact(m.clicks)}</td>
                            <td className="px-4 py-3 text-violet-400">{ctr}%</td>
                            <td className="px-4 py-3 text-purple-400">{m.conversions}</td>
                            <td className="px-4 py-3 text-red-400">{fmtMoney(sp)}</td>
                            <td className="px-4 py-3 text-emerald-400">{fmtMoney(rv)}</td>
                            <td className="px-4 py-3 font-bold"
                              style={{ color: roi >= 0 ? '#C9FC0D' : '#ef4444' }}>
                              {roi}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border p-12 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <BarChart2 size={40} className="mx-auto mb-3 text-slate-600" />
              <p className="text-slate-500 text-sm">{t('marketing.no_metrics')}</p>
              <button onClick={() => setMetricModal(true)} className="mt-4 px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: '#004AFF', color: '#fff' }}>{t('marketing.add_first_metric')}</button>
            </div>
          )}
        </div>
      )}

      {/* ── Creatives Tab ── */}
      {activeTab === 'creatives' && (
        <div className="space-y-6">
          <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>{t('marketing.upload_creative')}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('marketing.ad_copy')}</label>
                <textarea value={adCopy} onChange={e => setAdCopy(e.target.value)} rows={2}
                  placeholder={t('marketing.ad_copy_ph')}
                  className="w-full rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none resize-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept="image/*,video/*"
                  onChange={handleFileUpload} className="hidden" id="creative-upload" />
                <label htmlFor="creative-upload"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition"
                  style={{ background: '#004AFF', color: '#fff', opacity: uploading ? 0.6 : 1 }}>
                  <Upload size={16} />
                  {uploading ? t('common.uploading') : t('marketing.select_file')}
                </label>
                <p className="text-xs text-slate-500">JPG, PNG, GIF, WebP, MP4, MOV, WebM — max 50 MB</p>
              </div>
            </div>
          </div>

          {creatives.length === 0 ? (
            <div className="rounded-2xl border p-12 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <ImageIcon size={36} className="mx-auto mb-3 text-slate-600" />
              <p className="text-slate-500 text-sm">{t('marketing.no_creatives')}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {creatives.map(c => (
                <div key={c.id} className="rounded-2xl border overflow-hidden group relative"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                  {c.type === 'VIDEO' ? (
                    <video src={c.file_url} controls className="w-full aspect-video object-cover bg-black" />
                  ) : (
                    <img src={c.file_url} alt="creative" className="w-full aspect-video object-cover bg-slate-800" />
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        {c.type === 'VIDEO' ? <Film size={12} /> : <ImageIcon size={12} />} {c.type}
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {c.ad_copy && <p className="text-xs text-slate-300 mt-1 line-clamp-2">{c.ad_copy}</p>}
                  </div>
                  <button onClick={() => handleDeleteCreative(c.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition"
                    style={{ background: 'rgba(239,68,68,0.8)' }}>
                    <Trash2 size={12} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Leads Tab ── */}
      {activeTab === 'leads' && (
        campaign.leads?.length > 0 ? (
          <div className="rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
            <div className="px-5 py-4 border-b text-sm font-semibold"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
              {t('marketing.leads_from_campaign', { count: campaign.leads.length })}
            </div>
            <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
              {campaign.leads.map(lead => (
                <div key={lead.id}
                  className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: '#004AFF' }}>
                      {lead.name[0]}
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{lead.name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs px-2 py-0.5 rounded text-slate-400"
                      style={{ background: 'var(--surface-2)' }}>{lead.stage}</span>
                    {lead.deal_value && (
                      <span className="text-sm font-semibold" style={{ color: '#C9FC0D' }}>
                        {fmtMoney(lead.deal_value)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border p-12 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-slate-500 text-sm">{t('marketing.no_leads')}</p>
          </div>
        )
      )}

      {/* Add Metrics Modal */}
      <Modal open={metricModal} onClose={() => setMetricModal(false)} title={t('marketing.add_metrics_modal')}>
        <form onSubmit={handleAddMetric} className="space-y-4">
          <Input label={t('common.date')} type="date" value={metricForm.date}
            onChange={e => setMetricForm({ ...metricForm, date: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('marketing.impressions')} type="number" value={metricForm.impressions}
              onChange={e => setMetricForm({ ...metricForm, impressions: e.target.value })} placeholder="10000" />
            <Input label={t('marketing.clicks')} type="number" value={metricForm.clicks}
              onChange={e => setMetricForm({ ...metricForm, clicks: e.target.value })} placeholder="500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label={t('marketing.conversions')} type="number" value={metricForm.conversions}
              onChange={e => setMetricForm({ ...metricForm, conversions: e.target.value })} placeholder="25" />
            <Input label={t('marketing.spend_label')} type="number" step="0.01" value={metricForm.spend}
              onChange={e => setMetricForm({ ...metricForm, spend: e.target.value })} placeholder="1200" />
            <Input label={t('marketing.revenue_label')} type="number" step="0.01" value={metricForm.revenue}
              onChange={e => setMetricForm({ ...metricForm, revenue: e.target.value })} placeholder="5000" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: '#C9FC0D', color: '#0D0E1A' }}>
              {saving ? t('common.saving') : t('marketing.save_metrics')}
            </button>
            <Btn type="button" variant="ghost" onClick={() => setMetricModal(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
