'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreateUserModal, EditUserModal, ResetPasswordModal, roleLabel } from '@/components/admin/UserModals'

interface UserData {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  isActive: boolean
  hasPassword: boolean
  createdAt: string
}

const ROLE_BADGE: Record<string, string> = {
  ASESORA: 'bg-violet-50 text-violet-600', ASESOR: 'bg-violet-50 text-violet-600',
  OPERATIVO: 'bg-blue-50 text-blue-600', DIRECTOR: 'bg-amber-50 text-amber-600',
}

export default function UsuariosClient({ initialUsers, currentUserId }: { initialUsers: UserData[]; currentUserId: string | null }) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<UserData | null>(null)
  const [resetTarget, setResetTarget] = useState<UserData | null>(null)

  const refresh = () => router.refresh()

  const toggleActive = async (user: UserData) => {
    if (user.id === currentUserId && user.isActive) {
      alert('No puedes desactivar tu propia cuenta.')
      return
    }
    await fetch(`/api/agents/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    refresh()
  }

  const handleDelete = async (user: UserData) => {
    if (user.id === currentUserId) {
      alert('No puedes eliminar tu propia cuenta.')
      return
    }
    if (!confirm(`¿Eliminar permanentemente a ${user.name}? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/agents/${user.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'No se pudo eliminar el usuario')
      return
    }
    refresh()
  }

  const handleSavePassword = async (password: string) => {
    if (!resetTarget) return
    await fetch(`/api/agents/${resetTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setResetTarget(null)
    refresh()
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios y Configuración</h1>
          <p className="text-gray-500 mt-1">Crea usuarios, asígnales un rol y define su contraseña de acceso</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear usuario
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {initialUsers.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">Aún no hay usuarios.</p>
            <button onClick={() => setShowCreate(true)} className="mt-4 text-blue-600 text-sm font-semibold hover:underline">
              Crear el primero →
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Usuario</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Rol</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Contacto</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Acceso</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialUsers.map(user => {
                const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {user.name}{user.id === currentUserId && <span className="text-xs text-gray-400 ml-1.5">(tú)</span>}
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role.toUpperCase()] || 'bg-gray-100 text-gray-600'}`}>
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{user.phone || '—'}</td>
                    <td className="px-4 py-3.5 text-center">
                      {user.hasPassword ? (
                        <span className="text-xs font-medium text-green-600">✓ Configurado</span>
                      ) : (
                        <span className="text-xs font-medium text-red-500">Sin contraseña</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => toggleActive(user)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                          user.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditTarget(user)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setResetTarget(user)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Contraseña"
                        >
                          🔑
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar permanentemente"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={refresh} />}
      {editTarget && (
        <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={refresh} />
      )}
      {resetTarget && (
        <ResetPasswordModal userName={resetTarget.name} onClose={() => setResetTarget(null)} onSaved={handleSavePassword} />
      )}
    </div>
  )
}
