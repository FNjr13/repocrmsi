'use client'

import { useState, useEffect, useCallback } from 'react'

function toWA(phone: string | null) {
  if (!phone) return '#'
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

interface Activity { id: string; type: string; description: string; date: string }
interface BrokerProj {
  id: string; projectName: string; unitsSold: number; unitsReserved: number
  commissionPct: number | null; notes: string | null
  project?: { id: string; name: string; type: string } | null
}
interface Broker {
  id: string; name: string; company: string | null; phone: string | null; email: string | null
  country: string | null; city: string | null; type: string; status: string
  licenseNumber: string | null; commissionPct: number | null; notes: string | null
  followUpDate: string | null; createdAt: string
  brokerProjects: BrokerProj[]; activities: Activity[]
  _count?: { brokerProjects: number; activities: number }
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  AGENCIA:      { label: 'Agencia',      color: 'bg-blue-100 text-blue-700' },
  INDEPENDIENTE:{ label: 'Independiente',color: 'bg-purple-100 text-purple-700' },
  FRANQUICIA:   { label: 'Franquicia',   color: 'bg-orange-100 text-orange-700' },
  PROMOTOR:     { label: 'Promotor',     color: 'bg-teal-100 text-teal-700' },
}
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVO:  { label: 'Activo',   color: 'bg-green-100 text-green-700' },
  VIP:     { label: 'Top',      color: 'bg-amber-100 text-amber-700' },
  INACTIVO:{ label: 'Inactivo', color: 'bg-gray-100 text-gray-500' },
}
const ACT_ICONS: Record<string, string> = {
  LLAMADA: '📞', WHATSAPP: '💬', EMAIL: '📧', VISITA: '🤝', NOTA: '📝', REUNION: '🏢', INFO_ENVIADA: '📤',
}
const COUNTRIES = ['Panamá','Estados Unidos','Colombia','Venezuela','Argentina','Chile','México','España','Canadá','China','Costa Rica','Guatemala','Honduras','Otro']

