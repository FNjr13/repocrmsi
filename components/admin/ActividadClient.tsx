'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'

interface LogEntry {
  id: string
  agentId: string | null
  agentName: string
  role: string
  method: string
  path: string
  createdAt: string
}

const METHOD_LABELS: Record<string, string> = {
  POST: 'Creó', PATCH: 'Editó', PUT: 'Actualizó', DELETE: 'Eliminó',
}

const METHOD_COLORS: Record<string, string> = {
  POST: 'bg-green-100 text-green-700', PATCH: 'bg-blue-100 text-blue-700',
  PUT: 'bg-blue-100 text-blue-700', DELETE: 'bg-red-100 text-red-600',
}

const ENTITY_MAP: Array<[string, string]> = [
  ['/api/leads', 'un lead'],
  ['/api/agents', 'un usuario / asesor'],
  ['/api/projects', 'un proyecto'],
  ['/api/goals', 'una meta'],
  ['/api/brokers', 'un broker externo'],
  ['/api/units', 'una unidad'],
  ['/api/reservations', 'una reserva'],
  ['/api/whatsapp', 'un mensaje de WhatsApp'],
  ['/api/forms', 'un formulario'],
  ['/api/sequences', 'una secuencia'],
  ['/api/documents', 'un documento'],
  ['/api/calendar', 'un evento / tarea'],
  ['/api/campaigns', 'una campaña'],
  ['/api/qualifications', 'una precalificación bancaria'],
  ['/api/activities', 'una actividad'],
  ['/api/notifications', 'una notificación'],
  ['/api/meta', 'una configuración de Meta'],
]

function describe(method: string, path: string): string {
  const action = METHOD_LABELS[method] || method
  const match = ENTITY_MAP.find(([prefix]) => path.includes(prefix))
  const entity = match ? match[1] : `algo en ${path}`
  return `${action} ${entity}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ActividadClient({ initialLogs }: { initialLogs: LogEntry[] }) {
  const [logs, setLogs] = useState(initialLogs)
  const [filterUser, setFilterUser] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const users = useMemo(() => Array.from(new Set(logs.map(l => l.agentName))).sort(), [logs])

  const filtered = useMemo(
    () => filterUser ? logs.filter(l => l.agentName === filterUser) : logs,
    [logs, filterUser]
  )

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/audit?take=200')
      if (res.ok) setLogs(await res.json())
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [refresh])

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Actividad</h1>
          <p className="text-gray-500 mt-1">Registro de qué usuario hizo qué en la plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos los usuarios</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {refreshing ? 'Actualizando...' : '↻ Actualizar'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No hay actividad registrada todavía.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Usuario</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Acción</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Detalle técnico</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Cuándo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-gray-900">{log.agentName}</div>
                    <div className="text-xs text-gray-400">{log.role}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${METHOD_COLORS[log.method] || 'bg-gray-100 text-gray-600'}`}>
                      {describe(log.method, log.path)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.method} {log.path}</td>
                  <td className="px-5 py-3 text-right text-xs text-gray-500">{formatDate(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
