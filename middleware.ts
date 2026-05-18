import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

const PUBLIC_ROUTES = ['/login', '/register']

// Pages that only super_admin can access
const SUPER_ADMIN_ROUTES = ['/settings/users']

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  const cookie = request.cookies.get('session')?.value
  const session = await decrypt(cookie)

  // Check session expiry explicitly
  const isExpired = session ? new Date(session.expiresAt) < new Date() : false

  if ((!session || isExpired) && !isPublicRoute) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    if (isExpired) response.cookies.delete('session')
    return response
  }

  if (session && !isExpired && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role-based route protection
  if (session && !isExpired) {
    const isSuperAdminRoute = SUPER_ADMIN_ROUTES.some(route => pathname.startsWith(route))
    if (isSuperAdminRoute && session.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
