'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface WaMessage {
  id: string
  leadId: string
  direction: string
  content: string
  type: string
  status: string
  waMsgId: string
  createdAt: string
}

const QUICK_REPLIES = [
  '¡Hola! ¿En qué puedo ayudarte?',
  'Gracias por tu interés. ¿Cuándo podemos agendar una visita?',
  'Te envío información del proyecto ahora mismo.',
  'Perfecto, te contactamos hoy para coordinar.',
  '¿Tienes disponibilidad esta semana para visitar el proyecto?',
]

export default function WhatsAppChat({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showQuick, setShowQuick] = useState(false)
  const [configured, setConfigured] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp/messages/${leadId}`)
      if (res.ok) {
        const data = await res.json() as WaMessage[]
        setMessages(data)
      }
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    // Check if WhatsApp is configured
    fetch('/api/whatsapp/config').then(r => r.json()).then((cfg: null | { id: string }) => {
      setConfigured(!!cfg)
    }).catch(() => setConfigured(false))

    load()
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(() => { void load() }, 15_000)
    return () => clearInterval(interval)
  }, [load])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || sending) return
    setInput('')
    setShowQuick(false)
    setSending(true)

    // Optimistic UI
    const optimistic: WaMessage = {
      // eslint-disable-next-line react-hooks/purity
      id: `opt_${Date.now()}`,
      leadId,
      direction: 'OUTBOUND',
      content: msg,
      type: 'text',
      status: 'SENDING',
      waMsgId: '',
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, message: msg }),
      })
      const data = await res.json() as { ok: boolean; messageId: string; status: string }
      if (data.ok) {
        setMessages(prev =>
          prev.map(m => m.id === optimistic.id ? { ...m, id: data.messageId, status: data.status } : m)
        )
      }
    } finally {
      setSending(false)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Hoy'
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })
  }

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center p-6">
        <div className="text-4xl">📵</div>
        <p className="text-gray-600 font-medium">WhatsApp no configurado</p>
        <p className="text-sm text-gray-400">
          Configura la integración de WhatsApp Business API en la sección de WhatsApp del menú.
        </p>
      </div>
    )
  }

  // Group messages by date
  const grouped: { date: string; msgs: WaMessage[] }[] = []
  for (const m of messages) {
    const date = formatDate(m.createdAt)
    const last = grouped[grouped.length - 1]
    if (last && last.date === date) {
      last.msgs.push(m)
    } else {
      grouped.push({ date, msgs: [m] })
    }
  }

  return (
    <div className="flex flex-col h-full border border-gray-100 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-green-600 text-white">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
          {leadName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{leadName}</div>
          <div className="text-xs text-green-100">WhatsApp Business</div>
        </div>
        <button
          onClick={() => void load()}
          title="Actualizar"
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
           style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3C/svg%3E")' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm text-gray-400">Sin mensajes aún. Inicia la conversación.</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              <div className="flex justify-center mb-3">
                <span className="text-[11px] text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-0.5 shadow-sm">
                  {group.date}
                </span>
              </div>
              <div className="space-y-1.5">
                {group.msgs.map(m => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[72%] rounded-2xl px-3 py-2 shadow-sm ${
                        m.direction === 'OUTBOUND'
                          ? 'bg-green-500 text-white rounded-tr-sm'
                          : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                      <div className={`flex items-center gap-1 mt-1 justify-end ${m.direction === 'OUTBOUND' ? 'text-green-100' : 'text-gray-400'}`}>
                        <span className="text-[10px]">{formatTime(m.createdAt)}</span>
                        {m.direction === 'OUTBOUND' && (
                          <span className="text-[10px]">
                            {m.status === 'SENDING' ? '⏳' : m.status === 'FAILED' ? '❌' : '✓✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {showQuick && (
        <div className="border-t border-gray-100 bg-white px-3 py-2">
          <p className="text-xs text-gray-500 mb-1.5">Respuestas rápidas</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REPLIES.map(r => (
              <button
                key={r}
                onClick={() => void send(r)}
                className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-1 hover:bg-green-100 transition-colors"
              >
                {r.length > 40 ? r.slice(0, 40) + '…' : r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 px-3 py-3 bg-white border-t border-gray-100">
        <button
          onClick={() => setShowQuick(v => !v)}
          title="Respuestas rápidas"
          className={`flex-shrink-0 p-2 rounded-full transition-colors ${showQuick ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder={`Mensaje para ${leadName}...`}
          rows={1}
          className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 max-h-28 overflow-y-auto"
          style={{ minHeight: '40px' }}
        />
        <button
          onClick={() => void send()}
          disabled={!input.trim() || sending}
          className="flex-shrink-0 p-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white rounded-full transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  )
}
