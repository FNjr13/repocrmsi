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

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Calculator tab ───────────────────────────────────────────────────────────
interface SplitRow { name: string; pct: string }

function CalculadoraTab({ agents }: { agents: Agent[] }) {
  const [price,      setPrice]      = useState('')
  const [currency,   setCurrency]   = useState('USD')
  const [commPct,    setCommPct]    = useState('')
  const [commAmount, setCommAmount] = useState('')
  const [taxPct,     setTaxPct]     = useState('')
  const [opsPct,     setOpsPct]     = useState('')
  const [splits,     setSplits]     = useState<SplitRow[]>([{ name: '', pct: '50' }, { name: '', pct: '50' }])

  const p = parseFloat(price) || 0
  const pct = parseFloat(commPct) || 0
  const gross = p * pct / 100
  const taxAmt = gross * (parseFloat(taxPct) || 0) / 100
  const opsAmt = gross * (parseFloat(opsPct) || 0) / 100
  const net = gross - taxAmt - opsAmt
  const totalSplitPct = splits.reduce((s, r) => s + (parseFloat(r.pct) || 0), 0)

  function onPctChange(val: string) {
    setCommPct(val)
    const pv = parseFloat(val) || 0
    if (p > 0) setCommAmount(fmt(p * pv / 100))
  }
  function onAmountChange(val: string) {
    setCommAmount(val)
    const av = parseFloat(val) || 0
    if (p > 0) setCommPct(fmt(av / p * 100))
  }
  function onPriceChange(val: string) {
    setPrice(val)
    const pv = parseFloat(val) || 0
    if (pct > 0 && pv > 0) setCommAmount(fmt(pv * pct / 100))
  }
  function addSplit() { setSplits(prev => [...prev, { name: '', pct: '0' }]) }
  function removeSplit(i: number) { setSplits(prev => prev.filter((_, j) => j !== i)) }
  function updateSplit(i: number, field: keyof SplitRow, val: string) {
    setSplits(prev => prev.map((r, j) => j === i ? { ...r, [field]: val } : r))
  }

  const sym = currency === 'UF' ? 'UF ' : currency === 'EUR' ? '€' : '$'
  const sfx = currency === 'CLP' ? ' CLP' : ''

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto">

      {/* Datos base */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">📐 Datos base</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Precio de venta</label>
              <input
                type="number"
                placeholder="100,000"
                value={price}
                onChange={e => onPriceChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="USD">USD</option>
                <option value="UF">UF</option>
                <option value="CLP">CLP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">% Comisión</label>
            <div className="relative">
              <input
                type="number" min="0" max="100" step="0.01"
                placeholder="3"
                value={commPct}
                onChange={e => onPctChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Monto comisión</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{sym}</span>
              <input
                type="number" min="0" step="1"
                placeholder="3,000"
                value={commAmount}
                onChange={e => onAmountChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Quick result */}
        {gross > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="text-sm text-blue-700 font-medium">Comisión bruta</div>
            <div className="text-2xl font-bold text-blue-700">{sym}{fmt(gross)}{sfx}</div>
          </div>
        )}
      </div>

      {/* Deducciones */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">📉 Deducciones <span className="text-xs font-normal text-gray-400">(opcional)</span></h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ITBMS / Impuesto</label>
            <div className="relative">
              <input
                type="number" min="0" max="100" step="0.01"
                placeholder="0"
                value={taxPct}
                onChange={e => setTaxPct(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
            {taxAmt > 0 && <p className="text-xs text-red-500 mt-1">−{sym}{fmt(taxAmt)}{sfx}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Gastos operativos</label>
            <div className="relative">
              <input
                type="number" min="0" max="100" step="0.01"
                placeholder="0"
                value={opsPct}
                onChange={e => setOpsPct(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
            {opsAmt > 0 && <p className="text-xs text-red-500 mt-1">−{sym}{fmt(opsAmt)}{sfx}</p>}
          </div>
        </div>

        {/* Resumen */}
        {gross > 0 && (
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Comisión bruta</span>
              <span className="font-semibold">{sym}{fmt(gross)}{sfx}</span>
            </div>
            {taxAmt > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>ITBMS / Impuesto ({taxPct}%)</span>
                <span>−{sym}{fmt(taxAmt)}{sfx}</span>
              </div>
            )}
            {opsAmt > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Gastos operativos ({opsPct}%)</span>
                <span>−{sym}{fmt(opsAmt)}{sfx}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="font-bold text-gray-900">Comisión neta</span>
              <span className="text-2xl font-bold text-green-700">{sym}{fmt(net)}{sfx}</span>
            </div>
          </div>
        )}
      </div>

      {/* División por asesor/a */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">👥 División por asesor/a <span className="text-xs font-normal text-gray-400">(opcional)</span></h2>
          <button onClick={addSplit} className="text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
            + Agregar
          </button>
        </div>

        <div className="space-y-3">
          {splits.map((row, i) => {
            const rowPct = parseFloat(row.pct) || 0
            const rowAmt = net > 0 ? net * rowPct / 100 : gross * rowPct / 100
            return (
              <div key={i} className="flex items-center gap-3">
                <input
                  list={`agents-list-${i}`}
                  placeholder="Nombre del asesor/a"
                  value={row.name}
                  onChange={e => updateSplit(i, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id={`agents-list-${i}`}>
                  {agents.map(a => <option key={a.id} value={a.name} />)}
                </datalist>
                <div className="relative w-24 flex-shrink-0">
                  <input
                    type="number" min="0" max="100" step="1"
                    value={row.pct}
                    onChange={e => updateSplit(i, 'pct', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-7"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                </div>
                <div className="w-28 flex-shrink-0 text-right">
                  {(gross > 0 || net > 0) ? (
                    <span className="font-semibold text-sm text-green-700">{sym}{fmt(rowAmt)}{sfx}</span>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </div>
                {splits.length > 1 && (
                  <button onClick={() => removeSplit(i)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className={`mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-semibold ${totalSplitPct === 100 ? 'text-green-600' : totalSplitPct > 100 ? 'text-red-500' : 'text-yellow-600'}`}>
          <span>Total asignado</span>
          <span>{totalSplitPct}% {totalSplitPct === 100 ? '✓' : totalSplitPct > 100 ? '— supera el 100%' : '— falta asignar'}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ComisionesClient({ projects, agents }: { projects: Project[]; agents: Agent[] }) {
  const today     = new Date().toISOString().slice(0, 10)
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)

  const [tab,     setTab]     = useState<'list' | 'calc'>('list')
  const [list,    setList]    = useState<Commission[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Commission | null>(null)

  // Edit state — amount is primary, pct is derived
  const [editAmount, setEditAmount] = useState('')
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

  const pendingList  = filtered.filter(c => c.commissionStatus === 'PENDIENTE')
  const approvedList = filtered.filter(c => c.commissionStatus === 'APROBADA')
  const paidList     = filtered.filter(c => c.commissionStatus === 'PAGADA')

  async function advanceStatus(c: Commission) {
    const next = STATUS_CFG[c.commissionStatus]?.next
    if (!next) return
    const res = await fetch(`/api/commissions/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commissionStatus: next }),
    })
    if (res.ok) setList(prev => prev.map(x => x.id === c.id ? { ...x, commissionStatus: next } : x))
  }

  function openEdit(c: Commission) {
    setEditing(c)
    setEditAmount(c.commissionAmount.toFixed(2))
    setEditPct(c.commissionPct.toFixed(2))
    setEditStatus(c.commissionStatus)
  }

  function onEditAmountChange(val: string) {
    setEditAmount(val)
    if (editing && editing.price > 0) {
      const amt = parseFloat(val) || 0
      setEditPct((amt / editing.price * 100).toFixed(4))
    }
  }

  function onEditPctChange(val: string) {
    setEditPct(val)
    if (editing && editing.price > 0) {
      const pct = parseFloat(val) || 0
      setEditAmount((editing.price * pct / 100).toFixed(2))
    }
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    const pct = parseFloat(editPct)
    const body: Record<string, unknown> = {}
    if (!isNaN(pct)) body.commissionPct = pct
    if (editStatus !== editing.commissionStatus) body.commissionStatus = editStatus

    if (Object.keys(body).length > 0) {
      const res = await fetch(`/api/commissions/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">💰 Comisiones</h1>
            <p className="text-sm text-gray-500 mt-0.5">Control y seguimiento de comisiones por venta</p>
          </div>
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {([['list','📋 Comisiones'],['calc','🧮 Calculadora']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Calculator tab ── */}
      {tab === 'calc' && <CalculadoraTab agents={agents} />}

      {/* ── List tab ── */}
      {tab === 'list' && (
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
              { label: 'Total generado', items: filtered,      icon: '💰', color: 'text-gray-900',    bg: 'bg-white',      border: 'border-gray-200'  },
              { label: 'Pendiente',      items: pendingList,   icon: '⏳', color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
              { label: 'Aprobado',       items: approvedList,  icon: '✅', color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200'   },
              { label: 'Pagado',         items: paidList,      icon: '🎉', color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200'  },
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
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      {['Cliente','Unidad','Proyecto','Asesor/a','Precio venta','% Com.','Monto com.','Etapa','Estado','Fecha',''].map(h => (
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
                          <td className="px-4 py-3 text-gray-600 max-w-[130px] truncate">{c.projectName}</td>
                          <td className="px-4 py-3 text-gray-600">{c.agentName ?? '—'}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{money(c.price, c.currency)}</td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{c.commissionPct.toFixed(2)}%</td>
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
      )}

      {/* ── Edit Modal ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Editar comisión</h3>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-sm text-gray-500">{editing.clientName}</span>
              {editing.unitNumber && <><span className="text-gray-300">·</span><span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">Unidad {editing.unitNumber}</span></>}
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-500 truncate">{editing.projectName}</span>
            </div>

            {/* Agent (readonly display) */}
            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Asesor/a asignado/a</span>
              <span className="text-sm font-medium text-gray-800">{editing.agentName ?? '—'}</span>
            </div>

            {/* Precio referencia */}
            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Precio de venta</span>
              <span className="text-sm font-bold text-gray-900">{money(editing.price, editing.currency)}</span>
            </div>

            <div className="space-y-4">
              {/* Amount (primary — manual) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Monto de comisión <span className="text-blue-500 font-normal normal-case">(editar directamente)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">
                    {editing.currency === 'UF' ? 'UF' : editing.currency === 'EUR' ? '€' : '$'}
                  </span>
                  <input
                    type="number" min="0" step="1"
                    value={editAmount}
                    onChange={e => onEditAmountChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-3 border-2 border-blue-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-blue-50/30"
                  />
                </div>
              </div>

              {/* Pct (secondary — derived) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  % Comisión <span className="text-gray-400 font-normal normal-case">(se actualiza automáticamente)</span>
                </label>
                <div className="relative">
                  <input
                    type="number" min="0" max="100" step="0.01"
                    value={editPct}
                    onChange={e => onEditPctChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Estado de pago</label>
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

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
