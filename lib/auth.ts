// Utilidades de autenticación. Usa Web Crypto (no Node-only APIs) para que
// funcione tanto en Route Handlers (Node) como en middleware (Edge).

const ITERATIONS = 100_000
const KEY_LENGTH_BITS = 256
const SESSION_SECRET = process.env.SESSION_SECRET || 'vm-local-dev-secret-cambiar-en-produccion-2026'

export const SESSION_COOKIE_NAME = 'vm_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 días (visitante, o login sin "recordarme")
export const SESSION_MAX_AGE_REMEMBER_SECONDS = 60 * 60 * 24 * 180 // 180 días (login con "recordarme")

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function base64url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach(b => { binary += String.fromCharCode(b) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(input: string): Uint8Array {
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4)
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_LENGTH_BITS
  )
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derived = await deriveKey(password, salt)
  return `${toHex(salt)}:${toHex(derived)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const derived = await deriveKey(password, fromHex(saltHex))
  const derivedHex = toHex(derived)
  if (derivedHex.length !== hashHex.length) return false
  let diff = 0
  for (let i = 0; i < derivedHex.length; i++) diff |= derivedHex.charCodeAt(i) ^ hashHex.charCodeAt(i)
  return diff === 0
}

export interface SessionPayload {
  agentId: string | null
  name: string
  role: string
  isGuest: boolean
  iat: number
}

async function hmacSign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return base64url(new Uint8Array(sig))
}

export async function createSessionToken(payload: Omit<SessionPayload, 'iat'>): Promise<string> {
  const full: SessionPayload = { ...payload, iat: Date.now() }
  const body = base64url(new TextEncoder().encode(JSON.stringify(full)))
  const sig = await hmacSign(body)
  return `${body}.${sig}`
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = await hmacSign(body)
  if (expected !== sig) return null
  try {
    const json = new TextDecoder().decode(base64urlDecode(body))
    return JSON.parse(json) as SessionPayload
  } catch {
    return null
  }
}

export function isAdminRole(role: string): boolean {
  const r = role.toUpperCase()
  return r.includes('OPERATIVO') || r.includes('DIRECTOR')
}
