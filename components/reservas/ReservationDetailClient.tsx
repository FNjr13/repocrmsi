'use client'

import { useState } from 'react'
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
  priceMin: number
  priceMax: number
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
  notes: string | null
  dueDate: string | null
  createdAt: string
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

const STAGES = ['RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGADO', 'CAIDA']
const STAGE_LABELS: Record<string, string> = {
  RESERVA: 'Reserva', PROMESA: 'Promesa', ESCRITURA: 'Escritura', ENTREGADO: 'Entregado', CAIDA: 'Caída',
}

const DOC_STATUS_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-gray-100 text-gray-600 border-gray-200',
  SUBIDO: 'bg-blue-100 text-blue-700 border-blue-200',
  FIRMADO: 'bg-green-100 text-green-700 border-green-200',
  VENCIDO: 'bg-red-100 text-red-700 border-red-200',
}


function formatCurrency(amount: number, currency: string): string {
  if (currency === 'UF') return `UF ${amount.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  if (currency === 'CLP') return `$${Math.round(amount).toLocaleString('es-CL')}`
  return `USD ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
}

interface AddDocModalProps {
  onClose: () => void
  onAdd: (doc: { name: string; type: string; dueDate: string; notes: string }) => void
}

function AddDocModal({ onClose, onAdd }: AddDocModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState('OTRO')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-5">Agregar documento</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nombre</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Contrato firmado"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Tipo</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              <option value="RESERVA">Reserva</option>
              <option value="PROMESA">Promesa</option>
              <option value="ESCRITURA">Escritura</option>
              <option value="CONTRATO">Contrato</option>
              <option value="HIPOTECA">Hipoteca</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Fecha límite (opcional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Notas</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => { if (name) { onAdd({ name, type, dueDate, notes }); onClose() } }}
            disabled={!name}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReservationDetailClient({ reservation: initial }: { reservation: Reservation }) {
  const [r, setR] = useState(initial)
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editNotes, setEditNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(r.notes || '')

  const patch = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/reservations/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const updated = await res.json()
      setR(updated)
    } finally {
      setSaving(false)
    }
  }

  const updateDocStatus = async (docId: string, status: string) => {
    await patch({ updateDocument: { id: docId, status } })
  }

  const addDocument = async (doc: { name: string; type: string; dueDate: string; notes: string }) => {
    await patch({ addDocument: doc })
  }

  const commission = r.price * r.commissionPct / 100
  const docsTotal = r.documents.length
  const docsDone = r.documents.filter(d => d.status === 'SUBIDO' || d.status === 'FIRMADO').length
  const docsProgress = docsTotal > 0 ? Math.round((docsDone / docsTotal) * 100) : 0

  // Stage progress bar
  const activeStages = STAGES.filter(s => s !== 'CAIDA')
  const stageIdx = activeStages.indexOf(r.stage)
  const stageProgress = r.stage === 'CAIDA' ? 0 : ((stageIdx + 1) / activeStages.length) * 100

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link href="/reservas" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Reservas
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">
          {r.lead.firstName} {r.lead.lastName} — {r.project.name}
        </span>
        {saving && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-600">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Guardando...
          </span>
        )}
      </div>

      {/* Stage progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Estado del proceso</h2>
          <div className="flex items-center gap-3">
            <select
              value={r.stage}
              onChange={e => patch({ stage: e.target.value })}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium"
            >
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        {r.stage !== 'CAIDA' ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              {activeStages.map((s, i) => (
                <div key={s} className="flex flex-col items-center gap-1.5 flex-1">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                    i <= stageIdx
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {i < stageIdx ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${i <= stageIdx ? 'text-blue-600' : 'text-gray-400'}`}>
                    {STAGE_LABELS[s]}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden -mt-8 mx-4">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${stageProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <span className="text-2xl">❌</span>
            <div>
              <p className="text-sm font-semibold text-red-700">Reserva caída</p>
              <p className="text-xs text-red-500">Esta reserva fue cancelada</p>
            </div>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left - Main info */}
        <div className="col-span-2 space-y-5">
          {/* Client & Property */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Información general</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Cliente</p>
                <Link href={`/crm/${r.lead.id}`} className="text-base font-semibold text-blue-600 hover:underline">
                  {r.lead.firstName} {r.lead.lastName}
                </Link>
                <p className="text-sm text-gray-500 mt-0.5">{r.lead.phone}</p>
                {r.lead.email && <p className="text-sm text-gray-400">{r.lead.email}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Proyecto</p>
                <p className="text-base font-semibold text-gray-900">{r.project.name}</p>
                {r.unitNumber && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    Unidad {r.unitNumber}
                    {r.unitType ? ` (${r.unitType})` : ''}
                    {r.floor ? ` · Piso ${r.floor}` : ''}
                    {r.area ? ` · ${r.area}m²` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 mt-5 pt-5 grid grid-cols-3 gap-4">
              {[
                { label: 'Precio', value: formatCurrency(r.price, r.currency) },
                { label: 'Monto reserva', value: r.reserveAmount ? formatCurrency(r.reserveAmount, r.currency) : '—' },
                { label: 'Asesor', value: r.agent?.name || 'Sin asignar' },
                { label: 'Fecha reserva', value: formatDate(r.reserveDate) },
                { label: 'Fecha promesa', value: formatDate(r.promiseDate) },
                { label: 'Fecha escritura', value: formatDate(r.closingDate) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Documents checklist */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Documentación</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${docsProgress}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{docsDone}/{docsTotal} completados</span>
                </div>
              </div>
              <button
                onClick={() => setShowAddDoc(true)}
                className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar
              </button>
            </div>

            <div className="space-y-2">
              {r.documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => {
                      const cycle = ['PENDIENTE', 'SUBIDO', 'FIRMADO', 'VENCIDO']
                      const next = cycle[(cycle.indexOf(doc.status) + 1) % cycle.length]
                      updateDocStatus(doc.id, next)
                    }}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs flex-shrink-0 transition-colors ${DOC_STATUS_COLORS[doc.status] || DOC_STATUS_COLORS.PENDIENTE}`}
                  >
                    {doc.status === 'SUBIDO' || doc.status === 'FIRMADO' ? '✓' : ''}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{doc.name}</p>
                    {doc.notes && <p className="text-xs text-gray-400 mt-0.5">{doc.notes}</p>}
                    {doc.dueDate && (
                      <p className="text-xs text-amber-500 mt-0.5">Vence: {formatDate(doc.dueDate)}</p>
                    )}
                  </div>
                  <select
                    value={doc.status}
                    onChange={e => updateDocStatus(doc.id, e.target.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium focus:outline-none cursor-pointer ${DOC_STATUS_COLORS[doc.status]}`}
                  >
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="SUBIDO">Subido</option>
                    <option value="FIRMADO">Firmado</option>
                    <option value="VENCIDO">Vencido</option>
                  </select>
                </div>
              ))}
              {r.documents.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <p className="text-3xl mb-2">📄</p>
                  <p>No hay documentos registrados</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Notas internas</h3>
              <button
                onClick={() => setEditNotes(!editNotes)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {editNotes ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            {editNotes ? (
              <div className="space-y-3">
                <textarea
                  value={notesValue}
                  onChange={e => setNotesValue(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  placeholder="Agrega notas sobre esta reserva..."
                />
                <button
                  onClick={() => { patch({ notes: notesValue }); setEditNotes(false) }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
                >
                  Guardar notas
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">
                {r.notes || <span className="text-gray-400 italic">Sin notas</span>}
              </p>
            )}
          </div>
        </div>

        {/* Right sidebar - Commission */}
        <div className="space-y-5">
          {/* Commission card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg p-5 text-white">
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-1">Comisión estimada</p>
            <p className="text-3xl font-bold">{formatCurrency(commission, r.currency)}</p>
            <p className="text-blue-200 text-sm mt-1">{r.commissionPct}% de {formatCurrency(r.price, r.currency)}</p>

            <div className="mt-4 pt-4 border-t border-blue-500/40">
              <p className="text-blue-200 text-xs mb-2">Estado comisión</p>
              <select
                value={r.commissionStatus}
                onChange={e => patch({ commissionStatus: e.target.value })}
                className="w-full bg-white/20 text-white border border-white/30 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none cursor-pointer"
              >
                <option value="PENDIENTE" className="text-gray-800">⏳ Pendiente</option>
                <option value="APROBADA" className="text-gray-800">✅ Aprobada</option>
                <option value="PAGADA" className="text-gray-800">💰 Pagada</option>
              </select>
            </div>
          </div>

          {/* Key dates */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">Fechas clave</h3>
            <div className="space-y-3">
              {[
                { label: 'Reserva', value: r.reserveDate, field: 'reserveDate', color: 'text-blue-600' },
                { label: 'Promesa', value: r.promiseDate, field: 'promiseDate', color: 'text-violet-600' },
                { label: 'Escritura', value: r.closingDate, field: 'closingDate', color: 'text-amber-600' },
                { label: 'Entrega', value: r.deliveryDate, field: 'deliveryDate', color: 'text-green-600' },
              ].map(({ label, value, field, color }) => (
                <div key={field} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{label}</span>
                  <input
                    type="date"
                    defaultValue={value ? value.split('T')[0] : ''}
                    onChange={e => patch({ [field]: e.target.value })}
                    className={`text-xs font-medium ${color} border-0 bg-transparent focus:outline-none cursor-pointer`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Resumen financiero</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Precio venta</span>
                <span className="font-semibold text-gray-900">{formatCurrency(r.price, r.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monto reserva</span>
                <span className="font-medium text-gray-700">{r.reserveAmount ? formatCurrency(r.reserveAmount, r.currency) : '—'}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
                <span className="text-gray-500">Comisión ({r.commissionPct}%)</span>
                <span className="font-bold text-green-600">{formatCurrency(commission, r.currency)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <a
              href={`https://wa.me/${r.lead.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 w-full px-4 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors"
            >
              <span>💬</span> WhatsApp al cliente
            </a>
            <Link
              href={`/crm/${r.lead.id}`}
              className="flex items-center gap-2.5 w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors"
            >
              <span>👤</span> Ver ficha del lead
            </Link>
          </div>
        </div>
      </div>

      {showAddDoc && <AddDocModal onClose={() => setShowAddDoc(false)} onAdd={addDocument} />}
    </div>
  )
}
