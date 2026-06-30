import { NextResponse } from 'next/server'
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth'

export async function POST() {
  const token = await createSessionToken({ agentId: null, name: 'Visitante', role: 'VISITANTE', isGuest: true })
  const res = NextResponse.json({ name: 'Visitante', role: 'VISITANTE', isGuest: true })
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  return res
}
