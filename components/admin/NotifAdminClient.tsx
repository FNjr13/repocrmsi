'use client'

import { useState, useEffect } from 'react'

interface Agent {
  id: string
  name: string
  role: string
  department: string
}

interface SentNotif {
  id: string
  title: string
  message: string
  agentId: string | null
  sentBy: string | null
  isRead: boolean
  createdAt: string
}

const EMOJIS = ['📣', '⚠️', '🔔', '💬', '🎯', '📌', '🚀', '👀', '✅', '❌', '🔥', '💡', '📊', '🏆']

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const d = Math.floor(hrs / 24)
  return `hace ${d}d`
}

export default function NotifAdminClient({ agents }: { agents: Agent[] }) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [agentId, setAgentId] = useState('ALL')
  const [emoji, setEmoji] = useState('📣')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; sent?: number; error?: string } | null>(null)
  const [history, setHistory] = useState<SentNotif[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  async function loadHistory() {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/notifications?adminView=true')
      const data = await res.json()
      setHistory(data.sent || [])
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => { loadHistory() }, [])

  async function sendNotif() {
    if (!title.trim() || !message.trim()) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, agentId, emoji }),
      })
      const data = await res.json()
      if (data.ok) {
        setResult({ ok: true, sent: data.sent })
        setTitle('')
        setMessage('')
        setAgentId('ALL')
        setEmoji('📣')
        await loadHistory()
      } else {
        setResult({ error: data.error || 'Error desconocido' })
      }
    } catch {
      setResult({ error: 'No se pudo conectar' })
    }
    setSending(false)
  }

  const recipientLabel = (n: SentNotif) => {
    if (!n.agentId) return { text: 'Todos (global)', color: 'bg-blue-100 text-blue-700' }
    const a = agents.find(x => x.id === n.agentId)
    return a
      ? { text: a.name, color: 'bg-purple-100 text-purple-700' }
      : { text: 'Usuario específico', color: 'bg-gray-100 text-gray-600' }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">🔔 Notificaciones</h1>
        <p className="text-sm text-gray-500 mt-0.5">Envía mensajes internos a asesoras individuales o a todo el equipo</p>
      </div>

      <div className="p-4 sm:p-8 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Send panel ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">📤</span>
            Enviar notificación
          </h2>

          {/* Recipient */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Destinatario</label>
            <div className="grid grid-cols-1 gap-2">
              {/* All / Global */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAgentId('ALL')}
                  className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${agentId === 'ALL' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  <span className="text-lg">👥</span>
                  <div className="text-left">
                    <div className="font-semibold">Todo el equipo</div>
                    <div className="text-xs opacity-70">Una notif. por persona</div>
                  </div>
                </button>
                <button
                  onClick={() => setAgentId('GLOBAL')}
                  className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${agentId === 'GLOBAL' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  <span className="text-lg">🌐</span>
                  <div className="text-left">
                    <div className="font-semibold">Global</div>
                    <div className="text-xs opacity-70">Una notif. compartida</div>
                  </div>
                </button>
              </div>
              {/* Individual agents */}
              <div>
                <p className="text-xs text-gray-400 mb-1.5">O elige una asesora específica:</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {agents.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setAgentId(a.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left ${agentId === a.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                        {a.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                      </div>
                      <div className="truncate">
                        <div className="truncate">{a.name.split(' ')[0]}</div>
                        <div className="text-[10px] text-gray-400 truncate">{a.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Emoji */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ícono</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-xl text-lg transition-all ${emoji === e ? 'bg-blue-100 ring-2 ring-blue-400 scale-110' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Título</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 bg-white">
              <span className="pl-3 text-lg flex-shrink-0">{emoji}</span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Atiende tus leads pendientes"
                maxLength={80}
                className="flex-1 py-2.5 pr-3 text-sm focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-right">{title.length}/80</p>
          </div>

          {/* Message */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mensaje</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tienes 5 leads sin contactar desde hace más de 2 días. Por favor revísalos hoy."
              maxLength={300}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1 text-right">{message.length}/300</p>
          </div>

          {/* Preview */}
          {(title || message) && (
            <div className="mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <p className="text-xs font-semibold text-indigo-600 mb-1.5">Vista previa</p>
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-sm flex-shrink-0">{emoji}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{emoji} {title || 'Título...'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{message || 'Mensaje...'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Send button */}
          <button
            onClick={sendNotif}
            disabled={sending || !title.trim() || !message.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {sending ? (
              <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Enviando...</>
            ) : (
              <>📤 {agentId === 'ALL' ? `Enviar a todo el equipo (${agents.length})` : agentId === 'GLOBAL' ? 'Enviar notificación global' : `Enviar a ${agents.find(a => a.id === agentId)?.name.split(' ')[0] || 'usuario'}`}</>
            )}
          </button>

          {result && (
            <div className={`mt-3 px-4 py-3 rounded-xl text-sm font-medium ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {result.ok
                ? `✅ Notificación enviada a ${result.sent} ${result.sent === 1 ? 'persona' : 'personas'}`
                : `❌ ${result.error}`}
            </div>
          )}
        </div>

        {/* ── History panel ── */}
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">📋 Historial enviadas</h2>
            <button onClick={loadHistory} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Actualizar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[520px]">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <span className="text-5xl mb-3">📬</span>
                <p className="text-sm font-semibold text-gray-700">Sin notificaciones enviadas</p>
                <p className="text-xs text-gray-400 mt-1">Las notificaciones que envíes aparecerán aquí</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {history.map(n => {
                  const rec = recipientLabel(n)
                  return (
                    <div key={n.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{n.title}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2 leading-relaxed">{n.message}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${rec.color}`}>
                          → {rec.text}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${n.isRead ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {n.isRead ? '✓ Leída' : '○ Pendiente'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