function initials(name: string) { return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() }
function formatDate(d: string) { return new Date(d).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' }) }
function daysAgo(d: string) { const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return diff === 0 ? 'hoy' : diff === 1 ? 'ayer' : `hace ${diff}d` }
function isOverdue(d: string | null) { return !!d && new Date(d) < new Date() }

export default function BrokersClient({ projects }: { projects: { id: string; name: string; type: string }[] }) {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Broker | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [showNew, setShowNew] = useState(false)
  const [activeTab, setActiveTab] = useState<'perfil' | 'proyectos' | 'actividad'>('perfil')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Record<string, string>>({})

  const [showAddProj, setShowAddProj] = useState(false)
  const [newProj, setNewProj] = useState({ projectId: '', projectName: '', unitsSold: '0', unitsReserved: '0', commissionPct: '3', notes: '' })

  const [showAddAct, setShowAddAct] = useState(false)
  const [newAct, setNewAct] = useState({ type: 'LLAMADA', description: '', date: new Date().toISOString().slice(0, 16) })

  const [newBroker, setNewBroker] = useState({ name: '', company: '', phone: '', email: '', country: 'Panamá', city: '', type: 'AGENCIA', status: 'ACTIVO', licenseNumber: '', commissionPct: '3', notes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/inversores')
    setBrokers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = brokers.filter(b => {
    if (filterStatus !== 'ALL' && b.status !== filterStatus) return false
    if (filterType !== 'ALL' && b.type !== filterType) return false
    if (search) {
      const s = search.toLowerCase()
      if (!b.name.toLowerCase().includes(s) && !(b.company || '').toLowerCase().includes(s) && !(b.phone || '').includes(s)) return false
    }
    return true
  })

  const stats = {
    total: brokers.length,
    top: brokers.filter(b => b.status === 'VIP').length,
    overdue: brokers.filter(b => isOverdue(b.followUpDate)).length,
    totalSold: brokers.reduce((sum, b) => sum + b.brokerProjects.reduce((s, p) => s + p.unitsSold, 0), 0),
  }

  async function createBroker() {
    if (!newBroker.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/inversores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBroker) })
    const b = await res.json()
    setBrokers(prev => [{ ...b, brokerProjects: [], activities: [], _count: { brokerProjects: 0, activities: 0 } }, ...prev])
    setNewBroker({ name: '', company: '', phone: '', email: '', country: 'Panamá', city: '', type: 'AGENCIA', status: 'ACTIVO', licenseNumber: '', commissionPct: '3', notes: '' })
    setShowNew(false)
    setSaving(false)
  }

  async function saveEdit() {
    if (!selected) return
    setSaving(true)
    const res = await fetch(`/api/inversores/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData) })
    const updated = await res.json()
    const merged = { ...selected, ...updated }
    setSelected(merged)
    setBrokers(prev => prev.map(b => b.id === selected.id ? { ...b, ...updated } : b))
    setEditing(false)
    setSaving(false)
  }

  async function addProject() {
    if (!selected || !newProj.projectName.trim()) return
    setSaving(true)
    const res = await fetch(`/api/inversores/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'add_project', ...newProj }) })
    const proj = await res.json()
    const updated = { ...selected, brokerProjects: [proj, ...selected.brokerProjects] }
    setSelected(updated)
    setBrokers(prev => prev.map(b => b.id === selected.id ? { ...b, brokerProjects: updated.brokerProjects } : b))
    setNewProj({ projectId: '', projectName: '', unitsSold: '0', unitsReserved: '0', commissionPct: '3', notes: '' })
    setShowAddProj(false)
    setSaving(false)
  }

  async function deleteProject(brokerProjectId: string) {
    if (!selected || !confirm('¿Quitar este proyecto del broker?')) return
    await fetch(`/api/inversores/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'delete_project', brokerProjectId }) })
    const updated = { ...selected, brokerProjects: selected.brokerProjects.filter(p => p.id !== brokerProjectId) }
    setSelected(updated)
    setBrokers(prev => prev.map(b => b.id === selected.id ? { ...b, brokerProjects: updated.brokerProjects } : b))
  }

  async function addActivity() {
    if (!selected || !newAct.description.trim()) return
    setSaving(true)
    const res = await fetch(`/api/inversores/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'add_activity', ...newAct }) })
    const act = await res.json()
    setSelected(prev => prev ? { ...prev, activities: [act, ...prev.activities] } : prev)
    setNewAct({ type: 'LLAMADA', description: '', date: new Date().toISOString().slice(0, 16) })
    setShowAddAct(false)
    setSaving(false)
  }

  async function deleteBroker() {
    if (!selected || !confirm(`¿Eliminar a ${selected.name}?`)) return
    await fetch(`/api/inversores/${selected.id}`, { method: 'DELETE' })
    setBrokers(prev => prev.filter(b => b.id !== selected.id))
    setSelected(null)
  }

  const grad = (status: string) => status === 'VIP' ? 'from-amber-400 to-orange-500' : 'from-indigo-500 to-purple-600'

  return (
    <div className="flex h-full">
      {/* LEFT */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: 'Total brokers', value: stats.total, color: 'text-gray-900' },
              { label: 'Top performers', value: stats.top, color: 'text-amber-600' },
              { label: 'Seg. atrasados', value: stats.overdue, color: stats.overdue > 0 ? 'text-red-500' : 'text-gray-400' },
              { label: 'Unidades vendidas', value: stats.totalSold, color: 'text-green-600' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowNew(true)} className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            + Nuevo broker
          </button>
        </div>

        <div className="p-3 border-b border-gray-100 space-y-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o empresa..."
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex gap-2">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none">
              <option value="ALL">Todos</option><option value="ACTIVO">Activo</option><option value="VIP">Top</option><option value="INACTIVO">Inactivo</option>
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none">
              <option value="ALL">Todos tipos</option><option value="AGENCIA">Agencia</option><option value="INDEPENDIENTE">Independiente</option><option value="FRANQUICIA">Franquicia</option><option value="PROMOTOR">Promotor</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
            : filtered.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">{brokers.length === 0 ? 'Sin brokers. Agrega el primero.' : 'Sin resultados.'}</div>
            : filtered.map(b => (
              <button key={b.id} onClick={() => { setSelected(b); setEditing(false); setActiveTab('perfil') }}
                className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected?.id === b.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad(b.status)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {initials(b.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm text-gray-900 truncate">{b.name}</span>
                      {b.status === 'VIP' && <span className="text-amber-500 text-xs">★</span>}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{b.company || TYPE_CONFIG[b.type]?.label} · {b.brokerProjects.length} proyecto{b.brokerProjects.length !== 1 ? 's' : ''}</div>
                    {isOverdue(b.followUpDate) && <div className="text-[10px] text-red-500 font-medium">⚠ Seguimiento atrasado</div>}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_CONFIG[b.type]?.color}`}>{TYPE_CONFIG[b.type]?.label}</span>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-center">
            <div><div className="text-5xl mb-4">🤝</div><div className="text-gray-500 font-medium">Selecciona un broker</div><div className="text-gray-400 text-sm mt-1">o agrega uno nuevo</div></div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${grad(selected.status)} flex items-center justify-center text-white text-2xl font-bold`}>{initials(selected.name)}</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[selected.status]?.color}`}>{STATUS_CONFIG[selected.status]?.label}</span>
                    </div>
                    {selected.company && <div className="text-sm font-medium text-gray-600 mt-0.5">🏢 {selected.company}</div>}
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                      {selected.phone && <span>📞 {selected.phone}</span>}
                      {selected.email && <span>✉ {selected.email}</span>}
                    </div>
                    {selected.phone && (
                      <div className="flex gap-2 mt-2">
                        <a href={toWA(selected.phone)} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors">
                          💬 WhatsApp
                        </a>
                        <a href={`tel:${selected.phone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors">
                          📞 Llamar
                        </a>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_CONFIG[selected.type]?.color}`}>{TYPE_CONFIG[selected.type]?.label}</span>
                      {selected.country && <span className="text-xs text-gray-500">📍 {selected.country}{selected.city ? `, ${selected.city}` : ''}</span>}
                      {selected.commissionPct && <span className="text-xs text-gray-500">💰 Comisión: {selected.commissionPct}%</span>}
                      {selected.licenseNumber && <span className="text-xs text-gray-500">🪪 {selected.licenseNumber}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!editing ? (
                    <>
                      <button onClick={() => { setEditing(true); setEditData({ name: selected.name, company: selected.company ?? '', phone: selected.phone ?? '', email: selected.email ?? '', country: selected.country ?? '', city: selected.city ?? '', type: selected.type, status: selected.status, licenseNumber: selected.licenseNumber ?? '', commissionPct: String(selected.commissionPct ?? 3), notes: selected.notes ?? '', followUpDate: selected.followUpDate ? selected.followUpDate.slice(0,10) : '' }) }}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Editar</button>
                      <button onClick={deleteBroker} className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50">Eliminar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300">{saving ? 'Guardando...' : 'Guardar'}</button>
                      <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg">Cancelar</button>
                    </>
                  )}
                </div>
              </div>
              {selected.followUpDate && (
                <div className={`mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${isOverdue(selected.followUpDate) ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  {isOverdue(selected.followUpDate) ? '⚠️' : '🔔'} Próximo seguimiento: {formatDate(selected.followUpDate)}{isOverdue(selected.followUpDate) && ' · ¡Atrasado!'}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
              {(['perfil', 'proyectos', 'actividad'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {tab === 'perfil' ? '👤 Perfil' : tab === 'proyectos' ? `🏗️ Proyectos (${selected.brokerProjects.length})` : `📋 Actividad (${selected.activities.length})`}
                </button>
              ))}
            </div>

            {/* PERFIL */}
            {activeTab === 'perfil' && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                {editing ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[['name','Nombre completo','text'],['company','Empresa / Agencia','text'],['phone','Teléfono','text'],['email','Email','email'],['city','Ciudad','text'],['licenseNumber','N° de licencia','text']].map(([k,label,type]) => (
                      <div key={k}>
                        <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
                        <input type={type} value={editData[k] || ''} onChange={e => setEditData(p => ({ ...p, [k]: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">País</label>
                      <select value={editData.country || ''} onChange={e => setEditData(p => ({ ...p, country: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Tipo</label>
                      <select value={editData.type || ''} onChange={e => setEditData(p => ({ ...p, type: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="AGENCIA">Agencia</option><option value="INDEPENDIENTE">Independiente</option><option value="FRANQUICIA">Franquicia</option><option value="PROMOTOR">Promotor</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Estado</label>
                      <select value={editData.status || ''} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="ACTIVO">Activo</option><option value="VIP">Top Performer ★</option><option value="INACTIVO">Inactivo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Comisión (%)</label>
                      <input type="number" step="0.5" value={editData.commissionPct || ''} onChange={e => setEditData(p => ({ ...p, commissionPct: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Próximo seguimiento</label>
                      <input type="date" value={editData.followUpDate || ''} onChange={e => setEditData(p => ({ ...p, followUpDate: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 font-medium block mb-1">Notas</label>
                      <textarea value={editData.notes || ''} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                      {[['Empresa', selected.company],['Teléfono', selected.phone],['Email', selected.email],['País', selected.country],['Ciudad', selected.city],['Tipo', TYPE_CONFIG[selected.type]?.label],['Comisión', selected.commissionPct ? `${selected.commissionPct}%` : null],['Licencia', selected.licenseNumber],['Seguimiento', selected.followUpDate ? formatDate(selected.followUpDate) : null],['Registrado', formatDate(selected.createdAt)]].map(([label, value]) => value ? (
                        <div key={label as string}><span className="text-gray-400 text-xs">{label}</span><div className="font-medium text-gray-800">{value}</div></div>
                      ) : null)}
                    </div>
                    {selected.notes && <div className="pt-3 border-t border-gray-100"><div className="text-xs text-gray-400 mb-1">Notas</div><p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.notes}</p></div>}
                  </div>
                )}
              </div>
            )}

            {/* PROYECTOS */}
            {activeTab === 'proyectos' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-700 text-sm">Proyectos que gestiona ({selected.brokerProjects.length})</h3>
                  <button onClick={() => setShowAddProj(s => !s)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">+ Agregar proyecto</button>
                </div>

                {showAddProj && (
                  <div className="bg-white rounded-xl border border-indigo-200 p-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 font-medium block mb-1">Proyecto *</label>
                        <select value={newProj.projectId} onChange={e => {
                          const p = projects.find(p => p.id === e.target.value)
                          setNewProj(prev => ({ ...prev, projectId: e.target.value, projectName: p?.name || prev.projectName }))
                        }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="">Seleccionar...</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          <option value="__otro">Otro (escribir)</option>
                        </select>
                        {(newProj.projectId === '__otro' || !newProj.projectId) && (
                          <input value={newProj.projectName} onChange={e => setNewProj(p => ({ ...p, projectName: e.target.value }))} placeholder="Nombre del proyecto"
                            className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Unidades vendidas</label>
                        <input type="number" min="0" value={newProj.unitsSold} onChange={e => setNewProj(p => ({ ...p, unitsSold: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Unidades separadas</label>
                        <input type="number" min="0" value={newProj.unitsReserved} onChange={e => setNewProj(p => ({ ...p, unitsReserved: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Comisión (%)</label>
                        <input type="number" step="0.5" value={newProj.commissionPct} onChange={e => setNewProj(p => ({ ...p, commissionPct: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowAddProj(false)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg">Cancelar</button>
                      <button onClick={addProject} disabled={saving || !newProj.projectName.trim()} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300">{saving ? '...' : 'Agregar'}</button>
                    </div>
                  </div>
                )}

                {selected.brokerProjects.length === 0 && !showAddProj && (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">No hay proyectos asignados a este broker.</div>
                )}

                {selected.brokerProjects.map(bp => (
                  <div key={bp.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl flex-shrink-0">🏗️</div>
                        <div>
                          <div className="font-medium text-gray-900">{bp.projectName}</div>
                          <div className="flex gap-4 mt-1">
                            <span className="text-sm text-green-700 font-medium">✅ {bp.unitsSold} vendidas</span>
                            <span className="text-sm text-amber-600 font-medium">🔒 {bp.unitsReserved} separadas</span>
                            {bp.commissionPct && <span className="text-sm text-gray-500">💰 {bp.commissionPct}% comisión</span>}
                          </div>
                          {bp.notes && <p className="text-xs text-gray-400 mt-1">{bp.notes}</p>}
                        </div>
                      </div>
                      <button onClick={() => deleteProject(bp.id)} className="text-gray-300 hover:text-red-400 transition-colors text-lg">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ACTIVIDAD */}
            {activeTab === 'actividad' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-700 text-sm">Historial de contacto</h3>
                  <button onClick={() => setShowAddAct(s => !s)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">+ Registrar contacto</button>
                </div>
                {showAddAct && (
                  <div className="bg-white rounded-xl border border-indigo-200 p-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Tipo</label>
                        <select value={newAct.type} onChange={e => setNewAct(p => ({ ...p, type: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          {Object.entries(ACT_ICONS).map(([k,icon]) => <option key={k} value={k}>{icon} {k === 'INFO_ENVIADA' ? 'Info enviada' : k.charAt(0)+k.slice(1).toLowerCase()}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Fecha</label>
                        <input type="datetime-local" value={newAct.date} onChange={e => setNewAct(p => ({ ...p, date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 font-medium block mb-1">Descripción *</label>
                        <textarea value={newAct.description} onChange={e => setNewAct(p => ({ ...p, description: e.target.value }))} placeholder="Ej: Enviamos brochure de Volcancito y precios actualizados." rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowAddAct(false)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg">Cancelar</button>
                      <button onClick={addActivity} disabled={saving || !newAct.description.trim()} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300">{saving ? '...' : 'Registrar'}</button>
                    </div>
                  </div>
                )}
                {selected.activities.length === 0 && !showAddAct && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">Sin actividades registradas.</div>}
                <div className="space-y-2">
                  {selected.activities.map(act => (
                    <div key={act.id} className="bg-white rounded-xl border border-gray-200 p-3 flex gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-lg flex-shrink-0">{ACT_ICONS[act.type] || '📌'}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-gray-600">{act.type === 'INFO_ENVIADA' ? 'Info enviada' : act.type.charAt(0)+act.type.slice(1).toLowerCase()}</span>
                          <span className="text-xs text-gray-400">{daysAgo(act.date)} · {new Date(act.date).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <p className="text-sm text-gray-800 mt-0.5">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL NUEVO BROKER */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900 mb-4">Nuevo broker externo</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 font-medium block mb-1">Nombre *</label>
                <input value={newBroker.name} onChange={e => setNewBroker(p => ({ ...p, name: e.target.value }))} placeholder="Carlos Méndez"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 font-medium block mb-1">Empresa / Agencia</label>
                <input value={newBroker.company} onChange={e => setNewBroker(p => ({ ...p, company: e.target.value }))} placeholder="RE/MAX Panamá"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Teléfono</label>
                <input value={newBroker.phone} onChange={e => setNewBroker(p => ({ ...p, phone: e.target.value }))} placeholder="+507 6000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Email</label>
                <input type="email" value={newBroker.email} onChange={e => setNewBroker(p => ({ ...p, email: e.target.value }))} placeholder="broker@email.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">País</label>
                <select value={newBroker.country} onChange={e => setNewBroker(p => ({ ...p, country: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Tipo</label>
                <select value={newBroker.type} onChange={e => setNewBroker(p => ({ ...p, type: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="AGENCIA">Agencia</option><option value="INDEPENDIENTE">Independiente</option><option value="FRANQUICIA">Franquicia</option><option value="PROMOTOR">Promotor</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Estado</label>
                <select value={newBroker.status} onChange={e => setNewBroker(p => ({ ...p, status: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="ACTIVO">Activo</option><option value="VIP">Top Performer ★</option><option value="INACTIVO">Inactivo</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Comisión (%)</label>
                <input type="number" step="0.5" value={newBroker.commissionPct} onChange={e => setNewBroker(p => ({ ...p, commissionPct: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={createBroker} disabled={saving || !newBroker.name.trim()} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300">{saving ? 'Creando...' : 'Crear broker'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
