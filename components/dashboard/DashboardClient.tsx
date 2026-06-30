'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatNumber, STAGE_CONFIG, SOURCE_CONFIG, STATUS_CONFIG, PROJECT_TYPE_CONFIG } from '@/lib/utils'
import MetasSection from '@/components/projects/MetasSection'
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316']

interface Project {
  id: string; name: string; status: string; progress: number
  totalUnits: number; availableUnits: number; soldUnits: number; reservedUnits: number
  priceMin: number; priceMax: number; type: string; location: string; currency?: string
  deliveryDate?: string | null
}
interface AgentStat { id: string; name: string; total: number; won: number; active: number }
interface DashboardData {
  stats: { totalLeads: number; leadsThisMonth: number; wonLeadsThisMonth: number; activeProjects: number; totalBudget: number; totalSpent: number; totalCampaignLeads: number; totalClicks: number; totalImpressions: number; totalConversions: number; activeReservations: number; reservationVolume: number; unreadNotifications: number }
  leadsByStage: Array<{ stage: string; _count: { stage: number } }>
  leadsBySource: Array<{ source: string; _count: { source: number } }>
  recentLeads: Array<{ id: string; firstName: string; lastName: string; phone: string; source: string; stage: string; createdAt: Date | string; project: { name: string } | null; agent: { name: string } | null }>
  projects: Project[]
  monthlyData: Array<{ month: string; leads: number; ventas: number }>
  agentStats: AgentStat[]
}

interface Campaign {
  id: string; name: string; channel: string; status: string
  budget: number; spent: number; impressions: number
  clicks: number; leads: number; conversions: number
}

interface SourceDatum { name: string; value: number; icon: string }
interface StageDatum { name: string; value: number }

