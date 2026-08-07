'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const WonCelebration = dynamic(() => import('@/components/crm/WonCelebration'), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────
interface Notification {
  id: string
  type: string
  title: string
  message: string
  leadId: string | null
  sentBy: string | null
  isRead: boolean
  createdAt: string
}

interface Toast {
  uid: string
  title: string
  message: string
  type: string
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  NEW_LEAD:      'bg-blue-100 text-blue-700',
  FOLLOW_UP:     'bg-amber-100 text-amber-700',
  VISIT_TODAY:   'bg-purple-100 text-purple-700',
  INACTIVITY:    'bg-orange-100 text-orange-700',
  STAGE_CHANGE:  'bg-green-100 text-green-700',
  RESERVATION:   'bg-emerald-100 text-emerald-700',
  SALE_WON:      'bg-yellow-100 text-yellow-700',
  ADMIN_MESSAGE: 'bg-indigo-100 text-indigo-700',
  CHAT_MESSAGE:  'bg-pink-100 text-pink-700',
}

const TYPE_ICON: Record<string, string> = {
  NEW_LEAD:      '👤',
  FOLLOW_UP:     '🔔',
  VISIT_TODAY:   '🏠',
  INACTIVITY:    '⚠️',
  STAGE_CHANGE:  '📊',
  RESERVATION:   '📋',
  SALE_WON:      '🏆',
  ADMIN_MESSAGE: '📣',
  CHAT_MESSAGE:  '💬',
}

type Category = 'all' | 'leads' | 'ventas' | 'chat' | 'admin'

const CATS: { key: Category; label: string; icon: string; types: string[] }[] = [
  { key: 'all',    label: 'Todas',  icon: '🔔', types: [] },
  { key: 'leads',  label: 'Leads',  icon: '👤', types: ['NEW_LEAD','FOLLOW_UP','VISIT_TODAY','STAGE_CHANGE','INACTIVITY'] },
  { key: 'ventas', label: 'Ventas', icon: '💰', types: ['RESERVATION','SALE_WON'] },
  { key: 'chat',   label: 'Chat',   icon: '💬', types: ['CHAT_MESSAGE'] },
  { key: 'admin',  label: 'Admin',  icon: '📣', types: ['ADMIN_MESSAGE'] },
]

