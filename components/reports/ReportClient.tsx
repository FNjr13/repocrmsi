'use client'

import { useState, useRef } from 'react'
import { STAGE_CONFIG, STATUS_CONFIG, PROJECT_TYPE_CONFIG, formatDate } from '@/lib/utils'

interface Project { id: string; name: string; location: string; status: string; type: string }

interface Reservation {
  id: string
  unitNumber: string | null
  unitType: string | null
  floor: number | null
  area: number | null
  price: number
  currency: string
  stage: string
  reserveDate: string
  clientName: string
  agentName: string | null
  commissionPct: number
  commissionAmount: number
  commissionStatus: string
}

interface ProximoACerrar {
  id: string; name: string; stage: string; temperature: string | null; followUpDate: string | null; agent: string | null; budget: number | null
}

interface ReportData {
  project: { name: string; location: string; type: string; progress: number; totalUnits: number; soldUnits: number; reservedUnits: number; availableUnits: number }
  period: { from: string; to: string }
  generatedAt: string
  summary: { totalLeads: number; wonLeads: number; lostLeads: number; activeLeads: number; conversionRate: number; totalActivities: number }
  bySource: Record<string, number>
  byStage: Record<string, number>
  byTemperature: Record<string, number>
  byActivityType: Record<string, number>
  byAgent: Array<{ id: string; name: string; role: string; department: string; leads: number; won: number; lost: number; active: number; activities: number; conversionRate: number }>
  campaignsInPeriod: Array<{ id: string; name: string; status: string; spent: number; leads: number; clicks: number }>
  recentLeads: Array<{ id: string; name: string; stage: string; source: string; agent: string | null; activitiesCount: number; createdAt: string; temperature: string | null; followUpDate: string | null }>
  pipelineAll: Record<string, number>
  allLeadsByTemperature: Record<string, number>
  proximosACerrar: ProximoACerrar[]
  reservations: Reservation[]
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
const TEMP_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; bar: string }> = {
  HOT:    { label: 'Caliente', icon: '🔥', color: 'text-red-700',    bg: 'bg-red-50 border-red-200',     bar: 'bg-red-400' },
  WARM:   { label: 'Tibio',    icon: '☀️', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', bar: 'bg-orange-400' },
  NORMAL: { label: 'Normal',   icon: '🌡️', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   bar: 'bg-blue-400' },
  COLD:   { label: 'Frío',     icon: '🧊', color: 'text-cyan-700',   bg: 'bg-cyan-50 border-cyan-200',   bar: 'bg-cyan-400' },
}

const RESERVATION_STAGE: Record<string, { label: string; color: string }> = {
  RESERVA:   { label: 'Separación',  color: 'bg-amber-100 text-amber-700' },
  PROMESA:   { label: 'Promesa/CPP', color: 'bg-purple-100 text-purple-700' },
  ESCRITURA: { label: 'Escritura',   color: 'bg-blue-100 text-blue-700' },
  ENTREGADO: { label: 'Entregado',   color: 'bg-green-100 text-green-700' },
  CAIDA:     { label: 'Caída',       color: 'bg-red-100 text-red-600' },
}

export default function ReportClient({ projects }: { projects: Project[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id ?? '')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [activePreset, setActivePreset] = useState('Este mes')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [capturedHtml, setCapturedHtml] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const editRef = useRef<HTMLDivElement>(null)

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

  async function handleExportPDF() {
    const el = editMode ? editRef.current : printRef.current
    if (!el || !report || exporting) return

    setExporting(true)
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas-pro'),
      ])

      // Render the FULL element (entire scrollHeight, not just what's visible
      // on screen) into one tall canvas. windowWidth forces a desktop-width
      // layout even when exporting from a narrow mobile viewport, so the
      // report doesn't render squished.
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
      })

      const pdf = new jsPDF('p', 'mm', 'a4')
      const marginMM = 10
      const pageWidthMM = pdf.internal.pageSize.getWidth()
      const pageHeightMM = pdf.internal.pageSize.getHeight()
      const contentWidthMM = pageWidthMM - marginMM * 2
      const contentHeightMM = pageHeightMM - marginMM * 2
      const pxPerMM = canvas.width / contentWidthMM
      const pageHeightPx = Math.floor(contentHeightMM * pxPerMM)

      // Slice the tall canvas into as many A4-height chunks as needed —
      // guarantees every pixel of content ends up on some page, no matter
      // how long the report is.
      let renderedPx = 0
      let page = 0
      while (renderedPx < canvas.height) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx)
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = sliceHeightPx
        const ctx = pageCanvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)
        }
        const imgData = pageCanvas.toDataURL('image/jpeg', 0.95)
        const imgHeightMM = sliceHeightPx / pxPerMM
        if (page > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', marginMM, marginMM, contentWidthMM, imgHeightMM)
        renderedPx += sliceHeightPx
        page++
      }

      const safeName = report.project.name.replace(/[^\w-]+/g, '_')
      pdf.save(`Informe_${safeName}_${from}_a_${to}.pdf`)
    } catch (err) {
      console.error('Error exportando PDF:', err)
      alert('No se pudo generar el PDF. Intenta nuevamente.')
    } finally {
      setExporting(false)
    }
  }

  function handleStartEdit() {
    if (!printRef.current) return
    // Snapshot current rendered HTML — React won't interfere after this
    setCapturedHtml(printRef.current.innerHTML)
    setEditMode(true)
  }

  function handleStopEdit() {
    setEditMode(false)
    setCapturedHtml(null)
  }

  async function handleGenerateReport() {
    setEditMode(false)
    setCapturedHtml(null)
    await generateReport()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 print-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 Informes</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Genera reportes por proyecto y período</p>
          </div>
          {report && (
            <div className="flex items-center gap-2">
              {!editMode ? (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors border bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  ✏️ Editar informe
                </button>
              ) : (
                <button
                  onClick={handleStopEdit}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors border bg-amber-50 border-amber-300 text-amber-700"
                >
                  ✅ Terminar edición
                </button>
              )}
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {exporting ? (
                  <><span className="animate-spin">⏳</span> Generando PDF...</>
                ) : (
                  <>📄 Exportar PDF</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 print:p-0">
        {/* Configuration panel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 print-hidden">
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
              onClick={handleGenerateReport}
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
          <>
          {/* Edit mode banner */}
          {editMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3 print-hidden mb-4">
              <span className="text-amber-500 text-xl">✏️</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Modo edición activo — haz clic en cualquier parte del informe para editar</p>
                <p className="text-xs text-amber-600">Puedes cambiar textos, números, añadir comentarios, etc. Al exportar PDF se guardará tal como lo ves.</p>
              </div>
            </div>
          )}

          {/* Edit mode: editable HTML snapshot */}
          {editMode && capturedHtml && (
            <div
              ref={editRef}
              contentEditable
              suppressContentEditableWarning
              className="space-y-6 outline-none"
              dangerouslySetInnerHTML={{ __html: capturedHtml }}
            />
          )}

          {/* Normal read-only report */}
          <div ref={printRef} className={`space-y-6 ${editMode ? 'hidden' : ''}`}>

            {/* placeholder start of old section */}

            {/* Report header */}
            <div className="print-keep-together bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-7 text-white print:rounded-none">
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
            <div className="print-keep-together grid grid-cols-4 gap-4">
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
            <div className="print-keep-together">
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

            {/* Temperatura de leads activos */}
            {(() => {
              const temps = ['HOT', 'WARM', 'NORMAL', 'COLD']
              const total = temps.reduce((s, t) => s + (report.allLeadsByTemperature[t] || 0), 0)
              return (
                <div className="print-keep-together">
                  <h2 className="text-base font-bold text-gray-900 mb-3">🌡️ Temperatura de leads activos</h2>
                  <div className="grid grid-cols-4 gap-4">
                    {temps.map(t => {
                      const cfg = TEMP_CONFIG[t]
                      const count = report.allLeadsByTemperature[t] || 0
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0
                      return (
                        <div key={t} className={`border rounded-xl p-4 ${cfg.bg}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{cfg.icon}</span>
                            <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          <div className={`text-3xl font-bold ${cfg.color}`}>{count}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{pct}% del total activo</div>
                          <div className="w-full h-1.5 bg-white/60 rounded-full mt-2">
                            <div className={`h-full ${cfg.bar} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

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

              {/* Pipeline completo del proyecto */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-1">🔄 Pipeline total del proyecto</h2>
                <p className="text-xs text-gray-400 mb-4">Todos los leads, sin filtro de fecha</p>
                {Object.keys(report.pipelineAll).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Sin leads registrados</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(report.pipelineAll)
                      .sort(([,a],[,b]) => (b as number) - (a as number))
                      .map(([stage, count]) => {
                        const cfg = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]
                        const total = Object.values(report.pipelineAll).reduce((s, v) => s + (v as number), 0)
                        const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0
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

            {/* Rendimiento por equipo */}
            {(() => {
              type AgentRow = { id: string; name: string; role: string; department: string; leads: number; won: number; lost: number; active: number; activities: number; conversionRate: number }
              const allAgents = report.byAgent as AgentRow[]
              const ventas = allAgents.filter(a => a.department === 'VENTAS')
              const others = allAgents.filter(a => a.department !== 'VENTAS')
              const AgentTable = ({ agents, title, accent }: { agents: AgentRow[]; title: string; accent: string }) => (
                <div className={`mb-4 rounded-xl border ${accent} overflow-hidden`}>
                  <div className={`px-4 py-2.5 flex items-center gap-2 ${accent.replace('border-', 'bg-').replace('-200','-50')}`}>
                    <span className="text-sm font-bold text-gray-800">{title}</span>
                    <span className="text-xs text-gray-500 ml-auto">{agents.length} personas</span>
                  </div>
                  <table className="w-full bg-white">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Nombre · Rol','Leads','Ganados','Perdidos','Activos','Actividades','Conversión'].map(h=>(
                          <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-2 first:pl-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map(a=>(
                        <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${a.department==='VENTAS'?'bg-gradient-to-br from-blue-500 to-indigo-600':'bg-gradient-to-br from-gray-400 to-gray-500'}`}>
                                {a.name.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
                              </div>
                              <div>
                                <div className="font-medium text-sm text-gray-800">{a.name}</div>
                                <div className="text-xs text-gray-400">{a.role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-600">{a.leads}</td>
                          <td className="px-4 py-3 text-sm font-bold text-green-600">{a.won}</td>
                          <td className="px-4 py-3 text-sm font-bold text-red-500">{a.lost}</td>
                          <td className="px-4 py-3 text-sm font-bold text-orange-500">{a.active}</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-700">{a.activities}</td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${a.conversionRate>=20?'bg-green-100 text-green-700':a.conversionRate>=10?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-600'}`}>
                              {a.conversionRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
              return (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-base font-bold text-gray-900 mb-4">👥 Rendimiento del equipo</h2>
                  {ventas.length > 0 && <AgentTable agents={ventas} title="🏆 Equipo de Ventas" accent="border-blue-200" />}
                  {others.length > 0 && <AgentTable agents={others} title="⚙️ Soporte & Gestión" accent="border-gray-200" />}
                </div>
              )
            })()}

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

            {/* Próximos a cerrar */}
            {report.proximosACerrar.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">🎯 Próximos a cerrar</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Leads en negociación o con temperatura alta/media</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-500 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                    {report.proximosACerrar.length} leads
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                        <th className="text-left pb-2 pr-4">Nombre</th>
                        <th className="text-left pb-2 pr-4">Temp.</th>
                        <th className="text-left pb-2 pr-4">Etapa</th>
                        <th className="text-left pb-2 pr-4">Asesor/a</th>
                        <th className="text-left pb-2">Próximo contacto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.proximosACerrar.map(l => {
                        const stageCfg = STAGE_CONFIG[l.stage as keyof typeof STAGE_CONFIG]
                        const tempCfg = l.temperature ? TEMP_CONFIG[l.temperature] : null
                        const followUp = l.followUpDate ? new Date(l.followUpDate) : null
                        const isOverdue = followUp && followUp < new Date()
                        return (
                          <tr key={l.id} className="hover:bg-gray-50/50">
                            <td className="py-2.5 pr-4 font-semibold text-gray-800">{l.name}</td>
                            <td className="py-2.5 pr-4">
                              {tempCfg ? (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tempCfg.bg} ${tempCfg.color}`}>
                                  {tempCfg.icon} {tempCfg.label}
                                </span>
                              ) : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageCfg?.color || 'bg-gray-100 text-gray-700'}`}>
                                {stageCfg?.label || l.stage}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-gray-600">{l.agent || '—'}</td>
                            <td className="py-2.5">
                              {followUp ? (
                                <span className={`text-xs font-medium ${isOverdue ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200' : 'text-gray-600'}`}>
                                  {isOverdue ? '⚠️ ' : ''}{formatDate(followUp.toISOString())}
                                </span>
                              ) : <span className="text-gray-400 text-xs">Sin fecha</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Leads del período - tabla */}
            {report.recentLeads.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-4">👤 Leads del período ({report.recentLeads.length})</h2>
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <th className="text-left pb-2 pr-4">Nombre</th>
                      <th className="text-left pb-2 pr-4">Temp.</th>
                      <th className="text-left pb-2 pr-4">Fuente</th>
                      <th className="text-left pb-2 pr-4">Etapa</th>
                      <th className="text-left pb-2 pr-4">Asesora</th>
                      <th className="text-left pb-2 pr-4">Act.</th>
                      <th className="text-left pb-2">Ingreso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.recentLeads.map(l => {
                      const stageCfg = STAGE_CONFIG[l.stage as keyof typeof STAGE_CONFIG]
                      const tempCfg = l.temperature ? TEMP_CONFIG[l.temperature] : null
                      return (
                        <tr key={l.id}>
                          <td className="py-2.5 pr-4 font-medium text-gray-800">{l.name}</td>
                          <td className="py-2.5 pr-4">
                            {tempCfg ? (
                              <span title={tempCfg.label}>{tempCfg.icon}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
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
              </div>
            )}

            {/* Separaciones */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">🏠 Separaciones del período</h2>
                <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {report.reservations.length} {report.reservations.length === 1 ? 'separación' : 'separaciones'}
                </span>
              </div>
              {report.reservations.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No hay separaciones registradas en este período</p>
              ) : (
                <>
                  {/* Commission summary strip */}
                  {(() => {
                    const totalComm = report.reservations.reduce((s, r) => s + r.commissionAmount, 0)
                    const pendiente = report.reservations.filter(r => r.commissionStatus === 'PENDIENTE')
                    const aprobada  = report.reservations.filter(r => r.commissionStatus === 'APROBADA')
                    const pagada    = report.reservations.filter(r => r.commissionStatus === 'PAGADA')
                    return (
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        {[
                          { label: 'Total comisiones', count: report.reservations.length, amt: totalComm, color: 'text-gray-900',    bg: 'bg-gray-50' },
                          { label: 'Pendiente',        count: pendiente.length, amt: pendiente.reduce((s,r)=>s+r.commissionAmount,0), color: 'text-yellow-700', bg: 'bg-yellow-50' },
                          { label: 'Aprobada',         count: aprobada.length,  amt: aprobada.reduce((s,r)=>s+r.commissionAmount,0),  color: 'text-blue-700',   bg: 'bg-blue-50' },
                          { label: 'Pagada',           count: pagada.length,    amt: pagada.reduce((s,r)=>s+r.commissionAmount,0),    color: 'text-green-700',  bg: 'bg-green-50' },
                        ].map(k => (
                          <div key={k.label} className={`${k.bg} rounded-lg p-3 text-center`}>
                            <div className={`text-lg font-bold ${k.color}`}>
                              ${k.amt.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{k.label} ({k.count})</div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                        <th className="text-left pb-2 pr-4"># Lote / Unidad</th>
                        <th className="text-left pb-2 pr-4">Cliente</th>
                        <th className="text-left pb-2 pr-4">Asesor/a</th>
                        <th className="text-left pb-2 pr-4">Precio</th>
                        <th className="text-left pb-2 pr-4">% Com.</th>
                        <th className="text-left pb-2 pr-4">Monto com.</th>
                        <th className="text-left pb-2 pr-4">Estado com.</th>
                        <th className="text-left pb-2 pr-4">Etapa</th>
                        <th className="text-left pb-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.reservations.map(r => {
                        const stageCfg = RESERVATION_STAGE[r.stage] ?? { label: r.stage, color: 'bg-gray-100 text-gray-700' }
                        const commStatusColor = r.commissionStatus === 'PAGADA' ? 'bg-green-100 text-green-700' : r.commissionStatus === 'APROBADA' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                        const commStatusLabel = r.commissionStatus === 'PAGADA' ? 'Pagada' : r.commissionStatus === 'APROBADA' ? 'Aprobada' : 'Pendiente'
                        return (
                          <tr key={r.id} className="hover:bg-gray-50/50">
                            <td className="py-2.5 pr-4">
                              <span className="font-bold text-gray-900 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg text-sm">
                                {r.unitNumber ?? '—'}
                              </span>
                              {r.floor && <span className="text-xs text-gray-400 ml-1.5">Piso {r.floor}</span>}
                            </td>
                            <td className="py-2.5 pr-4 font-semibold text-gray-800">{r.clientName}</td>
                            <td className="py-2.5 pr-4 text-gray-600">{r.agentName ?? '—'}</td>
                            <td className="py-2.5 pr-4 font-semibold text-gray-900">
                              {r.currency === 'USD' ? '$' : r.currency === 'UF' ? 'UF ' : r.currency === 'EUR' ? '€' : '$'}{r.price.toLocaleString()}{r.currency === 'CLP' ? ' CLP' : ''}
                            </td>
                            <td className="py-2.5 pr-4 text-gray-700 font-medium">{r.commissionPct}%</td>
                            <td className="py-2.5 pr-4 font-bold text-green-700">
                              ${r.commissionAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${commStatusColor}`}>
                                {commStatusLabel}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${stageCfg.color}`}>
                                {stageCfg.label}
                              </span>
                            </td>
                            <td className="py-2.5 text-gray-500">{formatDate(r.reserveDate)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </div>

            {/* Observations section — always in normal report */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-bold text-gray-900 mb-3">📝 Observaciones del informe</h2>
              <p className="text-sm text-gray-400 whitespace-pre-wrap min-h-[60px]">Activa el modo edición para agregar observaciones, conclusiones o comentarios al informe.</p>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 pb-4">
              Informe generado por SI CRM · {formatDate(report.generatedAt)}
            </div>
          </div>
          </>
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          /* Hide UI chrome */
          .print-hidden { display: none !important; }
          body { background: white !important; margin: 0; }

          /* Page setup */
          @page { margin: 1.2cm; size: A4; }

          /* Force colors to print */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* THE MAIN FIX: overflow-x:auto clips tables in PDF */
          .overflow-x-auto { overflow: visible !important; width: 100% !important; }
          .overflow-hidden { overflow: visible !important; }

          /* Reset any viewport-height constraints that could clip content */
          .min-h-screen { min-height: auto !important; height: auto !important; }

          /* IMPORTANT: sections must NOT force break-inside:avoid — a table
             taller than one page (many leads/reservations) gets clipped at
             the page edge instead of flowing to the next page. Long sections
             are allowed to span multiple pages; only rows are protected
             below so no single row is ever split mid-content. */
          .bg-white.rounded-xl {
            margin-bottom: 12px !important;
          }

          /* Short, bounded-size cards CAN safely stay together */
          .print-keep-together {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Tables: repeat header on every page, never split a row */
          table { width: 100% !important; border-collapse: collapse !important; table-layout: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; break-inside: avoid; }

          /* Tighter text in tables for PDF so wide tables fit the page width */
          table th, table td { font-size: 9px !important; padding: 3px 5px !important; word-break: break-word; }

          /* Section headings: don't get orphaned alone at page bottom */
          h2 { page-break-after: avoid; break-after: avoid; }

          /* Don't let a page break land immediately after a heading with
             nothing following it visible — pairs with h2 rule above */
          h1, h2, h3 { orphans: 3; widows: 3; }

          /* Grid fixes for print */
          .grid { display: grid !important; }
          .grid-cols-2 { grid-template-columns: 1fr 1fr !important; }
          .grid-cols-4 { grid-template-columns: repeat(4, 1fr) !important; }
          .grid-cols-5 { grid-template-columns: repeat(5, 1fr) !important; }

          /* Remove hover effects */
          tr:hover { background: transparent !important; }
        }
      `}</style>
    </div>
  )
}
