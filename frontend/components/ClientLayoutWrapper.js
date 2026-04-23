'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getToken } from '../lib/auth'
import Sidebar from './Sidebar'
import { LocaleProvider } from '../hooks/useLocale'

const scrollPositions = {}

export default function ClientLayoutWrapper({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const mainRef = useRef(null)

  const isAuthPage = pathname === '/login' || pathname === '/' || pathname.startsWith('/public')

  useEffect(() => {
    if (!isAuthPage && !getToken()) {
      router.replace('/login')
      return
    }
    if (!ready) setReady(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (mainRef.current) {
      const savedPos = scrollPositions[pathname] || 0
      requestAnimationFrame(() => {
        if (mainRef.current) mainRef.current.scrollTo(0, savedPos)
      })
    }
  }, [pathname])

  const handleScroll = (e) => {
    scrollPositions[pathname] = e.target.scrollTop
  }

  if (!ready) {
    return (
      <LocaleProvider>
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg, #0D0E1A)' }}>
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </LocaleProvider>
    )
  }

  if (isAuthPage) {
    return (
      <LocaleProvider>
        <main className="min-h-screen">{children}</main>
      </LocaleProvider>
    )
  }

  const pathParts = pathname.split('/').filter(Boolean)
  const isProjectDetail = pathParts[0] === 'projects' && pathParts.length >= 2 && pathParts[1] !== 'milestones' && pathParts[1] !== 'new'
  const isMarketingDetail = pathParts[0] === 'marketing' && pathParts.length >= 2 && !isNaN(pathParts[1])
  const hasPadding = !(isProjectDetail || isMarketingDetail)

  return (
    <LocaleProvider>
      <div className="flex min-h-screen" style={{ background: 'var(--bg, #0D0E1A)' }}>
        <Sidebar />
        <main
          ref={mainRef}
          onScroll={handleScroll}
          className={`flex-1 overflow-auto ${hasPadding ? 'p-8' : ''}`}
        >
          {children}
        </main>
      </div>
    </LocaleProvider>
  )
}
