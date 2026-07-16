'use client'

import { useState, useEffect, useCallback } from 'react'

interface Activity { id: string; type: string; description: string; date: string }
interface Property { id: string; projectName: string; unitNumber: string | null; status: string; price: number | null; purchaseDate: string | null; notes: string | null; project?: { id: string; name: string; type: string } | null }
interface Investor {
  id: string; name: string; email: string | null; phone: string | null
  country: string | null; city: string | null; type: string; status: string
  budget: number | null; notes: string | null; followUpDate: string | null
  createdAt: string; properties: Property[]; activities: Activity[]
  _count?: { properties: number; activities: number }
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  COMPRADOR:     { label: 'Comprador',     color: 'bg-blue-100 text-blue-700' },
  INVERSOR:      { label: 'Inversor',      color: 'bg-purple-100 text-purple-700' },
  DESARROLLADOR: { label: 'Desarrollador', color: 'bg-orange-100 text-orange-700' },
  BROKER:        { label: 'Broker',        color: 'bg-teal-100 text-teal-700' },
}
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  ACTIVO:  { label: 'Activo',  color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  VIP:     { label: 'VIP',     color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  INACTIVO:{ label: 'Inactivo',color: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
}
const PROP_STATUS: Record<string, { label: string; color: string }> = {
  RESERVADO:   { label: 'Reservado',   color: 'bg-amber-100 text-amber-700' },
  CPP:         { label: 'CPP',         color: 'bg-orange-100 text-orange-700' },
  PROMESA:     { label: 'Promesa',     color: 'bg-blue-100 text-blue-700' },
  ESCRITURADO: { label: 'Escriturado', color: 'bg-green-100 text-green-700' },
}
const ACT_ICONS: Record<string, string> = {
  LLAMADA: '📞', WHATSAPP: '💬', EMAIL: '📧', VISITA: '🏠', NOTA: '📝', REUNION: '🤝',
}

const COUNTRIES = ['Panamá','Estados Unidos','Colombia','Venezuela','Argentina','Chile','México','España','Canadá','China','Alemania','Francia','Otro']

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatMoney(n: number) {
  return '$' + n.toLocaleString('en-US')
}
function daysAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'ayer'
  return `hace ${diff}d`
}
function isOverdue(d: string | null) {
  if (!d) return false
  return new Date(d) < new Date()
}

export default function InversoresClient({ projects }: { projects: { id: string; name: string; type: string }[] }) {
  const [investors, setInvestors] = useState<Investor[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Investor | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [showNew, setShowNew] = useState(false)
  const [activeTab, setActiveTab] = useState<'perfil' | 'propiedades' | 'actividad'>('perfil')

  // Forms state
  const [newInv, setNewInv] = useState({ name: '', phone: '', email: '', country: 'Panamá', city: '', type: 'COMPRADOR', status: 'ACTIVO', budget: '', notes: '' })
  const [saving, setSaving] = useState(false)

  // Property form
  const [showAddProp, setShowAddProp] = useState(false)
  const [newProp, setNewProp] = useState({ projectId: '', projectName: '', unitNumber: '', status: 'RESERVADO', price: '', purchaseDate: '', notes: '' })

  // Activity form
  const [showAddAct, setShowAddAct] = useState(false)
  const [newAct, setNewAct] = useState({ type: 'LLAMADA', description: '', date: new Date().toISOString().slice(0, 16) })

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Record<string, string | null>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/inversores')
    setInvestors(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = investors.filter(inv => {
    if (filterStatus !== 'ALL' && inv.status !== filterStatus) return false
    if (filterType !== 'ALL' && inv.type !== filterType) return false
    if (search) {
      const s = search.toLowerCase()
      if (!inv.name.toLowerCase().includes(s) && !(inv.phone || '').includes(s) && !(inv.country || '').toLowerCase().includes(s)) return false
    }
    return true
  })

  const stats = {
    total: investors.length,
    vip: investors.filter(i => i.status === 'VIP').length,
    overdue: investors.filter(i => isOverdue(i.followUpDate)).length,
    totalInvested: investors.reduce((sum, i) => sum + i.properties.reduce((s, p) => s + (p.price || 0), 0), 0),
  }

  async function createInvestor() {
    if (!newInv.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/inversores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newInv) })
    const inv = await res.json()
    setInvestors(prev => [{ ...inv, properties: [], activities: [], _count: { properties: 0, activities: 0 } }, ...prev])
    setNewInv({ name: '', phone: '', email: '', country: 'Panamá', city: '', type: 'COMPRADOR', status: 'ACTIVO', budget: '', notes: '' })
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
    setInvestors(prev => prev.map(i => i.id === selected.id ? { ...i, ...updated } : i))
    setEditing(false)
    setSaving(false)
  }

  async function addProperty() {
    if (!selected || !newProp.projectName.trim()) return
    setSaving(true)
    const payload = {
      _action: 'add_property',
      projectId: newProp.projectId || null,
      projectName: newProp.projectName,
      unitNumber: newProp.unitNumber || null,
      status: newProp.status,
      price: newProp.price || null,
      purchaseDate: newProp.purchaseDate || null,
      notes: newProp.notes || null,
    }
    const res = await fetch(`/api/inversores/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const prop = await res.json()
    const updated = { ...selected, properties: [prop, ...selected.properties] }
    setSelected(updated)
    setInvestors(prev => prev.map(i => i.id === selected.id ? { ...i, properties: [prop, ...i.properties] } : i))
    setNewProp({ projectId: '', projectName: '', unitNumber: '', status: 'RESERVADO', price: '', purchaseDate: '', notes: '' })
    setShowAddProp(false)
    setSaving(false)
  }

  async function deleteProp(propertyId: string) {
    if (!selected || !confirm('¿Eliminar esta propiedad?')) return
    await fetch(`/api/inversores/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'delete_property', propertyId }) })
    const updated = { ...selected, properties: selected.properties.filter(p => p.id !== propertyId) }
    setSelected(updated)
    setInvestors(prev => prev.map(i => i.id === selected.id ? { ...i, properties: updated.properties } : i))
  }

  async function addActivity() {
    if (!selected || !newAct.description.trim()) return
    setSaving(true)
    const res = await fetch(`/api/inversores/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'add_activity', ...newAct }) })
    const act = await res.json()
    const updated = { ...selected, activities: [act, ...selected.activities] }
    setSelected(updated)
    setNewAct({ type: 'LLAMADA', description: '', date: new Date().toISOString().slice(0, 16) })
    setShowAddAct(false)
    setSaving(false)
  }

  async function deleteInvestor() {
    if (!selected || !confirm(`¿Eliminar a ${selected.name}? Esta acción no se puede deshacer.`)) return
    await fetch(`/api/inversores/${selected.id}`, { method: 'DELETE' })
    setInvestors(prev => prev.filter(i => i.id !== selected.id))
    setSelected(null)
  }

  const avatarGradient = (status: string) =>
    status === 'VIP' ? 'from-amber-400 to-orange-500' : 'from-blue-500 to-indigo-600'

  return (
    <div className="flex h-full">
      {/* LEFT PANEL */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        {/* Stats */}
        <div className="p-4 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: 'Total', value: stats.total, color: 'text-gray-900' },
              { label: 'VIP', value: stats.vip, color: 'text-amber-600' },
              { label: 'Seg. atrasados', value: stats.overdue, color: stats.overdue > 0 ? 'text-red-600' : 'text-gray-400' },
              { label: 'Total invertido', value: stats.totalInvested > 0 ? formatMoney(stats.totalInvested) : '—', color: 'text-green-600' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Nuevo inversor
          </button>
        </div>

        {/* Search & filters */}
        <div className="p-3 border-b border-gray-100 space-y-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono, país..."
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none">
              <option value="ALL">Todos</option>
              <option value="ACTIVO">Activo</option>
              <option value="VIP">VIP</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none">
              <option value="ALL">Todos tipos</option>
              <option value="COMPRADOR">Comprador</option>
              <option value="INVERSOR">Inversor</option>
              <option value="DESARROLLADOR">Desarrollador</option>
              <option value="BROKER">Broker</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              {investors.length === 0 ? 'No hay inversores. Agrega el primero.' : 'No hay resultados.'}
            </div>
          ) : (
            filtered.map(inv => (
              <button
                key={inv.id}
                onClick={() => { setSelected(inv); setEditing(false); setActiveTab('perfil') }}
                className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected?.id === inv.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(inv.status)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {initials(inv.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-gray-900 truncate">{inv.name}</span>
                      {inv.status === 'VIP' && <span className="text-amber-500 text-xs">★</span>}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {inv.country}{inv.city ? ` · ${inv.city}` : ''} · {inv.properties.length} propiedad{inv.properties.length !== 1 ? 'es' : ''}
                    </div>
                    {isOverdue(inv.followUpDate) && (
                      <div className="text-[10px] text-red-500 font-medium">⚠ Seguimiento atrasado</div>
                    )}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TYPE_CONFIG[inv.type]?.color}`}>
                    {TYPE_CONFIG[inv.type]?.label}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="text-5xl mb-4">🏢</div>
              <div className="text-gray-500 font-medium">Selecciona un inversor</div>
              <div className="text-gray-400 text-sm mt-1">o agrega uno nuevo desde el panel izquierdo</div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${avatarGradient(selected.status)} flex items-center justify-center text-white text-2xl font-bold`}>
                    {initials(selected.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[selected.status]?.color}`}>
                        {STATUS_CONFIG[selected.status]?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      {selected.phone && <span>📞 {selected.phone}</span>}
                      {selected.email && <span>✉ {selected.email}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_CONFIG[selected.type]?.color}`}>
                        {TYPE_CONFIG[selected.type]?.label}
                      </span>
                      {selected.country && <span className="text-xs text-gray-500">📍 {selected.country}{selected.city ? `, ${selected.city}` : ''}</span>}
                      {selected.budget && <span className="text-xs text-gray-500">💰 Presupuesto: {formatMoney(selected.budget)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!editing ? (
                    <>
                      <button onClick={() => { setEditing(true); setEditData({ name: selected.name, phone: selected.phone ?? '', email: selected.email ?? '', country: selected.country ?? '', city: selected.city ?? '', type: selected.type, status: selected.status, budget: selected.budget != null ? String(selected.budget) : '', notes: selected.notes ?? '', followUpDate: selected.followUpDate ? selected.followUpDate.slice(0,10) : '' }) }}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        Editar
                      </button>
                      <button onClick={deleteInvestor} className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                        Eliminar
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors">
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Follow-up badge */}
              {selected.followUpDate && (
                <div className={`mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${isOverdue(selected.followUpDate) ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  {isOverdue(selected.followUpDate) ? '⚠️' : '🔔'} Seguimiento: {formatDate(selected.followUpDate)}
                  {isOverdue(selected.followUpDate) && ' · ¡Atrasado!'}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
              {(['perfil', 'propiedades', 'actividad'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {tab === 'perfil' ? '👤 Perfil' : tab === 'propiedades' ? `🏠 Propiedades (${selected.properties.length})` : `📋 Actividad (${selected.activities.length})`}
                </button>
              ))}
            </div>

            {/* PERFIL TAB */}
            {activeTab === 'perfil' && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                {editing ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Nombre completo', key: 'name', type: 'text' },
                      { label: 'Teléfono', key: 'phone', type: 'text' },
                      { label: 'Email', key: 'email', type: 'email' },
                      { label: 'Ciudad', key: 'city', type: 'text' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs text-gray-500 font-medium block mb-1">{f.label}</label>
                        <input type={f.type} value={(editData as Record<string, string>)[f.key] || ''} onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">País</label>
                      <select value={editData.country || ''} onChange={e => setEditData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Tipo</label>
                      <select value={editData.type || ''} onChange={e => setEditData(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="COMPRADOR">Comprador</option>
                        <option value="INVERSOR">Inversor</option>
                        <option value="DESARROLLADOR">Desarrollador</option>
                        <option value="BROKER">Broker</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Estado</label>
                      <select value={editData.status || ''} onChange={e => setEditData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="ACTIVO">Activo</option>
                        <option value="VIP">VIP</option>
                        <option value="INACTIVO">Inactivo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Presupuesto ($)</label>
                      <input type="number" value={(editData as Record<string, string>).budget || ''} onChange={e => setEditData(prev => ({ ...prev, budget: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Próximo seguimiento</label>
                      <input type="date" value={(editData as Record<string, string>).followUpDate || ''} onChange={e => setEditData(prev => ({ ...prev, followUpDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 font-medium block mb-1">Notas</label>
                      <textarea value={(editData as Record<string, string>).notes || ''} onChange={e => setEditData(prev => ({ ...prev, notes: e.target.value }))} rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                      {[
                        { label: 'Teléfono', value: selected.phone },
                        { label: 'Email', value: selected.email },
                        { label: 'País', value: selected.country },
                        { label: 'Ciudad', value: selected.city },
                        { label: 'Tipo', value: TYPE_CONFIG[selected.type]?.label },
                        { label: 'Presupuesto', value: selected.budget ? formatMoney(selected.budget) : null },
                        { label: 'Seguimiento', value: selected.followUpDate ? formatDate(selected.followUpDate) : null },
                        { label: 'Registrado', value: formatDate(selected.createdAt) },
                      ].map(f => f.value ? (
                        <div key={f.label}>
                          <span className="text-gray-400 text-xs">{f.label}</span>
                          <div className="font-medium text-gray-800">{f.value}</div>
                        </div>
                      ) : null)}
                    </div>
                    {selected.notes && (
                      <div className="pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">Notas</div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PROPIEDADES TAB */}
            {activeTab === 'propiedades' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-700 text-sm">Propiedades ({selected.properties.length})</h3>
                  <button onClick={() => setShowAddProp(s => !s)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    + Agregar propiedad
                  </button>
                </div>

                {showAddProp && (
                  <div className="bg-white rounded-xl border border-indigo-200 p-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Proyecto *</label>
                        <select value={newProp.projectId} onChange={e => {
                          const proj = projects.find(p => p.id === e.target.value)
                          setNewProp(prev => ({ ...prev, projectId: e.target.value, projectName: proj?.name || prev.projectName }))
                        }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="">Seleccionar proyecto...</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          <option value="__otro">Otro (escribir abajo)</option>
                        </select>
                      </div>
                      {(newProp.projectId === '__otro' || !newProp.projectId) && (
                        <div>
                          <label className="text-xs text-gray-500 font-medium block mb-1">Nombre del proyecto *</label>
                          <input value={newProp.projectName} onChange={e => setNewProp(prev => ({ ...prev, projectName: e.target.value }))} placeholder="Ej: Torre Pacífica"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">N° Unidad / Lote</label>
                        <input value={newProp.unitNumber} onChange={e => setNewProp(prev => ({ ...prev, unitNumber: e.target.value }))} placeholder="Ej: 12, A-101"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Estado</label>
                        <select value={newProp.status} onChange={e => setNewProp(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="RESERVADO">Reservado</option>
                          <option value="CPP">CPP</option>
                          <option value="PROMESA">Promesa</option>
                          <option value="ESCRITURADO">Escriturado</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Precio ($)</label>
                        <input type="number" value={newProp.price} onChange={e => setNewProp(prev => ({ ...prev, price: e.target.value }))} placeholder="275000"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Fecha de compra</label>
                        <input type="date" value={newProp.purchaseDate} onChange={e => setNewProp(prev => ({ ...prev, purchaseDate: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowAddProp(false)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg">Cancelar</button>
                      <button onClick={addProperty} disabled={saving || !newProp.projectName.trim()}
                        className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300">
                        {saving ? 'Guardando...' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                )}

                {selected.properties.length === 0 && !showAddProp && (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
                    No hay propiedades registradas para este inversor.
                  </div>
                )}

                {selected.properties.map(prop => (
                  <div key={prop.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl flex-shrink-0">🏗️</div>
                        <div>
                          <div className="font-medium text-gray-900">{prop.projectName}</div>
                          {prop.unitNumber && <div className="text-sm text-gray-500">Unidad / Lote: {prop.unitNumber}</div>}
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROP_STATUS[prop.status]?.color}`}>{PROP_STATUS[prop.status]?.label}</span>
                            {prop.price && <span className="text-sm font-medium text-green-700">{formatMoney(prop.price)}</span>}
                            {prop.purchaseDate && <span className="text-xs text-gray-400">{formatDate(prop.purchaseDate)}</span>}
                          </div>
                          {prop.notes && <p className="text-xs text-gray-500 mt-1">{prop.notes}</p>}
                        </div>
                      </div>
                      <button onClick={() => deleteProp(prop.id)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ACTIVIDAD TAB */}
            {activeTab === 'actividad' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-700 text-sm">Historial de contacto</h3>
                  <button onClick={() => setShowAddAct(s => !s)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    + Registrar toque
                  </button>
                </div>

                {showAddAct && (
                  <div className="bg-white rounded-xl border border-indigo-200 p-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Tipo</label>
                        <select value={newAct.type} onChange={e => setNewAct(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          {Object.entries(ACT_ICONS).map(([k, icon]) => <option key={k} value={k}>{icon} {k.charAt(0) + k.slice(1).toLowerCase()}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Fecha y hora</label>
                        <input type="datetime-local" value={newAct.date} onChange={e => setNewAct(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 font-medium block mb-1">Descripción *</label>
                        <textarea value={newAct.description} onChange={e => setNewAct(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Ej: Llamada para actualizar sobre avance del proyecto. Interesado en segunda unidad." rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowAddAct(false)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg">Cancelar</button>
                      <button onClick={addActivity} disabled={saving || !newAct.description.trim()}
                        className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300">
                        {saving ? 'Guardando...' : 'Registrar'}
                      </button>
                    </div>
                  </div>
                )}

                {selected.activities.length === 0 && !showAddAct && (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
                    Sin actividades. Registra el primer toque.
                  </div>
                )}

                <div className="space-y-2">
                  {selected.activities.map(act => (
                    <div key={act.id} className="bg-white rounded-xl border border-gray-200 p-3 flex gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                        {ACT_ICONS[act.type] || '📌'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-gray-600">{act.type.charAt(0) + act.type.slice(1).toLowerCase()}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">{daysAgo(act.date)} · {new Date(act.date).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })}</span>
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

      {/* NEW INVESTOR MODAL */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900 mb-4">Nuevo inversor</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 font-medium block mb-1">Nombre completo *</label>
                <input value={newInv.name} onChange={e => setNewInv(p => ({ ...p, name: e.target.value }))} placeholder="Juan Pérez"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Teléfono</label>
                <input value={newInv.phone} onChange={e => setNewInv(p => ({ ...p, phone: e.target.value }))} placeholder="+507 6000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Email</label>
                <input type="email" value={newInv.email} onChange={e => setNewInv(p => ({ ...p, email: e.target.value }))} placeholder="juan@email.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">País</label>
                <select value={newInv.country} onChange={e => setNewInv(p => ({ ...p, country: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Ciudad</label>
                <input value={newInv.city} onChange={e => setNewInv(p => ({ ...p, city: e.target.value }))} placeholder="Ciudad de Panamá"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Tipo</label>
                <select value={newInv.type} onChange={e => setNewInv(p => ({ ...p, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="COMPRADOR">Comprador</option>
                  <option value="INVERSOR">Inversor</option>
                  <option value="DESARROLLADOR">Desarrollador</option>
                  <option value="BROKER">Broker</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Estado</label>
                <select value={newInv.status} onChange={e => setNewInv(p => ({ ...p, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="ACTIVO">Activo</option>
                  <option value="VIP">VIP</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 font-medium block mb-1">Notas iniciales</label>
                <textarea value={newInv.notes} onChange={e => setNewInv(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={createInvestor} disabled={saving || !newInv.name.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300">
                {saving ? 'Creando...' : 'Crear inversor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
