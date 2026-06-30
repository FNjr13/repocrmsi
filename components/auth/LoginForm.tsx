'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, remember }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'No se pudo iniciar sesión')
        return
      }
      // Navegación completa (no solo cambio de ruta en cliente): así el navegador
      // detecta el login exitoso y ofrece guardar la contraseña.
      window.location.href = next
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    setGuestLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST' })
      if (!res.ok) {
        setError('No se pudo entrar como visitante')
        return
      }
      window.location.href = next
    } finally {
      setGuestLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-black/10 mx-auto mb-4">
            <Image src="/logo.png" alt="SI CRM" width={64} height={64} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">SI CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Ventas & Marketing</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4" autoComplete="on">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="current-password"
              required
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Mantener sesión iniciada en este dispositivo</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">o</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={handleGuest}
          disabled={guestLoading}
          className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>👀</span> {guestLoading ? 'Entrando...' : 'Entrar como visitante (solo ver)'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-3">
          El modo visitante permite ver toda la plataforma, pero no se puede crear, editar ni eliminar nada.
        </p>
      </div>
    </div>
  )
}
