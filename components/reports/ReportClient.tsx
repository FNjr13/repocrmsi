'use client'

import { useState, useRef } from 'react'
import { STAGE_CONFIG, STATUS_CONFIG, PROJECT_TYPE_CONFIG, formatDate } from '@/lib/utils'

interface Project { id: string; name: string; location: string; status: string; type: string }

interface ReportData {
  project: { name: string; location: string; type: string; progress: number; totalUnits: number; soldUnits: number; reservedUnits: number; availableUnits: number }
  period: { from: string; to: string }
  generatedAt: string
  summary: { totalLeads: number; wonLeads: number; lostLeads: number; activeLeads: number; conversionRate: number; totalActivities: number }
  bySource: Record<string, number>
  byStage: Record<string, number>
  byActivityType: Record<string, number>
  byAgent: Array<{ id: string; name: string; leads: number; won: number; lost: number; active: number; activities: number; conversionRate: number }>
  campaignsInPeriod: Array<{ id: string; name: string; status: string; spent: number; leads: number; clicks: number }>
  recentLeads: Array<{ id: string; name: string; stage: string; source: string; agent: string | null; activitiesCount: number; createdAt: string }>
}

const PRESETS = [
  { label: 'Esta semana', getDates: () => { const now = new Date(); const d = new Date(now); d.setDate(d.getDate() - d.getDay() + 1); return { from: d.toISOString().slice(0,10), to: now.toISOString().slice(0,10) } } },
  { label: 'Este mes', getDates: () => { const now = new Date(); return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10), to: now.toISOString().slice(0,10) } } },
  { label: 'Últimos 30 días', getDates: () => { const now = new Date(); const d = new Date(now); d.setDate(d.getDate()-30); return { from: d.toISOString().slice(0,10), to: now.toISOString().slice(0,10) } } },
  { label: 'Últimos 3 meses', getDates: () => { const now = new Date(); const d = new Date(now); d.setMonth(d.getMonth()-3); return { from: d.toISOString().slice(0,10), to: now.toISOString().slice(0,10) } } },
  { label: 'Este año', getDates: () => { const now = new Date(); return { from: new Date(now.getFullYear(), 0, 1).toISOString().slice(0,10), to: now.toISOString().slice(0,10) } } },
]

const SOURCE_LABELS: Record<string, string> = { META: 'Meta Ads', GOOGLE: 'Google Ads', WHATSAPP: 'WhatsApp', WEB: 'Web', REFERIDO: 'Referido', OTRO: 'Otro' }
const SOURCE_ICONS: Record<string, string> = { META: '📘', GOOGLE: '🔍', WHATSAPP: '💬', WEB: '🌐', REFERIDO: '👥', OTRO: '📌' }
const ACTIVITY_LABELS: Record<string, string> = { LLAMADA: '📞 Llamada', WHATSAPP: '💬 WhatsApp', EMAIL: '✉️ Email', VISITA: '🏠 Visita', NOTA: '📝 Nota', REUNION: '🤝 Reunión' }

