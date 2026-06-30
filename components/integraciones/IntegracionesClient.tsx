'use client'

import { useState, useMemo } from 'react'
import MetaIntegracionClient from './MetaIntegracionClient'

interface WebhookLog {
  id: string
  source: string
  payload: string
  status: string
  leadId: string | null
  error: string | null
  createdAt: string
}

interface IntegrationStats {
  source: string
  total: number
  created: number
  duplicate: number
  error: number
}

interface Project { id: string; name: string }
interface Agent { id: string; name: string }

const PORTALS = [
  {
    id: 'PORTALINMOBILIARIO',
    name: 'Portal Inmobiliario',
    logo: '🏢',
    description: 'El portal más grande de Chile. Recibe leads automáticamente.',
    color: 'from-red-500 to-red-600',
  },
  {
    id: 'YAPO',
    name: 'Yapo.cl',
    logo: '🟡',
    description: 'Portal de clasificados con alta demanda inmobiliaria.',
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    id: 'PROPERATI',
    name: 'Properati',
    logo: '🌐',
    description: 'Portal latinoamericano con leads de alta calidad.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'GOOGLE',
    name: 'Google Ads',
    logo: '🔍',
    description: 'Leads desde campañas de Google Search y Display.',
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'WEB',
    name: 'Sitio web propio',
    logo: '💻',
    description: 'Formulario de contacto de tu sitio web.',
    color: 'from-violet-500 to-violet-600',
  },
]

