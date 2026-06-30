'use client'

import { useState } from 'react'
import '@/lib/utils'

interface Broker {
  id: string
  name: string
  company: string | null
  phone: string | null
  email: string | null
  commissionPct: number | null
  soldUnits: number
  reservedUnits: number
  status: string
  notes: string | null
}

interface Props {
  projectId: string
  initialBrokers: Broker[]
  totalUnits: number
  priceMin: number
  priceMax: number
  currency: string
}

const EMPTY_FORM = {
  name: '',
  company: '',
  phone: '',
  email: '',
  commissionPct: '3',
  soldUnits: '0',
  reservedUnits: '0',
  status: 'ACTIVO',
  notes: '',
}

export default function BrokersSection({ projectId, initialBrokers, priceMin, priceMax, currency }: Props) {
  const [brokers, setBrokers] = useState<Broker[]>(initialBrokers)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Broker | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const avgPrice = (priceMin + priceMax) / 2

  const totalSoldByBrokers = brokers.reduce((s, b) => s + b.soldUnits, 0)
  const totalReservedByBrokers = brokers.reduce((s, b) => s + b.reservedUnits, 0)
  const totalCommissions = brokers.reduce((s, b) => {
    const sales = b.soldUnits * avgPrice
    return s + sales * ((b.commissionPct ?? 3) / 100)
  }, 0)

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(b: Broker) {
    setEditing(b)
    setForm({
      name: b.name,
      company: b.company ?? '',
      phone: b.phone ?? '',
      email: b.email ?? '',
      commissionPct: String(b.commissionPct ?? 3),
      soldUnits: String(b.soldUnits),
      reservedUnits: String(b.reservedUnits),
      status: b.status,
      notes: b.notes ?? '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/brokers/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            commissionPct: Number(form.commissionPct),
            soldUnits: Number(form.soldUnits),
            reservedUnits: Number(form.reservedUnits),
          }),
        })
        const updated = await res.json()
        setBrokers(prev => prev.map(b => b.id === editing.id ? updated : b))
      } else {
        const res = await fetch(`/api/projects/${projectId}/brokers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            commissionPct: Number(form.commissionPct),
            soldUnits: Number(form.soldUnits),
            reservedUnits: Number(form.reservedUnits),
          }),
        })
        const created = await res.json()
        setBrokers(prev => [...prev, created])
      }
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este broker?')) return
    await fetch(`/api/brokers/${id}`, { method: 'DELETE' })
    setBrokers(prev => prev.filter(b => b.id !== id))
  }

  return (
    <div className="mt-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏡</span>
          <h2 className="text-lg font-bold text-gray-900">Bienes Raíces Externos</h2>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
            {brokers.length} broker{brokers.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span> Agregar broker
        </button>
      </div>

      {/* Summary KPIs */}
      {brokers.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Brokers activos', value: brokers.filter(b => b.status === 'ACTIVO').length, icon: '👥', color: 'text-blue-600' },
            { label: 'Unidades vendidas', value: totalSoldByBrokers, icon: '✅', color: 'text-green-600' },
            { label: 'Unidades reservadas', value: totalReservedByBrokers, icon: '🔒', color: 'text-yellow-600' },
            { label: 'Total unidades', value: totalSoldByBrokers + totalReservedByBrokers, icon: '📊', color: 'text-purple-600' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{k.icon}</span>
                <span className="text-xs text-gray-500">{k.label}</span>
              </div>
              <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {brokers.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🏡</div>
            <p className="text-gray-500 font-medium">No hay brokers externos registrados</p>
            <p className="text-sm text-gray-400 mt-1">Agrega inmobiliarias o asesores externos que venden este proyecto</p>
            <button
              onClick={openNew}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              + Agregar primer broker
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Broker / Empresa</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Contacto</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Vendidas</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Reservadas</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Participación</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Resultado</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brokers.map(b => {
                const pct = totalSoldByBrokers > 0 ? Math.round((b.soldUnits / totalSoldByBrokers) * 100) : 0
                const commission = b.soldUnits * avgPrice * ((b.commissionPct ?? 3) / 100)
                const initials = b.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                return (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">{b.name}</div>
                          {b.company && <div className="text-xs text-gray-500">{b.company}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-gray-600 space-y-0.5">
                        {b.phone && <div>📞 {b.phone}</div>}
                        {b.email && <div>✉️ {b.email}</div>}
                        {!b.phone && !b.email && <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-green-600 text-sm">{b.soldUnits}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-yellow-600 text-sm">{b.reservedUnits}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-gray-700">{pct}%</span>
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="text-xs text-gray-700">
                        <div className="font-semibold">{b.soldUnits + b.reservedUnits} uds</div>
                        <div className="text-gray-400">vendidas + reservadas</div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        b.status === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {b.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(b)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          🗑️
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editing ? 'Editar broker' : 'Agregar broker externo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre del asesor / broker *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: María González"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Empresa / Inmobiliaria</label>
                  <input
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Remax, Coldwell Banker, independiente..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Teléfono</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+507 6000-0000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                  <input
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="broker@correo.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unidades vendidas</label>
                  <input
                    type="number"
                    min="0"
                    value={form.soldUnits}
                    onChange={e => setForm(f => ({ ...f, soldUnits: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unidades reservadas</label>
                  <input
                    type="number"
                    min="0"
                    value={form.reservedUnits}
                    onChange={e => setForm(f => ({ ...f, reservedUnits: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={form.commissionPct}
                    onChange={e => setForm(f => ({ ...f, commissionPct: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Estado</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas internas</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Zona que trabaja, tipo de cliente, acuerdos especiales..."
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 pt-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar broker'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
