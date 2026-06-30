'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  description: string | null
  type: string
  date: string
  endDate: string | null
  status: string
  priority: string
  agent: { id: string; name: string } | null
  lead: { id: string; firstName: string; lastName: string } | null
  project: { id: string; name: string } | null
}

interface Agent { id: string; name: string }
interface Lead { id: string; firstName: string; lastName: string }
interface Project { id: string; name: string }

const PRIORITY_CONFIG = {
  ALTA:   { label: 'Alta',   color: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500' },
  NORMAL: { label: 'Normal', color: 'bg-blue-100 text-blue-700 border-blue-200',  dot: 'bg-blue-500' },
  BAJA:   { label: 'Baja',   color: 'bg-gray-100 text-gray-600 border-gray-200',  dot: 'bg-gray-400' },
}

const STATUS_CONFIG = {
  PENDIENTE:  { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  COMPLETADO: { label: 'Completado', color: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  CANCELADO:  { label: 'Cancelado',  color: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400' },
}

const TYPE_ICONS: Record<string, string> = {
  TAREA: '✅', LLAMADA: '📞', VISITA: '🏠', REUNION: '🤝', CIERRE: '🏆', OTRO: '📌',
}

function CreateTaskModal({
  agents, leads, projects,
  onClose,
  onCreated,
}: {
  agents: Agent[]
  leads: Lead[]
  projects: Project[]
  onClose: () => void
  onCreated: (task: Task) => void
}) {
  // eslint-disable-next-line react-hooks/purity
  const tomorrow = new Date(Date.now() + 86400000)
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'TAREA',
    date: tomorrow.toISOString().slice(0, 10),
    time: '10:00',
    priority: 'NORMAL',
    agentId: '',
    leadId: '',
    projectId: '',
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const dateTime = new Date(`${form.date}T${form.time}`)
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          type: form.type,
          date: dateTime.toISOString(),
          status: 'PENDIENTE',
          priority: form.priority,
          agentId: form.agentId || null,
          leadId: form.leadId || null,
          projectId: form.projectId || null,
        }),
      })
      const task = await res.json() as Task
      onCreated({
        ...task,
        date: typeof task.date === 'string' ? task.date : new Date(task.date as unknown as Date).toISOString(),
        endDate: task.endDate ? (typeof task.endDate === 'string' ? task.endDate : new Date(task.endDate as unknown as Date).toISOString()) : null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Nueva tarea</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="ej: Llamar a María sobre visita"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(TYPE_ICONS).map(([k, icon]) => (
                  <option key={k} value={k}>{icon} {k.charAt(0) + k.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(PRIORITY_CONFIG).map(([k, c]) => (
                  <option key={k} value={k}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asesor</label>
            <select value={form.agentId} onChange={e => setForm(f => ({ ...f, agentId: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sin asignar</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead relacionado</label>
              <select value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Ninguno</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
              <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Ninguno</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Detalles adicionales..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => { void submit() }} disabled={saving || !form.title.trim()}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Creando...' : 'Crear tarea'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, onToggle, onDelete }: {
  task: Task
  onToggle: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const isOverdue = task.status === 'PENDIENTE' && new Date(task.date) < new Date()
  const isDone = task.status === 'COMPLETADO'
  const pCfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.NORMAL
  const sCfg = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDIENTE

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-sm group ${
      isDone ? 'bg-gray-50 border-gray-100 opacity-60' : isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, isDone ? 'PENDIENTE' : 'COMPLETADO')}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
          isDone ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        {isDone && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-base">{TYPE_ICONS[task.type] ?? '📌'}</span>
          <span className={`text-sm font-medium ${isDone ? 'line-through text-gray-400' : isOverdue ? 'text-red-800' : 'text-gray-900'}`}>
            {task.title}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${pCfg.color}`}>
            {pCfg.label}
          </span>
          {isOverdue && !isDone && (
            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">VENCIDA</span>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-gray-500 mb-1.5 line-clamp-1">{task.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          <span>📅 {new Date(task.date).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' })} · {new Date(task.date).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}</span>
          {task.agent && <span>👤 {task.agent.name}</span>}
          {task.lead && (
            <Link href={`/crm/${task.lead.id}`} className="text-blue-500 hover:underline">
              👤 {task.lead.firstName} {task.lead.lastName}
            </Link>
          )}
          {task.project && <span>🏗️ {task.project.name}</span>}
          <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold ${sCfg.color}`}>
            {sCfg.label}
          </span>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

export default function TareasClient({
  initialTasks,
  agents,
  leads,
  projects,
}: {
  initialTasks: Task[]
  agents: Agent[]
  leads: Lead[]
  projects: Project[]
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [showCreate, setShowCreate] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDIENTE' | 'COMPLETADO'>('PENDIENTE')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterAgent, setFilterAgent] = useState('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false
      if (filterPriority && t.priority !== filterPriority) return false
      if (filterAgent && t.agent?.id !== filterAgent) return false
      if (search) {
        const s = search.toLowerCase()
        if (!t.title.toLowerCase().includes(s) &&
          !(t.lead ? `${t.lead.firstName} ${t.lead.lastName}` : '').toLowerCase().includes(s) &&
          !(t.project?.name ?? '').toLowerCase().includes(s)) return false
      }
      return true
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [tasks, filterStatus, filterPriority, filterAgent, search])

  const overdue = tasks.filter(t => t.status === 'PENDIENTE' && new Date(t.date) < new Date()).length
  const todayCount = tasks.filter(t => {
    const d = new Date(t.date); const now = new Date()
    return t.status === 'PENDIENTE' && d.toDateString() === now.toDateString()
  }).length
  const pending = tasks.filter(t => t.status === 'PENDIENTE').length

  async function handleToggle(id: string, status: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    await fetch(`/api/calendar/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta tarea?')) return
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/calendar/${id}`, { method: 'DELETE' })
  }

  function handleCreated(task: Task) {
    setTasks(prev => [task, ...prev])
    setShowCreate(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tareas & Pendientes</h1>
            <p className="text-sm text-gray-500 mt-0.5">Organiza las actividades del equipo de ventas</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva tarea
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 lg:mb-5">
          {[
            { label: 'Pendientes', value: pending, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
            { label: '⚠️ Vencidas', value: overdue, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
            { label: '📅 Hoy', value: todayCount, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
            { label: '✅ Completadas', value: tasks.filter(t => t.status === 'COMPLETADO').length, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tarea..."
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['ALL', 'PENDIENTE', 'COMPLETADO'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {s === 'ALL' ? 'Todas' : s === 'PENDIENTE' ? 'Pendientes' : 'Completadas'}
              </button>
            ))}
          </div>

          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
            <option value="">Todas las prioridades</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, c]) => (
              <option key={k} value={k}>{c.label}</option>
            ))}
          </select>

          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
            <option value="">Todos los asesores</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          <span className="text-xs text-gray-400 ml-auto">{filtered.length} tareas</span>
        </div>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-gray-500 text-sm">
            {tasks.length === 0 ? 'Aún no hay tareas. ¡Crea la primera!' : 'No hay tareas que coincidan.'}
          </p>
          {tasks.length === 0 && (
            <button onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
              Nueva tarea
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Group by date */}
          {(() => {
            const groups: Record<string, Task[]> = {}
            for (const t of filtered) {
              const d = new Date(t.date)
              const today = new Date()
              const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
              const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
              let label: string
              if (d.toDateString() === today.toDateString()) label = '📅 Hoy'
              else if (d.toDateString() === tomorrow.toDateString()) label = '🌅 Mañana'
              else if (d.toDateString() === yesterday.toDateString()) label = '⏪ Ayer'
              else if (d < today) label = '⚠️ Vencidas'
              else label = d.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' })
              if (!groups[label]) groups[label] = []
              groups[label].push(t)
            }
            return Object.entries(groups).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4 first:mt-0">
                  {date} <span className="text-gray-300 font-normal">({items.length})</span>
                </h3>
                <div className="space-y-2">
                  {items.map(t => (
                    <TaskRow key={t.id} task={t} onToggle={(id, s) => { void handleToggle(id, s) }} onDelete={(id) => { void handleDelete(id) }} />
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      )}

      {showCreate && (
        <CreateTaskModal
          agents={agents} leads={leads} projects={projects}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
