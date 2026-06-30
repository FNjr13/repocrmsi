'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROLE_LABELS: Record<string, string> = {
  ASESORA: 'Asesora', ASESOR: 'Asesor', OPERATIVO: 'Operativo', DIRECTOR: 'Director', VISITANTE: 'Visitante',
}

export default function UserMenu({ name, role, isGuest }: { name: string; role: string; isGuest: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="hidden sm:flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${isGuest ? 'bg-amber-500' : 'bg-gradient-to-br from-violet-500 to-blue-500'}`}>
          {isGuest ? '👀' : initials}
        </div>
        <span className="text-sm font-medium text-gray-700">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
            <p className="text-xs text-gray-400">{ROLE_LABELS[role.toUpperCase()] || role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
