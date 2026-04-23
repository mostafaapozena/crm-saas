'use client'
import { useLocale } from '../hooks/useLocale'

// Stage/Status Badge
const stageColors = {
  LEAD: 'bg-slate-700 text-slate-300',
  QUALIFIED: 'bg-blue-500/20 text-blue-400',
  PROPOSAL_SENT: 'bg-violet-500/20 text-violet-400',
  NEGOTIATION: 'bg-amber-500/20 text-amber-400',
  WON: 'bg-emerald-500/20 text-emerald-400',
  LOST: 'bg-red-500/20 text-red-400',
  ACTIVE: 'bg-sky-500/20 text-sky-400',
  ON_HOLD: 'bg-orange-500/20 text-orange-400',
}

export function Badge({ value }) {
  const label = value?.replace('_', ' ') || value
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium capitalize ${stageColors[value] || 'bg-slate-700 text-slate-300'}`}>
      {label?.toLowerCase()}
    </span>
  )
}

// Stat Card
export function StatCard({ label, value, icon, color = 'sky', sub }) {
  const colors = {
    sky: 'from-sky-500/20 to-sky-600/10 border-sky-500/20 text-sky-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400',
    red: 'from-red-500/20 to-red-600/10 border-red-500/20 text-red-400',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <div className={`text-current opacity-70`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

// Modal
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose} className="transition" style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// Form Input
export function Input({ label, ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <input
        {...props}
        className="w-full rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500 transition text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
      />
    </div>
  )
}

// Form Select
export function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <select
        {...props}
        className="w-full rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500 transition text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
      >
        {children}
      </select>
    </div>
  )
}

// Button
export function Btn({ children, variant = 'primary', size = 'md', ...props }) {
  const variants = {
    primary: 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20',
    danger: 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20',
    ghost: 'bg-slate-800 hover:bg-slate-700 text-slate-300',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <button {...props} className={`${variants[variant]} ${sizes[size]} rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ''}`}>
      {children}
    </button>
  )
}

// Empty State
export function Empty({ message }) {
  const { t } = useLocale()
  return (
    <div className="text-center py-16 text-slate-500">
      <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-sm">{message ?? t('common.no_data')}</p>
    </div>
  )
}

// Loading Spinner
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
