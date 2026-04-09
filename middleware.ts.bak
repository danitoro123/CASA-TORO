import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const isLogin = req.nextUrl.pathname.startsWith('/login')
  const hasCookie = [...req.cookies.getAll()].some(c => c.name.startsWith('sb-'))

  if (!hasCookie && !isLogin) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (hasCookie && isLogin) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