export default function ReportClient({ projects }: { projects: Project[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id ?? '')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [activePreset, setActivePreset] = useState('Este mes')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  function applyPreset(preset: typeof PRESETS[0]) {
    const dates = preset.getDates()
    setFrom(dates.from)
    setTo(dates.to)
    setActivePreset(preset.label)
  }

  async function generateReport() {
    if (!selectedProject) return
    setLoading(true)
    setReport(null)
    try {
      const res = await fetch(`/api/reports/${selectedProject}?from=${from}&to=${to}`)
      const data = await res.json()
      setReport(data)
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 Informes</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Genera reportes por proyecto y período</p>
          </div>
          {report && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              🖨️ Imprimir / Exportar PDF
            </button>
          )}
        </div>
      </div>

      <div className="p-8 print:p-0">
        {/* Configuration panel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 print:hidden">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Configurar informe</h2>

          {/* Project selector */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-500 mb-2">Proyecto</label>
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
              {projects.map(p => {
                const sc = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]
                const tc = PROJECT_TYPE_CONFIG[p.type as keyof typeof PROJECT_TYPE_CONFIG]
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProject(p.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      selectedProject === p.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="text-xl mb-1">{tc?.icon || '🏢'}</div>
                    <div className="text-xs font-semibold text-gray-800 leading-tight">{p.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{p.location}</div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${sc?.color}`}>{sc?.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date range */}
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Período</label>
              <div className="flex items-center gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activePreset === p.label
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Desde</label>
                <input
                  type="date"
                  value={from}
                  onChange={e => { setFrom(e.target.value); setActivePreset('') }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-gray-400 pb-2">→</span>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Hasta</label>
                <input
                  type="date"
                  value={to}
                  onChange={e => { setTo(e.target.value); setActivePreset('') }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={generateReport}
              disabled={loading || !selectedProject}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Generando...</>
              ) : (
                <><span>📊</span> Generar informe</>
              )}
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 animate-bounce">📊</div>
            <p className="text-gray-500 font-medium">Generando informe...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !report && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-700">Selecciona un proyecto y período</h3>
            <p className="text-gray-400 mt-2">Elige el proyecto y el rango de fechas, luego haz clic en <strong>Generar informe</strong></p>
          </div>
        )}

        {/* ===== REPORT ===== */}
        {report && !loading && (
          <div ref={printRef} className="space-y-6">

            {/* Report header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-7 text-white print:rounded-none">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-blue-200 text-sm font-medium mb-1">INFORME DE PROYECTO</div>
                  <h1 className="text-3xl font-bold">{report.project.name}</h1>
                  <div className="flex items-center gap-3 mt-2 text-blue-100">
                    <span>📍 {report.project.location}</span>
                    <span>·</span>
                    <span>{PROJECT_TYPE_CONFIG[report.project.type as keyof typeof PROJECT_TYPE_CONFIG]?.label}</span>
                  </div>
                  <div className="mt-3 text-blue-200 text-sm">
                    Período: <strong className="text-white">{formatDate(report.period.from)}</strong> al <strong className="text-white">{formatDate(report.period.to)}</strong>
                  </div>
                </div>
                <div className="text-right text-sm text-blue-200">
                  <div>Generado el</div>
                  <div className="text-white font-semibold">{formatDate(report.generatedAt)}</div>
                  <div className="mt-3 bg-white/20 rounded-xl p-3 text-left">
                    <div className="text-xs text-blue-200">Avance de obra</div>
                    <div className="text-2xl font-bold text-white">{report.project.progress}%</div>
                    <div className="w-32 h-2 bg-white/30 rounded-full mt-1">
                      <div className="h-full bg-white rounded-full" style={{ width: `${report.project.progress}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Unit summary */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total unidades', value: report.project.totalUnits, color: 'text-gray-900', bg: 'bg-white' },
                { label: 'Vendidas', value: report.project.soldUnits, sub: `${Math.round((report.project.soldUnits/report.project.totalUnits)*100)}%`, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Reservadas', value: report.project.reservedUnits, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                { label: 'Disponibles', value: report.project.availableUnits, color: 'text-blue-600', bg: 'bg-blue-50' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl border border-gray-200 p-5 text-center`}>
                  <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                  {s.sub && <div className="text-sm text-gray-500">{s.sub}</div>}
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* KPI summary */}
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">📈 Resumen del período</h2>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'Leads recibidos', value: report.summary.totalLeads, icon: '👤', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Leads ganados', value: report.summary.wonLeads, icon: '✅', color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Leads perdidos', value: report.summary.lostLeads, icon: '❌', color: 'text-red-500', bg: 'bg-red-50' },
                  { label: 'En seguimiento', value: report.summary.activeLeads, icon: '🔄', color: 'text-orange-500', bg: 'bg-orange-50' },
                  { label: 'Tasa conversión', value: `${report.summary.conversionRate}%`, icon: '🎯', color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map(k => (
                  <div key={k.label} className={`${k.bg} rounded-xl border border-gray-200 p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{k.icon}</span>
                    </div>
                    <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Leads por fuente */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-4">📡 Leads por fuente</h2>
                {Object.keys(report.bySource).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Sin leads en este período</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(report.bySource)
                      .sort(([,a],[,b]) => (b as number) - (a as number))
                      .map(([source, count]) => {
                        const pct = report.summary.totalLeads > 0 ? Math.round(((count as number) / report.summary.totalLeads) * 100) : 0
                        return (
                          <div key={source}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {SOURCE_ICONS[source] || '📌'} {SOURCE_LABELS[source] || source}
                              </span>
                              <span className="text-sm font-bold text-gray-900">{count as number} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

              {/* Pipeline del período */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-4">🔄 Estado de leads del período</h2>
                {Object.keys(report.byStage).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Sin leads en este período</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(report.byStage)
                      .sort(([,a],[,b]) => (b as number) - (a as number))
                      .map(([stage, count]) => {
                        const cfg = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]
                        const pct = report.summary.totalLeads > 0 ? Math.round(((count as number) / report.summary.totalLeads) * 100) : 0
                        return (
                          <div key={stage} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg?.color || 'bg-gray-100 text-gray-700'}`}>
                              {cfg?.label || stage}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-gray-200 rounded-full">
                                <div className="h-full bg-gray-600 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-sm font-bold text-gray-900 w-6 text-right">{count as number}</span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Rendimiento por asesora */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-bold text-gray-900 mb-4">👩‍💼 Rendimiento por asesora</h2>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Asesora', 'Leads asignados', 'Ganados', 'Perdidos', 'En seguimiento', 'Actividades', 'Conversión'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(report.byAgent as Array<{ id: string; name: string; leads: number; won: number; lost: number; active: number; activities: number; conversionRate: number }>).map(a => (
                    <tr key={a.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                            {a.name.split(' ').map((w: string) => w[0]).slice(0,2).join('')}
                          </div>
                          <span className="font-medium text-sm text-gray-800">{a.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm font-bold text-blue-600">{a.leads}</td>
                      <td className="py-3 pr-4 text-sm font-bold text-green-600">{a.won}</td>
                      <td className="py-3 pr-4 text-sm font-bold text-red-500">{a.lost}</td>
                      <td className="py-3 pr-4 text-sm font-bold text-orange-500">{a.active}</td>
                      <td className="py-3 pr-4 text-sm font-bold text-gray-700">{a.activities}</td>
                      <td className="py-3">
                        <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                          a.conversionRate >= 20 ? 'bg-green-100 text-green-700' :
                          a.conversionRate >= 10 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {a.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Actividades */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-1">📞 Actividades registradas</h2>
                <p className="text-sm text-gray-500 mb-4">Total: <strong>{report.summary.totalActivities}</strong> interacciones</p>
                {Object.keys(report.byActivityType).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Sin actividades en este período</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(report.byActivityType)
                      .sort(([,a],[,b]) => (b as number) - (a as number))
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
                          <span className="text-sm text-gray-700">{ACTIVITY_LABELS[type] || type}</span>
                          <span className="text-sm font-bold text-gray-900 bg-white border border-gray-200 px-2.5 py-0.5 rounded-full">{count as number}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Campañas */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-4">📣 Campañas activas en el período</h2>
                {report.campaignsInPeriod.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Sin campañas en este período</p>
                ) : (
                  <div className="space-y-3">
                    {(report.campaignsInPeriod as Array<{ id: string; name: string; status: string; spent: number; leads: number; clicks: number }>).map(c => (
                      <div key={c.id} className="p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-800">{c.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.status === 'ACTIVA' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>{c.status}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                          <span>💰 Gastado: <strong className="text-gray-800">${c.spent.toLocaleString()}</strong></span>
                          <span>👤 Leads: <strong className="text-gray-800">{c.leads}</strong></span>
                          <span>🖱️ Clicks: <strong className="text-gray-800">{c.clicks.toLocaleString()}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Leads del período - tabla */}
            {report.recentLeads.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-4">👤 Leads del período ({report.recentLeads.length})</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <th className="text-left pb-2 pr-4">Nombre</th>
                      <th className="text-left pb-2 pr-4">Fuente</th>
                      <th className="text-left pb-2 pr-4">Etapa</th>
                      <th className="text-left pb-2 pr-4">Asesora</th>
                      <th className="text-left pb-2 pr-4">Actividades</th>
                      <th className="text-left pb-2">Ingreso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(report.recentLeads as Array<{ id: string; name: string; stage: string; source: string; agent: string | null; activitiesCount: number; createdAt: string }>).map(l => {
                      const stageCfg = STAGE_CONFIG[l.stage as keyof typeof STAGE_CONFIG]
                      return (
                        <tr key={l.id}>
                          <td className="py-2.5 pr-4 font-medium text-gray-800">{l.name}</td>
                          <td className="py-2.5 pr-4 text-gray-500">{SOURCE_ICONS[l.source]} {SOURCE_LABELS[l.source] || l.source}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageCfg?.color || 'bg-gray-100 text-gray-700'}`}>
                              {stageCfg?.label || l.stage}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-gray-600">{l.agent || '—'}</td>
                          <td className="py-2.5 pr-4 text-center">
                            <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">{l.activitiesCount}</span>
                          </td>
                          <td className="py-2.5 text-gray-500">{formatDate(l.createdAt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 pb-4 print:block">
              Informe generado por SI CRM · {formatDate(report.generatedAt)}
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  )
}
