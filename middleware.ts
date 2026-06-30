import { NextResponse } from 'next/server'
import type { NextRequest, NextFetchEvent } from 'next/server'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'

function isPublic(pathname: string, method: string): boolean {
  if (pathname === '/login') return true
  if (pathname.startsWith('/forms/')) return true // formulario público con QR
  if (pathname.startsWith('/portal/')) return true // portal del cliente/reserva
  if (pathname.startsWith('/api/auth/')) return true
  if (pathname.startsWith('/api/webhooks/')) return true
  if (pathname.startsWith('/api/portal/')) return true
  if (pathname === '/api/audit/log') return true // sink interno usado por este middleware
  if (/^\/api\/forms\/[^/]+$/.test(pathname) && (method === 'GET' || method === 'POST')) return true
  return false
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl
  const method = request.method

  if (isPublic(pathname, method)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)
  const isApi = pathname.startsWith('/api/')

  if (!session) {
    if (isApi) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Modo visitante: solo lectura. Cualquier escritura vía API queda bloqueada en el servidor.
  if (session.isGuest && isApi && method !== 'GET') {
    return NextResponse.json({ error: 'Modo visitante: solo puedes ver, no editar' }, { status: 403 })
  }

  // Auditoría: registra quién hizo qué (solo escrituras vía API), sin bloquear la respuesta.
  if (isApi && method !== 'GET' && !pathname.startsWith('/api/audit')) {
    event.waitUntil(
      fetch(new URL('/api/audit/log', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: session.agentId,
          agentName: session.name,
          role: session.role,
          method,
          path: pathname,
        }),
      }).catch(() => {})
    )
  }

  return NextResponse.next()
}

export const config = {
  // Excluye assets estáticos (logo, íconos, fuentes, etc.) además de los internos de Next.js
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|woff2?)$).*)'],
}
