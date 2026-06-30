'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SearchResults {
  leads: Array<{ id: string; firstName: string; lastName: string; phone: string; stage: string; temperature: string; project: { name: string } | null }>
  projects: Array<{ id: string; name: string; location: string; status: string; type: string }>
  reservations: Array<{ id: string; name: string; project: string; unit: string | null; stage: string; price: number; currency: string }>
}

const STAGE_COLORS: Record<string, string> = {
  NUEVO: 'bg-gray-100 text-gray-600',
  CONTACTADO: 'bg-blue-100 text-blue-700',
  INTERESADO: 'bg-cyan-100 text-cyan-700',
  VISITA: 'bg-purple-100 text-purple-700',
  NEGOCIACION: 'bg-orange-100 text-orange-700',
  GANADO: 'bg-green-100 text-green-700',
  PERDIDO: 'bg-red-100 text-red-600',
}

const TEMP_DOT: Record<string, string> = {
  HOT: 'bg-red-500', WARM: 'bg-orange-400', NORMAL: 'bg-blue-400', COLD: 'bg-slate-400',
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // CMD+K / Ctrl+K to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 50)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ('')
    setResults(null)
    setCursor(0)
  }, [open])

  const search = useCallback(async (query: string) => {
    if (query.length < 2) { setResults(null); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json() as SearchResults
      setResults(data)
      setCursor(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (value: string) => {
    setQ(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { void search(value) }, 220)
  }

  // Build flat list for keyboard nav
  const allItems: Array<{ type: string; id: string; href: string }> = [
    ...(results?.leads.map(l => ({ type: 'lead', id: l.id, href: `/crm/${l.id}` })) ?? []),
    ...(results?.projects.map(p => ({ type: 'project', id: p.id, href: `/projects/${p.id}` })) ?? []),
    ...(results?.reservations.map(r => ({ type: 'reservation', id: r.id, href: `/reservas/${r.id}` })) ?? []),
  ]

  const navigate = (href: string) => {
    router.push(href)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, allItems.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && allItems[cursor]) navigate(allItems[cursor].href)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline text-[10px] bg-white border border-gray-200 px-1 py-0.5 rounded font-mono text-gray-400">⌘K</kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar leads, proyectos, reservas..."
            className="flex-1 text-sm text-gray-900 bg-transparent outline-none placeholder-gray-400"
          />
          {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
          <kbd className="text-[10px] bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded font-mono text-gray-400">Esc</kbd>
        </div>

        {/* Results */}
        {results && (
          <div className="max-h-[60vh] overflow-y-auto">
            {allItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">Sin resultados para &quot;{q}&quot;</div>
            ) : (
              <div className="p-2">
                {/* Leads */}
                {results.leads.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">Leads ({results.leads.length})</p>
                    {results.leads.map((lead, i) => (
                      <button
                        key={lead.id}
                        onClick={() => navigate(`/crm/${lead.id}`)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${cursor === i ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TEMP_DOT[lead.temperature] ?? 'bg-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                          <div className="text-xs text-gray-400">{lead.phone}{lead.project ? ` · ${lead.project.name}` : ''}</div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[lead.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                          {lead.stage}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Projects */}
                {results.projects.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">Proyectos</p>
                    {results.projects.map((project, i) => (
                      <button
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${cursor === results.leads.length + i ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <span className="text-xl">🏗️</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          <div className="text-xs text-gray-400">{project.location}</div>
                        </div>
                        <span className="text-xs text-gray-400">{project.status}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Reservations */}
                {results.reservations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">Reservas</p>
                    {results.reservations.map((r, i) => (
                      <button
                        key={r.id}
                        onClick={() => navigate(`/reservas/${r.id}`)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${cursor === results.leads.length + results.projects.length + i ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <span className="text-xl">📋</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{r.name}</div>
                          <div className="text-xs text-gray-400">{r.project}{r.unit ? ` · Unidad ${r.unit}` : ''}</div>
                        </div>
                        <span className="text-xs font-semibold text-blue-600">{r.stage}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!results && q.length === 0 && (
          <div className="p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Accesos rápidos</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'CRM', href: '/crm', icon: '👥' },
                { label: 'Tareas', href: '/tareas', icon: '✅' },
                { label: 'Reservas', href: '/reservas', icon: '📋' },
                { label: 'Formularios', href: '/formularios', icon: '📄' },
                { label: 'WhatsApp', href: '/whatsapp', icon: '💬' },
                { label: 'Documentos', href: '/documentos', icon: '🗂️' },
              ].map(item => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 hover:bg-gray-50 text-left transition-colors"
                >
                  <span>{item.icon}</span>
                  <span className="text-sm text-gray-700">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 bg-gray-50">
          <span className="text-[11px] text-gray-400">↑↓ navegar</span>
          <span className="text-[11px] text-gray-400">↵ abrir</span>
          <span className="text-[11px] text-gray-400">Esc cerrar</span>
        </div>
      </div>
    </div>
  )
}
