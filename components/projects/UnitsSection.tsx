'use client'

import { useState, useEffect, useCallback } from 'react'

interface Unit {
  id: string
  unitNumber: string
  status: string
  type: string
  notes: string | null
}

const STATUS_CYCLE = ['DISPONIBLE', 'RESERVADO', 'VENDIDO']

const STATUS_STYLE: Record<string, string> = {
  DISPONIBLE: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  RESERVADO: 'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100',
  VENDIDO: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
  NO_DISPONIBLE: 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200',
}

const STATUS_LABEL: Record<string, string> = {
  DISPONIBLE: 'Disponible', RESERVADO: 'Reservado', VENDIDO: 'Vendido', NO_DISPONIBLE: 'No disponible',
}

export default function UnitsSection({ projectId, unitLabel = 'Unidad' }: { projectId: string; unitLabel?: string }) {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newNumbers, setNewNumbers] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/units`)
      setUnits(await res.json())
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  const cycleStatus = async (unit: Unit) => {
    const idx = STATUS_CYCLE.indexOf(unit.status)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] ?? STATUS_CYCLE[0]
    setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, status: next } : u))
    await fetch(`/api/projects/${projectId}/units`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId: unit.id, status: next }),
    })
  }

  const deleteUnit = async (unit: Unit, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar ${unitLabel} ${unit.unitNumber}?`)) return
    setUnits(prev => prev.filter(u => u.id !== unit.id))
    await fetch(`/api/projects/${projectId}/units`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId: unit.id }),
    })
  }

  const addUnits = async () => {
    const numbers = newNumbers.split(/[,\s]+/).map(n => n.trim()).filter(Boolean)
    if (numbers.length === 0) return
    setAdding(true)
    try {
      const created: Unit[] = []
      for (const num of numbers) {
        const res = await fetch(`/api/projects/${projectId}/units`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitNumber: num, status: 'DISPONIBLE' }),
        })
        created.push(await res.json())
      }
      setUnits(prev => [...prev, ...created])
      setNewNumbers('')
      setShowAdd(false)
    } finally {
      setAdding(false)
    }
  }

  const counts = STATUS_CYCLE.reduce((acc, s) => ({ ...acc, [s]: units.filter(u => u.status === s).length }), {} as Record<string, number>)
  const total = units.length
  const soldPct = total > 0 ? Math.round((counts.VENDIDO / total) * 100) : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏷️</span>
          <h3 className="font-semibold text-gray-900">{unitLabel}s</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{total}</span>
        </div>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          + Agregar
        </button>
      </div>

      {total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{soldPct}% vendido</span>
            <span>{counts.DISPONIBLE} disponibles · {counts.RESERVADO} reservados · {counts.VENDIDO} vendidos</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
            <div className="bg-green-500 h-2" style={{ width: `${total ? (counts.VENDIDO / total) * 100 : 0}%` }} />
            <div className="bg-yellow-400 h-2" style={{ width: `${total ? (counts.RESERVADO / total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {showAdd && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex gap-2">
            <input
              value={newNumbers}
              onChange={e => setNewNumbers(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addUnits() }}
              placeholder="Ej: 1, 2, 3 (separados por coma)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addUnits}
              disabled={adding || !newNumbers.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              {adding ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">Cargando...</div>
      ) : units.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-400">
          No hay {unitLabel.toLowerCase()}s cargadas. Usa &quot;+ Agregar&quot; para crear la primera.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {units.map(unit => (
              <button
                key={unit.id}
                onClick={() => cycleStatus(unit)}
                title={`${unitLabel} ${unit.unitNumber} · ${STATUS_LABEL[unit.status] || unit.status} · clic para cambiar`}
                className={`group relative aspect-square rounded-lg border text-xs font-semibold flex items-center justify-center transition-colors ${STATUS_STYLE[unit.status] || STATUS_STYLE.NO_DISPONIBLE}`}
              >
                {unit.unitNumber}
                <span
                  onClick={e => deleteUnit(unit, e)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:border-red-300 transition-opacity flex items-center justify-center text-[10px] leading-none"
                >
                  ✕
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-50 border border-blue-200 inline-block" /> Disponible</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-yellow-50 border border-yellow-300 inline-block" /> Reservado</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-100 border border-green-300 inline-block" /> Vendido</span>
            <span className="text-gray-400">· clic en una unidad para cambiar su estado</span>
          </div>
        </>
      )}
    </div>
  )
}
