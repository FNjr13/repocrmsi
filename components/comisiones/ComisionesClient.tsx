'use client'

import { useState, useEffect, useCallback } from 'react'

interface Commission {
  id: string
  clientName: string
  projectId: string
  projectName: string
  agentId: string | null
  agentName: string | null
  unitNumber: string | null
  floor: number | null
  price: number
  currency: string
  stage: string
  commissionPct: number
  commissionAmount: number
  commissionStatus: string
  reserveDate: string
}

interface Project { id: string; name: string }
interface Agent  { id: string; name: string }

const STATUS_CFG: Record<string, { label: string; color: string; dot: string; next: string | null }> = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400', next: 'APROBADA' },
  APROBADA:  { label: 'Aprobada',  color: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-500',   next: 'PAGADA'   },
  PAGADA:    { label: 'Pagada',    color: 'bg-green-100 text-green-700 border-green-200',    dot: 'bg-green-500',  next: null       },
}

const STAGE_LABELS: Record<string, string> = {
  RESERVA:   'Separación',
  PROMESA:   'Promesa / CPP',
  ESCRITURA: 'Escritura',
  ENTREGADO: 'Entregado',
}

function money(amount: number, currency = 'USD') {
  const n = amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  if (currency === 'UF')  return `UF ${n}`
  if (currency === 'CLP') return `$${n} CLP`
  if (currency === 'EUR') return `€${n}`
  return `$${n}`
}

