'use client'
import { useEffect, useState } from 'react'
import { Mail, Phone, MessageCircle } from 'lucide-react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Modal, Input, Btn, Empty, Spinner } from '../../components/ui'
import { useLocale } from '../../hooks/useLocale'

const EMPTY_FORM = { name: '', company: '', phone: '', whatsapp_phone: '', email: '' }

export default function ClientsPage() {
  const { t } = useLocale()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({})

  const fetchClients = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      const { data } = await api.get('/clients', { params })
      setClients(data.clients)
      setPagination(data.pagination)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchClients() }, [search])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name, company: c.company || '', phone: c.phone || '', whatsapp_phone: c.whatsapp_phone || '', email: c.email || '' })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) await api.put(`/clients/${editing.id}`, form)
      else await api.post('/clients', form)
      setModalOpen(false); fetchClients()
    } catch (err) { alert(err.response?.data?.error || t('errors.save_error')) }
    finally { setSaving(false) }
  }

  const fmt = (n) => n ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(n) : '—'

  return (
    <div>
      <Navbar title={t('clients.title')} subtitle={`${pagination.total ?? 0} ${t('clients.subtitle')}`}
        action={<Btn onClick={openCreate}>{t('clients.new_client')}</Btn>}
      />

      <div className="flex gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('clients.search')}
          className="flex-1 bg-[#111827] border border-slate-800 rounded-xl px-4 py-2.5 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
          style={{ color: 'var(--text)' }} />
      </div>

      {loading ? <Spinner /> : clients.length === 0 ? <Empty message={t('clients.no_clients')} /> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map(client => {
            const totalDeals = client.deals?.length || 0
            const totalValue = client.deals?.reduce((s, d) => s + parseFloat(d.value || 0), 0) || 0
            return (
              <div key={client.id} className="bg-[#111827] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/30 to-blue-600/30 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm flex-shrink-0">
                      {client.name[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{client.name}</h3>
                      <p className="text-xs text-slate-500">{client.company || t('clients.no_company')}</p>
                    </div>
                  </div>
                  <button onClick={() => openEdit(client)}
                    className="text-slate-600 hover:text-sky-400 transition opacity-0 group-hover:opacity-100">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  {client.email && <div className="flex items-center gap-2"><Mail size={12} className="text-slate-600 flex-shrink-0" /> {client.email}</div>}
                  {client.phone && <div className="flex items-center gap-2"><Phone size={12} className="text-slate-600 flex-shrink-0" /> {client.phone}</div>}
                  {client.whatsapp_phone && (
                    <div className="flex items-center gap-2">
                      <MessageCircle size={12} className="flex-shrink-0" style={{ color: '#25D366' }} />
                      <span>{client.whatsapp_phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between text-xs">
                  <span className="text-slate-500">{totalDeals} {t('clients.deals_count')}</span>
                  <span className="text-emerald-400 font-medium">{fmt(totalValue)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('clients.edit_client') : t('clients.new_client_modal')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={t('clients.full_name')} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder={t('clients.name_ph')} />
          <Input label={t('clients.company')} value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder={t('clients.company_ph')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('clients.email')} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder={t('clients.email_ph')} />
            <Input label={t('clients.phone')} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder={t('clients.phone_ph')} />
          </div>
          <Input label={t('clients.whatsapp')} value={form.whatsapp_phone} onChange={e => setForm({...form, whatsapp_phone: e.target.value})} placeholder={t('clients.whatsapp_ph')} />
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? t('common.saving') : editing ? t('clients.update_client') : t('clients.create_client')}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
