'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface Lead {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  budget: number | null
}

interface Project {
  id: string
  name: string
  currency: string
}

interface Agent {
  id: string
  name: string
}

interface ReservationDocument {
  id: string
  name: string
  type: string
  status: string
}

interface Reservation {
  id: string
  leadId: string
  projectId: string
  agentId: string | null
  unitNumber: string | null
  unitType: string | null
  floor: number | null
  area: number | null
  price: number
  currency: string
  reserveAmount: number | null
  stage: string
  reserveDate: string
  promiseDate: string | null
  closingDate: string | null
  deliveryDate: string | null
  commissionPct: number
  commissionStatus: string
  notes: string | null
  createdAt: string
  lead: Lead
  project: Project
  agent: Agent | null
  documents: ReservationDocument[]
}

const STAGES = [
  { key: 'RESERVA', label: 'Reserva', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { key: 'PROMESA', label: 'Promesa', color: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  { key: 'ESCRITURA', label: 'Escritura', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { key: 'ENTREGADO', label: 'Entregado', color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  { key: 'CAIDA', label: 'Caída', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
]

const COMMISSION_STATUS = {
  PENDIENTE: { label: 'Pendiente', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  APROBADA: { label: 'Aprobada', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  PAGADA: { label: 'Pagada', color: 'text-green-600 bg-green-50 border-green-200' },
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'UF') return `UF ${amount.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  if (currency === 'CLP') return `$${Math.round(amount).toLocaleString('es-CL')}`
  return `USD ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StageTag({ stage }: { stage: string }) {
  const s = STAGES.find(s => s.key === stage) || STAGES[0]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function DocsProgress({ documents }: { documents: ReservationDocument[] }) {
  if (!documents.length) return null
  const done = documents.filter(d => d.status === 'SUBIDO' || d.status === 'FIRMADO').length
  const pct = Math.round((done / documents.length) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{done}/{documents.length}</span>
    </div>
  )
}

export default function ReservasClient({ initialReservations }: { initialReservations: Reservation[] }) {
  const [reservations, setReservations] = useState(initialReservations)
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterCommission, setFilterCommission] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'stage'>('date')

  const filtered = useMemo(() => {
    let list = [...reservations]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        `${r.lead.firstName} ${r.lead.lastName}`.toLowerCase().includes(q) ||
        r.project.name.toLowerCase().includes(q) ||
        (r.unitNumber || '').toLowerCase().includes(q) ||
        (r.agent?.name || '').toLowerCase().includes(q)
      )
    }
    if (filterStage) list = list.filter(r => r.stage === filterStage)
    if (filterCommission) list = list.filter(r => r.commissionStatus === filterCommission)

    list.sort((a, b) => {
      if (sortBy === 'price') return b.price - a.price
      if (sortBy === 'stage') return a.stage.localeCompare(b.stage)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return list
  }, [reservations, search, filterStage, filterCommission, sortBy])

  // Stats
  const stats = useMemo(() => {
    const active = reservations.filter(r => r.stage !== 'CAIDA')
    const totalVolume = active.reduce((s, r) => s + r.price, 0)
    const totalCommission = active.reduce((s, r) => s + (r.price * r.commissionPct / 100), 0)
    const pendingCommission = active
      .filter(r => r.commissionStatus === 'PENDIENTE')
      .reduce((s, r) => s + (r.price * r.commissionPct / 100), 0)
    return { count: active.length, totalVolume, totalCommission, pendingCommission }
  }, [reservations])

  const updateStage = async (id: string, stage: string) => {
    await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    setReservations(prev => prev.map(r => r.id === id ? { ...r, stage } : r))
  }

  const updateCommission = async (id: string, commissionStatus: string) => {
    await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commissionStatus }),
    })
    setReservations(prev => prev.map(r => r.id === id ? { ...r, commissionStatus } : r))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservas & Contratos</h1>
          <p className="text-sm text-gray-500 mt-1">Seguimiento completo del pipeline de cierre</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('table')}
            className={`p-2 rounded-lg border transition-colors ${view === 'table' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            title="Vista tabla"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 4v16M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
            </svg>
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`p-2 rounded-lg border transition-colors ${view === 'kanban' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            title="Vista Kanban"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Reservas activas', value: stats.count, icon: '📋', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Volumen total', value: `USD ${(stats.totalVolume / 1000).toFixed(0)}K`, icon: '💰', color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Comisiones totales', value: `USD ${(stats.totalCommission / 1000).toFixed(0)}K`, icon: '🏆', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Comisiones pendientes', value: `USD ${(stats.pendingCommission / 1000).toFixed(0)}K`, icon: '⏳', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl`}>
                {s.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar cliente, proyecto, unidad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>

        <select
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
        >
          <option value="">Todas las etapas</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>

        <select
          value={filterCommission}
          onChange={e => setFilterCommission(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
        >
          <option value="">Todas comisiones</option>
          <option value="PENDIENTE">Comisión pendiente</option>
          <option value="APROBADA">Comisión aprobada</option>
          <option value="PAGADA">Comisión pagada</option>
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'date' | 'price' | 'stage')}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
        >
          <option value="date">Más recientes</option>
          <option value="price">Mayor precio</option>
          <option value="stage">Por etapa</option>
        </select>

        <span className="text-sm text-gray-400">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table view */}
      {view === 'table' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-5xl mb-4">📋</span>
              <p className="text-gray-600 font-medium">No hay reservas registradas</p>
              <p className="text-gray-400 text-sm mt-1">Las reservas aparecerán aquí cuando cierres negocios desde el CRM</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Proyecto / Unidad</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Precio</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Etapa</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Comisión</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Documentos</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Asesor</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Fecha reserva</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => {
                  const commission = r.price * r.commissionPct / 100
                  const commSt = COMMISSION_STATUS[r.commissionStatus as keyof typeof COMMISSION_STATUS] || COMMISSION_STATUS.PENDIENTE
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-medium text-sm text-gray-900">
                          {r.lead.firstName} {r.lead.lastName}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{r.lead.phone}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm font-medium text-gray-800">{r.project.name}</div>
                        {r.unitNumber && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            Unidad {r.unitNumber}
                            {r.floor ? ` · Piso ${r.floor}` : ''}
                            {r.area ? ` · ${r.area}m²` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(r.price, r.currency)}
                        </div>
                        {r.reserveAmount && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            Reserva: {formatCurrency(r.reserveAmount, r.currency)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <select
                          value={r.stage}
                          onChange={e => updateStage(r.id, e.target.value)}
                          className="text-xs border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-0 p-0"
                          style={{ WebkitAppearance: 'none' }}
                        >
                          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                        <StageTag stage={r.stage} />
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm font-medium text-gray-800">
                          {formatCurrency(commission, r.currency)}
                          <span className="text-xs text-gray-400 ml-1">({r.commissionPct}%)</span>
                        </div>
                        <select
                          value={r.commissionStatus}
                          onChange={e => updateCommission(r.id, e.target.value)}
                          className={`mt-1 text-[11px] px-2 py-0.5 rounded-full border font-medium cursor-pointer focus:outline-none ${commSt.color}`}
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="APROBADA">Aprobada</option>
                          <option value="PAGADA">Pagada</option>
                        </select>
                      </td>
                      <td className="px-3 py-4 min-w-[100px]">
                        <DocsProgress documents={r.documents} />
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm text-gray-600">{r.agent?.name || '—'}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-xs text-gray-500">{formatDate(r.reserveDate)}</div>
                        {r.promiseDate && (
                          <div className="text-xs text-violet-500 mt-0.5">Promesa: {formatDate(r.promiseDate)}</div>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/reservas/${r.id}`}
                            className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium"
                          >
                            Ver →
                          </Link>
                          <button
                            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/portal/${r.id}`) }}
                            title="Copiar link del portal del cliente"
                            className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-2 py-1.5 rounded-lg font-medium"
                          >
                            🔗 Portal
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const items = filtered.filter(r => r.stage === stage.key)
            const stageVolume = items.reduce((s, r) => s + r.price, 0)
            return (
              <div key={stage.key} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                    <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{items.length}</span>
                  </div>
                  {stageVolume > 0 && (
                    <span className="text-xs text-gray-400">USD {(stageVolume / 1000).toFixed(0)}K</span>
                  )}
                </div>
                <div className="space-y-3">
                  {items.map(r => {
                    const commission = r.price * r.commissionPct / 100
                    return (
                      <Link
                        key={r.id}
                        href={`/reservas/${r.id}`}
                        className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all"
                      >
                        <div className="font-semibold text-sm text-gray-900 mb-1">
                          {r.lead.firstName} {r.lead.lastName}
                        </div>
                        <div className="text-xs text-gray-500 mb-3">{r.project.name}</div>
                        {r.unitNumber && (
                          <div className="text-xs text-gray-400 mb-2">
                            Unidad {r.unitNumber}
                            {r.floor ? ` · P${r.floor}` : ''}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(r.price, r.currency)}
                          </span>
                          <span className="text-xs text-green-600 font-medium">
                            +{formatCurrency(commission, r.currency)}
                          </span>
                        </div>
                        {r.documents.length > 0 && (
                          <div className="mt-3">
                            <DocsProgress documents={r.documents} />
                          </div>
                        )}
                        {r.agent && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-[9px] font-bold">
                              {r.agent.name[0]}
                            </div>
                            <span className="text-xs text-gray-400">{r.agent.name}</span>
                          </div>
                        )}
                      </Link>
                    )
                  })}
                  {items.length === 0 && (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                      <p className="text-xs text-gray-400">Sin reservas en esta etapa</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
