'use client'

import { useState, useEffect } from 'react'

interface Lead {
  id: string
  firstName: string
  lastName: string
  project: { id: string; name: string } | null
  agent: { id: string; name: string } | null
  budget: number | null
}

interface Project {
  id: string
  name: string
  currency?: string
}

interface Unit {
  id: string
  unitNumber: string
  floor: number | null
  area: number | null
  type: string
  status: string
  price: number | null
}

const STAGE_OPTIONS = [
  { value: 'RESERVA',   label: 'Separación / Reserva',      icon: '📋', active: 'border-amber-400 bg-amber-50 text-amber-700' },
  { value: 'PROMESA',   label: 'Promesa / CPP',             icon: '📝', active: 'border-purple-400 bg-purple-50 text-purple-700' },
  { value: 'ESCRITURA', label: 'Escritura / Venta definitiva', icon: '✅', active: 'border-blue-400 bg-blue-50 text-blue-700' },
]

const CURRENCIES = ['USD', 'UF', 'CLP', 'EUR']

export default function WonReservationModal({
  lead,
  projects,
  onSuccess,
  onSkip,
}: {
  lead: Lead
  projects: Project[]
  onSuccess: (leadName: string) => void
  onSkip: (leadName: string) => void
}) {
  const leadName = `${lead.firstName} ${lead.lastName}`

  const [projectId, setProjectId] = useState(lead.project?.id || '')
  const [units, setUnits] = useState<Unit[]>([])
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [unitId, setUnitId] = useState('')
  const [stage, setStage] = useState('RESERVA')
  const [price, setPrice] = useState(lead.budget ? String(lead.budget) : '')
  const [currency, setCurrency] = useState('USD')
  const [reserveDate, setReserveDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load units when project changes
  useEffect(() => {
    if (!projectId) { setUnits([]); setUnitId(''); return }
    setLoadingUnits(true)
    setUnitId('')
    fetch(`/api/projects/${projectId}/units`)
      .then(r => r.json())
      .then((data: Unit[]) => {
        setUnits(data.filter(u => u.status === 'DISPONIBLE'))
      })
      .catch(() => setUnits([]))
      .finally(() => setLoadingUnits(false))
  }, [projectId])

  // Pre-fill price from selected unit
  const selectedUnit = units.find(u => u.id === unitId)
  useEffect(() => {
    if (selectedUnit?.price) setPrice(String(selectedUnit.price))
  }, [selectedUnit])

  async function handleSubmit() {
    if (!projectId) { setError('Selecciona un proyecto'); return }
    if (!price || isNaN(parseFloat(price))) { setError('Ingresa un precio válido'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          projectId,
          agentId: lead.agent?.id || null,
          unitNumber: selectedUnit?.unitNumber || null,
          unitType: selectedUnit?.type || null,
          floor: selectedUnit?.floor || null,
          area: selectedUnit?.area || null,
          price: parseFloat(price),
          currency,
          stage,
          reserveDate,
          notes: notes || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Error al registrar')
      }
      onSuccess(leadName)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">🏆</div>
            <div>
              <h2 className="text-lg font-bold leading-tight">¡Venta ganada!</h2>
              <p className="text-green-100 text-sm">{leadName}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-green-100 leading-relaxed">
            Registra la separación para que aparezca en el tablero del proyecto y en los informes.
          </p>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">

          {/* Project */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Proyecto *
            </label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
            >
              <option value="">Seleccionar proyecto...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              Lote / Unidad
              {projectId && !loadingUnits && (
                <span className="font-normal text-gray-400">({units.length} disponibles)</span>
              )}
            </label>
            {loadingUnits ? (
              <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <select
                value={unitId}
                onChange={e => setUnitId(e.target.value)}
                disabled={!projectId || units.length === 0}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-50 disabled:text-gray-400 bg-white"
              >
                <option value="">
                  {!projectId
                    ? 'Selecciona proyecto primero'
                    : units.length === 0
                      ? 'Sin unidades disponibles — ingresar manualmente'
                      : 'Seleccionar unidad...'}
                </option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>
                    Lote {u.unitNumber}
                    {u.floor ? ` · Piso ${u.floor}` : ''}
                    {u.area ? ` · ${u.area}m²` : ''}
                    {u.price ? ` · $${u.price.toLocaleString()}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Stage type */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Tipo de separación *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STAGE_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStage(s.value)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 text-[11px] font-semibold transition-all leading-tight text-center ${
                    stage === s.value ? s.active : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Precio de venta *
            </label>
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-20 px-2 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0"
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Fecha de separación
            </label>
            <input
              type="date"
              value={reserveDate}
              onChange={e => setReserveDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Condiciones especiales, observaciones..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>

          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 bg-gray-50/50">
          <button
            onClick={() => onSkip(leadName)}
            className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-white transition-colors"
          >
            Solo celebrar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !projectId || !price}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {saving
              ? 'Guardando...'
              : stage === 'RESERVA' ? '📋 Registrar separación'
              : stage === 'PROMESA' ? '📝 Registrar promesa / CPP'
              : '✅ Registrar venta definitiva'}
          </button>
        </div>
      </div>
    </div>
  )
}
