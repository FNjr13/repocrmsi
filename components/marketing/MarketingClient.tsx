'use client'

import { useState } from 'react'
import { formatNumber, formatDate } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Campaign {
  id: string; name: string; channel: string; budget: number; spent: number
  impressions: number; clicks: number; leads: number; conversions: number
  status: string; startDate: Date | string; endDate: Date | string | null
  project: { id: string; name: string } | null
}
interface ChannelStat {
  channel: string; totalLeads: number; wonLeads: number
  budget: number; spent: number; impressions: number; clicks: number; campaignLeads: number
}
export interface MarketingRecord {
  id: string; projectId: string | null; channel: string; period: string
  date: string | Date; spend: number; impressions: number; reach: number
  clicks: number; leads: number; conversions: number; notes: string | null
  project: { id: string; name: string } | null
}
interface Project { id: string; name: string }
interface MarketingData {
  campaigns: Campaign[]
  leads: Array<{ source: string; _count: { source: number } }>
  channelStats: ChannelStat[]
  marketingRecords: MarketingRecord[]
  projects: Project[]
}

// ─── Config ───────────────────────────────────────────────────────────────────
const CHANNEL_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  META:     { label: 'Meta Ads',    icon: '📘', color: '#1877f2' },
  GOOGLE:   { label: 'Google Ads',  icon: '🔍', color: '#ea4335' },
  TIKTOK:   { label: 'TikTok',      icon: '🎵', color: '#010101' },
  WHATSAPP: { label: 'WhatsApp',    icon: '💬', color: '#25d366' },
  EMAIL:    { label: 'Email',       icon: '📧', color: '#06b6d4' },
  REFERIDO: { label: 'Referido',    icon: '👥', color: '#f59e0b' },
  OUTDOOR:  { label: 'Exterior',    icon: '🪧', color: '#6b7280' },
  OTRO:     { label: 'Otro',        icon: '📌', color: '#8b5cf6' },
}
const CHANNELS = Object.keys(CHANNEL_CONFIG)
const PERIODS = ['DIARIO', 'SEMANAL', 'MENSUAL']
const PERIOD_LABELS: Record<string, string> = { DIARIO: 'Diario', SEMANAL: 'Semanal', MENSUAL: 'Mensual' }

function fmt(n: number) { return formatNumber(Math.round(n)) }
function fmtPct(n: number, d: number) { return d > 0 ? `${((n/d)*100).toFixed(1)}%` : '0%' }

// ─── Record Form Modal ────────────────────────────────────────────────────────
const EMPTY_FORM = {
  projectId: '', channel: 'META', period: 'MENSUAL',
  date: new Date().toISOString().slice(0, 10),
  spend: '', impressions: '', reach: '', clicks: '', leads: '', conversions: '', notes: '',
}

