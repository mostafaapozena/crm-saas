'use client'
import { useState, useEffect, useCallback } from 'react'

let _addToast = null

export function useToast() {
  const addToast = useCallback((msg, type = 'success') => {
    _addToast?.(msg, type)
  }, [])
  return { toast: addToast }
}

export default function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    _addToast = (msg, type = 'success') => {
      const id = Date.now()
      setToasts(t => [...t, { id, msg, type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
    }
    return () => { _addToast = null }
  }, [])

  const icons = {
    success: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    error: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  }

  const colors = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-2">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm shadow-xl backdrop-blur-sm animate-fade-in ${colors[t.type]}`}>
          {icons[t.type]}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
