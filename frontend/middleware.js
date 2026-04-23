import { NextResponse } from 'next/server'

const LOCALES = ['ar', 'en']

// Intercept /ar/* and /en/* — store locale in cookie, redirect to base path.
// This lets the Navbar toggle navigate to /<locale>/<path> which triggers the
// locale cookie update, then redirects transparently back to /<path>.
export function middleware(request) {
  const { pathname } = request.nextUrl

  const locale = LOCALES.find(
    l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  )

  if (locale) {
    const strippedPath = pathname.slice(`/${locale}`.length) || '/'
    const response = NextResponse.redirect(new URL(strippedPath, request.url))
    response.cookies.set('locale', locale, { path: '/', maxAge: 31536000, sameSite: 'lax' })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|.*\\..*).*)'],
}
