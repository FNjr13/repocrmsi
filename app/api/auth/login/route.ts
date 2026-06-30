import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_REMEMBER_SECONDS } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password, remember } = await request.json()
    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    const agent = await prisma.agent.findUnique({ where: { email: email.trim() } })
    if (!agent || !agent.isActive || !agent.passwordHash) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const valid = await verifyPassword(password, agent.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const token = await createSessionToken({
      agentId: agent.id, name: agent.name, role: agent.role, isGuest: false,
    })

    const res = NextResponse.json({ id: agent.id, name: agent.name, role: agent.role, isGuest: false })
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      // "Recordarme" marcado: cookie persiste 180 días. Si no, es de sesión
      // (se borra al cerrar el navegador) — no se vuelve a pedir mientras siga abierto.
      ...(remember ? { maxAge: SESSION_MAX_AGE_REMEMBER_SECONDS } : {}),
    })
    return res
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 })
  }
}
