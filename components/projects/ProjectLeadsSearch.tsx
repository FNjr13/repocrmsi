'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface Lead {
  id: string
  firstName: string
  lastName: string
  phone: string
  stage: string
  source: string
  agent: { id: string; name: string } | null
  activities: { date: string | Date }[]
}

const STAGE_COLOR: Record<string, string> = {
  NUEVO:        'bg-blue-100 text-blue-700',
  CONTACTADO:   'bg-cyan-100 text-cyan-700',
  CALIFICADO:   'bg-indigo-100 text-indigo-700',
  VISITA:       'bg-violet-100 text-violet-700',
  PROPUESTA:    'bg-yellow-100 text-yellow-700',
  NEGOCIACION:  'bg-orange-100 text-orange-700',
  SEPARACION:   'bg-amber-100 text-amber-700',
  CPP:          'bg-purple-100 text-purple-700',
  VENDIDO:      'bg-green-100 text-green-700',
  PERDIDO:      'bg-red-100 text-red-700',
  NO_CALIFICA:  'bg-gray-100 text-gray-500',
}

const STAGE_LABEL: Record<string, string> = {
  NUEVO: 'Nuevo', CONTACTADO: 'Contactado', CALIFICADO: 'Calificado',
  VISITA: 'Visita', PROPUESTA: 'Propuesta', NEGOCIACION: 'Negociación',
  SEPARACION: 'Separación', CPP: 'CPP', VENDIDO: 'Vendido',
  PERDIDO: 'Perdido', NO_CALIFICA: 'No califica',
}

const SOURCE_ICON: Record<string, string> = {
  FACEBOOK: '📘', INSTAGRAM: '📸', WHATSAPP: '💬', REFERIDO: '🤝',
  GOOGLE: '🔍', TIKTOK: '🎵', WALK_IN: '🚶', LLAMADA: '📞',
  EMAIL: '📧', OTRO: '📌',
}

export default function ProjectLeadsSearch({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState('')

  const sorted = useMemo(() =>
    [...leads].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es')
    ), [leads])

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted
    const q = search.toLowerCase().trim()
    return sorted.filter(l =>
      l.firstName.toLowerCase().includes(q) ||
      l.lastName.toLowerCase().includes(q) ||
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
      l.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    )
  }, [sorted, search])

  // Group by first letter when not searching
  const grouped = useMemo(() => {
    if (search.trim()) return null
    const map = new Map<string, Lead[]>()
    for (const lead of filtered) {
      const letter = lead.firstName[0]?.toUpperCase() ?? '#'
      if (!map.has(letter)) map.set(letter, [])
      map.get(letter)!.push(lead)
    }
    return map
  }, [filtered, search])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Leads del Proyecto</h3>
        <span className="text-sm text-gray-500">{leads.length} total</span>
      </div>

      {leads.length > 0 && (
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, apellido o teléfono..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
      )}

      <div>
        {leads.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No hay leads para este proyecto</p>
        )}
        {filtered.length === 0 && search && (
          <p className="text-center text-gray-400 text-sm py-6">Sin resultados para &quot;{search}&quot;</p>
        )}

        {/* With search: flat list */}
        {search.trim() && (
          <div className="space-y-1">
            {filtered.map(lead => <LeadRow key={lead.id} lead={lead} />)}
          </div>
        )}

        {/* Without search: grouped by letter */}
        {!search.trim() && grouped && (
          <div>
            {[...grouped.entries()].map(([letter, group]) => (
              <div key={letter} className="mb-1">
                <div className="flex items-center gap-2 py-1.5 sticky top-0 bg-white z-10">
                  <span className="text-xs font-bold text-gray-400 w-5 text-center">{letter}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="space-y-0.5">
                  {group.map(lead => <LeadRow key={lead.id} lead={lead} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LeadRow({ lead }: { lead: Lead }) {
  return (
    <Link
      href={`/crm/${lead.id}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {lead.firstName[0]}{lead.lastName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900">{lead.firstName} {lead.lastName}</div>
        <div className="text-xs text-gray-500">{SOURCE_ICON[lead.source] || '📌'} {lead.phone}</div>
      </div>
      <div className="flex items-center gap-2">
        {lead.agent && <span className="text-xs text-gray-400 hidden sm:block">{lead.agent.name}</span>}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLOR[lead.stage] || 'bg-gray-100 text-gray-600'}`}>
          {STAGE_LABEL[lead.stage] || lead.stage}
        </span>
      </div>
    </Link>
  )
}
