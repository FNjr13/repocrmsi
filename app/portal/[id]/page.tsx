'use client'

import { useState, useEffect, use } from 'react'

interface PortalData {
  id: string
  stage: string
  unitNumber: string | null
  unitType: string | null
  floor: number | null
  area: number | null
  price: number
  currency: string
  reserveAmount: number | null
  reserveDate: string
  promiseDate: string | null
  closingDate: string | null
  deliveryDate: string | null
  notes: string | null
  lead: {
    firstName: string
    lastName: string
    email: string | null
    phone: string
    stage: string
    activities: Array<{ id: string; type: string; description: string; date: string }>
  }
  project: { name: string; location: string; type: string; currency: string }
  agent: { name: string } | null
  documents: Array<{
    id: string; name: string; type: string; status: string
    notes: string | null; dueDate: string | null; createdAt: string
  }>
}

const STAGES = [
  { key: 'RESERVA',   label: 'Reserva',   icon: '📋', desc: 'Reserva recibida y en proceso' },
  { key: 'PROMESA',   label: 'Promesa',   icon: '✍️',  desc: 'Promesa de compraventa firmada' },
  { key: 'ESCRITURA', label: 'Escritura', icon: '📜', desc: 'Escritura notarial en trámite' },
  { key: 'ENTREGADO', label: 'Entregado', icon: '🏠', desc: 'Unidad entregada al propietario' },
]

const DOC_STATUS: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  ENVIADO:   { label: 'Enviado',   color: 'bg-blue-100 text-blue-700' },
  FIRMADO:   { label: 'Firmado',   color: 'bg-green-100 text-green-700' },
  VENCIDO:   { label: 'Vencido',   color: 'bg-red-100 text-red-700' },
}

const ACT_ICONS: Record<string, string> = {
  LLAMADA: '📞', WHATSAPP: '💬', EMAIL: '📧',
  VISITA: '🏠', REUNION: '🤝', NOTA: '📝',
}

