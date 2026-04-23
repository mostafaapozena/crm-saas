'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import en from '../lib/translations/en.json'
import ar from '../lib/translations/ar.json'

const TRANSLATIONS = { en, ar }

const LocaleContext = createContext({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
  dir: 'ltr',
})

function getStoredLocale() {
  try {
    const ls = localStorage.getItem('locale')
    if (ls === 'ar' || ls === 'en') return ls
    // Fall back to cookie (set by middleware)
    const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
    if (match && (match[1] === 'ar' || match[1] === 'en')) return match[1]
  } catch {}
  return 'en'
}

function applyToDOM(locale) {
  const html = document.documentElement
  if (locale === 'ar') {
    html.setAttribute('dir', 'rtl')
    html.setAttribute('lang', 'ar')
    html.classList.add('font-arabic')
  } else {
    html.setAttribute('dir', 'ltr')
    html.setAttribute('lang', 'en')
    html.classList.remove('font-arabic')
  }
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState('en')

  useEffect(() => {
    const saved = getStoredLocale()
    setLocaleState(saved)
    applyToDOM(saved)
  }, [])

  const setLocale = useCallback((newLocale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem('locale', newLocale)
      document.cookie = `locale=${newLocale};path=/;max-age=31536000;SameSite=Lax`
    } catch {}
    applyToDOM(newLocale)
  }, [])

  const t = useCallback((key, vars) => {
    const keys = key.split('.')
    let result = TRANSLATIONS[locale]
    for (const k of keys) {
      if (result == null) return key
      result = result[k]
    }
    if (result == null) return key
    if (vars) {
      return String(result).replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)
    }
    return String(result)
  }, [locale])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, dir: locale === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