function RecordModal({
  record, projects, onClose, onSaved,
}: {
  record: MarketingRecord | null
  projects: Project[]
  onClose: () => void
  onSaved: (r: MarketingRecord) => void
}) {
  const isNew = !record
  const [form, setForm] = useState(() => record ? {
    projectId: record.projectId ?? '',
    channel: record.channel,
    period: record.period,
    date: new Date(record.date).toISOString().slice(0, 10),
    spend: String(record.spend),
    impressions: String(record.impressions),
    reach: String(record.reach),
    clicks: String(record.clicks),
    leads: String(record.leads),
    conversions: String(record.conversions),
    notes: record.notes ?? '',
  } : { ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function save() {
    setSaving(true)
    try {
      const url = isNew ? '/api/marketing-records' : `/api/marketing-records/${record!.id}`
      const method = isNew ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId: form.projectId || null }),
      })
      const saved = await res.json() as MarketingRecord
      onSaved(saved)
    } finally { setSaving(false) }
  }

  const Field = ({ label, fkey, type = 'number', prefix }: { label: string; fkey: string; type?: string; prefix?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
        <input
          type={type} value={(form as Record<string, string>)[fkey]}
          onChange={e => set(fkey, e.target.value)}
          className={`w-full border border-gray-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${prefix ? 'pl-7 pr-3' : 'px-3'}`}
        />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900">{isNew ? 'Nuevo registro' : 'Editar registro'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Canal *</label>
              <select value={form.channel} onChange={e => set('channel', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CHANNELS.map(c => <option key={c} value={c}>{CHANNEL_CONFIG[c].icon} {CHANNEL_CONFIG[c].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Período</label>
              <select value={form.period} onChange={e => set('period', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PERIODS.map(p => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Proyecto</label>
              <select value={form.projectId} onChange={e => set('projectId', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">General (todos)</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Métricas de alcance</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Inversión ($)" fkey="spend" prefix="$" />
              <Field label="Impresiones" fkey="impressions" />
              <Field label="Alcance" fkey="reach" />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Métricas de resultado</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Clics" fkey="clicks" />
              <Field label="Leads" fkey="leads" />
              <Field label="Reservas/Ventas" fkey="conversions" />
            </div>
          </div>

          {/* Calculated preview */}
          {(Number(form.impressions) > 0 || Number(form.leads) > 0) && (
            <div className="bg-blue-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-blue-400 font-semibold uppercase">CTR</p>
                <p className="text-sm font-bold text-blue-700">{fmtPct(Number(form.clicks), Number(form.impressions))}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-400 font-semibold uppercase">CPL</p>
                <p className="text-sm font-bold text-blue-700">{Number(form.leads) > 0 ? `$${fmt(Number(form.spend)/Number(form.leads))}` : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-400 font-semibold uppercase">CPC</p>
                <p className="text-sm font-bold text-blue-700">{Number(form.clicks) > 0 ? `$${fmt(Number(form.spend)/Number(form.clicks))}` : '—'}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Campaña especial, evento, observaciones..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => { void save() }} disabled={saving || !form.channel || !form.date}
            className="px-5 py-2.5 text-sm bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Guardando...' : isNew ? 'Guardar registro' : 'Actualizar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({ records, channelStats, campaigns }: {
  records: MarketingRecord[]
  channelStats: ChannelStat[]
  campaigns: Campaign[]
}) {
  const [filterProject, setFilterProject] = useState('all')
  const projects = Array.from(new Set(records.filter(r => r.project).map(r => r.project!.name)))

  const filtered = filterProject === 'all' ? records : records.filter(r => r.project?.name === filterProject)

  const totalSpend = filtered.reduce((s, r) => s + r.spend, 0)
  const totalImpressions = filtered.reduce((s, r) => s + r.impressions, 0)
  const totalReach = filtered.reduce((s, r) => s + r.reach, 0)
  const totalClicks = filtered.reduce((s, r) => s + r.clicks, 0)
  const totalLeads = filtered.reduce((s, r) => s + r.leads, 0)
  const totalConversions = filtered.reduce((s, r) => s + r.conversions, 0)
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0

  // Leads + spend by channel
  const byChannel: Record<string, { leads: number; spend: number; impressions: number; reach: number; clicks: number; conversions: number }> = {}
  for (const r of filtered) {
    if (!byChannel[r.channel]) byChannel[r.channel] = { leads: 0, spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0 }
    byChannel[r.channel].leads += r.leads
    byChannel[r.channel].spend += r.spend
    byChannel[r.channel].impressions += r.impressions
    byChannel[r.channel].reach += r.reach
    byChannel[r.channel].clicks += r.clicks
    byChannel[r.channel].conversions += r.conversions
  }

  const channelChartData = Object.entries(byChannel)
    .filter(([, v]) => v.leads > 0 || v.spend > 0)
    .map(([ch, v]) => ({
      name: (CHANNEL_CONFIG[ch]?.icon ?? '') + ' ' + (CHANNEL_CONFIG[ch]?.label ?? ch),
      leads: v.leads,
      inversión: Math.round(v.spend),
      conversiones: v.conversions,
      color: CHANNEL_CONFIG[ch]?.color ?? '#8b5cf6',
    }))

  // Spend over time (by month)
  const byMonth: Record<string, number> = {}
  for (const r of filtered) {
    const key = new Date(r.date).toISOString().slice(0, 7)
    byMonth[key] = (byMonth[key] ?? 0) + r.spend
  }
  const trendData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, spend]) => ({ mes: m.slice(5) + '/' + m.slice(2, 4), inversión: Math.round(spend) }))

  // Leads by project (pie)
  const byProject: Record<string, number> = {}
  for (const r of filtered) {
    const key = r.project?.name ?? 'General'
    byProject[key] = (byProject[key] ?? 0) + r.leads
  }
  const pieData = Object.entries(byProject).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

  const KPI = ({ label, value, sub, color = 'text-gray-900' }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Filter */}
      {projects.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Proyecto:</span>
          <button onClick={() => setFilterProject('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterProject === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Todos
          </button>
          {projects.map(p => (
            <button key={p} onClick={() => setFilterProject(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterProject === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-gray-600 font-semibold mb-1">Aún no hay registros</p>
          <p className="text-gray-400 text-sm">Agrega tu primer registro de métricas en la pestaña "Registros"</p>
        </div>
      ) : (
        <>
          {/* KPIs row 1 */}
          <div className="grid grid-cols-4 gap-4">
            <KPI label="Inversión total" value={`$${fmt(totalSpend)}`} sub={`${filtered.length} registros`} />
            <KPI label="Total leads" value={fmt(totalLeads)} sub={`CPL: $${fmt(cpl)}`} color="text-blue-600" />
            <KPI label="Impresiones" value={fmt(totalImpressions)} sub={`Alcance: ${fmt(totalReach)}`} />
            <KPI label="Clics" value={fmt(totalClicks)} sub={`CTR: ${ctr.toFixed(2)}%`} color="text-indigo-600" />
          </div>
          {/* KPIs row 2 */}
          <div className="grid grid-cols-4 gap-4">
            <KPI label="CTR" value={`${ctr.toFixed(2)}%`} sub="clics / impresiones" />
            <KPI label="CPL" value={`$${fmt(cpl)}`} sub="costo por lead" color="text-emerald-600" />
            <KPI label="CPC" value={`$${fmt(cpc)}`} sub="costo por clic" />
            <KPI label="Reservas / Ventas" value={fmt(totalConversions)} sub={`CPM: $${fmt(cpm)}`} color="text-green-600" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-5">
            {/* Leads + conversiones por canal */}
            {channelChartData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">Leads y conversiones por canal</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={channelChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="leads" name="Leads" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="conversiones" name="Ventas" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Inversión por canal */}
            {channelChartData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">Inversión por canal ($)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={channelChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => [`$${fmt(Number(v))}`, 'Inversión']} />
                    <Bar dataKey="inversión" name="Inversión ($)" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Trend */}
            {trendData.length > 1 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">Inversión mensual ($)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => [`$${fmt(Number(v))}`, 'Inversión']} />
                    <Line type="monotone" dataKey="inversión" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Leads by project pie */}
            {pieData.length > 1 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">Leads por proyecto</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Channel breakdown table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Métricas detalladas por canal</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Canal','Inversión','Impresiones','Alcance','Clics','CTR','Leads','CPL','CPC','CPM','Ventas'].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byChannel).map(([ch, v]) => {
                    const cfg = CHANNEL_CONFIG[ch]
                    const chCtr = v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0
                    const chCpl = v.leads > 0 ? v.spend / v.leads : 0
                    const chCpc = v.clicks > 0 ? v.spend / v.clicks : 0
                    const chCpm = v.impressions > 0 ? (v.spend / v.impressions) * 1000 : 0
                    return (
                      <tr key={ch} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{cfg?.icon} {cfg?.label ?? ch}</td>
                        <td className="px-4 py-3 font-semibold">${fmt(v.spend)}</td>
                        <td className="px-4 py-3 text-gray-600">{fmt(v.impressions)}</td>
                        <td className="px-4 py-3 text-gray-600">{fmt(v.reach)}</td>
                        <td className="px-4 py-3 text-gray-600">{fmt(v.clicks)}</td>
                        <td className="px-4 py-3 text-gray-600">{chCtr.toFixed(2)}%</td>
                        <td className="px-4 py-3 font-semibold text-blue-600">{v.leads}</td>
                        <td className="px-4 py-3">{chCpl > 0 ? `$${fmt(chCpl)}` : '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{chCpc > 0 ? `$${fmt(chCpc)}` : '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{chCpm > 0 ? `$${fmt(chCpm)}` : '—'}</td>
                        <td className="px-4 py-3 font-semibold text-green-600">{v.conversions}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Records Tab ──────────────────────────────────────────────────────────────
function RecordsTab({ records, projects, onAdd, onEdit, onDelete }: {
  records: MarketingRecord[]
  projects: Project[]
  onAdd: () => void
  onEdit: (r: MarketingRecord) => void
  onDelete: (id: string) => void
}) {
  const [filterChannel, setFilterChannel] = useState('all')
  const [filterProject, setFilterProject] = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('all')

  const filtered = records.filter(r =>
    (filterChannel === 'all' || r.channel === filterChannel) &&
    (filterProject === 'all' || (r.project?.id ?? '') === filterProject || (!r.project && filterProject === 'general')) &&
    (filterPeriod === 'all' || r.period === filterPeriod)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
          <option value="all">Todos los canales</option>
          {CHANNELS.map(c => <option key={c} value={c}>{CHANNEL_CONFIG[c].icon} {CHANNEL_CONFIG[c].label}</option>)}
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
          <option value="all">Todos los proyectos</option>
          <option value="general">General</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
          <option value="all">Todos los períodos</option>
          {PERIODS.map(p => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
        </select>
        <div className="ml-auto">
          <button onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + Agregar registro
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 text-sm">No hay registros con estos filtros.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Fecha','Canal','Proyecto','Período','Inversión','Impresiones','Alcance','Clics','CTR','Leads','CPL','Ventas',''].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const cfg = CHANNEL_CONFIG[r.channel]
                  const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0
                  const cpl = r.leads > 0 ? r.spend / r.leads : 0
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-blue-50 group">
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{new Date(r.date).toLocaleDateString('es-PA', { day:'2-digit', month:'short', year:'2-digit' })}</td>
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">{cfg?.icon} {cfg?.label ?? r.channel}</td>
                      <td className="px-3 py-2.5 text-gray-600 max-w-32 truncate">{r.project?.name ?? <span className="text-gray-400">General</span>}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.period === 'DIARIO' ? 'bg-blue-50 text-blue-700' : r.period === 'SEMANAL' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                          {PERIOD_LABELS[r.period]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold">${fmt(r.spend)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{fmt(r.impressions)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{fmt(r.reach)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{fmt(r.clicks)}</td>
                      <td className="px-3 py-2.5 text-gray-500">{ctr.toFixed(1)}%</td>
                      <td className="px-3 py-2.5 font-semibold text-blue-600">{r.leads}</td>
                      <td className="px-3 py-2.5 text-gray-600">{cpl > 0 ? `$${fmt(cpl)}` : '—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-green-600">{r.conversions > 0 ? r.conversions : '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onEdit(r)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                          <button onClick={() => { if (confirm('¿Eliminar este registro?')) onDelete(r.id) }}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">🗑</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Campaigns Tab ────────────────────────────────────────────────────────────
function CampaignsTab({ campaigns }: { campaigns: Campaign[] }) {
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0)
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVA').length
  const cpl = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Campañas activas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{activeCampaigns}</p>
          <p className="text-xs text-gray-400 mt-0.5">de {campaigns.length} totales</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Presupuesto total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${fmt(totalBudget)}</p>
          <p className="text-xs text-gray-400 mt-0.5">${fmt(totalSpent)} gastado</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Leads de campañas</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalLeads}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">CPL de campañas</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">${fmt(cpl)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Campaña','Canal','Proyecto','Presupuesto','Gastado','Impresiones','Clics','CTR','Leads','CPL','Estado'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const cfg = CHANNEL_CONFIG[c.channel]
                const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0'
                const cpl = c.leads > 0 ? Math.round(c.spent / c.leads) : null
                return (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-blue-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-gray-900 max-w-48 truncate">{c.name}</div>
                      <div className="text-xs text-gray-400">{formatDate(c.startDate as string)}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{cfg?.icon} {cfg?.label ?? c.channel}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-32 truncate">{c.project?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium">${fmt(c.budget)}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">${fmt(c.spent)}</div>
                      <div className="w-16 bg-gray-100 rounded-full h-1.5 mt-1">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${c.budget > 0 ? Math.min((c.spent/c.budget)*100,100) : 0}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmt(c.impressions)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmt(c.clicks)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ctr}%</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">{c.leads}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cpl ? `$${fmt(cpl)}` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.status === 'ACTIVA' ? 'bg-green-100 text-green-700' : c.status === 'PAUSADA' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MarketingClient({ data }: { data: MarketingData }) {
  const [tab, setTab] = useState<'dashboard' | 'records' | 'campaigns'>('dashboard')
  const [records, setRecords] = useState<MarketingRecord[]>(data.marketingRecords)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MarketingRecord | null>(null)

  function handleSaved(r: MarketingRecord) {
    setRecords(prev => {
      const idx = prev.findIndex(x => x.id === r.id)
      if (idx >= 0) return prev.map(x => x.id === r.id ? r : x)
      return [r, ...prev]
    })
    setShowModal(false)
    setEditingRecord(null)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/marketing-records/${id}`, { method: 'DELETE' })
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const TABS = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'records',   label: '📋 Registros' },
    { key: 'campaigns', label: '🎯 Campañas' },
  ] as const

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
          <p className="text-gray-500 mt-1 text-sm">Métricas por proyecto, canal y período</p>
        </div>
        <button
          onClick={() => { setEditingRecord(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          + Nuevo registro
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab records={records} channelStats={data.channelStats} campaigns={data.campaigns} />}
      {tab === 'records' && (
        <RecordsTab
          records={records}
          projects={data.projects}
          onAdd={() => { setEditingRecord(null); setShowModal(true) }}
          onEdit={r => { setEditingRecord(r); setShowModal(true) }}
          onDelete={handleDelete}
        />
      )}
      {tab === 'campaigns' && <CampaignsTab campaigns={data.campaigns} />}

      {showModal && (
        <RecordModal
          record={editingRecord}
          projects={data.projects}
          onClose={() => { setShowModal(false); setEditingRecord(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
