'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface WaConfig {
  id: string
  agentId: string | null
  agent: { id: string; name: string } | null
  phoneNumberId: string
  wabaId: string
  accessToken: string
  verifyToken: string
  phoneNumber: string | null
  displayName: string | null
  isActive: boolean
}

interface Agent {
  id: string
  name: string
}

const EMPTY_FORM = {
  agentId: '',
  phoneNumberId: '',
  wabaId: '',
  accessToken: '',
  verifyToken: 'wh_verify_token',
  phoneNumber: '',
  displayName: '',
}

function SetupStep({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <div className="text-sm text-gray-600">{children}</div>
      </div>
    </div>
  )
}

function LineModal({
  agents, editing, takenAgentIds, onClose, onSaved,
}: {
  agents: Agent[]
  editing: WaConfig | null
  takenAgentIds: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    agentId: editing?.agentId ?? '',
    phoneNumberId: editing?.phoneNumberId ?? '',
    wabaId: editing?.wabaId ?? '',
    accessToken: editing?.accessToken ?? '',
    verifyToken: editing?.verifyToken ?? 'wh_verify_token',
    phoneNumber: editing?.phoneNumber ?? '',
    displayName: editing?.displayName ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const availableAgents = agents.filter(a => a.id === editing?.agentId || !takenAgentIds.includes(a.id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al guardar')
        return
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{editing ? 'Editar línea' : 'Conectar línea de WhatsApp'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a</label>
            <select
              value={form.agentId}
              onChange={e => setForm(f => ({ ...f, agentId: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Línea general / compartida</option>
              {availableAgents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Si la asignas a una asesora, sus mensajes se envían y reciben desde este número. La línea general se usa de respaldo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID *</label>
              <input
                value={form.phoneNumberId}
                onChange={e => setForm(f => ({ ...f, phoneNumberId: e.target.value }))}
                placeholder="123456789012345"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WABA ID *</label>
              <input
                value={form.wabaId}
                onChange={e => setForm(f => ({ ...f, wabaId: e.target.value }))}
                placeholder="123456789012345"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Token *</label>
            <input
              value={form.accessToken}
              onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))}
              type="password"
              placeholder="EAAxxxxxx..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
              required={!editing}
            />
            <p className="text-xs text-gray-400 mt-1">
              {editing ? 'Déjalo igual para no cambiarlo, o pega uno nuevo para reemplazarlo.' : 'Normalmente el mismo token de sistema sirve para todas las líneas de tu Business Manager.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de teléfono</label>
              <input
                value={form.phoneNumber}
                onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                placeholder="+507 6000-0000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de pantalla</label>
              <input
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="ej: Alexania - SI CRM"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verify Token</label>
            <input
              value={form.verifyToken}
              onChange={e => setForm(f => ({ ...f, verifyToken: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">Usa el mismo valor en todas tus líneas si comparten el webhook de Meta.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Conectar línea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function WhatsAppConfigClient({ initialConfigs, agents }: { initialConfigs: WaConfig[]; agents: Agent[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<'lines' | 'guide'>('lines')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<WaConfig | null>(null)

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/whatsapp`
    : '/api/webhooks/whatsapp'

  const refresh = () => router.refresh()

  const toggleActive = async (config: WaConfig) => {
    await fetch('/api/whatsapp/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: config.id, isActive: !config.isActive }),
    })
    refresh()
  }

  const deleteLine = async (config: WaConfig) => {
    const who = config.agent?.name || 'la línea general'
    if (!confirm(`¿Desconectar la línea de ${who}?`)) return
    await fetch('/api/whatsapp/config', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: config.id }),
    })
    refresh()
  }

  const takenAgentIds = initialConfigs.filter(c => c.agentId).map(c => c.agentId as string)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Business</h1>
            <p className="text-sm text-gray-500">Cada asesora puede tener su propia línea oficial conectada</p>
          </div>
          {tab === 'lines' && (
            <button
              onClick={() => { setEditing(null); setShowModal(true) }}
              className="flex-shrink-0 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              + Conectar línea
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
          {(['lines', 'guide'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'lines' ? '📱 Líneas conectadas' : '📖 Guía de configuración'}
            </button>
          ))}
        </div>

        {tab === 'lines' ? (
          <div className="space-y-4">
            {/* Webhook info, shared by all lines */}
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL (la misma para todas las líneas)</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 font-mono break-all">
                  {webhookUrl}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(webhookUrl)}
                  className="flex-shrink-0 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Lines table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {initialConfigs.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">📵</div>
                  <p className="text-gray-500 font-medium">No hay líneas conectadas todavía</p>
                  <p className="text-sm text-gray-400 mt-1">Conecta la línea general o la primera línea de una asesora</p>
                  <button
                    onClick={() => { setEditing(null); setShowModal(true) }}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                  >
                    + Conectar la primera línea
                  </button>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Asignada a</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Número</th>
                      <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Estado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {initialConfigs.map(config => (
                      <tr key={config.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="text-sm font-medium text-gray-900">
                            {config.agent ? config.agent.name : '🌐 Línea general'}
                          </div>
                          {config.displayName && <div className="text-xs text-gray-500">{config.displayName}</div>}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">{config.phoneNumber || '—'}</td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => toggleActive(config)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                              config.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {config.isActive ? 'Conectada' : 'Desconectada'}
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => { setEditing(config); setShowModal(true) }}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteLine(config)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Desconectar"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <h2 className="font-semibold text-gray-900 text-lg">Cómo conectar una línea de WhatsApp Business</h2>

            <div className="space-y-5">
              <SetupStep number={1} title="Crear cuenta en Meta for Developers">
                Ve a{' '}
                <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  developers.facebook.com
                </a>{' '}
                y crea una cuenta de desarrollador. Necesitas una página de Facebook y una cuenta de Business Manager.
              </SetupStep>

              <SetupStep number={2} title="Crear una App de tipo Business">
                En el panel de Meta for Developers, crea una nueva App. Selecciona el tipo <strong>Business</strong>. Dale un nombre como &quot;SI CRM&quot;.
              </SetupStep>

              <SetupStep number={3} title="Agregar el producto WhatsApp">
                Dentro de tu App, busca el producto <strong>WhatsApp</strong> y haz clic en &quot;Configurar&quot;.
              </SetupStep>

              <SetupStep number={4} title="Agregar un número por cada asesora">
                En <strong>WhatsApp {'>'} Configuración de la API</strong>, agrega un número de teléfono por cada asesora que quieras conectar (cada una necesita su propia línea/SIM). Meta te pedirá verificar cada número con un código por SMS o llamada.
              </SetupStep>

              <SetupStep number={5} title="Obtener Phone Number ID y WABA ID de cada número">
                Cada número agregado tiene su propio <strong>Phone Number ID</strong>. El <strong>WABA ID</strong> (WhatsApp Business Account) normalmente es el mismo para todos los números de tu cuenta.
              </SetupStep>

              <SetupStep number={6} title="Generar un Access Token permanente">
                En <strong>Configuración {'>'} Avanzada</strong>, genera un token de sistema que no expire. El mismo token suele servir para enviar mensajes desde cualquier número de tu Business Manager.
              </SetupStep>

              <SetupStep number={7} title="Configurar el Webhook (una sola vez)">
                En <strong>WhatsApp {'>'} Configuración {'>'} Webhooks</strong>, configura la URL y el token de verificación una sola vez — funciona para todas las líneas que conectes después:
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600">
                  <li>URL de callback: <code className="bg-gray-100 px-1 rounded text-xs">{webhookUrl}</code></li>
                  <li>Suscribirse a: <strong>messages</strong></li>
                </ul>
              </SetupStep>

              <SetupStep number={8} title="Conectar cada línea en el CRM">
                Vuelve a la pestaña &quot;Líneas conectadas&quot;, dale &quot;+ Conectar línea&quot; por cada número, pega el Phone Number ID y demás datos, y asígnala a la asesora correspondiente.
              </SetupStep>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-700">
                <strong>Nota:</strong> Cada asesora necesita su propio número de teléfono (línea/SIM) para registrarlo como
                línea de WhatsApp Business — no se puede usar el mismo número para dos asesoras.
              </p>
            </div>
          </div>
        )}

        {showModal && (
          <LineModal
            agents={agents}
            editing={editing}
            takenAgentIds={takenAgentIds}
            onClose={() => setShowModal(false)}
            onSaved={refresh}
          />
        )}
      </div>
    </div>
  )
}
