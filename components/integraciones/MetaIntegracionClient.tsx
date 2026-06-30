'use client'

import { useState, useEffect } from 'react'

interface MetaPageConfig {
  id: string
  pageId: string
  pageName: string
  instagramHandle: string | null
  projectId: string | null
  agentId: string | null
  accessToken: string
  autoAssign: boolean
  isActive: boolean
  leadsReceived: number
  lastLeadAt: string | null
  notes: string | null
  createdAt: string
}

interface MetaLeadLog {
  id: string
  leadgenId: string
  pageId: string
  formId: string | null
  adId: string | null
  status: string
  leadId: string | null
  error: string | null
  createdAt: string
}

interface Project { id: string; name: string }
interface Agent { id: string; name: string }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

// ── Modal para conectar una cuenta ──────────────────────────────────────────
function ConnectAccountModal({
  projects,
  agents,
  onClose,
  onSave,
}: {
  projects: Project[]
  agents: Agent[]
  onClose: () => void
  onSave: (config: MetaPageConfig) => void
}) {
  const [step, setStep] = useState<'form' | 'validating' | 'success' | 'error'>('form')
  const [form, setForm] = useState({
    pageId: '',
    pageName: '',
    instagramHandle: '',
    accessToken: '',
    projectId: '',
    agentId: '',
    autoAssign: true,
    notes: '',
  })
  const [errorMsg, setErrorMsg] = useState('')
  const [validatedName, setValidatedName] = useState('')

  const handleSubmit = async () => {
    if (!form.pageId || !form.accessToken || !form.pageName) {
      setErrorMsg('Page ID, nombre y Access Token son obligatorios')
      return
    }
    setStep('validating')
    setErrorMsg('')

    try {
      const res = await fetch('/api/meta/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Error al conectar la cuenta')
        setStep('error')
        return
      }

      setValidatedName(data.pageName || form.pageName)
      setStep('success')
      onSave(data)
    } catch (e) {
      setErrorMsg(`Error de conexión: ${String(e)}`)
      setStep('error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center text-white text-lg">
              📸
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Conectar Instagram / Facebook</h3>
              <p className="text-xs text-gray-500">Captura leads automáticamente desde tus Lead Ads</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        {step === 'success' ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">¡Cuenta conectada!</h4>
            <p className="text-gray-600 mb-2">
              <strong>{validatedName || form.pageName}</strong> está conectada y lista para recibir leads.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Los leads de Instagram Lead Ads se crearán automáticamente en el CRM.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
            >
              Continuar
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">

            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <span className="text-blue-500 text-lg flex-shrink-0">ℹ️</span>
              <div className="text-xs text-blue-700 space-y-1">
                <p className="font-semibold">¿Cómo obtener el Page Access Token?</p>
                <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                  <li>Ve a <strong>Meta Business Suite</strong> → Configuración → Integraciones → API de Lead Ads</li>
                  <li>O usa el <strong>Graph API Explorer</strong> en developers.facebook.com</li>
                  <li>Selecciona tu página y genera un token con permiso <code className="bg-blue-100 px-1 rounded">leads_retrieval</code></li>
                  <li>Convierte a token de larga duración (no expira)</li>
                </ol>
              </div>
            </div>

            {/* Form */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Page ID de Facebook *
                </label>
                <input
                  value={form.pageId}
                  onChange={e => setForm(f => ({ ...f, pageId: e.target.value.trim() }))}
                  placeholder="Ej: 123456789012345"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                <p className="text-xs text-gray-400 mt-1">Lo encuentras en: Facebook Page → Acerca de → Info de la página</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nombre de la página *</label>
                <input
                  value={form.pageName}
                  onChange={e => setForm(f => ({ ...f, pageName: e.target.value }))}
                  placeholder="Ej: Altos de Casa Mía"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Handle de Instagram</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                  <input
                    value={form.instagramHandle}
                    onChange={e => setForm(f => ({ ...f, instagramHandle: e.target.value.replace('@', '') }))}
                    placeholder="altoscasamia"
                    className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Page Access Token *</label>
                <input
                  type="password"
                  value={form.accessToken}
                  onChange={e => setForm(f => ({ ...f, accessToken: e.target.value.trim() }))}
                  placeholder="EAAxxxxxxxxxxxxxxxxxxxxx..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-gray-400 mt-1">Usa un token de larga duración para que no expire</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Asignación automática de leads</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Proyecto por defecto</label>
                  <select
                    value={form.projectId}
                    onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
                  >
                    <option value="">Sin proyecto específico</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Asesor asignado</label>
                  <select
                    value={form.agentId}
                    onChange={e => setForm(f => ({ ...f, agentId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
                  >
                    <option value="">Auto (round-robin)</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 mt-3 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, autoAssign: !f.autoAssign }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.autoAssign ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.autoAssign ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm text-gray-700">Auto-asignar usando round-robin si no hay asesor configurado</span>
              </label>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                <span>❌</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={step === 'validating' || !form.pageId || !form.accessToken || !form.pageName}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {step === 'validating' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Validando token...
                  </>
                ) : (
                  <>
                    <span>📸</span>
                    Conectar cuenta
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tarjeta de cuenta conectada ──────────────────────────────────────────────
function AccountCard({
  config,
  projects,
  agents,
  logs,
  onToggle,
  onDelete,
  onUpdate,
}: {
  config: MetaPageConfig
  projects: Project[]
  agents: Agent[]
  logs: MetaLeadLog[]
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, data: Partial<MetaPageConfig>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [projectId, setProjectId] = useState(config.projectId || '')
  const [agentId, setAgentId] = useState(config.agentId || '')
  const [autoAssign, setAutoAssign] = useState(config.autoAssign)

  const accountLogs = logs.filter(l => l.pageId === config.pageId)
  const processed = accountLogs.filter(l => l.status === 'PROCESADO').length
  const duplicates = accountLogs.filter(l => l.status === 'DUPLICADO').length
  const errors = accountLogs.filter(l => l.status === 'ERROR').length

  const saveChanges = async () => {
    await onUpdate(config.id, { projectId: projectId || null, agentId: agentId || null, autoAssign } as Partial<MetaPageConfig>)
    setEditing(false)
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${config.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0 shadow-sm">
          📸
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-gray-900">{config.pageName}</h3>
            {config.instagramHandle && (
              <span className="text-sm text-gray-400 font-normal">@{config.instagramHandle}</span>
            )}
            {config.isActive ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold border border-green-200">Activa</span>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Pausada</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">Page ID: {config.pageId}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onToggle(config.id, !config.isActive)}
            className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${config.isActive ? 'bg-green-500' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${config.isActive ? 'translate-x-5' : ''}`} />
          </button>
          <button
            onClick={() => onDelete(config.id)}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 pb-4 flex items-center gap-6 text-sm">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{config.leadsReceived}</p>
          <p className="text-xs text-gray-400">leads totales</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">{processed}</p>
          <p className="text-xs text-gray-400">creados</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-amber-500">{duplicates}</p>
          <p className="text-xs text-gray-400">duplicados</p>
        </div>
        {errors > 0 && (
          <div className="text-center">
            <p className="text-lg font-bold text-red-500">{errors}</p>
            <p className="text-xs text-gray-400">errores</p>
          </div>
        )}
        {config.lastLeadAt && (
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-400">Último lead</p>
            <p className="text-xs font-medium text-gray-600">{timeAgo(config.lastLeadAt)}</p>
          </div>
        )}
      </div>

      {/* Assignment config */}
      <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
        {!editing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                📁 {config.projectId ? projects.find(p => p.id === config.projectId)?.name || 'Sin proyecto' : 'Sin proyecto'}
              </span>
              <span>·</span>
              <span>
                👤 {config.agentId ? agents.find(a => a.id === config.agentId)?.name || 'Sin asesor' : config.autoAssign ? 'Auto (round-robin)' : 'Sin asignar'}
              </span>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Editar asignación
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Proyecto</label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                >
                  <option value="">Sin proyecto específico</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Asesor</label>
                <select
                  value={agentId}
                  onChange={e => setAgentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                >
                  <option value="">Auto (round-robin)</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setAutoAssign(!autoAssign)}
                  className={`w-9 h-4.5 rounded-full transition-colors relative ${autoAssign ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${autoAssign ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-xs text-gray-600">Auto-asignar con round-robin</span>
              </label>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                <button onClick={saveChanges} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700">Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function MetaIntegracionClient({
  projects,
  agents,
}: {
  projects: Project[]
  agents: Agent[]
}) {
  const [configs, setConfigs] = useState<MetaPageConfig[]>([])
  const [logs, setLogs] = useState<MetaLeadLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showConnect, setShowConnect] = useState(false)
  const [testLoading, setTestLoading] = useState<string | null>(null)

  const VERIFY_TOKEN = 'plataforma-vm-meta-2024-secret'
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/meta`
    : '/api/webhooks/meta'

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pagesRes, logsRes] = await Promise.all([
        fetch('/api/meta/pages'),
        fetch('/api/meta/logs?limit=100'),
      ])
      setConfigs(await pagesRes.json())
      setLogs(await logsRes.json())
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [])

  const handleToggle = async (id: string, isActive: boolean) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, isActive } : c))
    await fetch(`/api/meta/pages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta integración? Los leads ya creados no se eliminarán.')) return
    setConfigs(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/meta/pages/${id}`, { method: 'DELETE' })
  }

  const handleUpdate = async (id: string, data: Partial<MetaPageConfig>) => {
    const res = await fetch(`/api/meta/pages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const updated = await res.json()
    setConfigs(prev => prev.map(c => c.id === id ? updated : c))
  }

  // Simular un lead de prueba
  const sendTestLead = async (config: MetaPageConfig) => {
    setTestLoading(config.id)
    const ts = Date.now()
    try {
      // Usamos el endpoint de test de Meta (lead ficticio) que no requiere Graph API
      const res = await fetch('/api/webhooks/meta/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: config.pageId,
          configId: config.id,
          firstName: 'Test',
          lastName: `Instagram ${new Date().toLocaleTimeString('es-CL')}`,
          phone: `+5691${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
          email: `test.${ts}@ejemplo.com`,
          extras: {
            '¿En qué proyecto te interesas?': projects.find(p => p.id === config.projectId)?.name || 'Consulta general',
            '¿Cuándo planeas comprar?': 'En los próximos 3 meses',
          },
        }),
      })
      const data = await res.json()
      if (data.ok) {
        alert(`✅ Lead de prueba creado:\n${data.leadName}\nRevísalo en el CRM.`)
        fetchData()
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } finally {
      setTestLoading(null)
    }
  }

  const totalLeads = configs.reduce((s, c) => s + c.leadsReceived, 0)
  const activeCount = configs.filter(c => c.isActive).length

  return (
    <div className="space-y-6">
      {/* Header de la sección */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">
              📸
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Instagram & Facebook Lead Ads</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Conecta tus páginas de Instagram y Facebook para capturar leads automáticamente
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold border border-purple-200">
                  {activeCount} cuenta{activeCount !== 1 ? 's' : ''} activa{activeCount !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-gray-500">{totalLeads} leads totales recibidos</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowConnect(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Conectar cuenta
          </button>
        </div>
      </div>

      {/* Cómo funciona */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">⚡ Flujo automático</h3>
        <div className="grid grid-cols-5 gap-2 items-center">
          {[
            { icon: '📸', label: 'Cliente llena el formulario de Instagram Lead Ad' },
            { icon: '→', label: '', arrow: true },
            { icon: '🔗', label: 'Meta envía el lead a tu webhook automáticamente' },
            { icon: '→', label: '', arrow: true },
            { icon: '👤', label: 'Se crea el lead en el CRM con proyecto y asesor asignado' },
          ].map((item, i) => (
            item.arrow ? (
              <div key={i} className="text-2xl text-gray-300 text-center">→</div>
            ) : (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-xs text-gray-600 leading-relaxed">{item.label}</p>
              </div>
            )
          ))}
        </div>

        {/* Datos que se capturan */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-3">Datos capturados automáticamente:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: '👤', label: 'Nombre completo' },
              { icon: '📞', label: 'Número de teléfono' },
              { icon: '📧', label: 'Email' },
              { icon: '💬', label: 'Respuestas del formulario → Notas' },
              { icon: '🌡️', label: 'Temperatura detectada automáticamente' },
              { icon: '💰', label: 'Presupuesto (si está en el formulario)' },
              { icon: '📁', label: 'Proyecto asignado por cuenta' },
              { icon: '👔', label: 'Asesor auto-asignado' },
            ].map(d => (
              <span key={d.label} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full border border-blue-100 font-medium">
                <span>{d.icon}</span>{d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Configuración del webhook */}
      <div className="bg-gray-950 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-300 font-semibold text-sm">Configuración del Webhook en Meta Business Suite</h3>
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-semibold border border-green-500/30">
            Paso único
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-gray-500 text-xs mb-2">1. Webhook URL (copia esto en Meta Business Suite → Suscripciones de webhooks):</p>
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
              <code className="text-green-400 text-sm flex-1 break-all">{webhookUrl}</code>
              <button
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                className="text-gray-400 hover:text-gray-200 flex-shrink-0 text-xs"
              >
                Copiar
              </button>
            </div>
          </div>

          <div>
            <p className="text-gray-500 text-xs mb-2">2. Token de verificación (en Meta, campo &quot;Verify Token&quot;):</p>
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
              <code className="text-amber-400 text-sm flex-1">{VERIFY_TOKEN}</code>
              <button
                onClick={() => navigator.clipboard.writeText(VERIFY_TOKEN)}
                className="text-gray-400 hover:text-gray-200 flex-shrink-0 text-xs"
              >
                Copiar
              </button>
            </div>
          </div>

          <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl p-4">
            <p className="text-blue-300 text-xs font-semibold mb-2">📋 Pasos en Meta Business Suite:</p>
            <ol className="text-blue-400/80 text-xs space-y-1.5 list-decimal list-inside">
              <li>Ve a <strong className="text-blue-300">Meta for Developers</strong> → Tu App → Webhooks</li>
              <li>Agrega la URL del webhook y el token de verificación de arriba</li>
              <li>Suscríbete al campo: <code className="bg-blue-900/50 px-1 rounded text-blue-200">leadgen</code></li>
              <li>Activa la suscripción en cada página de Facebook que tengas</li>
              <li>¡Listo! Cada Lead Ad de Instagram llegará aquí automáticamente</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Cuentas conectadas */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Cuentas conectadas</h3>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : configs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">📸</div>
            <p className="text-gray-600 font-semibold text-lg">Sin cuentas conectadas</p>
            <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
              Conecta las páginas de Instagram de tus proyectos para capturar leads automáticamente
            </p>
            <button
              onClick={() => setShowConnect(true)}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:opacity-90"
            >
              + Conectar primera cuenta
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {configs.map(config => (
              <div key={config.id}>
                <AccountCard
                  config={config}
                  projects={projects}
                  agents={agents}
                  logs={logs}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
                {/* Test button */}
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => sendTestLead(config)}
                    disabled={testLoading === config.id || !config.isActive}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {testLoading === config.id ? (
                      <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    Enviar lead de prueba
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs recientes */}
      {logs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">Últimos leads recibidos de Instagram</h3>
            <span className="text-xs text-gray-400">{logs.length} registros</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Página</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Estado</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Lead ID Meta</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Lead CRM</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Hace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.slice(0, 20).map(log => {
                const config = configs.find(c => c.pageId === log.pageId)
                const statusColors: Record<string, string> = {
                  PROCESADO: 'bg-green-100 text-green-700 border-green-200',
                  DUPLICADO: 'bg-amber-100 text-amber-700 border-amber-200',
                  ERROR: 'bg-red-100 text-red-700 border-red-200',
                }
                return (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-gray-700">{config?.pageName || log.pageId}</span>
                      {config?.instagramHandle && (
                        <span className="text-xs text-gray-400 ml-1">@{config.instagramHandle}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColors[log.status] || 'bg-gray-100 text-gray-600'}`}>
                        {log.status === 'PROCESADO' ? '✅ Creado' : log.status === 'DUPLICADO' ? '⚠️ Duplicado' : '❌ Error'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <code className="text-xs text-gray-400 font-mono">{log.leadgenId.slice(0, 20)}...</code>
                    </td>
                    <td className="px-3 py-3">
                      {log.leadId ? (
                        <a href={`/crm/${log.leadId}`} className="text-xs text-blue-600 hover:underline">Ver lead →</a>
                      ) : (
                        <span className="text-xs text-gray-400">{log.error ? log.error.slice(0, 30) : '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-gray-400">{timeAgo(log.createdAt)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showConnect && (
        <ConnectAccountModal
          projects={projects}
          agents={agents}
          onClose={() => setShowConnect(false)}
          onSave={config => {
            setConfigs(prev => [config, ...prev])
            setShowConnect(false)
          }}
        />
      )}
    </div>
  )
}
