'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Agent { id: string; name: string; role: string; avatar: string | null }
interface Room {
  id: string; type: string; name: string | null; slug: string
  unread: number; lastMsg: string | null; lastMsgAt: string | null
}
interface Message {
  id: string; roomId: string; senderId: string; senderName: string
  content: string; type: string; taskDone: boolean
  reminderAt: string | null; isPinned: boolean; createdAt: string
}

type MsgType = 'TEXT' | 'TASK' | 'REMINDER'

const TYPE_CFG: Record<MsgType, { icon: string; label: string; color: string }> = {
  TEXT:     { icon: '💬', label: 'Mensaje',    color: 'bg-blue-100 text-blue-800' },
  TASK:     { icon: '✅', label: 'Tarea',      color: 'bg-green-100 text-green-800' },
  REMINDER: { icon: '🔔', label: 'Recordatorio', color: 'bg-yellow-100 text-yellow-800' },
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Ayer'
  return d.toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit' })
}

function fmtFull(iso: string) {
  return new Date(iso).toLocaleString('es-PA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function avatarLetters(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const COLORS = ['bg-indigo-500','bg-pink-500','bg-teal-500','bg-orange-500','bg-purple-500','bg-cyan-500','bg-rose-500','bg-emerald-500']
function agentColor(id: string) { return COLORS[id.charCodeAt(id.length - 1) % COLORS.length] }

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  agents: Agent[]
  currentAgentId: string
  currentAgentName: string
}

export default function ChatClient({ agents, currentAgentId, currentAgentName }: Props) {
  const [rooms, setRooms]           = useState<Room[]>([])
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [msgType, setMsgType]       = useState<MsgType>('TEXT')
  const [reminderAt, setReminderAt] = useState('')
  const [showNewDM, setShowNewDM]   = useState(false)
  const [sending, setSending]       = useState(false)
  const [lastFetch, setLastFetch]   = useState('')
  const bottomRef                   = useRef<HTMLDivElement>(null)
  const pollRef                     = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Fetch rooms ──────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    const res = await fetch('/api/chat/rooms')
    if (res.ok) setRooms(await res.json())
  }, [])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  // ── Fetch messages with polling ──────────────────────────────────────────
  const fetchMessages = useCallback(async (room: Room, since?: string) => {
    const url = `/api/chat/messages?roomId=${room.id}${since ? `&since=${encodeURIComponent(since)}` : ''}`
    const res = await fetch(url)
    if (!res.ok) return
    const data: Message[] = await res.json()
    if (data.length > 0) {
      setMessages(prev => {
        const ids = new Set(prev.map(m => m.id))
        const fresh = data.filter(m => !ids.has(m.id))
        return [...prev, ...fresh]
      })
      setLastFetch(data[data.length - 1].createdAt)
    }
  }, [])

  const selectRoom = useCallback(async (room: Room) => {
    setActiveRoom(room)
    setMessages([])
    setLastFetch('')
    await fetchMessages(room)
    await fetch(`/api/chat/rooms/${room.id}/read`, { method: 'POST' })
    setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unread: 0 } : r))
  }, [fetchMessages])

  // Polling every 3 seconds when a room is open
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!activeRoom) return
    pollRef.current = setInterval(async () => {
      if (!activeRoom) return
      await fetchMessages(activeRoom, lastFetch || undefined)
      fetchRooms()
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeRoom, lastFetch, fetchMessages, fetchRooms])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ─────────────────────────────────────────────────────────
  const send = async () => {
    if (!input.trim() || !activeRoom || sending) return
    setSending(true)
    const body: Record<string, unknown> = {
      roomId: activeRoom.id,
      content: input.trim(),
      type: msgType,
    }
    if (msgType === 'REMINDER' && reminderAt) body.reminderAt = reminderAt
    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const msg: Message = await res.json()
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setLastFetch(msg.createdAt)
      setInput('')
      if (msgType === 'REMINDER') setReminderAt('')
    }
    setSending(false)
    fetchRooms()
  }

  const toggleTask = async (msg: Message) => {
    const res = await fetch(`/api/chat/messages/${msg.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskDone: !msg.taskDone }),
    })
    if (res.ok) {
      const updated: Message = await res.json()
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
    }
  }

  const togglePin = async (msg: Message) => {
    const res = await fetch(`/api/chat/messages/${msg.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: !msg.isPinned }),
    })
    if (res.ok) {
      const updated: Message = await res.json()
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
    }
  }

  const deleteMsg = async (id: string) => {
    if (!confirm('¿Eliminar este mensaje?')) return
    const res = await fetch(`/api/chat/messages/${id}`, { method: 'DELETE' })
    if (res.ok) setMessages(prev => prev.filter(m => m.id !== id))
  }

  const startDM = async (targetId: string) => {
    const res = await fetch('/api/chat/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetAgentId: targetId }),
    })
    if (res.ok) {
      await fetchRooms()
      setShowNewDM(false)
      // small delay to let rooms update
      setTimeout(async () => {
        const rooms2Res = await fetch('/api/chat/rooms')
        if (rooms2Res.ok) {
          const rooms2: Room[] = await rooms2Res.json()
          setRooms(rooms2)
          const dm = rooms2.find(r => r.type === 'DIRECT' && r.slug.includes(targetId))
          if (dm) selectRoom(dm)
        }
      }, 300)
    }
  }

  const roomLabel = (room: Room) => {
    if (room.type === 'GENERAL') return '# General'
    // For DM: show other person's name
    const otherIds = room.slug.replace('dm-', '').split('-').filter(Boolean)
    const otherId = otherIds.find(id => !currentAgentId.includes(id)) || otherIds[0]
    const agent = agents.find(a => a.id === otherId || otherId && a.id.includes(otherId))
    return `@ ${agent?.name ?? 'Mensaje Directo'}`
  }

  const pinnedMessages = messages.filter(m => m.isPinned)
  const tasks = messages.filter(m => m.type === 'TASK')
  const reminders = messages.filter(m => m.type === 'REMINDER')

  return (
    <div className="flex h-screen bg-gray-50" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* ── Sidebar ── */}
      <div className="w-64 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold text-lg">💬 Chat interno</h2>
          <p className="text-xs text-gray-400 mt-0.5">{currentAgentName}</p>
        </div>

        {/* Rooms list */}
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 && (
            <p className="text-gray-500 text-xs px-4 py-3">Cargando salas…</p>
          )}
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => selectRoom(room)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors ${
                activeRoom?.id === room.id ? 'bg-gray-800 border-l-2 border-indigo-400' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm truncate ${activeRoom?.id === room.id ? 'text-white font-medium' : 'text-gray-300'}`}>
                  {roomLabel(room)}
                </span>
                {room.unread > 0 && (
                  <span className="ml-1 bg-indigo-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {room.unread}
                  </span>
                )}
              </div>
              {room.lastMsg && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{room.lastMsg}</p>
              )}
            </button>
          ))}
        </div>

        {/* New DM */}
        <div className="p-3 border-t border-gray-700">
          <button
            onClick={() => setShowNewDM(true)}
            className="w-full text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded px-3 py-2 text-center transition-colors"
          >
            + Mensaje directo
          </button>
        </div>
      </div>

      {/* ── Main chat area ── */}
      {!activeRoom ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-lg font-medium">Selecciona una sala para chatear</p>
            <p className="text-sm mt-1">O inicia un mensaje directo con alguien del equipo</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">{roomLabel(activeRoom)}</h3>
              <p className="text-xs text-gray-500">
                {activeRoom.type === 'GENERAL' ? 'Canal general del equipo' : 'Conversación privada'}
              </p>
            </div>
            {/* Quick stats */}
            <div className="flex gap-3 text-xs text-gray-500">
              {tasks.length > 0 && (
                <span className="flex items-center gap-1">
                  ✅ <b>{tasks.filter(t => t.taskDone).length}/{tasks.length}</b> tareas
                </span>
              )}
              {reminders.length > 0 && (
                <span className="flex items-center gap-1">
                  🔔 <b>{reminders.length}</b> recordatorios
                </span>
              )}
              {pinnedMessages.length > 0 && (
                <span className="flex items-center gap-1">
                  📌 <b>{pinnedMessages.length}</b> fijados
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                <div className="text-4xl mb-2">👋</div>
                <p>No hay mensajes aún. ¡Sé el primero!</p>
              </div>
            )}
            {messages.map(msg => {
              const isMe = msg.senderId === currentAgentId
              const cfg = TYPE_CFG[msg.type as MsgType] ?? TYPE_CFG.TEXT

              return (
                <div key={msg.id} className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${agentColor(msg.senderId)}`}>
                    {avatarLetters(msg.senderName)}
                  </div>

                  <div className={`max-w-lg ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {/* Sender + time */}
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-medium text-gray-700">{msg.senderName}</span>
                      <span className="text-xs text-gray-400">{fmtTime(msg.createdAt)}</span>
                      {msg.isPinned && <span title="Fijado">📌</span>}
                    </div>

                    {/* Bubble */}
                    <div className={`relative rounded-2xl px-4 py-2 text-sm break-words ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 border rounded-tl-sm shadow-sm'
                    }`}>
                      {/* Type badge */}
                      {msg.type !== 'TEXT' && (
                        <div className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded mb-1 ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </div>
                      )}

                      {/* Task: strike-through when done */}
                      {msg.type === 'TASK' ? (
                        <p className={msg.taskDone ? 'line-through opacity-60' : ''}>{msg.content}</p>
                      ) : (
                        <p>{msg.content}</p>
                      )}

                      {/* Reminder date */}
                      {msg.type === 'REMINDER' && msg.reminderAt && (
                        <p className={`text-xs mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-500'}`}>
                          🕐 {fmtFull(msg.reminderAt)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={`flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'flex-row-reverse' : ''}`}>
                      {msg.type === 'TASK' && (
                        <button
                          onClick={() => toggleTask(msg)}
                          className="text-xs text-gray-500 hover:text-green-600"
                          title={msg.taskDone ? 'Marcar pendiente' : 'Marcar completada'}
                        >
                          {msg.taskDone ? '↩ Reabrir' : '✓ Completar'}
                        </button>
                      )}
                      <button
                        onClick={() => togglePin(msg)}
                        className="text-xs text-gray-500 hover:text-indigo-600"
                        title={msg.isPinned ? 'Desfijar' : 'Fijar'}
                      >
                        {msg.isPinned ? '📌 Desfijar' : '📌 Fijar'}
                      </button>
                      {isMe && (
                        <button
                          onClick={() => deleteMsg(msg.id)}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="bg-white border-t px-6 py-4">
            {/* Type selector */}
            <div className="flex gap-2 mb-3">
              {(Object.keys(TYPE_CFG) as MsgType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setMsgType(t)}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    msgType === t
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {TYPE_CFG[t].icon} {TYPE_CFG[t].label}
                </button>
              ))}
            </div>

            {/* Reminder date picker */}
            {msgType === 'REMINDER' && (
              <div className="mb-2">
                <label className="text-xs text-gray-500 mb-1 block">Fecha y hora del recordatorio</label>
                <input
                  type="datetime-local"
                  value={reminderAt}
                  onChange={e => setReminderAt(e.target.value)}
                  className="border rounded px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            )}

            <div className="flex gap-3 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={
                  msgType === 'TASK' ? 'Describe la tarea…' :
                  msgType === 'REMINDER' ? 'Describe el recordatorio…' :
                  'Escribe un mensaje… (Enter para enviar)'
                }
                rows={2}
                className="flex-1 border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {sending ? '…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New DM modal ── */}
      {showNewDM && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-800">Nuevo mensaje directo</h3>
              <button onClick={() => setShowNewDM(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {agents
                .filter(a => a.id !== currentAgentId)
                .map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => startDM(agent.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${agentColor(agent.id)}`}>
                      {avatarLetters(agent.name)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{agent.name}</p>
                      <p className="text-xs text-gray-400">{agent.role}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
