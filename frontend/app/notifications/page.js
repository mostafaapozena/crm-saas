'use client'
import { useEffect, useState } from 'react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import { Spinner, Empty } from '../../components/ui'
import { Info, CheckCircle, AlertTriangle, XCircle, ClipboardList, Coins, CreditCard, Bell } from 'lucide-react'
import { useLocale } from '../../hooks/useLocale'

const TYPE_CFG = {
  INFO:    { bg: 'rgba(0,74,255,0.1)',   text: '#004AFF', icon: <Info size={18} color="#004AFF" /> },
  SUCCESS: { bg: 'rgba(16,185,129,0.1)', text: '#10b981', icon: <CheckCircle size={18} color="#10b981" /> },
  WARNING: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', icon: <AlertTriangle size={18} color="#f59e0b" /> },
  ERROR:   { bg: 'rgba(239,68,68,0.1)',  text: '#ef4444', icon: <XCircle size={18} color="#ef4444" /> },
  TASK:    { bg: 'rgba(139,92,246,0.1)', text: '#8b5cf6', icon: <ClipboardList size={18} color="#8b5cf6" /> },
  DEAL:    { bg: 'rgba(201,252,13,0.1)', text: '#C9FC0D', icon: <Coins size={18} color="#C9FC0D" /> },
  PAYMENT: { bg: 'rgba(16,185,129,0.1)', text: '#10b981', icon: <CreditCard size={18} color="#10b981" /> },
}

const fmtAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export default function NotificationsPage() {
  const { t } = useLocale()
  const [notifs, setNotifs]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUnread, setShowUnread]   = useState(false)

  const loadNotifs = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/notifications${showUnread ? '?unread=true' : ''}`)
      setNotifs(data.notifications); setUnreadCount(data.unreadCount)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadNotifs() }, [showUnread])

  const markAll = async () => {
    try { await api.put('/notifications/all/read'); loadNotifs() }
    catch (e) { console.error(e) }
  }

  const markOne = async (id) => {
    try { await api.put(`/notifications/${id}/read`); loadNotifs() }
    catch (e) { console.error(e) }
  }

  return (
    <div>
      <Navbar title={t('notifications.title')} subtitle={`${unreadCount} ${t('notifications.unread')}`}
        action={
          <div className="flex gap-2">
            <button onClick={() => setShowUnread(!showUnread)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition border"
              style={showUnread ? { background: '#004AFF', color: '#fff', borderColor: '#004AFF' } : { color: 'var(--muted)', borderColor: 'var(--border)', background: 'transparent' }}>
              {showUnread ? t('notifications.all') : t('notifications.unread_only')}
            </button>
            {unreadCount > 0 && (
              <button onClick={markAll} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white border transition"
                style={{ borderColor: 'var(--border)' }}>
                {t('notifications.mark_all_read')}
              </button>
            )}
          </div>
        }
      />

      {loading ? <Spinner /> : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <div className="mb-4 text-slate-500"><Bell size={48} className="mx-auto" /></div>
          <p className="text-sm">{t('notifications.no_notifications')}</p>
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {notifs.map(n => {
            const cfg = TYPE_CFG[n.type] || TYPE_CFG.INFO
            return (
              <div key={n.id}
                onClick={() => !n.read && markOne(n.id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition cursor-pointer ${!n.read ? 'border-slate-600' : 'opacity-60'}`}
                style={{ background: n.read ? '#111422' : '#1A2035', borderColor: n.read ? '#1e2640' : '#334155' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: cfg.bg }}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{n.title}</p>
                    <span className="text-xs text-slate-500 flex-shrink-0">{fmtAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#004AFF' }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