const STATUS_COLORS: Record<string, string> = {
  PROCESADO: 'bg-green-100 text-green-700 border-green-200',
  DUPLICADO: 'bg-amber-100 text-amber-700 border-amber-200',
  ERROR: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_ICONS: Record<string, string> = {
  PROCESADO: '✅',
  DUPLICADO: '⚠️',
  ERROR: '❌',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

// ── Portals Tab ──────────────────────────────────────────────────────────────
function PortalsTab({ initialLogs }: { initialLogs: WebhookLog[] }) {
  const [logs, setLogs] = useState(initialLogs)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [loadingLogs, setLoadingLogs] = useState(false)

  const stats: IntegrationStats[] = useMemo(() => {
    const map = new Map<string, IntegrationStats>()
    for (const log of logs) {
      if (!map.has(log.source)) {
        map.set(log.source, { source: log.source, total: 0, created: 0, duplicate: 0, error: 0 })
      }
      const s = map.get(log.source)!
      s.total++
      if (log.status === 'PROCESADO') s.created++
      else if (log.status === 'DUPLICADO') s.duplicate++
      else if (log.status === 'ERROR') s.error++
    }
    return Array.from(map.values())
  }, [logs])

  const filteredLogs = useMemo(() => {
    let list = [...logs]
    if (selectedSource) list = list.filter(l => l.source === selectedSource)
    if (filterStatus) list = list.filter(l => l.status === filterStatus)
    return list.slice(0, 100)
  }, [logs, selectedSource, filterStatus])

  const refreshLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch('/api/webhooks/portal?limit=100')
      const newLogs = await res.json()
      setLogs(newLogs)
    } finally {
      setLoadingLogs(false)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(''), 2000)
  }

  const getWebhookUrl = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://tu-dominio.com'
    return `${base}/api/webhooks/portal`
  }

  const sendTestWebhook = async (source: string) => {
    const testPayload = {
      source,
      name: 'Juan Pérez Test',
      email: `test+${Date.now()}@ejemplo.com`,
      phone: '+56912345678',
      message: 'Interesado en conocer más información sobre el proyecto',
      project: 'Proyecto Demo',
    }
    try {
      const res = await fetch('/api/webhooks/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-portal-source': source },
        body: JSON.stringify(testPayload),
      })
      const data = await res.json()
      alert(`Test enviado: ${data.status === 'created' ? '✅ Lead creado exitosamente' : data.status === 'duplicate' ? '⚠️ Lead duplicado detectado' : '❌ Error'}`)
      refreshLogs()
    } catch {
      alert('Error al enviar test')
    }
  }

  const webhookUrl = getWebhookUrl()

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Conecta portales inmobiliarios y recibe leads automáticamente vía webhook</p>
        </div>
        <button
          onClick={refreshLogs}
          disabled={loadingLogs}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          {loadingLogs ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Actualizar logs
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total webhooks', value: logs.length, icon: '📡', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Leads creados', value: logs.filter(l => l.status === 'PROCESADO').length, icon: '✅', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Duplicados', value: logs.filter(l => l.status === 'DUPLICADO').length, icon: '⚠️', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Errores', value: logs.filter(l => l.status === 'ERROR').length, icon: '❌', color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl`}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Portals grid */}
      <div>
        <h2 className="text-base font-bold text-gray-800 mb-4">Canales disponibles</h2>
        <div className="grid grid-cols-3 gap-4">
          {PORTALS.map(portal => {
            const stat = stats.find(s => s.source === portal.id)
            return (
              <div key={portal.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 transition-all">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${portal.color} flex items-center justify-center text-2xl shadow-sm flex-shrink-0`}>
                    {portal.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900">{portal.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{portal.description}</p>
                  </div>
                </div>

                {stat && (
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="text-green-600 font-semibold">✓ {stat.created}</span>
                    <span>·</span>
                    <span className="text-amber-600 font-semibold">⚠ {stat.duplicate}</span>
                    <span>·</span>
                    <span className="text-red-600 font-semibold">✗ {stat.error}</span>
                    <span className="text-gray-400 ml-auto">{stat.total} total</span>
                  </div>
                )}

                {/* Webhook URL */}
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1">Webhook URL</p>
                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                    <code className="text-[10px] text-gray-600 flex-1 truncate">{webhookUrl}</code>
                    <button
                      onClick={() => copyToClipboard(webhookUrl, portal.id)}
                      className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                    >
                      {copiedId === portal.id ? (
                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-1">Header requerido</p>
                  <code className="text-[10px] bg-gray-50 border border-gray-100 rounded px-2 py-1 text-gray-600 block">
                    x-portal-source: {portal.id}
                  </code>
                </div>

                <button
                  onClick={() => sendTestWebhook(portal.id)}
                  className="w-full px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Enviar lead de prueba
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Payload example */}
      <div className="bg-gray-950 rounded-2xl p-6 text-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-300 font-semibold text-sm">Formato de payload esperado</h3>
          <button
            onClick={() => copyToClipboard(JSON.stringify({ name: 'Juan Pérez', email: 'juan@ejemplo.com', phone: '+56912345678', message: 'Consulta sobre departamentos', project: 'Nombre del proyecto', utm_campaign: 'campaña-google' }, null, 2), 'payload')}
            className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1.5"
          >
            {copiedId === 'payload' ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
        <pre className="text-green-400 text-xs leading-relaxed overflow-x-auto">{`// POST /api/webhooks/portal
// Header: x-portal-source: PORTALINMOBILIARIO

{
  "name": "Juan Pérez",           // o firstName / lastName por separado
  "email": "juan@ejemplo.com",
  "phone": "+56912345678",
  "message": "Consulta sobre departamentos",
  "project": "Nombre del proyecto",
  "budget": 150000,               // opcional
  "utm_campaign": "campaña-google" // opcional
}`}</pre>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">Registro de webhooks</h3>
          <div className="flex items-center gap-3">
            <select
              value={selectedSource || ''}
              onChange={e => setSelectedSource(e.target.value || null)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
            >
              <option value="">Todas las fuentes</option>
              {PORTALS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="PROCESADO">Procesado</option>
              <option value="DUPLICADO">Duplicado</option>
              <option value="ERROR">Error</option>
            </select>
            <span className="text-xs text-gray-400">{filteredLogs.length} registros</span>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">📡</span>
            <p className="text-gray-600 font-medium">No hay registros de webhooks</p>
            <p className="text-gray-400 text-sm mt-1">Envía un lead de prueba desde cualquier integración</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Fuente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Estado</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Lead creado</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Payload (resumen)</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Hace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map(log => {
                  let payload: Record<string, unknown> = {}
                  try { payload = JSON.parse(log.payload) } catch { /* ignore */ }
                  const name = String(payload.name || payload.nombre || `${payload.first_name || ''} ${payload.last_name || ''}`.trim() || '—')
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-gray-700">{log.source}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_ICONS[log.status]} {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {log.leadId ? (
                          <a href={`/crm/${log.leadId}`} className="text-xs text-blue-600 hover:underline">
                            Ver lead →
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs text-gray-600">
                          {name !== '—' && <span className="font-medium">{name}</span>}
                          {payload.email ? <span className="text-gray-400 ml-2">{String(payload.email)}</span> : null}
                          {log.error && <span className="text-red-500 block mt-0.5 truncate max-w-[200px]">{log.error}</span>}
                        </div>
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
      </div>
    </div>
  )
}

// ── Main component with tabs ─────────────────────────────────────────────────
type TabId = 'portales' | 'instagram'

const TABS: { id: TabId; label: string; icon: string; badge?: string }[] = [
  { id: 'portales', label: 'Portales web', icon: '🏢' },
  { id: 'instagram', label: 'Instagram / Meta Lead Ads', icon: '📸', badge: 'Nuevo' },
]

export default function IntegracionesClient({
  initialLogs,
  projects,
  agents,
}: {
  initialLogs: WebhookLog[]
  projects: Project[]
  agents: Agent[]
}) {
  const [activeTab, setActiveTab] = useState<TabId>('portales')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integraciones</h1>
        <p className="text-sm text-gray-500 mt-1">Conecta portales y fuentes de leads a tu CRM automáticamente</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold rounded-full leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'portales' && <PortalsTab initialLogs={initialLogs} />}
      {activeTab === 'instagram' && <MetaIntegracionClient projects={projects} agents={agents} />}
    </div>
  )
}
