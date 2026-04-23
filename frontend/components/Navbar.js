'use client'
import { Sun, Moon } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import useTheme from '../hooks/useTheme'
import { useLocale } from '../hooks/useLocale'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="p-2 rounded-lg transition-colors"
      style={{ color: 'var(--text-secondary)', background: 'var(--surface)' }}
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}

function LangToggle() {
  const { locale, setLocale } = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  const switchTo = (newLocale) => {
    setLocale(newLocale)
    // Navigate to /<locale>/<path> so middleware sets the cookie,
    // then redirects back — this keeps URL state in sync.
    router.push(`/${newLocale}${pathname}`)
  }

  return (
    <div
      className="flex items-center rounded-lg overflow-hidden border text-xs font-bold"
      style={{ borderColor: 'var(--border)' }}
    >
      {['en', 'ar'].map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          className="px-2.5 py-1.5 transition-colors"
          style={
            locale === l
              ? { background: 'var(--brand-blue)', color: '#ffffff' }
              : { background: 'transparent', color: 'var(--text-secondary)' }
          }
        >
          {l === 'en' ? 'EN' : 'AR'}
        </button>
      ))}
    </div>
  )
}

export default function Navbar({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <LangToggle />
        <ThemeToggle />
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}
