'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  '¿Qué seguimientos están atrasados?',
  'Dame un resumen del pipeline',
  '¿Qué citas tengo esta semana?',
  '¿Cómo van las reservas activas?',
]

function formatMessage(text: string) {
  return text
    .split('\n')
    .map((line, i) => {
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      line = line.replace(/\*(.*?)\*/g, '<em>$1</em>')
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return `<div key="${i}" class="flex gap-1.5 mt-1"><span class="text-blue-400 mt-0.5 flex-shrink-0">•</span><span>${line.slice(2)}</span></div>`
      }
      if (line.startsWith('---') || line.startsWith('===')) {
        const label = line.replace(/[-=]/g, '').trim()
        return label ? `<div key="${i}" class="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-1">${label}</div>` : ''
      }
      if (line.trim() === '') return `<div key="${i}" class="h-1"></div>`
      return `<div key="${i}">${line}</div>`
    })
    .join('')
}

export default function CRMChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { if (open) scrollToBottom() }, [messages, open])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100) }, [open])

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: msg }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages }),
      })
      const data = await res.json()
      if (data.error === 'ANTHROPIC_API_KEY no configurada') {
        setHasApiKey(false)
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ El asistente no está configurado todavía. Pide al administrador que agregue la API key de Anthropic.' }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión. Intenta de nuevo.' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl transition-all duration-200 ${
          open ? 'bg-gray-700 scale-95' : 'bg-gradient-to-br from-blue-600 to-indigo-700 hover:scale-110'
        }`}
        title="Asistente IA"
      >
        {open ? '✕' : '✦'}
        {!open && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: 'min(600px, calc(100vh - 8rem))' }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-lg">✦</div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">Asistente SI</div>
              <div className="text-blue-200 text-xs">Acceso completo al CRM · Actualizado en tiempo real</div>
            </div>
            <button
              onClick={() => { setMessages([]); setInput('') }}
              className="text-blue-200 hover:text-white text-xs transition-colors"
              title="Limpiar conversación"
            >
              ↺ Limpiar
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✦</div>
                <div className="text-sm font-medium text-gray-700 mb-1">¿En qué te ayudo?</div>
                <div className="text-xs text-gray-400 mb-4">Tengo acceso completo al CRM: leads, citas, reservas, proyectos y más.</div>
                <div className="space-y-2">
                  {QUICK_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={() => void send(p)}
                      className="block w-full text-left text-xs px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                  msg.role === 'user' ? 'bg-indigo-100 text-indigo-700' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
                }`}>
                  {msg.role === 'user' ? 'Tú' : '✦'}
                </div>
                <div className={`max-w-[85%] text-sm leading-relaxed rounded-2xl px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs">✦</div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escribe tu pregunta... (Enter para enviar)"
              rows={1}
              disabled={loading || !hasApiKey}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-28 overflow-y-auto disabled:bg-gray-50 disabled:text-gray-400"
              style={{ lineHeight: '1.5' }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 112) + 'px'
              }}
            />
            <button
              onClick={() => void send()}
              disabled={loading || !input.trim() || !hasApiKey}
              className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex-shrink-0"
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  )
}