function StageTracker({ current }: { current: string }) {
  const idx = STAGES.findIndex(s => s.key === current)
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        {STAGES.map((s, i) => (
          <div key={s.key} className="flex flex-col items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mb-1 z-10 relative transition-all ${
              i <= idx ? 'bg-blue-600 shadow-lg shadow-blue-200' : 'bg-gray-100'
            }`}>
              {s.icon}
            </div>
            <span className={`text-xs font-medium text-center ${i <= idx ? 'text-blue-700' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {i <= idx && i === idx && (
              <span className="text-[10px] text-blue-500 mt-0.5">← Etapa actual</span>
            )}
          </div>
        ))}
      </div>
      {/* Connector line */}
      <div className="absolute top-5 left-10 right-10 h-0.5 bg-gray-200 -z-0">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${(idx / (STAGES.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}

export default function PortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/portal/${id}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null }
        return r.json() as Promise<PortalData>
      })
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando tu portal...</p>
        </div>
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Portal no encontrado</h1>
          <p className="text-gray-500 text-sm">Este enlace no corresponde a ninguna reserva activa. Verifica con tu asesor.</p>
        </div>
      </div>
    )
  }

  const isCaida = data.stage === 'CAIDA'
  const fmt = (n: number) => n.toLocaleString('es-PA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
            VM
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Portal del Cliente</div>
            <div className="text-xs text-gray-500">{data.project.name}</div>
          </div>
          <div className="ml-auto">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isCaida ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {isCaida ? 'Reserva caída' : '● Activa'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Welcome */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            ¡Hola, {data.lead.firstName}! 👋
          </h1>
          <p className="text-gray-500 text-sm">
            Aquí puedes seguir el avance de tu proceso de compra en {data.project.name}.
          </p>
          {data.agent && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <span>Tu asesor:</span>
              <span className="font-semibold text-blue-700">{data.agent.name}</span>
            </div>
          )}
        </div>

        {/* Stage tracker */}
        {!isCaida && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-5">📍 Estado de tu proceso</h2>
            <StageTracker current={data.stage} />
            <p className="text-xs text-gray-500 text-center mt-4">
              {STAGES.find(s => s.key === data.stage)?.desc ?? ''}
            </p>
          </div>
        )}

        {/* Unit details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">🏢 Detalles de la unidad</h2>
          <div className="grid grid-cols-2 gap-4">
            {data.unitNumber && (
              <div>
                <div className="text-xs text-gray-400">Unidad</div>
                <div className="font-semibold text-gray-900">{data.unitNumber}</div>
              </div>
            )}
            {data.unitType && (
              <div>
                <div className="text-xs text-gray-400">Tipo</div>
                <div className="font-semibold text-gray-900 capitalize">{data.unitType.toLowerCase()}</div>
              </div>
            )}
            {data.floor != null && (
              <div>
                <div className="text-xs text-gray-400">Piso</div>
                <div className="font-semibold text-gray-900">{data.floor}</div>
              </div>
            )}
            {data.area != null && (
              <div>
                <div className="text-xs text-gray-400">Área</div>
                <div className="font-semibold text-gray-900">{data.area} m²</div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-400">Precio</div>
              <div className="font-bold text-blue-700 text-lg">{data.currency} {fmt(data.price)}</div>
            </div>
            {data.reserveAmount != null && (
              <div>
                <div className="text-xs text-gray-400">Monto de reserva</div>
                <div className="font-semibold text-gray-900">{data.currency} {fmt(data.reserveAmount)}</div>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-2">Proyecto</div>
            <div className="font-medium text-gray-900">{data.project.name}</div>
            <div className="text-sm text-gray-500">{data.project.location}</div>
          </div>
        </div>

        {/* Timeline dates */}
        {(data.promiseDate ?? data.closingDate ?? data.deliveryDate) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">📅 Fechas clave</h2>
            <div className="space-y-3">
              <DateRow label="Fecha de reserva" iso={data.reserveDate} />
              {data.promiseDate && <DateRow label="Promesa de compraventa" iso={data.promiseDate} />}
              {data.closingDate && <DateRow label="Escrituración" iso={data.closingDate} />}
              {data.deliveryDate && <DateRow label="Entrega estimada" iso={data.deliveryDate} isFuture />}
            </div>
          </div>
        )}

        {/* Documents */}
        {data.documents.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">📁 Documentos del proceso</h2>
            <div className="space-y-2">
              {data.documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{doc.name}</div>
                    {doc.dueDate && (
                      <div className="text-xs text-gray-400">
                        Vence: {new Date(doc.dueDate).toLocaleDateString('es-PA')}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DOC_STATUS[doc.status]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                    {DOC_STATUS[doc.status]?.label ?? doc.status}
                  </span>
                  {doc.notes && (
                    <span className="text-xs text-gray-400 ml-1 truncate max-w-[100px]">{doc.notes}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity timeline */}
        {data.lead.activities.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">🕐 Últimas gestiones</h2>
            <div className="space-y-3">
              {data.lead.activities.map(act => (
                <div key={act.id} className="flex gap-3">
                  <span className="text-lg w-6 text-center flex-shrink-0">{ACT_ICONS[act.type] ?? '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{act.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(act.date).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact agent */}
        {data.agent && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white text-center">
            <p className="text-sm font-medium mb-1">¿Tienes alguna pregunta?</p>
            <p className="text-blue-100 text-xs mb-4">Contáctate directamente con tu asesor</p>
            <a
              href={`https://wa.me/${data.lead.phone.replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Contactar asesor
            </a>
          </div>
        )}

        <div className="text-center text-xs text-gray-400 pb-6">
          SI CRM · Desarrollado para{' '}
          <span className="font-medium text-gray-500">{data.project.name}</span>
        </div>
      </div>
    </div>
  )
}

function DateRow({ label, iso, isFuture }: { label: string; iso: string; isFuture?: boolean }) {
  const d = new Date(iso)
  const isPast = d < new Date()
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-medium ${isFuture && !isPast ? 'text-blue-700' : 'text-gray-900'}`}>
        {d.toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' })}
      </span>
    </div>
  )
}
