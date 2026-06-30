'use client'

import { useState, useEffect, useCallback } from 'react'

interface GoalItem {
  id: string
  label: string
  target: number
  current: number
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const BAR_COLORS = ['bg-yellow-400', 'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-pink-500', 'bg-orange-500']

const SUGGESTIONS = ['Separaciones', 'Cartas Promesa (CPP)', 'Contactos']

function getNow() {
  const d = new Date()
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

export default function MetasSection({ projectId }: { projectId: string }) {
  const [{ month, year }, setPeriod] = useState(getNow)
  const [items, setItems] = useState<GoalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/goals?month=${month}&year=${year}`)
      setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }, [projectId, month, year])

  useEffect(() => { void load() }, [load])

  const changeMonth = (delta: number) => {
    setPeriod(prev => {
      let m = prev.month + delta
      let y = prev.year
      if (m > 12) { m = 1; y += 1 }
      if (m < 1) { m = 12; y -= 1 }
      return { month: m, year: y }
    })
  }

  const addGoal = async (label: string) => {
    if (!label.trim() || adding) return
    setAdding(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, label: label.trim(), target: 0, current: 0 }),
      })
      const created = await res.json()
      setItems(prev => [...prev, created])
      setNewLabel('')
      setShowAdd(false)
    } finally {
      setAdding(false)
    }
  }

  const updateGoal = (id: string, field: 'target' | 'current', value: string) => {
    const num = Number(value) || 0
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: num } : it))
  }

  const saveGoal = async (id: string) => {
    const item = items.find(it => it.id === id)
    if (!item) return
    await fetch(`/api/projects/${projectId}/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: item.target, current: item.current }),
    })
  }

  const deleteGoal = async (id: string) => {
    if (!confirm('¿Eliminar esta meta?')) return
    setItems(prev => prev.filter(it => it.id !== id))
    await fetch(`/api/projects/${projectId}/goals/${id}`, { method: 'DELETE' })
  }

  const isCurrentMonth = (() => {
    const now = getNow()
    return now.month === month && now.year === year
  })()

  const existingLabels = new Set(items.map(it => it.label.toLowerCase()))
  const availableSuggestions = SUGGESTIONS.filter(s => !existingLabels.has(s.toLowerCase()))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="font-semibold text-gray-900">Metas Mensuales</h3>
        </div>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          + Agregar meta
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button onClick={() => changeMonth(-1)} className="text-gray-400 hover:text-gray-700 px-2">←</button>
        <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
          {MONTH_NAMES[month - 1]} {year}
          {isCurrentMonth && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Actual</span>}
        </span>
        <button onClick={() => changeMonth(1)} className="text-gray-400 hover:text-gray-700 px-2">→</button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          {availableSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {availableSuggestions.map(s => (
                <button
                  key={s}
                  onClick={() => addGoal(s)}
                  disabled={adding}
                  className="text-xs px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addGoal(newLabel) }}
              placeholder="Nombre de la meta (ej: Visitas agendadas)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => addGoal(newLabel)}
              disabled={adding || !newLabel.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-400">
          No hay metas para este mes. Usa &quot;+ Agregar meta&quot; para crear la primera.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => {
            const pct = item.target > 0 ? Math.min(100, Math.round((item.current / item.target) * 100)) : 0
            return (
              <div key={item.id} className="group">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-sm text-gray-700 font-medium truncate">{item.label}</span>
                  <button
                    onClick={() => deleteGoal(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity flex-shrink-0"
                    title="Eliminar meta"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="number" min="0"
                    value={item.current}
                    onChange={e => updateGoal(item.id, 'current', e.target.value)}
                    onBlur={() => saveGoal(item.id)}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                    title="Lo que llevo"
                  />
                  <span className="text-gray-400 text-sm">/</span>
                  <input
                    type="number" min="0"
                    value={item.target}
                    onChange={e => updateGoal(item.id, 'target', e.target.value)}
                    onBlur={() => saveGoal(item.id)}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Meta"
                  />
                  <span className="text-xs text-gray-400">meta</span>
                </div>
                {item.target > 0 && (
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${BAR_COLORS[idx % BAR_COLORS.length]}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
