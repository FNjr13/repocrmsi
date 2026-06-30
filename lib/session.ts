import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE_NAME, type SessionPayload } from './auth'

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE_NAME)?.value
  return verifySessionToken(token)
}
