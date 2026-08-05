'use client'

import { useState, useEffect, useCallback } from 'react'

interface Commission {
  id: string
  source: 'AUTO' | 'MANUAL'
  clientName: string
  projectId: string | null
  projectName: string | null
  agentId: string | null
  agentName: string | null
  unitNumber: string | null
  floor: number | null
  salePrice: number | null
  currency: string
  stage: string | null
  commissionPct: number | null
  commissionAmount: number
  commissionStatus: string
  date: string
  description: string | null
  notes: string | null
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
  const [price, setPrice]           = useState('')
  const [currency, setCurrency]     = useState('USD')
  const [commPct, setCommPct]       = useState('')
  const [commAmount, setCommAmount] = useState('')
  const [taxPct, setTaxPct]         = useState('')
  const [opsPct, setOpsPct]         = useState('')
  const [splits, setSplits]         = useState<SplitRow[]>([{ name: '', pct: '50' }, { name: '', pct: '50' }])

  const p = parseFloat(price) || 0
  const pct = parseFloat(commPct) || 0
  const gross = p * pct / 100
  const taxAmt = gross * (parseFloat(taxPct) || 0) / 100
  const opsAmt = gross * (parseFloat(opsPct) || 0) / 100
  const net = gross - taxAmt - opsAmt
  const totalSplitPct = splits.reduce((s, r) => s + (parseFloat(r.pct) || 0), 0)

  function onPctChange(val: string)    { setCommPct(val);    if (p > 0) setCommAmount(fmt(p * (parseFloat(val)||0) / 100)) }
  function onAmountChange(val: string) { setCommAmount(val); if (p > 0) setCommPct(fmt((parseFloat(val)||0) / p * 100)) }
  function onPriceChange(val: string)  { setPrice(val);      if (pct > 0) setCommAmount(fmt((parseFloat(val)||0) * pct / 100)) }
  function addSplit() { setSplits(prev => [...prev, { name: '', pct: '0' }]) }
  function removeSplit(i: number) { setSplits(prev => prev.filter((_, j) => j !== i)) }
  function updateSplit(i: number, field: keyof SplitRow, val: string) {
    setSplits(prev => prev.map((r, j) => j === i ? { ...r, [field]: val } : r))
  }

