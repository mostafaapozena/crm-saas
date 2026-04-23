'use client'
import { useState, useEffect } from 'react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Modal, Btn, Input, Select, Spinner, StatCard, Badge, Empty } from '../../components/ui'
import { useLocale } from '../../hooks/useLocale'

const STATUS_COLORS = {
  PENDING: 'yellow',
  ASSIGNED: 'blue',
  IN_TRANSIT: 'purple',
  DELIVERED: 'green',
  FAILED: 'red',
}

const STATUS_TABS = ['ALL', 'PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED']
const STATUS_OPTIONS = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED']

export default function DeliveriesPage() {
  const { t } = useLocale()
  const [deliveries, setDeliveries] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [posSales, setPosSales] = useState([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [createForm, setCreateForm] = useState({ sale_id: '', address: '', notes: '' })
  const [assignForm, setAssignForm] = useState({ driver_id: '' })
  const [statusForm, setStatusForm] = useState({ status: '', notes: '' })

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [dRes, tRes, sRes] = await Promise.all([
        api.get('/deliveries'),
        api.get('/team'),
        api.get('/pos/sales?status=COMPLETED'),
      ])
      setDeliveries(dRes.data || [])
      setTeamMembers(tRes.data || [])
      setPosSales(sRes.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const filtered = statusFilter === 'ALL'
    ? deliveries
    : deliveries.filter(d => d.status === statusFilter)

  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'PENDING').length,
    inTransit: deliveries.filter(d => d.status === 'IN_TRANSIT').length,
    delivered: deliveries.filter(d => d.status === 'DELIVERED').length,
    failed: deliveries.filter(d => d.status === 'FAILED').length,
  }

  const openCreate = () => {
    setCreateForm({ sale_id: '', address: '', notes: '' })
    setModal('create')
  }
  const openAssign = (d) => {
    setSelected(d)
    setAssignForm({ driver_id: '' })
    setModal('assign')
  }
  const openStatus = (d) => {
    setSelected(d)
    setStatusForm({ status: d.status, notes: '' })
    setModal('status')
  }
  const openView = (d) => { setSelected(d); setModal('view') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleCreate = async () => {
    if (!createForm.sale_id) return alert(t('pos.select_sale_alert'))
    if (!createForm.address) return alert(t('pos.enter_address_alert'))
    setSaving(true)
    try {
      await api.post('/deliveries', {
        sale_id: createForm.sale_id,
        address: createForm.address,
        notes: createForm.notes,
      })
      closeModal()
      fetchAll()
    } catch (e) {
      alert(e?.response?.data?.error || t('errors.save_error'))
    } finally {
      setSaving(false)
    }
  }

  const handleAssign = async () => {
    if (!assignForm.driver_id) return alert(t('pos.select_driver_alert'))
    setSaving(true)
    try {
      await api.post(`/deliveries/${selected.id}/assign`, { driver_id: assignForm.driver_id })
      closeModal()
      fetchAll()
    } catch (e) {
      alert(e?.response?.data?.error || t('errors.save_error'))
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!statusForm.status) return alert(t('pos.select_status_alert'))
    setSaving(true)
    try {
      await api.put(`/deliveries/${selected.id}`, { status: statusForm.status, notes: statusForm.notes })
      closeModal()
      fetchAll()
    } catch (e) {
      alert(e?.response?.data?.error || t('errors.save_error'))
    } finally {
      setSaving(false)
    }
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString() : '—'
  const fmtDt = (d) => d ? new Date(d).toLocaleString() : '—'

  const statusLabel = (s) => {
    if (s === 'ALL') return t('common.all')
    return t(`pos.status_${s.toLowerCase().replace('_', '_')}`) || s
  }

  return (
    <div>
      <Navbar
        title={t('pos.deliveries_title')}
        subtitle={t('pos.delivery_subtitle')}
        action={
          <Btn onClick={openCreate} style={{ background: '#004AFF', color: '#fff' }}>
            {t('pos.new_delivery')}
          </Btn>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label={t('pos.stat_total')} value={stats.total} />
        <StatCard label={t('pos.stat_pending')} value={stats.pending} />
        <StatCard label={t('pos.stat_in_transit')} value={stats.inTransit} />
        <StatCard label={t('pos.stat_delivered')} value={stats.delivered} />
        <StatCard label={t('pos.stat_failed')} value={stats.failed} />
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={statusFilter === s
              ? { background: '#004AFF', color: '#fff' }
              : { background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            {s === 'ALL' ? t('common.all') : t(`pos.status_${s.toLowerCase()}`)}
          </button>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <Empty message={t('pos.no_deliveries')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[
                    t('pos.col_delivery_num'),
                    t('pos.col_sale_num'),
                    t('pos.col_address'),
                    t('pos.col_driver'),
                    t('common.status'),
                    t('pos.col_created'),
                    t('pos.col_delivered_at'),
                    t('common.actions'),
                  ].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, idx) => (
                  <tr key={d.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                    className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#C9FC0D' }}>{d.delivery_number}</td>
                    <td className="px-4 py-3" style={{ color: '#60a5fa' }}>{d.sale?.sale_number || '—'}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate" style={{ color: 'var(--text)' }} title={d.address}>{d.address || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text)' }}>
                      {d.driver?.name || <span style={{ color: 'var(--text-secondary)' }}>{t('pos.unassigned')}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLORS[d.status] || 'gray'}>{t(`pos.status_${(d.status || '').toLowerCase()}`)}</Badge>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{fmt(d.createdAt)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{fmt(d.delivered_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => openView(d)}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium transition"
                          style={{ background: 'rgba(0,74,255,0.15)', color: '#60a5fa' }}>
                          {t('pos.view')}
                        </button>
                        {!d.driver && (
                          <button onClick={() => openAssign(d)}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium transition"
                            style={{ background: 'rgba(201,252,13,0.12)', color: '#C9FC0D' }}>
                            {t('pos.assign')}
                          </button>
                        )}
                        <button onClick={() => openStatus(d)}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium transition"
                          style={{ background: 'var(--bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                          {t('common.status')}
                        </button>
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
      <Modal open={modal === 'create'} onClose={closeModal} title={t('pos.modal_new_delivery')}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('pos.sale_required')}</label>
            <Select value={createForm.sale_id} onChange={e => setCreateForm(f => ({ ...f, sale_id: e.target.value }))}>
              <option value="">— {t('pos.select_completed_sale')} —</option>
              {posSales.map(s => (
                <option key={s.id} value={s.id}>
                  {s.sale_number} — ${Number(s.total || 0).toFixed(2)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('pos.delivery_address_required')}</label>
            <Input
              value={createForm.address}
              onChange={e => setCreateForm(f => ({ ...f, address: e.target.value }))}
              placeholder={t('pos.address_placeholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('common.notes')}</label>
            <textarea
              rows={2}
              value={createForm.notes}
              onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
              placeholder={t('pos.optional_notes_placeholder')}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Btn onClick={closeModal} style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{t('common.cancel')}</Btn>
            <Btn onClick={handleCreate} disabled={saving} style={{ background: '#004AFF', color: '#fff' }}>
              {saving ? t('pos.creating_delivery') : t('pos.create_delivery_btn')}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Assign Driver Modal */}
      <Modal open={modal === 'assign'} onClose={closeModal} title={`${t('pos.assign_driver_title')} — ${selected?.delivery_number || ''}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('pos.driver_required')}</label>
            <Select value={assignForm.driver_id} onChange={e => setAssignForm(f => ({ ...f, driver_id: e.target.value }))}>
              <option value="">— {t('pos.select_team_member')} —</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name} {m.role ? `(${m.role.replace(/_/g, ' ')})` : ''}</option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Btn onClick={closeModal} style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{t('common.cancel')}</Btn>
            <Btn onClick={handleAssign} disabled={saving} style={{ background: '#004AFF', color: '#fff' }}>
              {saving ? t('pos.assigning') : t('pos.assign_driver_btn')}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal open={modal === 'status'} onClose={closeModal} title={`${t('pos.update_status_title')} — ${selected?.delivery_number || ''}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('common.status')} *</label>
            <Select value={statusForm.status} onChange={e => setStatusForm(f => ({ ...f, status: e.target.value }))}>
              <option value="">— {t('common.status')} —</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{t(`pos.status_${s.toLowerCase()}`)}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('common.notes')}</label>
            <textarea
              rows={2}
              value={statusForm.notes}
              onChange={e => setStatusForm(f => ({ ...f, notes: e.target.value }))}
              placeholder={t('pos.optional_notes_placeholder')}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Btn onClick={closeModal} style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{t('common.cancel')}</Btn>
            <Btn onClick={handleStatusUpdate} disabled={saving} style={{ background: '#004AFF', color: '#fff' }}>
              {saving ? t('pos.updating') : t('pos.update_status_btn')}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={modal === 'view' && !!selected} onClose={closeModal} title={`${t('pos.deliveries_title')} ${selected?.delivery_number || ''}`}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t('common.status')}</p>
                <Badge color={STATUS_COLORS[selected.status] || 'gray'}>{t(`pos.status_${(selected.status || '').toLowerCase()}`)}</Badge>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t('pos.col_sale_num')}</p>
                <p className="font-medium" style={{ color: '#60a5fa' }}>{selected.sale?.sale_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t('pos.col_driver')}</p>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{selected.driver?.name || t('pos.unassigned')}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t('pos.sale_total_label')}</p>
                <p className="font-medium" style={{ color: 'var(--text)' }}>${Number(selected.sale?.total || 0).toFixed(2)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t('pos.col_address')}</p>
                <p style={{ color: 'var(--text)' }}>{selected.address || '—'}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t('pos.col_created')}</p>
                <p style={{ color: 'var(--text)' }}>{fmt(selected.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t('pos.assigned_at')}</p>
                <p style={{ color: 'var(--text)' }}>{fmtDt(selected.assigned_at)}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t('pos.col_delivered_at')}</p>
                <p style={{ color: 'var(--text)' }}>{fmtDt(selected.delivered_at)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Btn onClick={closeModal} style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{t('common.close')}</Btn>
              {!selected.driver && (
                <Btn onClick={() => openAssign(selected)} style={{ background: 'rgba(201,252,13,0.12)', color: '#C9FC0D' }}>
                  {t('pos.assign_driver_btn')}
                </Btn>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
