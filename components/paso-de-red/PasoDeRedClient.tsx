'use client'

import { useState, useEffect, useCallback } from 'react'

interface PasoDeRed {
  id: string
  clientName: string
  clientPhone: string | null
  clientEmail: string | null
  source: string
  referredBy: string | null
  jobType: string
  description: string | null
  amount: number | null
  currency: string
  commissionPct: number | null
  commissionAmount: number | null
  status: string
  startDate: string | null
  endDate: string | null
  agentId: string | null
  agentName: string | null
  notes: string | null
  createdAt: string
}

interface Agent { id: string; name: string }

// ─── Config maps ──────────────────────────────────────────────────────────────

const SOURCE_CFG: Record<string, { label: string; icon: string; color: string }> = {
  INSTAGRAM: { label: 'Instagram', icon: '📸', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  FACEBOOK:  { label: 'Facebook',  icon: '👥', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  TIKTOK:    { label: 'TikTok',    icon: '🎵', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  WHATSAPP:  { label: 'WhatsApp',  icon: '💬', color: 'bg-green-100 text-green-700 border-green-200' },
  YOUTUBE:   { label: 'YouTube',   icon: '▶️',  color: 'bg-red-100 text-red-700 border-red-200' },
  REFERIDO:  { label: 'Referido',  icon: '🤝', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  OTRO:      { label: 'Otro',      icon: '🔗', color: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const JOB_CFG: Record<string, { label: string; icon: string }> = {
  CONSTRUCCION: { label: 'Construcción',  icon: '🏗️' },
  REMODELACION: { label: 'Remodelación',  icon: '🔨' },
  SERVICIO:     { label: 'Servicio',      icon: '⚙️' },
  OTRO:         { label: 'Otro',          icon: '📋' },
}

const STATUS_CFG: Record<string, { label: string; color: string; dot: string; next: string | null }> = {
  NUEVO:      { label: 'Nuevo',       color: 'bg-gray-100 text-gray-600 border-gray-200',      dot: 'bg-gray-400',   next: 'EN_PROCESO' },
  EN_PROCESO: { label: 'En proceso',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400', next: 'COMPLETADO' },
  COMPLETADO: { label: 'Completado',  color: 'bg-green-100 text-green-700 border-green-200',    dot: 'bg-green-500',  next: null         },
  CANCELADO:  { label: 'Cancelado',   color: 'bg-red-100 text-red-600 border-red-200',          dot: 'bg-red-400',    next: null         },
}

function money(n: number, cur = 'USD') {
  const f = n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  if (cur === 'UF')  return `UF ${f}`
  if (cur === 'CLP') return `$${f} CLP`
  if (cur === 'EUR') return `€${f}`
  return `$${f}`
}

function pct(a: number | null, b: number | null) {
  if (a == null || b == null) return ''
  return (a / b * 100).toFixed(1) + '%'
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface FormData {
  clientName: string; clientPhone: string; clientEmail: string
  source: string; referredBy: string; jobType: string; description: string
  amount: string; currency: string; commissionPct: string; commissionAmount: string
  status: string; startDate: string; endDate: string; agentId: string; notes: string
}

const EMPTY: FormData = {
  clientName: '', clientPhone: '', clientEmail: '',
  source: 'OTRO', referredBy: '', jobType: 'OTRO', description: '',
  amount: '', currency: 'USD', commissionPct: '', commissionAmount: '',
  status: 'NUEVO', startDate: '', endDate: '', agentId: '', notes: '',
}

function Form({ initial, agents, onSave, onCancel, saving, title }: {
  initial: FormData; agents: Agent[]
  onSave: (d: FormData) => void; onCancel: () => void
  saving: boolean; title: string
}) {
  const [d, setD] = useState<FormData>(initial)
  const set = (k: keyof FormData) => (v: string) => setD(p => ({ ...p, [k]: v }))

  const a = parseFloat(d.amount) || 0

  function onAmountChange(val: string) {
    const pctVal = parseFloat(d.commissionPct) || 0
    setD(p => ({
      ...p, amount: val,
      commissionAmount: a > 0 && pctVal > 0
        ? (parseFloat(val) * pctVal / 100).toFixed(2)
        : p.commissionAmount,
    }))
  }
  function onCommPctChange(val: string) {
    setD(p => ({
      ...p, commissionPct: val,
      commissionAmount: a > 0
        ? (a * (parseFloat(val) || 0) / 100).toFixed(2)
        : p.commissionAmount,
    }))
  }
  function onCommAmtChange(val: string) {
    setD(p => ({
      ...p, commissionAmount: val,
      commissionPct: a > 0
        ? ((parseFloat(val) || 0) / a * 100).toFixed(2)
        : p.commissionPct,
    }))
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

      {/* Cliente */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cliente</p>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre <span className="text-red-400">*</span></label>
            <input value={d.clientName} onChange={e => set('clientName')(e.target.value)} placeholder="Nombre completo"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
              <input value={d.clientPhone} onChange={e => set('clientPhone')(e.target.value)} placeholder="+507 …"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="email" value={d.clientEmail} onChange={e => set('clientEmail')(e.target.value)} placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Origen */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Origen</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {Object.entries(SOURCE_CFG).map(([key, cfg]) => (
            <button key={key} onClick={() => set('source')(key)} type="button"
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium border transition-all ${d.source === key ? cfg.color + ' ring-2 ring-blue-400 ring-offset-1' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
              <span className="text-lg leading-none">{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          ))}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Referido por (persona)</label>
          <input value={d.referredBy} onChange={e => set('referredBy')(e.target.value)} placeholder="Nombre de quien refirió"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Tipo de trabajo */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tipo de trabajo</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {Object.entries(JOB_CFG).map(([key, cfg]) => (
            <button key={key} onClick={() => set('jobType')(key)} type="button"
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium border transition-all ${d.jobType === key ? 'bg-blue-100 text-blue-700 border-blue-300 ring-2 ring-blue-400 ring-offset-1' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
              <span className="text-lg leading-none">{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          ))}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Descripción del trabajo</label>
          <textarea value={d.description} onChange={e => set('description')(e.target.value)} rows={2}
            placeholder="Detalles del trabajo o servicio…"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </div>

      {/* Datos económicos */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Datos económicos</p>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Monto del trabajo</label>
            <input type="number" min="0" value={d.amount} onChange={e => onAmountChange(e.target.value)} placeholder="0"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Moneda</label>
            <select value={d.currency} onChange={e => set('currency')(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['USD','UF','CLP','EUR'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">% Comisión / referido</label>
            <div className="relative">
              <input type="number" min="0" max="100" step="0.01" value={d.commissionPct} onChange={e => onCommPctChange(e.target.value)} placeholder="0"
                className="w-full px-3 py-2.5 pr-8 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Monto comisión <span className="text-blue-500 font-normal">(principal)</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" min="0" step="1" value={d.commissionAmount} onChange={e => onCommAmtChange(e.target.value)} placeholder="0"
                className="w-full pl-7 pr-3 py-2.5 border-2 border-blue-300 bg-blue-50/30 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Gestión */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Gestión</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
            <button key={key} onClick={() => set('status')(key)} type="button"
              className={`py-2 rounded-xl text-xs font-semibold border transition-all ${d.status === key ? cfg.color + ' ring-2 ring-offset-1 ring-blue-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
              {cfg.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Inicio</label>
            <input type="date" value={d.startDate} onChange={e => set('startDate')(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Entrega / cierre</label>
            <input type="date" value={d.endDate} onChange={e => set('endDate')(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Asesor/a responsable</label>
          <select value={d.agentId} onChange={e => set('agentId')(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Sin asignar —</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
          <textarea value={d.notes} onChange={e => set('notes')(e.target.value)} rows={2} placeholder="Observaciones adicionales"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </div>

      <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
        <button onClick={() => onSave(d)} disabled={saving || !d.clientName}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando…' : title}
        </button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PasoDeRedClient({ agents }: { agents: Agent[] }) {
  const today     = new Date().toISOString().slice(0, 10)
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)

  const [list,    setList]    = useState<PasoDeRed[]>([])
  const [loading, setLoading] = useState(false)
  const [modal,   setModal]   = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<PasoDeRed | null>(null)
  const [form,    setForm]    = useState<FormData>(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [delId,   setDelId]   = useState<string | null>(null)

  // Filters
  const [agentId,  setAgentId]  = useState('')
  const [status,   setStatus]   = useState('')
  const [source,   setSource]   = useState('')
  const [jobType,  setJobType]  = useState('')
  const [from,     setFrom]     = useState(yearStart)
  const [to,       setTo]       = useState(today)
  const [search,   setSearch]   = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (agentId) p.set('agentId', agentId)
    if (status)  p.set('status',  status)
    if (source)  p.set('source',  source)
    if (jobType) p.set('jobType', jobType)
    if (from)    p.set('from',    from)
    if (to)      p.set('to',      to)
    const res = await fetch(`/api/pasos-de-red?${p}`)
    setList(await res.json())
    setLoading(false)
  }, [agentId, status, source, jobType, from, to])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = search
    ? list.filter(r =>
        r.clientName.toLowerCase().includes(search.toLowerCase()) ||
        r.referredBy?.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase())
      )
    : list

  async function advanceStatus(r: PasoDeRed) {
    const next = STATUS_CFG[r.status]?.next
    if (!next) return
    const res = await fetch(`/api/pasos-de-red/${r.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) setList(prev => prev.map(x => x.id === r.id ? { ...x, status: next } : x))
  }

  function openCreate() {
    setForm(EMPTY)
    setModal('create')
  }

  function openEdit(r: PasoDeRed) {
    setEditing(r)
    setForm({
      clientName:       r.clientName,
      clientPhone:      r.clientPhone      ?? '',
      clientEmail:      r.clientEmail      ?? '',
      source:           r.source,
      referredBy:       r.referredBy       ?? '',
      jobType:          r.jobType,
      description:      r.description      ?? '',
      amount:           r.amount           != null ? String(r.amount) : '',
      currency:         r.currency,
      commissionPct:    r.commissionPct    != null ? String(r.commissionPct)    : '',
      commissionAmount: r.commissionAmount != null ? String(r.commissionAmount) : '',
      status:           r.status,
      startDate:        r.startDate ? r.startDate.slice(0, 10) : '',
      endDate:          r.endDate   ? r.endDate.slice(0, 10)   : '',
      agentId:          r.agentId   ?? '',
      notes:            r.notes     ?? '',
    })
    setModal('edit')
  }

  async function handleCreate(d: FormData) {
    setSaving(true)
    const res = await fetch('/api/pasos-de-red', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName:       d.clientName,
        clientPhone:      d.clientPhone      || null,
        clientEmail:      d.clientEmail      || null,
        source:           d.source,
        referredBy:       d.referredBy       || null,
        jobType:          d.jobType,
        description:      d.description      || null,
        amount:           d.amount           ? parseFloat(d.amount)           : null,
        currency:         d.currency,
        commissionPct:    d.commissionPct    ? parseFloat(d.commissionPct)    : null,
        commissionAmount: d.commissionAmount ? parseFloat(d.commissionAmount) : null,
        status:           d.status,
        startDate:        d.startDate || null,
        endDate:          d.endDate   || null,
        agentId:          d.agentId   || null,
        notes:            d.notes     || null,
      }),
    })
    if (res.ok) { const created = await res.json(); setList(p => [created, ...p]) }
    setSaving(false)
    setModal(null)
  }

  async function handleEdit(d: FormData) {
    if (!editing) return
    setSaving(true)
    const res = await fetch(`/api/pasos-de-red/${editing.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName:       d.clientName,
        clientPhone:      d.clientPhone      || null,
        clientEmail:      d.clientEmail      || null,
        source:           d.source,
        referredBy:       d.referredBy       || null,
        jobType:          d.jobType,
        description:      d.description      || null,
        amount:           d.amount           ? parseFloat(d.amount)           : null,
        currency:         d.currency,
        commissionPct:    d.commissionPct    ? parseFloat(d.commissionPct)    : null,
        commissionAmount: d.commissionAmount ? parseFloat(d.commissionAmount) : null,
        status:           d.status,
        startDate:        d.startDate || null,
        endDate:          d.endDate   || null,
        agentId:          d.agentId   || null,
        notes:            d.notes     || null,
      }),
    })
    if (res.ok) { const updated = await res.json(); setList(p => p.map(x => x.id === editing.id ? updated : x)) }
    setSaving(false)
    setModal(null)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/pasos-de-red/${id}`, { method: 'DELETE' })
    if (res.ok) { setList(p => p.filter(x => x.id !== id)); setDelId(null) }
  }

  // KPIs
  const totalAmount = filtered.reduce((s, r) => s + (r.amount ?? 0), 0)
  const totalComm   = filtered.reduce((s, r) => s + (r.commissionAmount ?? 0), 0)
  const byStatus = Object.fromEntries(
    Object.keys(STATUS_CFG).map(k => [k, filtered.filter(r => r.status === k).length])
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🌐 Paso de Red</h1>
            <p className="text-sm text-gray-500 mt-0.5">Trabajos y servicios referidos por redes sociales</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo paso de red
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <input type="text" placeholder="Buscar cliente o descripción…" value={search} onChange={e => setSearch(e.target.value)}
              className="col-span-2 sm:col-span-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={source} onChange={e => setSource(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los orígenes</option>
              {Object.entries(SOURCE_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <select value={jobType} onChange={e => setJobType(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los tipos</option>
              {Object.entries(JOB_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <select value={agentId} onChange={e => setAgentId(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los asesores</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-400 mb-1">Total trabajos</p>
            <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">{money(totalAmount)} en volumen</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-400 mb-1">Comisiones ganadas</p>
            <p className="text-2xl font-bold text-green-700">{money(totalComm)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{pct(totalComm, totalAmount)} del total</p>
          </div>
          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
            <div key={key} className={`rounded-xl border p-4 ${cfg.color}`}>
              <p className="text-xs font-medium opacity-70 mb-1">{cfg.label}</p>
              <p className="text-2xl font-bold">{byStatus[key] ?? 0}</p>
            </div>
          ))}
        </div>

        {/* Source breakdown */}
        {filtered.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Distribución por origen</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SOURCE_CFG).map(([key, cfg]) => {
                const count = filtered.filter(r => r.source === key).length
                if (!count) return null
                return (
                  <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${cfg.color}`}>
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 mt-3">Cargando…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">🌐</div>
              <p className="text-sm text-gray-500 font-medium">No hay registros con los filtros seleccionados</p>
              <button onClick={openCreate} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
                + Registrar primer paso de red
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    {['Origen','Cliente','Tipo','Descripción','Monto','Comisión','Asesor','Estado','Fecha',''].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(r => {
                    const srcCfg = SOURCE_CFG[r.source] ?? SOURCE_CFG.OTRO
                    const jCfg   = JOB_CFG[r.jobType]  ?? JOB_CFG.OTRO
                    const stCfg  = STATUS_CFG[r.status] ?? STATUS_CFG.NUEVO
                    const overdue = r.endDate && r.status !== 'COMPLETADO' && r.status !== 'CANCELADO'
                      && new Date(r.endDate) < new Date()
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${srcCfg.color}`}>
                            {srcCfg.icon} {srcCfg.label}
                          </span>
                          {r.referredBy && (
                            <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[90px]">por {r.referredBy}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{r.clientName}</div>
                          {r.clientPhone && <div className="text-xs text-gray-400">{r.clientPhone}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{jCfg.icon}</span>
                          <span className="text-xs text-gray-600 ml-1">{jCfg.label}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{r.description ?? '—'}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {r.amount != null ? money(r.amount, r.currency) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 font-bold text-green-700">
                          {r.commissionAmount != null ? money(r.commissionAmount, r.currency) : <span className="text-gray-400 font-normal">—</span>}
                          {r.commissionPct != null && <div className="text-xs font-normal text-gray-400">{r.commissionPct}%</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.agentName ?? '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => advanceStatus(r)} disabled={!stCfg.next} title={stCfg.next ? `Avanzar a ${STATUS_CFG[stCfg.next]?.label}` : 'Estado final'}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${stCfg.color} ${stCfg.next ? 'cursor-pointer hover:opacity-75' : 'cursor-default'}`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${stCfg.dot}`} />
                            {stCfg.label}
                          </button>
                          {overdue && <div className="text-[10px] text-red-500 mt-0.5 font-medium">⚠️ vencido</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(r.createdAt).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(r)} className="text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                              Editar
                            </button>
                            <button onClick={() => setDelId(r.id)} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors">
                              ✕
                            </button>
                          </div>
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

      {/* Create Modal */}
      {modal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="font-bold text-gray-900 text-lg mb-5">🌐 Nuevo paso de red</h3>
            <Form initial={form} agents={agents} onSave={handleCreate} onCancel={() => setModal(null)} saving={saving} title="Registrar" />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setModal(null); setEditing(null) }} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="font-bold text-gray-900 text-lg mb-5">Editar paso de red</h3>
            <Form initial={form} agents={agents} onSave={handleEdit} onCancel={() => { setModal(null); setEditing(null) }} saving={saving} title="Guardar cambios" />
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDelId(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="text-3xl mb-3">🗑️</div>
            <h3 className="font-bold text-gray-900 mb-1">Eliminar registro</h3>
            <p className="text-sm text-gray-500 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => handleDelete(delId)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
