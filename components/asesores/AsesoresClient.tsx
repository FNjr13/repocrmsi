'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { STAGE_CONFIG } from '@/lib/utils'
import { CreateUserModal, ResetPasswordModal, roleLabel } from '@/components/admin/UserModals'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts'

type AsesorData = {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  hasPassword: boolean
  totalLeads: number
  wonLeads: number
  activeLeads: number
  lostLeads: number
  conversionRate: number
  byStage: Record<string, number>
  byProject: Record<string, number>
}

const PALETTE = [
  { bg: 'from-violet-500 to-purple-600', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', hex: '#8b5cf6' },
  { bg: 'from-pink-500 to-rose-600', light: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', hex: '#ec4899' },
  { bg: 'from-blue-500 to-cyan-600', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hex: '#3b82f6' },
  { bg: 'from-amber-500 to-orange-600', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', hex: '#f59e0b' },
  { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', hex: '#10b981' },
  { bg: 'from-slate-500 to-slate-700', light: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', hex: '#64748b' },
]

const STAGE_PIPELINE = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'VISITA', 'NEGOCIACION']
const STAGE_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#8b5cf6', '#f97316']

function isSalesRole(role: string) {
  return role.toUpperCase().includes('ASESOR')
}

export default function AsesoresClient({ asesores }: { asesores: AsesorData[] }) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [resetTarget, setResetTarget] = useState<AsesorData | null>(null)

  const salesTeam = asesores.filter(a => isSalesRole(a.role))
  const otherUsers = asesores.filter(a => !isSalesRole(a.role))

  const handleCreated = () => router.refresh()

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`¿Desactivar a ${name}? Dejará de aparecer en esta vista.`)) return
    await fetch(`/api/agents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    router.refresh()
  }

  const handleSavePassword = async (password: string) => {
    if (!resetTarget) return
    await fetch(`/api/agents/${resetTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setResetTarget(null)
    router.refresh()
  }

  // Datos comparativos para chart lado a lado
  const compareData = STAGE_PIPELINE.map((stage) => ({
    name: STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]?.label || stage,
    ...salesTeam.reduce((acc, a) => ({ ...acc, [a.name.split(' ')[0]]: a.byStage[stage] || 0 }), {}),
  }))

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipo</h1>
          <p className="text-gray-500 mt-1">Asesoras de ventas y usuarios con acceso a la plataforma</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar usuario
        </button>
      </div>

      {salesTeam.length === 0 && otherUsers.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">Aún no hay usuarios registrados.</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 text-blue-600 text-sm font-semibold hover:underline">
            Agregar el primero →
          </button>
        </div>
      )}

      {/* Asesor cards */}
      {salesTeam.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {salesTeam.map((asesor, idx) => {
            const colors = PALETTE[idx % PALETTE.length]
            const initials = asesor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            const convPct = asesor.conversionRate.toFixed(1)

            const projectData = Object.entries(asesor.byProject)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([name, count]) => ({ name, count }))

            return (
              <div key={asesor.id} className={`bg-white rounded-2xl border-2 ${colors.border} overflow-hidden shadow-sm`}>
                {/* Card header */}
                <div className={`bg-gradient-to-r ${colors.bg} p-6 text-white`}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold text-white border-2 border-white/30 flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold truncate">{asesor.name}</h2>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <p className="text-white/80 text-sm">{roleLabel(asesor.role)}</p>
                        {!asesor.hasPassword && (
                          <span className="text-[10px] font-semibold bg-red-500/30 text-white px-2 py-0.5 rounded-full">Sin acceso</span>
                        )}
                      </div>
                      {asesor.phone && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-white/90 text-xs bg-white/20 rounded-full px-3 py-1">
                            📱 {asesor.phone}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Conversion badge */}
                    <div className="text-center bg-white/20 backdrop-blur rounded-2xl p-4 border border-white/30 flex-shrink-0">
                      <div className="text-3xl font-bold">{convPct}%</div>
                      <div className="text-white/80 text-xs mt-1">conversión</div>
                    </div>
                  </div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-4 border-b border-gray-100">
                  {[
                    { label: 'Total Leads', value: asesor.totalLeads, color: 'text-gray-900' },
                    { label: 'Activos', value: asesor.activeLeads, color: 'text-blue-600' },
                    { label: 'Ganados', value: asesor.wonLeads, color: 'text-green-600' },
                    { label: 'Perdidos', value: asesor.lostLeads, color: 'text-red-400' },
                  ].map(stat => (
                    <div key={stat.label} className="p-4 text-center border-r border-gray-100 last:border-0">
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Pipeline visual */}
                <div className="p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Pipeline actual</h4>
                  <div className="space-y-2">
                    {STAGE_PIPELINE.map((stage, i) => {
                      const count = asesor.byStage[stage] || 0
                      const max = Math.max(...salesTeam.flatMap(a => STAGE_PIPELINE.map(s => a.byStage[s] || 0)), 1)
                      const pct = Math.round((count / max) * 100)
                      const cfg = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]
                      return (
                        <div key={stage} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-28 flex-shrink-0">{cfg?.label}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[i] }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-4 text-right">{count}</span>
                        </div>
                      )
                    })}
                    {/* Ganado */}
                    <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                      <span className="text-xs text-green-600 font-medium w-28 flex-shrink-0">✓ Ganado</span>
                      <div className="flex-1 bg-green-50 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all"
                          style={{ width: `${Math.round(((asesor.byStage['GANADO'] || 0) / Math.max(asesor.totalLeads, 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-green-600 w-4 text-right">{asesor.byStage['GANADO'] || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Projects */}
                {projectData.length > 0 && (
                  <div className="px-5 pb-5">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Leads por Proyecto</h4>
                    <div className="space-y-1.5">
                      {projectData.map(({ name, count }) => (
                        <div key={name} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                          <span className="text-xs text-gray-600 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                            {name}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.light} ${colors.text}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="px-5 pb-5 flex gap-2">
                  <Link
                    href={`/crm?agentId=${asesor.id}`}
                    className={`flex-1 block text-center py-2.5 rounded-xl text-sm font-semibold ${colors.light} ${colors.text} hover:opacity-80 transition-opacity border ${colors.border}`}
                  >
                    Ver leads de {asesor.name.split(' ')[0]} →
                  </Link>
                  <button
                    onClick={() => setResetTarget(asesor)}
                    className="px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-gray-100"
                    title="Contraseña"
                  >
                    🔑
                  </button>
                  <button
                    onClick={() => handleDeactivate(asesor.id, asesor.name)}
                    className="px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-gray-100"
                    title="Desactivar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Comparativo lado a lado */}
      {salesTeam.length >= 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-1">Comparativo del Equipo</h3>
          <p className="text-sm text-gray-500 mb-5">Distribución de leads en el pipeline por asesora</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={compareData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              />
              {salesTeam.map((a, idx) => (
                <Bar
                  key={a.id}
                  dataKey={a.name.split(' ')[0]}
                  fill={PALETTE[idx % PALETTE.length].hex}
                  radius={[4, 4, 0, 0]}
                  name={a.name}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-2 flex-wrap">
            {salesTeam.map((a, idx) => (
              <div key={a.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PALETTE[idx % PALETTE.length].hex }}
                />
                <span className="text-sm text-gray-600">{a.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Otros usuarios (operativo, director, etc.) */}
      {otherUsers.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">Otros usuarios</h3>
          <p className="text-sm text-gray-500 mb-4">Usuarios con acceso general a la plataforma</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherUsers.map((user, idx) => {
              const colors = PALETTE[(salesTeam.length + idx) % PALETTE.length]
              const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={user.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors.light} ${colors.text}`}>
                        {roleLabel(user.role)}
                      </span>
                      {!user.hasPassword && (
                        <span className="text-[10px] font-semibold bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Sin acceso</span>
                      )}
                    </div>
                    {user.phone && <p className="text-xs text-gray-400 mt-2 truncate">📱 {user.phone}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setResetTarget(user)}
                      className="text-gray-300 hover:text-blue-600 transition-colors"
                      title="Contraseña"
                    >
                      🔑
                    </button>
                    <button
                      onClick={() => handleDeactivate(user.id, user.name)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Desactivar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {resetTarget && (
        <ResetPasswordModal
          userName={resetTarget.name}
          onClose={() => setResetTarget(null)}
          onSaved={handleSavePassword}
        />
      )}
    </div>
  )
}
