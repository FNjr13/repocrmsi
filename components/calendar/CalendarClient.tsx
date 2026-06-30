'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalEvent {
  id: string
  title: string
  description: string | null
  type: string
  date: string
  endDate: string | null
  allDay: boolean
  status: string
  priority: string
  agentId: string | null
  leadId: string | null
  projectId: string | null
  agent: { id: string; name: string } | null
  lead: { id: string; firstName: string; lastName: string } | null
  project: { id: string; name: string } | null
}

interface Props {
  agents: Array<{ id: string; name: string; role: string }>
  projects: Array<{ id: string; name: string }>
  leads: Array<{ id: string; firstName: string; lastName: string }>
}

// ─── Config ───────────────────────────────────────────────────────────────────
const EVENT_TYPES = [
  { value: 'LLAMADA',  label: '📞 Llamada',   color: 'bg-blue-500' },
  { value: 'VISITA',   label: '🏠 Visita',    color: 'bg-green-500' },
  { value: 'REUNION',  label: '🤝 Reunión',   color: 'bg-purple-500' },
  { value: 'TAREA',    label: '✅ Tarea',     color: 'bg-orange-500' },
  { value: 'CIERRE',   label: '🎯 Cierre',    color: 'bg-yellow-500' },
  { value: 'OTRO',     label: '📌 Otro',      color: 'bg-gray-400' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  PENDIENTE:   { label: 'Pendiente',    color: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
  EN_PROGRESO: { label: 'En progreso',  color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  COMPLETADO:  { label: 'Completado',   color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  CANCELADO:   { label: 'Cancelado',    color: 'bg-red-100 text-red-600',     dot: 'bg-red-400' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  BAJA:   { label: '🔵 Baja',   color: 'text-blue-500' },
  NORMAL: { label: '🟡 Normal', color: 'text-yellow-500' },
  ALTA:   { label: '🔴 Alta',   color: 'text-red-500' },
}

// Agent color palette
const AGENT_COLORS = [
  { bg: 'bg-violet-500',  light: 'bg-violet-100', text: 'text-violet-700', hex: '#8b5cf6' },
  { bg: 'bg-pink-500',    light: 'bg-pink-100',   text: 'text-pink-700',   hex: '#ec4899' },
  { bg: 'bg-cyan-500',    light: 'bg-cyan-100',   text: 'text-cyan-700',   hex: '#06b6d4' },
  { bg: 'bg-amber-500',   light: 'bg-amber-100',  text: 'text-amber-700',  hex: '#f59e0b' },
]

function getAgentColor(agents: Props['agents'], agentId: string | null) {
  if (!agentId) return { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700', hex: '#3b82f6' }
  const idx = agents.findIndex(a => a.id === agentId)
  return AGENT_COLORS[idx % AGENT_COLORS.length] || AGENT_COLORS[0]
}

function getTypeLabel(type: string) {
  return EVENT_TYPES.find(t => t.value === type)?.label || type
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES   = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

function toYMD(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

// ─── Event Form Modal ─────────────────────────────────────────────────────────
function EventModal({ event, agents, projects, leads, onClose, onSaved, onDeleted, defaultDate }: {
  event: CalEvent | null
  agents: Props['agents']
  projects: Props['projects']
  leads: Props['leads']
  defaultDate: string
  onClose: () => void
  onSaved: (ev: CalEvent) => void
  onDeleted?: (id: string) => void
}) {
  const isEdit = !!event
  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    type: event?.type || 'TAREA',
    date: event ? event.date.slice(0,10) : defaultDate,
    time: event ? new Date(event.date).toTimeString().slice(0,5) : '09:00',
    allDay: event?.allDay ?? false,
    status: event?.status || 'PENDIENTE',
    priority: event?.priority || 'NORMAL',
    agentId: event?.agentId || '',
    leadId: event?.leadId || '',
    projectId: event?.projectId || '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const dateTime = form.allDay ? new Date(form.date + 'T00:00:00') : new Date(form.date + 'T' + form.time + ':00')
    const payload = {
      title: form.title,
      description: form.description || null,
      type: form.type,
      date: dateTime.toISOString(),
      allDay: form.allDay,
      status: form.status,
      priority: form.priority,
      agentId: form.agentId || null,
      leadId: form.leadId || null,
      projectId: form.projectId || null,
    }
    const url = isEdit ? `/api/calendar/${event!.id}` : '/api/calendar'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) onSaved(await res.json())
    setSaving(false)
  }

  async function del() {
    if (!confirm('¿Eliminar este evento?')) return
    setDeleting(true)
    await fetch(`/api/calendar/${event!.id}`, { method: 'DELETE' })
    onDeleted?.(event!.id)
    setDeleting(false)
  }

  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar actividad' : 'Nueva actividad'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Título *</label>
            <input value={form.title} onChange={e => f('title', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Ej: Llamada con cliente, Visita proyecto..." />
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map(t => (
                <button key={t.value} onClick={() => f('type', t.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border-2 ${form.type === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fecha</label>
              <input type="date" value={form.date} onChange={e => f('date', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Hora</label>
              <input type="time" value={form.time} disabled={form.allDay} onChange={e => f('time', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-40" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.allDay} onChange={e => f('allDay', e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-600">Todo el día</span>
          </label>

          {/* Assign */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Asignado a</label>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => f('agentId', '')}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${!form.agentId ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                👤 General
              </button>
              {agents.map((a, i) => {
                const c = AGENT_COLORS[i % AGENT_COLORS.length]
                return (
                  <button key={a.id} onClick={() => f('agentId', a.id)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${form.agentId === a.id ? `${c.bg} text-white` : `${c.light} ${c.text} hover:opacity-80`}`}>
                    {a.name.split(' ')[0]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Prioridad</label>
              <select value={form.priority} onChange={e => f('priority', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {Object.entries(PRIORITY_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Estado</label>
              <select value={form.status} onChange={e => f('status', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Link to project */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Proyecto</label>
              <select value={form.projectId} onChange={e => f('projectId', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Sin proyecto</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Lead</label>
              <select value={form.leadId} onChange={e => f('leadId', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Sin lead</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Descripción / notas</label>
            <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Detalles del evento..." />
          </div>
        </div>

        <div className="flex items-center justify-between p-5 pt-0">
          {isEdit ? (
            <button onClick={del} disabled={deleting} className="text-red-400 hover:text-red-600 text-sm">
              {deleting ? 'Eliminando...' : '🗑️ Eliminar'}
            </button>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
            <button onClick={save} disabled={saving || !form.title.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear actividad'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Event pill (shown in calendar cell) ─────────────────────────────────────
function EventPill({ event, agents, onClick }: { event: CalEvent; agents: Props['agents']; onClick: () => void }) {
  const agentColor = getAgentColor(agents, event.agentId)
  const isDone = event.status === 'COMPLETADO'
  const isCancelled = event.status === 'CANCELADO'
  const hour = event.allDay ? '' : new Date(event.date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

  return (
    <div onClick={e => { e.stopPropagation(); onClick() }}
      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer transition-all hover:opacity-80 truncate ${
        isDone ? 'bg-gray-100 text-gray-400 line-through' :
        isCancelled ? 'bg-red-50 text-red-400 line-through' :
        `${agentColor.bg} text-white`
      }`}
      title={event.title}
    >
      <span className="flex-shrink-0">{getTypeLabel(event.type).split(' ')[0]}</span>
      {hour && <span className="opacity-80 flex-shrink-0">{hour}</span>}
      <span className="truncate">{event.title}</span>
    </div>
  )
}

// ─── Day Events Panel ─────────────────────────────────────────────────────────
function DayPanel({ date, events, agents, onClose, onCreate, onEdit }: {
  date: Date; events: CalEvent[]; agents: Props['agents']
  onClose: () => void; onCreate: () => void; onEdit: (ev: CalEvent) => void
}) {
  const dayName = date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

  async function quickComplete(ev: CalEvent) {
    const newStatus = ev.status === 'COMPLETADO' ? 'PENDIENTE' : 'COMPLETADO'
    await fetch(`/api/calendar/${ev.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    // Optimistic — will reload on next fetch
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <div className="text-xs text-gray-500 capitalize">{dayName}</div>
          <div className="font-bold text-gray-900">{events.length} actividad{events.length !== 1 ? 'es' : ''}</div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <button onClick={onCreate}
        className="mx-4 mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
        + Nueva actividad este día
      </button>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {events.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-sm">Sin actividades este día</p>
          </div>
        )}
        {events.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(ev => {
          const agentColor = getAgentColor(agents, ev.agentId)
          const statusCfg = STATUS_CONFIG[ev.status]
          const isDone = ev.status === 'COMPLETADO'
          const hour = ev.allDay ? 'Todo el día' : new Date(ev.date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={ev.id} className={`rounded-xl border p-3 transition-all ${isDone ? 'opacity-60 bg-gray-50 border-gray-100' : 'bg-white border-gray-200 hover:border-blue-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${agentColor.bg}`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm text-gray-900 ${isDone ? 'line-through text-gray-400' : ''}`}>{ev.title}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">{getTypeLabel(ev.type)}</span>
                    <span className="text-xs text-gray-400">{hour}</span>
                    {ev.agent && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${agentColor.light} ${agentColor.text}`}>{ev.agent.name.split(' ')[0]}</span>}
                    {ev.priority === 'ALTA' && <span className="text-xs text-red-500 font-medium">🔴 Alta</span>}
                  </div>
                  {ev.description && <p className="text-xs text-gray-500 mt-1 truncate">{ev.description}</p>}
                  {(ev.lead || ev.project) && (
                    <div className="flex gap-2 mt-1 text-xs text-gray-400">
                      {ev.project && <span>🏢 {ev.project.name}</span>}
                      {ev.lead && <span>👤 {ev.lead.firstName} {ev.lead.lastName}</span>}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                <div className="flex gap-2">
                  <button onClick={() => quickComplete(ev)}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${isDone ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                    {isDone ? '↩ Reabrir' : '✓ Completar'}
                  </button>
                  <button onClick={() => onEdit(ev)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                    ✏️
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Calendar ────────────────────────────────────────────────────────────
export default function CalendarClient({ agents, projects, leads }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [, setLoading] = useState(true)
  const [filterAgent, setFilterAgent] = useState('')
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [modalEvent, setModalEvent] = useState<CalEvent | null | 'new'>(null)
  const [defaultDate, setDefaultDate] = useState(toYMD(today))

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const from = new Date(year, month - 1, 1)
    const to = new Date(year, month + 2, 0)
    const url = `/api/calendar?from=${from.toISOString()}&to=${to.toISOString()}${filterAgent ? `&agentId=${filterAgent}` : ''}`
    const res = await fetch(url)
    setEvents(await res.json())
    setLoading(false)
  }, [year, month, filterAgent])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Build calendar grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Monday-based: 0=Mon...6=Sun
  const startPad = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < totalCells; i++) {
    const d = i - startPad + 1
    cells.push(d > 0 && d <= lastDay.getDate() ? new Date(year, month, d) : null)
  }

  function eventsForDay(date: Date) {
    const key = toYMD(date)
    return events.filter(e => e.date.slice(0,10) === key)
  }

  function prevMonth() { if (month === 0) { setYear(y => y-1); setMonth(11) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 11) { setYear(y => y+1); setMonth(0) } else setMonth(m => m+1) }

  function handleDayClick(date: Date) {
    setSelectedDay(date)
    setDefaultDate(toYMD(date))
  }

  function handleEventSaved(ev: CalEvent) {
    setEvents(prev => {
      const exists = prev.find(e => e.id === ev.id)
      return exists ? prev.map(e => e.id === ev.id ? ev : e) : [...prev, ev]
    })
    setModalEvent(null)
    fetchEvents()
  }

  function handleEventDeleted(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id))
    setModalEvent(null)
  }

  // Stats
  const monthEvents = events.filter(e => {
    const d = new Date(e.date)
    return d.getFullYear() === year && d.getMonth() === month
  })
  const pending = monthEvents.filter(e => e.status === 'PENDIENTE').length
  const done = monthEvents.filter(e => e.status === 'COMPLETADO').length
  const high = monthEvents.filter(e => e.priority === 'ALTA' && e.status !== 'COMPLETADO').length
  const todayEvents = events.filter(e => e.date.slice(0,10) === toYMD(today))

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">📅 Calendario del Equipo</h1>
              <p className="text-gray-500 text-xs mt-0.5">Actividades, tareas y seguimientos de ventas</p>
            </div>
            {/* Month nav */}
            <div className="flex items-center gap-2 ml-6">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">‹</button>
              <span className="text-base font-bold text-gray-900 min-w-[160px] text-center">{MONTHS_ES[month]} {year}</span>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">›</button>
              <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today) }}
                className="ml-2 px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                Hoy
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats pills */}
            <div className="flex gap-2 text-xs">
              <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">{monthEvents.length} total</span>
              <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-medium">{pending} pendientes</span>
              <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">{done} completados</span>
              {high > 0 && <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">🔴 {high} urgentes</span>}
            </div>

            {/* Agent filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button onClick={() => setFilterAgent('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filterAgent ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Todos
              </button>
              {agents.map((a, i) => {
                const c = AGENT_COLORS[i % AGENT_COLORS.length]
                return (
                  <button key={a.id} onClick={() => setFilterAgent(a.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterAgent === a.id ? `${c.bg} text-white` : `text-gray-500 hover:text-gray-700`}`}>
                    {a.name.split(' ')[0]}
                  </button>
                )
              })}
            </div>

            <button onClick={() => { setDefaultDate(toYMD(today)); setModalEvent('new') }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              + Nueva actividad
            </button>
          </div>
        </div>
      </div>

      {/* Today's agenda bar */}
      {todayEvents.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-100 px-8 py-2 flex items-center gap-3 overflow-x-auto flex-shrink-0">
          <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">HOY:</span>
          {todayEvents.slice(0,6).map(ev => {
            const c = getAgentColor(agents, ev.agentId)
            return (
              <button key={ev.id} onClick={() => setModalEvent(ev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${ev.status === 'COMPLETADO' ? 'bg-white text-gray-400 line-through' : `${c.bg} text-white`}`}>
                {getTypeLabel(ev.type).split(' ')[0]} {ev.title}
                {ev.agent && <span className="opacity-70">· {ev.agent.name.split(' ')[0]}</span>}
              </button>
            )
          })}
          {todayEvents.length > 6 && <span className="text-xs text-blue-500">+{todayEvents.length-6} más</span>}
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 overflow-auto p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_ES.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} className="min-h-24 bg-gray-50/50 rounded-xl" />
              const dayEvs = eventsForDay(date)
              const isToday = toYMD(date) === toYMD(today)
              const isSelected = selectedDay && toYMD(date) === toYMD(selectedDay)
              const isPast = date < today && !isToday
              return (
                <div key={i} onClick={() => handleDayClick(date)}
                  className={`min-h-24 rounded-xl p-2 cursor-pointer transition-all border-2 ${
                    isSelected ? 'border-blue-400 bg-blue-50' :
                    isToday ? 'border-blue-200 bg-blue-50/50' :
                    'border-transparent hover:border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                  <div className={`text-sm font-bold mb-1.5 w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-600 text-white' :
                    isPast ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvs.slice(0,3).map(ev => (
                      <EventPill key={ev.id} event={ev} agents={agents} onClick={() => setModalEvent(ev)} />
                    ))}
                    {dayEvs.length > 3 && (
                      <div className="text-xs text-gray-400 pl-1">+{dayEvs.length - 3} más</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day panel */}
        {selectedDay && (
          <DayPanel
            date={selectedDay}
            events={eventsForDay(selectedDay)}
            agents={agents}
            onClose={() => setSelectedDay(null)}
            onCreate={() => { setDefaultDate(toYMD(selectedDay)); setModalEvent('new') }}
            onEdit={(ev) => setModalEvent(ev)}
          />
        )}
      </div>

      {/* Modal */}
      {modalEvent !== null && (
        <EventModal
          event={modalEvent === 'new' ? null : modalEvent}
          agents={agents}
          projects={projects}
          leads={leads}
          defaultDate={defaultDate}
          onClose={() => setModalEvent(null)}
          onSaved={handleEventSaved}
          onDeleted={handleEventDeleted}
        />
      )}
    </div>
  )
}