// ─── Campaign update modal ────────────────────────────────────────────────────
function CampaignUpdateModal({ campaign, onClose, onSaved }: {
  campaign: Campaign; onClose: () => void; onSaved: (updated: Campaign) => void
}) {
  const [form, setForm] = useState({
    spent: String(campaign.spent), impressions: String(campaign.impressions),
    clicks: String(campaign.clicks), leads: String(campaign.leads),
    conversions: String(campaign.conversions), status: campaign.status,
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/campaigns/${campaign.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spent: Number(form.spent), impressions: Number(form.impressions), clicks: Number(form.clicks), leads: Number(form.leads), conversions: Number(form.conversions), status: form.status }),
    })
    if (res.ok) { onSaved(await res.json()) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Actualizar métricas</h3>
            <p className="text-sm text-gray-500 mt-0.5">{campaign.name} · {campaign.channel}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          {[
            { label: '👁️ Impresiones', key: 'impressions' },
            { label: '🖱️ Clicks', key: 'clicks' },
            { label: '👤 Leads generados', key: 'leads' },
            { label: '✅ Conversiones', key: 'conversions' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
              <input type="number" min="0" value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Estado</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="ACTIVA">Activa</option>
              <option value="PAUSADA">Pausada</option>
              <option value="FINALIZADA">Finalizada</option>
            </select>
          </div>
        </div>
        <div className="p-5 pt-0 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
            {saving ? 'Guardando...' : 'Guardar métricas'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Per-project view ─────────────────────────────────────────────────────────
function ProjectDashboard({ project }: { project: Project }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/dashboard?projectId=${project.id}`)
    setData(await res.json())
    setLoading(false)
  }, [project.id])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-bounce">📊</div>
        <p className="text-gray-400">Cargando datos de {project.name}...</p>
      </div>
    </div>
  )
  if (!data) return null

  const { stats, leadsByStage, leadsBySource, campaigns, monthlyData, agentStats } = data as {
    stats: Record<string, number>
    leadsByStage: Array<{ stage: string; _count: { stage: number } }>
    leadsBySource: Array<{ source: string; _count: { source: number } }>
    campaigns: Campaign[]
    monthlyData: Array<{ month: string; leads: number; ventas: number }>
    agentStats: AgentStat[]
  }
  const convRate = stats.totalLeads > 0 ? ((stats.wonLeads / stats.totalLeads) * 100).toFixed(1) : '0.0'
  const soldPct = Math.round((project.soldUnits / project.totalUnits) * 100)
  const reservedPct = Math.round((project.reservedUnits / project.totalUnits) * 100)
  const typeCfg = PROJECT_TYPE_CONFIG[project.type as keyof typeof PROJECT_TYPE_CONFIG]

  const sourceData: SourceDatum[] = (leadsBySource as Array<{ source: string; _count: { source: number } }>).map(s => ({
    name: SOURCE_CONFIG[s.source as keyof typeof SOURCE_CONFIG]?.label || s.source,
    value: s._count.source,
    icon: SOURCE_CONFIG[s.source as keyof typeof SOURCE_CONFIG]?.icon || '📌',
  }))

  const stageData: StageDatum[] = (leadsByStage as Array<{ stage: string; _count: { stage: number } }>)
    .filter(s => s.stage !== 'PERDIDO')
    .map(s => ({
      name: STAGE_CONFIG[s.stage as keyof typeof STAGE_CONFIG]?.label || s.stage,
      value: s._count.stage,
    }))

  return (
    <div className="space-y-6">
      {/* Project header card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-3xl">
              {typeCfg?.icon || '🏢'}
            </div>
            <div>
              <div className="text-slate-300 text-xs font-medium uppercase tracking-wide">{typeCfg?.label}</div>
              <h2 className="text-2xl font-bold mt-0.5">{project.name}</h2>
              <p className="text-slate-300 text-sm mt-0.5">📍 {project.location}</p>
            </div>
          </div>
          <div className="flex gap-6 text-center">
            <div><div className="text-2xl font-bold text-green-400">{project.soldUnits}</div><div className="text-xs text-slate-400">Vendidas</div></div>
            <div><div className="text-2xl font-bold text-yellow-400">{project.reservedUnits}</div><div className="text-xs text-slate-400">Reservadas</div></div>
            <div><div className="text-2xl font-bold text-blue-400">{project.availableUnits}</div><div className="text-xs text-slate-400">Disponibles</div></div>
          </div>
        </div>

        {/* Units bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Unidades ({project.totalUnits} total)</span>
            <span>{soldPct}% vendido</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            <div className="bg-green-400 transition-all" style={{ width: `${soldPct}%` }} />
            <div className="bg-yellow-400 transition-all" style={{ width: `${reservedPct}%` }} />
            <div className="bg-white/10 flex-1" />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full inline-block" />Vendido</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-full inline-block" />Reservado</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white/30 rounded-full inline-block" />Disponible</span>
          </div>
        </div>

        {/* Avance */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/10 text-sm">
          <span className="text-slate-300">Avance de obra: <strong className="text-white">{project.progress}%</strong></span>
        </div>
      </div>

      {/* KPIs del proyecto */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 lg:gap-4">
        {[
          { label: 'Total leads', value: stats.totalLeads, color: 'text-blue-600', bg: 'bg-blue-50', icon: '👤' },
          { label: 'Este mes', value: stats.leadsThisMonth, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: '📅' },
          { label: 'Ganados', value: stats.wonLeads, color: 'text-green-600', bg: 'bg-green-50', icon: '✅' },
          { label: 'Conversión', value: `${convRate}%`, color: 'text-purple-600', bg: 'bg-purple-50', icon: '🎯' },
          { label: 'Perdidos', value: stats.lostLeads ?? 0, color: 'text-red-600', bg: 'bg-red-50', icon: '❌' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl border border-gray-200 p-4`}>
            <div className="text-xl mb-1">{k.icon}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Metas mensuales */}
      <MetasSection projectId={project.id} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Monthly trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Leads últimos 6 meses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="leads" stroke="#3b82f6" fill="#dbeafe" name="Leads" strokeWidth={2} />
              <Area type="monotone" dataKey="ventas" stroke="#10b981" fill="#d1fae5" name="Ganados" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Source + Stage */}
        <div className="space-y-4">
          {/* By source */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Por canal</h3>
            {sourceData.length === 0 ? <p className="text-sm text-gray-400">Sin leads</p> : (
              <div className="space-y-2">
                {sourceData.sort((a, b) => b.value - a.value).map((s, i) => {
                  const pct = stats.totalLeads > 0 ? Math.round((s.value / stats.totalLeads) * 100) : 0
                  return (
                    <div key={s.name}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-xs text-gray-600">{s.icon} {s.name}</span>
                        <span className="text-xs font-bold">{s.value} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* By stage */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Pipeline actual</h3>
            {stageData.length === 0 ? <p className="text-sm text-gray-400">Sin leads</p> : (
              <div className="space-y-1.5">
                {stageData.map(s => {
                  const cfg = STAGE_CONFIG[Object.keys(STAGE_CONFIG).find(k => STAGE_CONFIG[k as keyof typeof STAGE_CONFIG].label === s.name) as keyof typeof STAGE_CONFIG]
                  return (
                    <div key={s.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg?.color || 'bg-gray-100 text-gray-700'}`}>{s.name}</span>
                      <span className="font-bold text-sm text-gray-800">{s.value}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asesoras performance */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">👩‍💼 Rendimiento de asesoras en este proyecto</h3>
        <div className="grid grid-cols-2 gap-4">
          {(agentStats as AgentStat[]).filter(a => a.total > 0).map(a => (
            <div key={a.id} className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {a.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{a.name}</div>
                <div className="flex gap-3 mt-1 text-xs">
                  <span className="text-blue-600 font-medium">{a.total} leads</span>
                  <span className="text-green-600 font-medium">{a.won} ganados</span>
                  <span className="text-orange-500 font-medium">{a.active} activos</span>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${a.total > 0 && Math.round((a.won / a.total) * 100) >= 20 ? 'text-green-600' : 'text-gray-700'}`}>
                  {a.total > 0 ? Math.round((a.won / a.total) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-400">conversión</div>
              </div>
            </div>
          ))}
          {agentStats.filter(a => a.total > 0).length === 0 && (
            <p className="text-sm text-gray-400 col-span-2 text-center py-4">Sin leads asignados a asesoras en este proyecto</p>
          )}
        </div>
      </div>

      {/* Campaigns */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">📣 Campañas del proyecto</h3>
          <span className="text-xs text-gray-400">{campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''}</span>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin campañas registradas para este proyecto</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  {['Campaña', 'Canal', 'Estado', 'Impresiones', 'Clicks', 'Leads', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map(c => {
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500">{c.channel}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'ACTIVA' ? 'bg-green-100 text-green-700' : c.status === 'PAUSADA' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatNumber(c.impressions)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatNumber(c.clicks)}</td>
                      <td className="px-4 py-3 font-semibold text-blue-600">{c.leads}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditingCampaign(c)}
                          className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-500 px-2.5 py-1 rounded-lg transition-colors font-medium"
                        >
                          ✏️ Actualizar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingCampaign && (
        <CampaignUpdateModal
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSaved={(updated) => {
            setData(prev => prev ? {
              ...prev,
              campaigns: (prev.campaigns as Campaign[]).map(c => c.id === updated.id ? updated : c),
            } : null)
            setEditingCampaign(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Executive General Dashboard ─────────────────────────────────────────────
function GeneralDashboard({ data }: { data: DashboardData }) {
  const { stats, leadsByStage, projects, agentStats, recentLeads } = data

  // Portfolio totals
  const totalUnits = projects.reduce((s, p) => s + p.totalUnits, 0)
  const totalSold = projects.reduce((s, p) => s + p.soldUnits, 0)
  const totalReserved = projects.reduce((s, p) => s + p.reservedUnits, 0)
  const totalAvail = projects.reduce((s, p) => s + p.availableUnits, 0)

  const soldPct = totalUnits > 0 ? Math.round((totalSold / totalUnits) * 100) : 0
  const reservedPct = totalUnits > 0 ? Math.round((totalReserved / totalUnits) * 100) : 0

  // Pipeline (active only, no GANADO/PERDIDO)
  const pipeline = leadsByStage.filter(s => !['GANADO', 'PERDIDO'].includes(s.stage))
  const totalActive = pipeline.reduce((s, x) => s + x._count.stage, 0)

  // Recent wins
  const recentWins = recentLeads.filter(l => l.stage === 'GANADO').slice(0, 5)


  return (
    <div className="space-y-6">

      {/* ── Top KPI strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 lg:gap-4">
        {[
          { label: 'Proyectos Activos', value: stats.activeProjects, sub: 'en venta / pre venta', icon: '🏗️', bg: 'from-blue-500 to-blue-600' },
          { label: 'Portfolio Total', value: `${totalUnits} uds`, sub: `${totalAvail} disponibles`, icon: '🏘️', bg: 'from-slate-600 to-slate-700' },
          { label: 'Unidades Vendidas', value: totalSold, sub: `${soldPct}% del total`, icon: '✅', bg: 'from-green-500 to-green-600' },
          { label: 'Unidades Reservadas', value: totalReserved, sub: `${reservedPct}% del total`, icon: '🔒', bg: 'from-yellow-500 to-yellow-600' },
          { label: 'Leads Activos', value: totalActive, sub: 'en pipeline', icon: '👥', bg: 'from-purple-500 to-purple-600' },
        ].map(k => (
          <div key={k.label} className={`bg-gradient-to-br ${k.bg} rounded-2xl p-5 text-white`}>
            <div className="text-2xl mb-2">{k.icon}</div>
            <div className="text-2xl font-bold leading-tight">{k.value}</div>
            <div className="text-xs font-semibold mt-0.5 opacity-90">{k.label}</div>
            <div className="text-xs opacity-60 mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Reservas & CRM quick stats ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: 'Leads activos', value: stats.totalLeads - stats.wonLeadsThisMonth, sub: 'en seguimiento', icon: '📋', color: 'text-blue-600', bg: 'bg-blue-50', href: '/crm' },
          { label: 'Ganados este mes', value: stats.wonLeadsThisMonth, sub: 'leads cerrados', icon: '🏆', color: 'text-violet-600', bg: 'bg-violet-50', href: '/crm' },
          { label: 'Leads este mes', value: stats.leadsThisMonth, sub: 'nuevos ingresos', icon: '👤', color: 'text-green-600', bg: 'bg-green-50', href: '/crm' },
          { label: 'Notificaciones', value: stats.unreadNotifications, sub: stats.unreadNotifications > 0 ? 'pendientes de revisar' : 'todo al día', icon: '🔔', color: stats.unreadNotifications > 0 ? 'text-amber-600' : 'text-gray-500', bg: stats.unreadNotifications > 0 ? 'bg-amber-50' : 'bg-gray-50', href: '#' },
        ].map(s => (
          <a key={s.label} href={s.href} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 hover:shadow-md transition-all flex items-center gap-4">
            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          </a>
        ))}
      </div>

      {/* ── Portfolio units bar ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Estado del Portfolio — {totalUnits} unidades totales</h3>
          <Link href="/projects" className="text-sm text-blue-600 hover:underline font-medium">Ver proyectos →</Link>
        </div>
        <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
          <div className="bg-green-500 transition-all flex items-center justify-center" style={{ width: `${soldPct}%` }}>
            {soldPct >= 8 && <span className="text-white text-xs font-bold">{soldPct}%</span>}
          </div>
          <div className="bg-yellow-400 transition-all flex items-center justify-center" style={{ width: `${reservedPct}%` }}>
            {reservedPct >= 8 && <span className="text-white text-xs font-bold">{reservedPct}%</span>}
          </div>
          <div className="bg-gray-200 flex-1" />
        </div>
        <div className="flex items-center gap-6 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded-sm inline-block" /> Vendidas ({totalSold})</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-400 rounded-sm inline-block" /> Reservadas ({totalReserved})</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-gray-200 rounded-sm inline-block border" /> Disponibles ({totalAvail})</span>
        </div>
      </div>

      {/* ── Projects table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">📊 Portfolio de Proyectos</h3>
          <Link href="/projects" className="text-sm text-blue-600 hover:underline font-medium">Gestionar →</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase bg-gray-50">
              {['Proyecto', 'Estado', 'Ubicación', 'Tipo', 'Total', 'Vendidas', 'Reservadas', 'Disponibles', 'Progreso ventas'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map(p => {
              const statusCfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]
              const typeCfg = PROJECT_TYPE_CONFIG[p.type as keyof typeof PROJECT_TYPE_CONFIG]
              const pct = p.totalUnits > 0 ? Math.round((p.soldUnits / p.totalUnits) * 100) : 0
              const resPct = p.totalUnits > 0 ? Math.round((p.reservedUnits / p.totalUnits) * 100) : 0
              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`} className="flex items-center gap-2.5 group">
                      <span className="text-xl">{typeCfg?.icon || '🏢'}</span>
                      <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusCfg?.color || 'bg-gray-100 text-gray-600'}`}>{statusCfg?.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.location}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{typeCfg?.label}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{p.totalUnits}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${p.soldUnits > 0 ? 'text-green-600' : 'text-gray-400'}`}>{p.soldUnits}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${p.reservedUnits > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{p.reservedUnits}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-blue-600">{p.availableUnits}</span>
                  </td>
                  <td className="px-4 py-3 min-w-32">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex gap-0.5">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                        <div className="bg-yellow-400 h-full" style={{ width: `${resPct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-600 w-8 text-right">{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Bottom row: Pipeline + Team ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

        {/* Sales pipeline (active) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">🔄 Pipeline Activo</h3>
            <Link href="/crm" className="text-sm text-blue-600 hover:underline font-medium">Ver CRM →</Link>
          </div>
          <div className="mb-3 text-2xl font-bold text-gray-900">{totalActive} <span className="text-sm font-normal text-gray-500">leads en seguimiento</span></div>
          <div className="space-y-2">
            {pipeline
              .sort((a, b) => {
                const order = ['NUEVO','CONTACTADO','INTERESADO','VISITA','NEGOCIACION']
                return order.indexOf(a.stage) - order.indexOf(b.stage)
              })
              .map(s => {
                const cfg = STAGE_CONFIG[s.stage as keyof typeof STAGE_CONFIG]
                const pct = totalActive > 0 ? Math.round((s._count.stage / totalActive) * 100) : 0
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium min-w-24 text-center ${cfg?.color || 'bg-gray-100 text-gray-600'}`}>{cfg?.label || s.stage}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full">
                      <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-800 w-6 text-right">{s._count.stage}</span>
                  </div>
                )
              })}
          </div>
          {pipeline.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin leads activos</p>}
          {/* Recent wins */}
          {recentWins.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🏆 Últimas ventas cerradas</div>
              {recentWins.map(l => (
                <div key={l.id} className="flex items-center gap-2 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold flex-shrink-0">
                    {l.firstName[0]}{l.lastName[0]}
                  </div>
                  <span className="text-sm text-gray-800 font-medium flex-1 truncate">{l.firstName} {l.lastName}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{l.project?.name || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">👩‍💼 Equipo de Ventas</h3>
            <Link href="/asesores" className="text-sm text-blue-600 hover:underline font-medium">Ver asesoras →</Link>
          </div>
          <div className="space-y-4">
            {agentStats.sort((a, b) => b.won - a.won).map((agent, idx) => {
              const convRate = agent.total > 0 ? Math.round((agent.won / agent.total) * 100) : 0
              const avatarColors = ['from-violet-500 to-purple-600', 'from-pink-500 to-rose-600', 'from-blue-500 to-cyan-600', 'from-orange-500 to-amber-600']
              return (
                <div key={agent.id} className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {agent.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{agent.name}</div>
                    <div className="flex gap-4 text-xs text-gray-500 mt-0.5">
                      <span className="text-blue-600 font-medium">{agent.total} leads</span>
                      <span className="text-green-600 font-medium">{agent.won} ganados</span>
                      <span className="text-orange-500 font-medium">{agent.active} activos</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-xl font-bold ${convRate >= 20 ? 'text-green-600' : convRate >= 10 ? 'text-blue-600' : 'text-gray-500'}`}>
                      {convRate}%
                    </div>
                    <div className="text-xs text-gray-400">conversión</div>
                  </div>
                </div>
              )
            })}
            {agentStats.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin asesoras activas</p>}
          </div>

          {/* Total wins summary */}
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-blue-600">{agentStats.reduce((s, a) => s + a.total, 0)}</div>
              <div className="text-xs text-gray-400">Total leads</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-600">{agentStats.reduce((s, a) => s + a.won, 0)}</div>
              <div className="text-xs text-gray-400">Ganados</div>
            </div>
            <div>
              <div className="text-xl font-bold text-orange-500">{agentStats.reduce((s, a) => s + a.active, 0)}</div>
              <div className="text-xs text-gray-400">En seguimiento</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pending tasks widget ─────────────────────────────────────── */}
      <PendingTasksWidget />
    </div>
  )
}

// ─── Pending tasks widget ─────────────────────────────────────────────────────
function PendingTasksWidget() {
  const [tasks, setTasks] = useState<Array<{
    id: string; title: string; type: string; date: string; priority: string; status: string
    lead: { id: string; firstName: string; lastName: string } | null
    agent: { name: string } | null
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date()
    const weekLater = new Date(today.getTime() + 7 * 86400000)
    fetch(`/api/calendar?from=${today.toISOString().slice(0, 10)}&to=${weekLater.toISOString().slice(0, 10)}`)
      .then(r => r.json())
      .then((data: typeof tasks) => {
        setTasks(data.filter((t: typeof tasks[0]) => t.status === 'PENDIENTE').slice(0, 8))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const TYPE_ICONS: Record<string, string> = { TAREA: '✅', LLAMADA: '📞', VISITA: '🏠', REUNION: '🤝', CIERRE: '🏆', OTRO: '📌' }
  const PRIORITY_DOT: Record<string, string> = { ALTA: 'bg-red-500', NORMAL: 'bg-blue-500', BAJA: 'bg-gray-300' }

  const overdueCount = tasks.filter(t => new Date(t.date) < new Date()).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">📋 Tareas pendientes esta semana</h3>
          {overdueCount > 0 && (
            <span className="text-xs text-red-600 font-medium">{overdueCount} vencida{overdueCount > 1 ? 's' : ''}</span>
          )}
        </div>
        <Link href="/tareas" className="text-sm text-blue-600 hover:underline font-medium">Ver todas →</Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-400">🎉 Sin tareas pendientes esta semana</p>
          <Link href="/tareas" className="text-xs text-blue-500 hover:underline mt-1 inline-block">Crear tarea</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => {
            const isOverdue = new Date(t.date) < new Date()
            return (
              <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                <span className="text-lg">{TYPE_ICONS[t.type] ?? '📌'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] ?? 'bg-gray-300'}`} />
                    <span className={`text-sm font-medium truncate ${isOverdue ? 'text-red-800' : 'text-gray-900'}`}>{t.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span>{new Date(t.date).toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    {t.agent && <span>· {t.agent.name}</span>}
                    {t.lead && (
                      <Link href={`/crm/${t.lead.id}`} className="text-blue-500 hover:underline">
                        · {t.lead.firstName} {t.lead.lastName}
                      </Link>
                    )}
                  </div>
                </div>
                {isOverdue && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full flex-shrink-0">VENCIDA</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardClient({ data }: { data: DashboardData }) {
  const [activeTab, setActiveTab] = useState<'general' | string>('general')
  const selectedProject = data.projects.find(p => p.id === activeTab)

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      {/* Header + tabs */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
        <p className="text-gray-500 mt-1 text-sm">Vista global y por proyecto</p>

        {/* Tabs */}
        <div className="flex items-center gap-2 mt-5 border-b border-gray-200 overflow-x-auto pb-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🌐 General
          </button>
          {data.projects.map(p => {
            const tc = PROJECT_TYPE_CONFIG[p.type as keyof typeof PROJECT_TYPE_CONFIG]
            return (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === p.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tc?.icon} {p.name}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'general'
        ? <GeneralDashboard data={data} />
        : selectedProject
          ? <ProjectDashboard project={selectedProject} />
          : null
      }
    </div>
  )
}