export default function ComisionesClient({ projects, agents }: { projects: Project[]; agents: Agent[] }) {
  const today     = new Date().toISOString().slice(0, 10)
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)

  const [list,    setList]    = useState<Commission[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Commission | null>(null)
  const [editPct,    setEditPct]    = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving] = useState(false)

  // Filters
  const [projectId, setProjectId] = useState('')
  const [agentId,   setAgentId]   = useState('')
  const [status,    setStatus]    = useState('')
  const [from,      setFrom]      = useState(yearStart)
  const [to,        setTo]        = useState(today)
  const [search,    setSearch]    = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (projectId) p.set('projectId', projectId)
    if (agentId)   p.set('agentId',   agentId)
    if (status)    p.set('status',    status)
    if (from)      p.set('from',      from)
    if (to)        p.set('to',        to)
    const res = await fetch(`/api/commissions?${p}`)
    setList(await res.json())
    setLoading(false)
  }, [projectId, agentId, status, from, to])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = search
    ? list.filter(c =>
        c.clientName.toLowerCase().includes(search.toLowerCase()) ||
        (c.unitNumber?.toLowerCase().includes(search.toLowerCase()))
      )
    : list

  // KPIs (fixed currency = USD for aggregate; mix currencies just show counts)
  const totalAmt    = filtered.reduce((s, c) => s + c.commissionAmount, 0)
  const pendingList = filtered.filter(c => c.commissionStatus === 'PENDIENTE')
  const approvedList= filtered.filter(c => c.commissionStatus === 'APROBADA')
  const paidList    = filtered.filter(c => c.commissionStatus === 'PAGADA')

  async function advanceStatus(c: Commission) {
    const next = STATUS_CFG[c.commissionStatus]?.next
    if (!next) return
    const res = await fetch(`/api/commissions/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commissionStatus: next }),
    })
    if (res.ok) {
      setList(prev => prev.map(x => x.id === c.id ? { ...x, commissionStatus: next } : x))
    }
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    const body: Record<string, unknown> = {}
    const pct = parseFloat(editPct)
    if (!isNaN(pct) && pct !== editing.commissionPct) body.commissionPct = pct
    if (editStatus !== editing.commissionStatus)       body.commissionStatus = editStatus
    if (Object.keys(body).length > 0) {
      const res = await fetch(`/api/commissions/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const newPct = typeof body.commissionPct === 'number' ? body.commissionPct : editing.commissionPct
        const newSt  = typeof body.commissionStatus === 'string' ? body.commissionStatus : editing.commissionStatus
        setList(prev => prev.map(x => x.id === editing.id
          ? { ...x, commissionPct: newPct, commissionStatus: newSt, commissionAmount: x.price * newPct / 100 }
          : x
        ))
      }
    }
    setSaving(false)
    setEditing(null)
  }

  const openEdit = (c: Commission) => {
    setEditing(c)
    setEditPct(String(c.commissionPct))
    setEditStatus(c.commissionStatus)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">💰 Comisiones</h1>
            <p className="text-sm text-gray-500 mt-0.5">Seguimiento y control de comisiones por venta</p>
          </div>
          <div className="text-sm text-gray-400">{filtered.length} registros</div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <input
              type="text"
              placeholder="Buscar cliente o unidad…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="col-span-2 sm:col-span-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los proyectos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={agentId} onChange={e => setAgentId(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los asesores</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="APROBADA">Aprobada</option>
              <option value="PAGADA">Pagada</option>
            </select>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total generado',  items: filtered,      icon: '💰', color: 'text-gray-900', bg: 'bg-white',      border: 'border-gray-200'  },
            { label: 'Pendiente',        items: pendingList,   icon: '⏳', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
            { label: 'Aprobado',         items: approvedList,  icon: '✅', color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
            { label: 'Pagado',           items: paidList,      icon: '🎉', color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200'  },
          ].map(k => {
            const amt = k.items.reduce((s, c) => s + c.commissionAmount, 0)
            return (
              <div key={k.label} className={`${k.bg} rounded-xl border ${k.border} p-5`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{k.icon}</span>
                  <span className="text-sm font-medium text-gray-500">{k.label}</span>
                </div>
                <div className={`text-2xl font-bold ${k.color}`}>
                  ${amt.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {k.items.length} {k.items.length === 1 ? 'comisión' : 'comisiones'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 mt-3">Cargando comisiones…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">💸</div>
              <p className="text-sm text-gray-500 font-medium">No hay comisiones con los filtros seleccionados</p>
              <p className="text-xs text-gray-400 mt-1">Ajusta el rango de fechas o los filtros para ver más resultados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    {['Cliente', 'Unidad', 'Proyecto', 'Asesor/a', 'Precio venta', '% Com.', 'Monto com.', 'Etapa', 'Estado', 'Fecha', ''].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => {
                    const cfg = STATUS_CFG[c.commissionStatus] ?? STATUS_CFG.PENDIENTE
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-800">{c.clientName}</td>
                        <td className="px-4 py-3">
                          {c.unitNumber
                            ? <span className="font-bold text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                                {c.unitNumber}{c.floor ? ` P${c.floor}` : ''}
                              </span>
                            : <span className="text-gray-400">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{c.projectName}</td>
                        <td className="px-4 py-3 text-gray-600">{c.agentName ?? '—'}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{money(c.price, c.currency)}</td>
                        <td className="px-4 py-3 text-gray-700 font-medium">{c.commissionPct}%</td>
                        <td className="px-4 py-3 font-bold text-green-700">{money(c.commissionAmount, c.currency)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{STAGE_LABELS[c.stage] ?? c.stage}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => advanceStatus(c)}
                            disabled={!cfg.next}
                            title={cfg.next ? `Avanzar a ${STATUS_CFG[cfg.next]?.label}` : 'Estado final'}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${cfg.color} ${cfg.next ? 'hover:opacity-75 cursor-pointer' : 'cursor-default'}`}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} />
                            {cfg.label}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(c.reserveDate).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openEdit(c)}
                            className="text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors font-medium"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Editar comisión</h3>
            <p className="text-sm text-gray-500 mb-6">
              {editing.clientName}
              {editing.unitNumber ? ` · Unidad ${editing.unitNumber}` : ''}
              {' · '}{editing.projectName}
            </p>

            <div className="space-y-5">
              {/* % field */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Porcentaje de comisión
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0" max="100" step="0.5"
                    value={editPct}
                    onChange={e => setEditPct(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">%</span>
                </div>
                {!isNaN(parseFloat(editPct)) && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Monto calculado: <strong className="text-green-700">
                      {money(editing.price * parseFloat(editPct) / 100, editing.currency)}
                    </strong>
                  </p>
                )}
              </div>

              {/* Status selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Estado de pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setEditStatus(key)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        editStatus === key
                          ? cfg.color + ' ring-2 ring-offset-1 ring-blue-500'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-7">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