function getRoute(n: Notification): string | null {
  if (n.type === 'SALE_WON')      return null          // handled with celebration
  if (n.type === 'CHAT_MESSAGE')  return '/chat'
  if (n.type === 'VISIT_TODAY')   return '/calendar'
  if (n.type === 'NEW_LEAD')      return '/crm'
  if (n.type === 'RESERVATION')   return '/comisiones'
  if (n.leadId)                   return `/crm/${n.leadId}`
  return null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ─── Sound ────────────────────────────────────────────────────────────────────
function playPing() {
  try {
    const AC = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch { /* silent fail */ }
}

// ─── Browser notification ─────────────────────────────────────────────────────
function showBrowserNotif(title: string, body: string) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/favicon.ico', silent: true })
  } catch { /* ignore */ }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NotificationCenter() {
  const router = useRouter()
  const [open, setOpen]                         = useState(false)
  const [notifs, setNotifs]                     = useState<Notification[]>([])
  const [unread, setUnread]                     = useState(0)
  const [cat, setCat]                           = useState<Category>('all')
  const [toasts, setToasts]                     = useState<Toast[]>([])
  const [browserOk, setBrowserOk]               = useState(false)
  const [celebNotif, setCelebNotif]             = useState<Notification | null>(null)
  const prevIds                                 = useRef<Set<string>>(new Set())
  const isFirst                                 = useRef(true)
  const panelRef                                = useRef<HTMLDivElement>(null)

  // Inject keyframe CSS once
  useEffect(() => {
    if (document.getElementById('notif-anim')) return
    const s = document.createElement('style')
    s.id = 'notif-anim'
    s.textContent = `
      @keyframes notifSlideUp {
        from { transform: translateY(20px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      .notif-slide-up { animation: notifSlideUp 0.28s cubic-bezier(.22,.68,0,1.2); }

      @keyframes notifBell {
        0%,100% { transform: rotate(0);   }
        15%     { transform: rotate(15deg); }
        30%     { transform: rotate(-12deg); }
        45%     { transform: rotate(8deg); }
        60%     { transform: rotate(-5deg); }
        75%     { transform: rotate(3deg); }
      }
      .notif-bell-ring { animation: notifBell 0.6s ease; }
    `
    document.head.appendChild(s)
  }, [])

  // Browser permission state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserOk(Notification.permission === 'granted')
    }
  }, [])

  // Push toast
  const pushToast = useCallback((t: Toast) => {
    setToasts(prev => [...prev.slice(-3), t]) // max 4 toasts
    setTimeout(() => setToasts(prev => prev.filter(x => x.uid !== t.uid)), 6000)
  }, [])

  // Fetch
  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      const incoming: Notification[] = data.notifications ?? []

      if (!isFirst.current) {
        const fresh = incoming.filter(n => !prevIds.current.has(n.id) && !n.isRead)
        if (fresh.length > 0) {
          playPing()
          fresh.forEach(n => {
            pushToast({ uid: n.id + Date.now(), title: n.title, message: n.message, type: n.type })
            showBrowserNotif(n.title, n.message)
          })
          // Ring the bell: add/remove class
          const bell = document.getElementById('notif-bell-icon')
          if (bell) {
            bell.classList.add('notif-bell-ring')
            setTimeout(() => bell.classList.remove('notif-bell-ring'), 700)
          }
        }
      }

      isFirst.current = false
      prevIds.current = new Set(incoming.map(n => n.id))
      setNotifs(incoming)
      setUnread(data.unreadCount ?? 0)
    } catch { /* ignore */ }
  }, [pushToast])

  useEffect(() => {
    fetchNotifs()
    const iv = setInterval(fetchNotifs, 5000)
    return () => clearInterval(iv)
  }, [fetchNotifs])

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // ── Actions ────────────────────────────────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnread(0)
  }

  const clearRead = async () => {
    await fetch('/api/notifications', { method: 'DELETE' })
    setNotifs(prev => prev.filter(n => !n.isRead))
  }

  const handleClick = async (n: Notification) => {
    if (!n.isRead) await markRead(n.id)
    if (n.type === 'SALE_WON') { setOpen(false); setCelebNotif(n); return }
    const route = getRoute(n)
    if (route) { setOpen(false); router.push(route) }
  }

  const requestBrowser = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    const r = await Notification.requestPermission()
    setBrowserOk(r === 'granted')
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = cat === 'all'
    ? notifs
    : notifs.filter(n => CATS.find(c => c.key === cat)?.types.includes(n.type))

  const catUnread = (c: { key: Category; types: string[] }) =>
    c.key === 'all'
      ? notifs.filter(n => !n.isRead).length
      : notifs.filter(n => c.types.includes(n.type) && !n.isRead).length

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Bell button ── */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => { setOpen(o => !o); if (!open) fetchNotifs() }}
          className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Notificaciones"
        >
          <svg
            id="notif-bell-icon"
            className="w-5 h-5 text-gray-600"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {/* ── Dropdown panel ── */}
        {open && (
          <div className="absolute right-0 top-12 w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">

            {/* Header */}
            <div className="px-4 pt-4 pb-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-base">Notificaciones</span>
                  {unread > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {unread} nuevas
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!browserOk && (
                    <button
                      onClick={requestBrowser}
                      title="Activar alertas del navegador"
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 border border-indigo-200 rounded-lg px-2 py-1"
                    >
                      🔔 Activar alertas
                    </button>
                  )}
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Leer todas
                    </button>
                  )}
                  <button onClick={clearRead} className="text-xs text-gray-400 hover:text-gray-600">
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex gap-1 overflow-x-auto pb-3 scrollbar-none">
                {CATS.map(c => {
                  const cnt = catUnread(c)
                  return (
                    <button
                      key={c.key}
                      onClick={() => setCat(c.key)}
                      className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                        cat === c.key
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <span>{c.icon}</span>
                      <span>{c.label}</span>
                      {cnt > 0 && (
                        <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                          cat === c.key ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {cnt}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Notification list */}
            <div className="max-h-[440px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <span className="text-5xl mb-3">🎉</span>
                  <p className="text-sm font-semibold text-gray-700">Todo al día</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {cat === 'all' ? 'Sin notificaciones pendientes' : `Sin notificaciones en esta categoría`}
                  </p>
                </div>
              ) : (
                filtered.map(n => {
                  const route = getRoute(n)
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`group flex gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50 transition-colors ${
                        !n.isRead ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Icon badge */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${TYPE_COLOR[n.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_ICON[n.type] ?? '📌'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                        </div>

                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>

                        <div className="flex items-center gap-2 mt-1.5">
                          {n.sentBy && (
                            <span className="text-[11px] text-indigo-500">De: {n.sentBy}</span>
                          )}
                          {n.type === 'SALE_WON' && (
                            <span className="text-[11px] text-yellow-600 font-semibold animate-pulse">¡Toca para celebrar! 🎊</span>
                          )}
                          {route && n.type !== 'SALE_WON' && (
                            <span className="text-[11px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                              Ir → {route}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unread dot */}
                      {!n.isRead && (
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-2 shadow-sm shadow-blue-300" />
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                {filtered.length} notificación{filtered.length !== 1 ? 'es' : ''} · polling 5s
                {browserOk && <span className="ml-1 text-green-500" title="Alertas del navegador activas">🔔</span>}
              </span>
              <button
                onClick={fetchNotifs}
                className="text-[11px] text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Toast notifications (bottom-right) ── */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.uid}
            className="notif-slide-up pointer-events-auto flex items-start gap-3 bg-white border border-gray-200 rounded-2xl shadow-2xl px-4 py-3 w-80 cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => {
              setToasts(prev => prev.filter(x => x.uid !== t.uid))
              setOpen(true)
            }}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${TYPE_COLOR[t.type] ?? 'bg-gray-100 text-gray-600'}`}>
              {TYPE_ICON[t.type] ?? '📌'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{t.title}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{t.message}</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setToasts(prev => prev.filter(x => x.uid !== t.uid)) }}
              className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0 mt-0.5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ── SALE_WON celebration ── */}
      {celebNotif && (
        <WonCelebration
          leadName={celebNotif.title.split('— ')[1] ?? celebNotif.title}
          onClose={() => setCelebNotif(null)}
        />
      )}
    </>
  )
}
