'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

interface Unit {
  id: string
  unitNumber: string
  status: string
  type: string
  clientName: string | null
  notes: string | null
  floor: number | null
}

const STATUSES = ['DISPONIBLE', 'RESERVADO', 'CPP', 'VENDIDO', 'NO_DISPONIBLE'] as const
type Status = typeof STATUSES[number]

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string; border: string; dot: string }> = {
  DISPONIBLE:    { label: 'Disponible',     bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',  dot: 'bg-blue-500' },
  RESERVADO:     { label: 'Reservado',      bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-300', dot: 'bg-amber-400' },
  CPP:           { label: 'CPP',            bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-300',dot: 'bg-orange-500' },
  VENDIDO:       { label: 'Vendido',        bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-300', dot: 'bg-green-500' },
  NO_DISPONIBLE: { label: 'No disponible',  bg: 'bg-gray-100',   text: 'text-gray-400',   border: 'border-gray-200',  dot: 'bg-gray-400' },
}

function cfg(status: string) {
  return STATUS_CONFIG[status as Status] ?? STATUS_CONFIG.NO_DISPONIBLE
}

function naturalSort(a: Unit, b: Unit): number {
  return a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true, sensitivity: 'base' })
}

export default function UnitsSection({ projectId, unitLabel = 'Unidad' }: { projectId: string; unitLabel?: string }) {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [editing, setEditing] = useState<{ status: string; clientName: string; notes: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newNumbers, setNewNumbers] = useState('')
  const [adding, setAdding] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

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

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSelectedUnit(null)
        setEditing(null)
      }
    }
    if (selectedUnit) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedUnit])

  const openUnit = (unit: Unit) => {
    setSelectedUnit(unit)
    setEditing({ status: unit.status, clientName: unit.clientName ?? '', notes: unit.notes ?? '' })
  }

  const saveUnit = async () => {
    if (!selectedUnit || !editing) return
    setSaving(true)
    const updated = {
      ...selectedUnit,
      status: editing.status,
      clientName: editing.clientName || null,
      notes: editing.notes || null,
    }
    setUnits(prev => prev.map(u => u.id === selectedUnit.id ? updated : u))
    setSelectedUnit(updated)
    await fetch(`/api/projects/${projectId}/units`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId: selectedUnit.id, status: editing.status, clientName: editing.clientName || null, notes: editing.notes || null }),
    })
    setSaving(false)
  }

  const deleteUnit = async (unitId: string) => {
    if (!confirm(`¿Eliminar esta unidad?`)) return
    setUnits(prev => prev.filter(u => u.id !== unitId))
    setSelectedUnit(null)
    setEditing(null)
    await fetch(`/api/projects/${projectId}/units`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId }),
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

  const sorted = useMemo(() => [...units].sort(naturalSort), [units])
  const counts = Object.fromEntries(STATUSES.map(s => [s, units.filter(u => u.status === s).length]))
  const total = units.length
  const soldPct = total > 0 ? Math.round(((counts.VENDIDO + counts.CPP) / total) * 100) : 0

  const clients = useMemo(
    () => sorted.filter(u => u.status !== 'DISPONIBLE' && u.status !== 'NO_DISPONIBLE'),
    [sorted]
  )

  // Group by floor if any unit has floor set, otherwise flat list
  const hasFloors = units.some(u => u.floor !== null)
  const floors = hasFloors
    ? [...new Set(units.map(u => u.floor ?? 0))].sort((a, b) => b - a)
    : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏗️</span>
          <h3 className="font-semibold text-gray-900">Mapa de {unitLabel}s</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{total}</span>
        </div>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          + Agregar
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{soldPct}% cerrado</span>
            <span className="flex gap-3">
              <span>{counts.DISPONIBLE} disp.</span>
              <span>{counts.RESERVADO} reserv.</span>
              <span>{counts.CPP} CPP</span>
              <span>{counts.VENDIDO} vend.</span>
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
            <div className="bg-green-500 h-2 transition-all" style={{ width: `${total ? (counts.VENDIDO / total) * 100 : 0}%` }} />
            <div className="bg-orange-500 h-2 transition-all" style={{ width: `${total ? (counts.CPP / total) * 100 : 0}%` }} />
            <div className="bg-amber-400 h-2 transition-all" style={{ width: `${total ? (counts.RESERVADO / total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex gap-2">
            <input
              value={newNumbers}
              onChange={e => setNewNumbers(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addUnits() }}
              placeholder={`Ej: 1, 2, 3 ó A-101, A-102`}
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
          No hay {unitLabel.toLowerCase()}s. Usa &quot;+ Agregar&quot; para crear la primera.
        </div>
      ) : (
        <div className="relative">
          {/* Unit grid */}
          {hasFloors && floors ? (
            <div className="space-y-3">
              {floors.map(floor => (
                <div key={floor}>
                  <div className="text-xs text-gray-400 font-medium mb-1.5">Piso {floor}</div>
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {sorted.filter(u => (u.floor ?? 0) === floor).map(unit => (
                      <UnitCard key={unit.id} unit={unit} unitLabel={unitLabel} onClick={() => openUnit(unit)} selected={selectedUnit?.id === unit.id} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {sorted.map(unit => (
                <UnitCard key={unit.id} unit={unit} unitLabel={unitLabel} onClick={() => openUnit(unit)} selected={selectedUnit?.id === unit.id} />
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-gray-500">
            {STATUSES.filter(s => s !== 'NO_DISPONIBLE').map(s => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded ${cfg(s).dot} inline-block`} />
                {cfg(s).label}
              </span>
            ))}
            <span className="text-gray-400">· toca una unidad para ver detalles</span>
          </div>

          {/* Clients table */}
          {clients.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                👥 Clientes / Separaciones
                <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{clients.length}</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-4">{unitLabel} #</th>
                      <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-4">Estado</th>
                      <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-4">Cliente</th>
                      <th className="text-left text-xs font-medium text-gray-400 pb-2">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clients.map(unit => {
                      const c = cfg(unit.status)
                      return (
                        <tr
                          key={unit.id}
                          onClick={() => openUnit(unit)}
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-2.5 pr-4">
                            <span className="font-bold text-gray-900">{unit.unitNumber}</span>
                            {unit.floor !== null && (
                              <span className="ml-1.5 text-xs text-gray-400">P{unit.floor}</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text} ${c.border} border`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                              {c.label}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4">
                            {unit.clientName ? (
                              <span className="font-medium text-gray-800">{unit.clientName}</span>
                            ) : (
                              <span className="text-gray-300 italic text-xs">Sin cliente</span>
                            )}
                          </td>
                          <td className="py-2.5 max-w-xs">
                            {unit.notes ? (
                              <span className="text-gray-500 text-xs line-clamp-1">{unit.notes}</span>
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Side panel */}
          {selectedUnit && editing && (
            <div
              ref={panelRef}
              className="absolute right-0 top-0 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">{unitLabel}</div>
                  <div className="text-xl font-bold text-gray-900">{selectedUnit.unitNumber}</div>
                </div>
                <button
                  onClick={() => { setSelectedUnit(null); setEditing(null) }}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Status selector */}
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 mb-2">Estado</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATUSES.filter(s => s !== 'NO_DISPONIBLE').map(s => {
                    const c = cfg(s)
                    const active = editing.status === s
                    return (
                      <button
                        key={s}
                        onClick={() => setEditing(prev => prev ? { ...prev, status: s } : prev)}
                        className={`text-xs font-semibold px-2 py-1.5 rounded-lg border transition-all ${
                          active
                            ? `${c.bg} ${c.text} ${c.border} ring-2 ring-offset-1 ring-current`
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Client name */}
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  {editing.status === 'DISPONIBLE' ? 'Cliente (opcional)' : 'Cliente'}
                </label>
                <input
                  value={editing.clientName}
                  onChange={e => setEditing(prev => prev ? { ...prev, clientName: e.target.value } : prev)}
                  placeholder="Nombre del cliente..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 block mb-1">Notas</label>
                <textarea
                  value={editing.notes}
                  onChange={e => setEditing(prev => prev ? { ...prev, notes: e.target.value } : prev)}
                  placeholder="Observaciones, precio acordado..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={saveUnit}
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => deleteUnit(selectedUnit.id)}
                  className="px-3 py-2 text-red-500 hover:bg-red-50 border border-red-200 rounded-lg text-sm transition-colors"
                  title="Eliminar unidad"
                >
                  🗑
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function UnitCard({ unit, unitLabel, onClick, selected }: { unit: Unit; unitLabel: string; onClick: () => void; selected: boolean }) {
  const c = cfg(unit.status)
  const initials = unit.clientName
    ? unit.clientName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : null

  return (
    <button
      onClick={onClick}
      title={`${unitLabel} ${unit.unitNumber}${unit.clientName ? ` · ${unit.clientName}` : ''} · ${c.label}`}
      className={`relative aspect-square rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${c.bg} ${c.text} ${c.border} ${
        selected ? 'ring-2 ring-blue-500 ring-offset-1 scale-105 shadow-md' : 'hover:scale-105 hover:shadow-sm'
      }`}
    >
      <span className="leading-tight">{unit.unitNumber}</span>
      {initials && (
        <span className="text-[9px] font-normal opacity-75 leading-tight">{initials}</span>
      )}
      {unit.status === 'CPP' && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-white" />
      )}
      {unit.status === 'VENDIDO' && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" />
      )}
    </button>
  )
}