  const sym = currency === 'UF' ? 'UF ' : currency === 'EUR' ? '€' : '$'
  const sfx = currency === 'CLP' ? ' CLP' : ''

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">📐 Datos base</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Precio de venta</label>
              <input type="number" placeholder="100,000" value={price} onChange={e => onPriceChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['USD','UF','CLP','EUR'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">% Comisión</label>
            <div className="relative">
              <input type="number" min="0" max="100" step="0.01" placeholder="3" value={commPct} onChange={e => onPctChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Monto comisión</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{sym}</span>
              <input type="number" min="0" step="1" placeholder="3,000" value={commAmount} onChange={e => onAmountChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        {gross > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">Comisión bruta</span>
            <span className="text-2xl font-bold text-blue-700">{sym}{fmt(gross)}{sfx}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">📉 Deducciones <span className="text-xs font-normal text-gray-400">(opcional)</span></h2>
        <div className="grid grid-cols-2 gap-4">
          {[['ITBMS / Impuesto', taxPct, setTaxPct, taxAmt], ['Gastos operativos', opsPct, setOpsPct, opsAmt]].map(([label, val, setter, amt]) => (
            <div key={label as string}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label as string}</label>
              <div className="relative">
                <input type="number" min="0" max="100" step="0.01" placeholder="0" value={val as string}
                  onChange={e => (setter as (v: string) => void)(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
              {(amt as number) > 0 && <p className="text-xs text-red-500 mt-1">−{sym}{fmt(amt as number)}{sfx}</p>}
            </div>
          ))}
        </div>
        {gross > 0 && (
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            <div className="flex justify-between text-sm text-gray-600"><span>Comisión bruta</span><span className="font-semibold">{sym}{fmt(gross)}{sfx}</span></div>
            {taxAmt > 0 && <div className="flex justify-between text-sm text-red-500"><span>ITBMS ({taxPct}%)</span><span>−{sym}{fmt(taxAmt)}{sfx}</span></div>}
            {opsAmt > 0 && <div className="flex justify-between text-sm text-red-500"><span>Gastos op. ({opsPct}%)</span><span>−{sym}{fmt(opsAmt)}{sfx}</span></div>}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="font-bold text-gray-900">Comisión neta</span>
              <span className="text-2xl font-bold text-green-700">{sym}{fmt(net)}{sfx}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">👥 División por asesor/a <span className="text-xs font-normal text-gray-400">(opcional)</span></h2>
          <button onClick={addSplit} className="text-xs text-blue-600 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">+ Agregar</button>
        </div>
        <div className="space-y-3">
          {splits.map((row, i) => {
            const rowPct = parseFloat(row.pct) || 0
            const rowAmt = (net > 0 ? net : gross) * rowPct / 100
            return (
              <div key={i} className="flex items-center gap-3">
                <input list={`al-${i}`} placeholder="Nombre del asesor/a" value={row.name} onChange={e => updateSplit(i, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <datalist id={`al-${i}`}>{agents.map(a => <option key={a.id} value={a.name} />)}</datalist>
                <div className="relative w-24 flex-shrink-0">
                  <input type="number" min="0" max="100" value={row.pct} onChange={e => updateSplit(i, 'pct', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-7" />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                </div>
                <div className="w-28 flex-shrink-0 text-right">
                  {(gross > 0 || net > 0) ? <span className="font-semibold text-sm text-green-700">{sym}{fmt(rowAmt)}{sfx}</span> : <span className="text-gray-400 text-sm">—</span>}
                </div>
                {splits.length > 1 && (
                  <button onClick={() => removeSplit(i)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div className={`mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-semibold ${totalSplitPct === 100 ? 'text-green-600' : totalSplitPct > 100 ? 'text-red-500' : 'text-yellow-600'}`}>
          <span>Total asignado</span>
          <span>{totalSplitPct}% {totalSplitPct === 100 ? '✓' : totalSplitPct > 100 ? '— supera 100%' : '— falta asignar'}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
interface FormData {
  clientName: string; projectId: string; agentId: string; unitNumber: string
  description: string; salePrice: string; currency: string
  commissionPct: string; commissionAmount: string
  status: string; commissionDate: string; notes: string
}

const EMPTY_FORM: FormData = {
  clientName: '', projectId: '', agentId: '', unitNumber: '',
  description: '', salePrice: '', currency: 'USD',
  commissionPct: '', commissionAmount: '',
  status: 'PENDIENTE', commissionDate: new Date().toISOString().slice(0,10), notes: '',
}

function CommissionForm({
  initial, projects, agents, price: refPrice,
  onSave, onCancel, saving, title, isAuto,
}: {
  initial: FormData; projects: Project[]; agents: Agent[]
  price?: number; onSave: (d: FormData) => void
  onCancel: () => void; saving: boolean; title: string; isAuto?: boolean
}) {
  const [d, setD] = useState<FormData>(initial)
  const set = (k: keyof FormData) => (v: string) => setD(prev => ({ ...prev, [k]: v }))

  const p = parseFloat(d.salePrice) || refPrice || 0

  function onPctChange(val: string) {
    setD(prev => ({ ...prev, commissionPct: val, commissionAmount: p > 0 ? fmt(p * (parseFloat(val)||0) / 100) : prev.commissionAmount }))
  }
  function onAmountChange(val: string) {
    setD(prev => ({ ...prev, commissionAmount: val, commissionPct: p > 0 ? fmt((parseFloat(val)||0) / p * 100) : prev.commissionPct }))
  }
  function onSalePriceChange(val: string) {
    const pv = parseFloat(val) || 0
    const pct = parseFloat(d.commissionPct) || 0
    setD(prev => ({ ...prev, salePrice: val, commissionAmount: pv > 0 && pct > 0 ? fmt(pv * pct / 100) : prev.commissionAmount }))
  }

  const sym = d.currency === 'UF' ? 'UF ' : d.currency === 'EUR' ? '€' : '$'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Cliente <span className="text-red-400">*</span>
          </label>
          <input value={d.clientName} onChange={e => set('clientName')(e.target.value)} placeholder="Nombre del cliente"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {!isAuto && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Proyecto</label>
              <select value={d.projectId} onChange={e => set('projectId')(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sin proyecto —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Asesor/a</label>
              <select value={d.agentId} onChange={e => set('agentId')(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sin asignar —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Unidad / Lote</label>
              <input value={d.unitNumber} onChange={e => set('unitNumber')(e.target.value)} placeholder="Ej: A-12"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Descripción</label>
              <input value={d.description} onChange={e => set('description')(e.target.value)} placeholder="Concepto de la comisión"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos económicos</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Precio de venta</label>
            <input type="number" min="0" value={d.salePrice} onChange={e => onSalePriceChange(e.target.value)} placeholder="0"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Moneda</label>
            <select value={d.currency} onChange={e => set('currency')(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['USD','UF','CLP','EUR'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Monto comisión <span className="text-blue-500 font-normal normal-case">(principal)</span> <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{sym}</span>
              <input type="number" min="0" step="1" value={d.commissionAmount} onChange={e => onAmountChange(e.target.value)} placeholder="0"
                className="w-full pl-8 pr-3 py-2.5 border-2 border-blue-300 bg-blue-50/30 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">% Comisión</label>
            <div className="relative">
              <input type="number" min="0" max="100" step="0.01" value={d.commissionPct} onChange={e => onPctChange(e.target.value)} placeholder="0"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Gestión</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
            <button key={key} onClick={() => set('status')(key)}
              className={`py-2 rounded-xl text-xs font-semibold border transition-all ${d.status === key ? cfg.color + ' ring-2 ring-offset-1 ring-blue-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
              {cfg.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha</label>
            <input type="date" value={d.commissionDate} onChange={e => set('commissionDate')(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {!isAuto && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notas</label>
            <textarea value={d.notes} onChange={e => set('notes')(e.target.value)} rows={2} placeholder="Observaciones adicionales"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        )}
      </div>

      {!d.clientName && (
        <p className="text-xs text-red-500 -mt-1">⚠️ El nombre del cliente es obligatorio</p>
      )}
      {d.clientName && !d.commissionAmount && (
        <p className="text-xs text-red-500 -mt-1">⚠️ Ingresa el monto de comisión para continuar</p>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button onClick={() => onSave(d)} disabled={saving || !d.clientName || !d.commissionAmount}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
          {saving ? 'Guardando…' : title}
        </button>
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

  // Modal state
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Commission | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

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
    const endpoint = c.source === 'MANUAL' ? `/api/manual-commissions/${c.id}` : `/api/commissions/${c.id}`
    const field    = c.source === 'MANUAL' ? 'status' : 'commissionStatus'
    const res = await fetch(endpoint, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: next }),
    })
    if (res.ok) setList(prev => prev.map(x => x.id === c.id ? { ...x, commissionStatus: next } : x))
  }

  function openCreate() {
    setFormData({ ...EMPTY_FORM, commissionDate: today })
    setModal('create')
  }

  function openEdit(c: Commission) {
    setEditing(c)
    setFormData({
      clientName:       c.clientName,
      projectId:        c.projectId    ?? '',
      agentId:          c.agentId      ?? '',
      unitNumber:       c.unitNumber   ?? '',
      description:      c.description  ?? '',
      salePrice:        c.salePrice    != null ? String(c.salePrice) : '',
      currency:         c.currency,
      commissionPct:    c.commissionPct != null ? String(c.commissionPct) : '',
      commissionAmount: String(c.commissionAmount),
      status:           c.commissionStatus,
      commissionDate:   c.date.slice(0, 10),
      notes:            c.notes ?? '',
    })
    setModal('edit')
  }

  async function handleCreate(d: FormData) {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/manual-commissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName:       d.clientName,
          projectId:        d.projectId   || null,
          agentId:          d.agentId     || null,
          unitNumber:       d.unitNumber  || null,
          description:      d.description || null,
          salePrice:        d.salePrice   ? parseFloat(d.salePrice) : null,
          currency:         d.currency,
          commissionPct:    d.commissionPct ? parseFloat(d.commissionPct) : null,
          commissionAmount: parseFloat(d.commissionAmount),
          status:           d.status,
          commissionDate:   d.commissionDate,
          notes:            d.notes || null,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setList(prev => [created, ...prev])
        setModal(null)
        setSaveError(null)
      } else {
        const err = await res.json().catch(() => ({}))
        setSaveError(err.error || `Error ${res.status} — intenta de nuevo`)
      }
    } catch {
      setSaveError('Error de conexión — verifica tu internet e intenta de nuevo')
    }
    setSaving(false)
  }

  async function handleEdit(d: FormData) {
    if (!editing) return
    setSaving(true)
    setSaveError(null)
    try {
      if (editing.source === 'MANUAL') {
        const res = await fetch(`/api/manual-commissions/${editing.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName:       d.clientName,
            projectId:        d.projectId   || null,
            agentId:          d.agentId     || null,
            unitNumber:       d.unitNumber  || null,
            description:      d.description || null,
            salePrice:        d.salePrice   ? parseFloat(d.salePrice) : null,
            currency:         d.currency,
            commissionPct:    d.commissionPct ? parseFloat(d.commissionPct) : null,
            commissionAmount: parseFloat(d.commissionAmount),
            status:           d.status,
            commissionDate:   d.commissionDate,
            notes:            d.notes || null,
          }),
        })
        if (res.ok) {
          const updated = await res.json()
          setList(prev => prev.map(x => x.id === editing.id ? updated : x))
          setModal(null); setEditing(null)
        } else {
          const err = await res.json().catch(() => ({}))
          setSaveError(err.error || `Error ${res.status} — intenta de nuevo`)
        }
      } else {
        // AUTO: only update commissionPct and commissionStatus
        const body: Record<string, unknown> = {}
        const pct = parseFloat(d.commissionPct)
        if (!isNaN(pct))      body.commissionPct    = pct
        if (d.status !== editing.commissionStatus) body.commissionStatus = d.status
        if (Object.keys(body).length > 0) {
          const res = await fetch(`/api/commissions/${editing.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (res.ok) {
            const newPct = typeof body.commissionPct === 'number' ? body.commissionPct : editing.commissionPct ?? 0
            const newSt  = typeof body.commissionStatus === 'string' ? body.commissionStatus : editing.commissionStatus
            setList(prev => prev.map(x => x.id === editing.id
              ? { ...x, commissionPct: newPct, commissionStatus: newSt, commissionAmount: (x.salePrice ?? 0) * newPct / 100 }
              : x
            ))
            setModal(null); setEditing(null)
          } else {
            const err = await res.json().catch(() => ({}))
            setSaveError(err.error || `Error ${res.status}`)
          }
        } else {
          // nothing changed — just close
          setModal(null); setEditing(null)
        }
      }
    } catch {
      setSaveError('Error de conexión — verifica tu internet e intenta de nuevo')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/manual-commissions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setList(prev => prev.filter(x => x.id !== id))
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">💰 Comisiones</h1>
            <p className="text-sm text-gray-500 mt-0.5">Control y seguimiento de comisiones por venta</p>
          </div>
          <div className="flex items-center gap-3">
            {tab === 'list' && (
              <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva comisión
              </button>
            )}
            <div className="flex bg-gray-100 rounded-xl p-1">
              {([['list','📋 Comisiones'],['calc','🧮 Calculadora']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tab === 'calc' && <CalculadoraTab agents={agents} />}

      {tab === 'list' && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <input type="text" placeholder="Buscar cliente o unidad…" value={search} onChange={e => setSearch(e.target.value)}
                className="col-span-2 sm:col-span-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
              { label: 'Total generado', items: filtered,     icon: '💰', color: 'text-gray-900',    bg: 'bg-white',     border: 'border-gray-200'  },
              { label: 'Pendiente',      items: pendingList,  icon: '⏳', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
              { label: 'Aprobado',       items: approvedList, icon: '✅', color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
              { label: 'Pagado',         items: paidList,     icon: '🎉', color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200'  },
            ].map(k => {
              const amt = k.items.reduce((s, c) => s + c.commissionAmount, 0)
              return (
                <div key={k.label} className={`${k.bg} rounded-xl border ${k.border} p-5`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{k.icon}</span>
                    <span className="text-sm font-medium text-gray-500">{k.label}</span>
                  </div>
                  <div className={`text-2xl font-bold ${k.color}`}>${amt.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{k.items.length} {k.items.length === 1 ? 'comisión' : 'comisiones'}</div>
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
                <button onClick={openCreate} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
                  + Registrar comisión manual
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      {['Tipo','Cliente','Unidad','Proyecto','Asesor/a','Precio venta','% Com.','Monto com.','Estado','Fecha',''].map(h => (
                        <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(c => {
                      const cfg = STATUS_CFG[c.commissionStatus] ?? STATUS_CFG.PENDIENTE
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.source === 'MANUAL' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                              {c.source === 'MANUAL' ? 'MANUAL' : 'AUTO'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {c.clientName}
                            {c.description && <div className="text-xs text-gray-400 font-normal">{c.description}</div>}
                          </td>
                          <td className="px-4 py-3">
                            {c.unitNumber
                              ? <span className="font-bold text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">{c.unitNumber}</span>
                              : <span className="text-gray-400">—</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{c.projectName ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{c.agentName ?? '—'}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {c.salePrice != null ? money(c.salePrice, c.currency) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-700 font-medium">
                            {c.commissionPct != null ? `${c.commissionPct.toFixed(2)}%` : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 font-bold text-green-700">{money(c.commissionAmount, c.currency)}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => advanceStatus(c)} disabled={!cfg.next} title={cfg.next ? `Avanzar a ${STATUS_CFG[cfg.next]?.label}` : 'Estado final'}
                              className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${cfg.color} ${cfg.next ? 'hover:opacity-75 cursor-pointer' : 'cursor-default'}`}>
                              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} />
                              {cfg.label}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {new Date(c.date).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(c)} className="text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors font-medium">
                                Editar
                              </button>
                              {c.source === 'MANUAL' && (
                                <button onClick={() => setDeleteConfirm(c.id)} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors">
                                  ✕
                                </button>
                              )}
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
      )}

      {/* Create Modal */}
      {modal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setModal(null); setSaveError(null) }} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 text-lg mb-4">✏️ Nueva comisión manual</h3>
            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                ❌ {saveError}
              </div>
            )}
            <CommissionForm
              initial={formData} projects={projects} agents={agents}
              onSave={handleCreate} onCancel={() => { setModal(null); setSaveError(null) }}
              saving={saving} title="Registrar comisión"
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setModal(null); setEditing(null); setSaveError(null) }} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-lg">Editar comisión</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${editing.source === 'MANUAL' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                {editing.source}
              </span>
            </div>
            {editing.source === 'AUTO' && (
              <p className="text-xs text-gray-400 mb-2">Separación vinculada · Solo puedes editar el monto/% y el estado</p>
            )}
            {saveError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                ❌ {saveError}
              </div>
            )}
            <CommissionForm
              initial={formData} projects={projects} agents={agents}
              price={editing.salePrice ?? undefined}
              onSave={handleEdit} onCancel={() => { setModal(null); setEditing(null) }}
              saving={saving} title="Guardar cambios" isAuto={editing.source === 'AUTO'}
            />
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="text-3xl mb-3">🗑️</div>
            <h3 className="font-bold text-gray-900 mb-1">Eliminar comisión</h3>
            <p className="text-sm text-gray-500 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
