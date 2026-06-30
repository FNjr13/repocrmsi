'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { SOURCE_CONFIG, STAGE_CONFIG, formatRelativeTime } from '@/lib/utils'
import BankQualificationModal from './BankQualificationModal'
import WhatsAppChat from '@/components/whatsapp/WhatsAppChat'

const TEMP_CONFIG = {
  HOT:    { label: '🔥 Hot',    color: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500' },
  WARM:   { label: '☀️ Warm',   color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  NORMAL: { label: '😐 Normal', color: 'bg-blue-100 text-blue-700 border-blue-200',  dot: 'bg-blue-400' },
  COLD:   { label: '🧊 Cold',   color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
}

const ACTIVITY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  LLAMADA:   { label: 'Llamada',   icon: '📞', color: 'bg-blue-100 text-blue-700' },
  WHATSAPP:  { label: 'WhatsApp',  icon: '💬', color: 'bg-green-100 text-green-700' },
  EMAIL:     { label: 'Email',     icon: '📧', color: 'bg-purple-100 text-purple-700' },
  VISITA:    { label: 'Visita',    icon: '🏠', color: 'bg-orange-100 text-orange-700' },
  REUNION:   { label: 'Reunión',   icon: '🤝', color: 'bg-yellow-100 text-yellow-700' },
  NOTA:      { label: 'Nota',      icon: '📝', color: 'bg-gray-100 text-gray-600' },
}

const STAGES = ['NUEVO','CONTACTADO','INTERESADO','VISITA','NEGOCIACION','GANADO','PERDIDO']

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  LLAMADA: { label: 'Llamada', color: 'text-blue-600 bg-blue-50', icon: '📞' },
  VISITA:  { label: 'Visita',  color: 'text-orange-600 bg-orange-50', icon: '🏠' },
  REUNION: { label: 'Reunión', color: 'text-purple-600 bg-purple-50', icon: '🤝' },
  TAREA:   { label: 'Tarea',   color: 'text-gray-600 bg-gray-100', icon: '✅' },
  CIERRE:  { label: 'Cierre',  color: 'text-green-600 bg-green-50', icon: '🏆' },
  OTRO:    { label: 'Otro',    color: 'text-gray-500 bg-gray-50', icon: '📌' },
}

interface Lead {
  id: string; firstName: string; lastName: string
  email: string | null; phone: string; source: string
  stage: string; temperature: string; budget: number | null
  notes: string | null; projectId: string | null; agentId: string | null
  propertyInterest: string | null; financingType: string | null
  followUpDate: string | null; lostReason: string | null
  utmSource: string | null; utmMedium: string | null; utmCampaign: string | null
  createdAt: string; updatedAt: string
  project: { id: string; name: string } | null
  agent: { id: string; name: string } | null
  activities: Array<{ id: string; type: string; description: string; date: string }>
  events: Array<{ id: string; title: string; type: string; date: string; status: string; agent: { id: string; name: string } | null }>
}

export default function LeadDetailClient({
  lead: initialLead,
  agents,
  projects,
}: {
  lead: Lead
  agents: Array<{ id: string; name: string }>
  projects: Array<{ id: string; name: string; type: string; status: string }>
}) {
  const [lead, setLead] = useState<Lead>(initialLead)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Lead>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Activity
  const [actType, setActType] = useState('NOTA')
  const [actDesc, setActDesc] = useState('')
  const [addingAct, setAddingAct] = useState(false)
  const actRef = useRef<HTMLTextAreaElement>(null)

  // Stage
  const [changingStage, setChangingStage] = useState(false)
  const [showLostModal, setShowLostModal] = useState(false)
  const [lostReason, setLostReason] = useState('')

  // Delete
  const [showDelete, setShowDelete] = useState(false)
  // New modals
  const [showSchedule, setShowSchedule] = useState(false)
  const [showReserva, setShowReserva] = useState(false)
  const [showBankQual, setShowBankQual] = useState(false)
  const [rightTab, setRightTab] = useState<'actividades' | 'whatsapp'>('actividades')

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setLead(updated)
    }
  }

  async function addActivity() {
    if (!actDesc.trim()) return
    setAddingAct(true)
    const res = await fetch('/api/activities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, type: actType, description: actDesc }),
    })
    if (res.ok) {
      const act = await res.json()
      setLead(prev => ({ ...prev, activities: [act, ...prev.activities] }))
      setActDesc('')
    }
    setAddingAct(false)
  }

  async function changeStage(stage: string) {
    if (stage === 'PERDIDO') { setShowLostModal(true); return }
    setChangingStage(true)
    await patch({ stage })
    setChangingStage(false)
  }

  async function markLost() {
    setChangingStage(true)
    await patch({ stage: 'PERDIDO', lostReason })
    setShowLostModal(false)
    setChangingStage(false)
  }

  async function saveEdit() {
    setSavingEdit(true)
    await patch(editForm)
    setSavingEdit(false)
    setEditing(false)
    setEditForm({})
  }

  async function deleteLead() {
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
    window.location.href = '/crm'
  }

  const stageCfg = STAGE_CONFIG[lead.stage as keyof typeof STAGE_CONFIG]
  const sourceCfg = SOURCE_CONFIG[lead.source as keyof typeof SOURCE_CONFIG]
  const tempCfg = TEMP_CONFIG[lead.temperature as keyof typeof TEMP_CONFIG] || TEMP_CONFIG.NORMAL
  const cleanPhone = lead.phone.replace(/\D/g, '')

  // Merge activities and events into a unified timeline
  const timelineItems = [
    ...lead.activities.map(a => ({ type: 'activity' as const, data: a, date: new Date(a.date) })),
    ...lead.events.map(e => ({ type: 'event' as const, data: e, date: new Date(e.date) })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  const upcomingEvents = lead.events.filter(e =>
    new Date(e.date) > new Date() && e.status !== 'CANCELADO'
  )

  // eslint-disable-next-line react-hooks/purity
  const daysInCRM = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000)
  const followUpOverdue = lead.followUpDate && new Date(lead.followUpDate) < new Date()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">
            <Link href="/crm" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              <span className="hidden sm:inline">CRM</span>
            </Link>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <span className="text-gray-900 font-semibold text-sm lg:text-base truncate">{lead.firstName} {lead.lastName}</span>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
            {(lead.stage === 'NEGOCIACION' || lead.stage === 'GANADO') && (
              <button onClick={() => setShowReserva(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 lg:px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs lg:text-sm font-semibold rounded-lg transition-colors shadow-sm">
                🏆 <span className="hidden lg:inline">Crear Reserva</span><span className="sm:inline lg:hidden">Reserva</span>
              </button>
            )}
            <button onClick={()=>setShowSchedule(true)}
              className="flex items-center gap-1.5 px-3 lg:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs lg:text-sm font-semibold rounded-lg transition-colors">
              📅 <span className="hidden sm:inline">Agendar</span>
            </button>
            <button onClick={()=>setShowBankQual(true)}
              className="flex items-center gap-1.5 px-3 lg:px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs lg:text-sm font-semibold rounded-lg transition-colors">
              🏦 <span className="hidden sm:inline">Precalificar</span>
            </button>
            <button
              onClick={() => { setEditing(true); setEditForm({ firstName: lead.firstName, lastName: lead.lastName, email: lead.email || '', phone: lead.phone, budget: lead.budget || undefined, projectId: lead.projectId || '', agentId: lead.agentId || '', propertyInterest: lead.propertyInterest || '', financingType: lead.financingType || '', followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().slice(0,16) : '', notes: lead.notes || '' }) }}
              className="flex items-center gap-1.5 px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs lg:text-sm font-semibold rounded-lg transition-colors"
            >
              ✏️ <span className="hidden sm:inline">Editar</span>
            </button>
            <button onClick={() => setShowDelete(true)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">

        {/* ── LEFT COLUMN ── */}
        <div className="col-span-1 space-y-5">

          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold mb-3">
                    {lead.firstName[0]}{lead.lastName[0]}
                  </div>
                  <h1 className="text-xl font-bold">{lead.firstName} {lead.lastName}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${tempCfg.color}`}>{tempCfg.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${stageCfg?.color || 'bg-gray-100 text-gray-600'}`}>{stageCfg?.label || lead.stage}</span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>{daysInCRM} días</div>
                  <div>en CRM</div>
                </div>
              </div>
              {/* Contact buttons */}
              <div className="flex gap-2 mt-4">
                <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                  <span>💬</span> WhatsApp
                </a>
                <a href={`tel:${lead.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                  <span>📞</span> Llamar
                </a>
              </div>
            </div>

            {/* Contact details */}
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-5">📱</span>
                <span className="text-gray-800 font-medium">{lead.phone}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400 w-5">📧</span>
                  <span className="text-gray-800">{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-5">{sourceCfg?.icon || '📌'}</span>
                <span className="text-gray-800">Fuente: {sourceCfg?.label || lead.source}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-5">📅</span>
                <span className="text-gray-500">Desde {new Date(lead.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Temperature picker */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🌡️ Temperatura del Lead</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TEMP_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => patch({ temperature: key })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${lead.temperature === key ? cfg.color + ' ring-2 ring-offset-1 ring-current' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stage pipeline */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Etapa del Pipeline</h3>
            <div className="space-y-1.5">
              {STAGES.map((s, i) => {
                const cfg = STAGE_CONFIG[s as keyof typeof STAGE_CONFIG]
                const isActive = lead.stage === s
                const isPast = STAGES.indexOf(lead.stage) > i && lead.stage !== 'PERDIDO'
                return (
                  <button key={s} onClick={() => changeStage(s)} disabled={changingStage}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                      ${isActive ? (cfg?.color || 'bg-blue-100 text-blue-700') + ' ring-2 ring-blue-300' : ''}
                      ${isPast ? 'bg-gray-50 text-gray-400' : ''}
                      ${!isActive && !isPast ? 'text-gray-600 hover:bg-gray-100' : ''}
                    `}>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs
                      ${isActive ? 'border-current bg-current text-white' : isPast ? 'border-gray-300 bg-gray-200' : 'border-gray-300'}`}>
                      {isPast ? '✓' : isActive ? '●' : ''}
                    </span>
                    {cfg?.label || s}
                    {isActive && <span className="ml-auto text-xs opacity-70">← actual</span>}
                  </button>
                )
              })}
            </div>
            {lead.stage === 'PERDIDO' && lead.lostReason && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg text-xs text-red-600">
                <strong>Razón:</strong> {lead.lostReason}
              </div>
            )}
          </div>

          {/* Lead details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">💼 Detalles del Lead</h3>

            <div className="flex items-start justify-between text-sm py-2 border-b border-gray-100">
              <span className="text-gray-500">Proyecto</span>
              <span className="font-medium text-gray-800 text-right">{lead.project?.name || <span className="text-gray-400">Sin asignar</span>}</span>
            </div>
            <div className="flex items-start justify-between text-sm py-2 border-b border-gray-100">
              <span className="text-gray-500">Asesora</span>
              <span className="font-medium text-gray-800">{lead.agent?.name || <span className="text-gray-400">Sin asignar</span>}</span>
            </div>
            <div className="flex items-start justify-between text-sm py-2 border-b border-gray-100">
              <span className="text-gray-500">Interés</span>
              <span className="font-medium text-gray-800">{lead.propertyInterest || <span className="text-gray-400">—</span>}</span>
            </div>
            <div className="flex items-start justify-between text-sm py-2 border-b border-gray-100">
              <span className="text-gray-500">Financiamiento</span>
              <span className="font-medium text-gray-800">{lead.financingType || <span className="text-gray-400">—</span>}</span>
            </div>
            {lead.followUpDate && (
              <div className={`flex items-start justify-between text-sm py-2 border-b border-gray-100 ${followUpOverdue ? 'text-red-600' : ''}`}>
                <span className={followUpOverdue ? 'text-red-500' : 'text-gray-500'}>
                  {followUpOverdue ? '⚠️ Seguimiento' : '📅 Seguimiento'}
                </span>
                <span className={`font-medium ${followUpOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                  {new Date(lead.followUpDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
            {(lead.utmSource || lead.utmCampaign) && (
              <div className="pt-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">UTM</p>
                {lead.utmSource && <p className="text-xs text-gray-500">Source: {lead.utmSource}</p>}
                {lead.utmMedium && <p className="text-xs text-gray-500">Medium: {lead.utmMedium}</p>}
                {lead.utmCampaign && <p className="text-xs text-gray-500">Campaign: {lead.utmCampaign}</p>}
              </div>
            )}
          </div>

          {/* Score card */}
          {lead.activities.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-5">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">📊 Lead Score</h3>
              <div className="space-y-2.5">
                <div className="border-t border-emerald-200 pt-2.5">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Lead Score</span>
                    <span className="font-bold text-gray-700">{(() => {
                      const TEMP_SCORE: Record<string,number> = {HOT:30,WARM:20,NORMAL:10,COLD:0}
                      const STAGE_SCORE: Record<string,number> = {NUEVO:0,CONTACTADO:5,INTERESADO:10,VISITA:15,NEGOCIACION:25,GANADO:25,PERDIDO:0}
                      let s = (TEMP_SCORE[lead.temperature]||0) + (STAGE_SCORE[lead.stage]||0)
                      if (lead.budget) s += 20
                      const lastA = lead.activities[0]
                      // eslint-disable-next-line react-hooks/purity
                      if (lastA) { const d=Math.floor((Date.now()-new Date(lastA.date).getTime())/86400000); s+=d<=1?15:d<=3?10:d<=7?5:0 }
                      return Math.min(100,s)
                    })()}/100</span>
                  </div>
                  <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${Math.min(100,(() => {
                      const TEMP_SCORE: Record<string,number> = {HOT:30,WARM:20,NORMAL:10,COLD:0}
                      const STAGE_SCORE: Record<string,number> = {NUEVO:0,CONTACTADO:5,INTERESADO:10,VISITA:15,NEGOCIACION:25,GANADO:25,PERDIDO:0}
                      let s = (TEMP_SCORE[lead.temperature]||0) + (STAGE_SCORE[lead.stage]||0)
                      if (lead.budget) s += 20
                      const lastA = lead.activities[0]
                      // eslint-disable-next-line react-hooks/purity
                      if (lastA) { const d=Math.floor((Date.now()-new Date(lastA.date).getTime())/86400000); s+=d<=1?15:d<=3?10:d<=7?5:0 }
                      return s
                    })())}%`}}/>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 Notas internas</h3>
            <NoteEditor leadId={lead.id} initialNotes={lead.notes || ''} onSaved={(notes) => setLead(p => ({ ...p, notes }))} />
          </div>

          {/* Upcoming events */}
          {upcomingEvents.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📆 Próximas actividades</h3>
              <div className="space-y-2">
                {upcomingEvents.map(ev => {
                  const ecfg = EVENT_TYPE_CONFIG[ev.type] || EVENT_TYPE_CONFIG.OTRO
                  return (
                    <div key={ev.id} className={`flex items-center gap-3 p-3 rounded-xl ${ecfg.color}`}>
                      <span className="text-lg">{ecfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{ev.title}</div>
                        <div className="text-xs opacity-70">
                          {new Date(ev.date).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(ev.date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {ev.agent && <div className="text-xs opacity-60 flex-shrink-0">{ev.agent.name.split(' ')[0]}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Timeline / WhatsApp ── */}
        <div className="col-span-1 md:col-span-2 space-y-5">

          {/* Tab switcher */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => setRightTab('actividades')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${rightTab === 'actividades' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              📋 Actividades
            </button>
            <button
              onClick={() => setRightTab('whatsapp')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${rightTab === 'whatsapp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              💬 WhatsApp
            </button>
          </div>

          {rightTab === 'whatsapp' && (
            <div className="h-[600px]">
              <WhatsAppChat
                leadId={lead.id}
                leadName={`${lead.firstName} ${lead.lastName}`}
              />
            </div>
          )}

          {rightTab === 'actividades' && (
          <>{/* Add activity panel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">➕ Registrar actividad</h3>

            {/* Type buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(ACTIVITY_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => setActType(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${actType === key ? cfg.color + ' border-current ring-2 ring-offset-1 ring-current/40' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <textarea ref={actRef} value={actDesc} onChange={e => setActDesc(e.target.value)}
                placeholder={`¿Qué pasó en esta ${ACTIVITY_CONFIG[actType]?.label?.toLowerCase() || 'actividad'}? Ej: Cliente confirmó visita, está muy interesado en unidad A3...`}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-20"
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); addActivity() } }}
              />
              <button onClick={addActivity} disabled={addingAct || !actDesc.trim()}
                className="self-end px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors">
                {addingAct ? '...' : 'Guardar'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Ctrl+Enter para guardar rápido</p>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">📋 Historial completo</h3>
              <span className="text-xs text-gray-400">{timelineItems.length} registros</span>
            </div>

            {timelineItems.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <div className="text-4xl mb-3">📭</div>
                <p>Sin actividades registradas aún</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {timelineItems.map((item) => {
                  if (item.type === 'activity') {
                    const act = item.data as Lead['activities'][0]
                    const cfg = ACTIVITY_CONFIG[act.type] || ACTIVITY_CONFIG.NOTA
                    return (
                      <div key={`a-${act.id}`} className="px-6 py-4 flex gap-4 hover:bg-gray-50 transition-colors">
                        <div className={`w-9 h-9 rounded-full ${cfg.color} flex items-center justify-center text-base flex-shrink-0 mt-0.5`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                            <span className="text-xs text-gray-400">{formatRelativeTime(act.date)} · {new Date(act.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{act.description}</p>
                        </div>
                      </div>
                    )
                  } else {
                    const ev = item.data as Lead['events'][0]
                    const ecfg = EVENT_TYPE_CONFIG[ev.type] || EVENT_TYPE_CONFIG.OTRO
                    const isPast = new Date(ev.date) < new Date()
                    return (
                      <div key={`e-${ev.id}`} className={`px-6 py-4 flex gap-4 hover:bg-gray-50 transition-colors ${!isPast ? 'bg-blue-50/50' : ''}`}>
                        <div className={`w-9 h-9 rounded-full ${ecfg.color} flex items-center justify-center text-base flex-shrink-0 mt-0.5`}>
                          {ecfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ecfg.color}`}>Evento: {ecfg.label}</span>
                              {!isPast && <span className="text-xs bg-blue-100 text-blue-600 font-semibold px-2 py-0.5 rounded-full">Próximo</span>}
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(ev.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} {new Date(ev.date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-800">{ev.title}</p>
                          {ev.agent && <p className="text-xs text-gray-400 mt-0.5">Asignado a: {ev.agent.name}</p>}
                        </div>
                      </div>
                    )
                  }
                })}
              </div>
            )}
          </div>
          </>)}
        </div>
      </div>

      {/* ── Schedule Visit Modal ── */}
      {showSchedule && (
        <ScheduleVisitDetailModal lead={lead} agents={agents}
          onClose={()=>setShowSchedule(false)}
          onScheduled={(ev)=>{
            setLead(p=>({...p, events:[{...ev, agent: agents.find(a=>a.id===ev.agentId)||null}, ...p.events]}))
            setShowSchedule(false)
          }}/>
      )}

      {/* ── Crear Reserva Modal ── */}
      {showReserva && (
        <CreateReservationModal
          lead={lead}
          projects={projects}
          agents={agents}
          onClose={() => setShowReserva(false)}
          onCreated={(reservationId) => {
            setShowReserva(false)
            setLead(prev => ({ ...prev, stage: 'GANADO' }))
            window.location.href = `/reservas/${reservationId}`
          }}
        />
      )}

      {/* ── Bank Qualification Modal ── */}
      {showBankQual && (
        <BankQualificationModal
          leadId={lead.id}
          leadName={`${lead.firstName} ${lead.lastName}`}
          onClose={() => setShowBankQual(false)}
        />
      )}

      {/* ── Edit Modal ── */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-gray-900 text-lg">✏️ Editar Lead</h3>
              <button onClick={() => { setEditing(false); setEditForm({}) }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Nombre *', key: 'firstName', type: 'text' },
                { label: 'Apellido *', key: 'lastName', type: 'text' },
                { label: 'Teléfono *', key: 'phone', type: 'tel' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Presupuesto (USD)', key: 'budget', type: 'number' },
                { label: 'Fecha de seguimiento', key: 'followUpDate', type: 'datetime-local' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">{f.label}</label>
                  <input type={f.type} value={String((editForm as Record<string, unknown>)[f.key] ?? '')}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}

              {/* Selects */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Proyecto</label>
                <select value={String(editForm.projectId ?? '')} onChange={e => setEditForm(p => ({ ...p, projectId: e.target.value || null }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin proyecto</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Asesora</label>
                <select value={String(editForm.agentId ?? '')} onChange={e => setEditForm(p => ({ ...p, agentId: e.target.value || null }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin asignar</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tipo de propiedad de interés</label>
                <select value={String(editForm.propertyInterest ?? '')} onChange={e => setEditForm(p => ({ ...p, propertyInterest: e.target.value || null }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No definido</option>
                  {['DEPARTAMENTO','CASA','PENTHOUSE','OFICINA','OTRO'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tipo de financiamiento</label>
                <select value={String(editForm.financingType ?? '')} onChange={e => setEditForm(p => ({ ...p, financingType: e.target.value || null }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No definido</option>
                  {['CONTADO','FINANCIADO','HIPOTECARIO'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notas</label>
                <textarea value={String(editForm.notes ?? '')} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3 justify-end">
              <button onClick={() => { setEditing(false); setEditForm({}) }} className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 font-medium">Cancelar</button>
              <button onClick={saveEdit} disabled={savingEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {savingEdit ? 'Guardando...' : '✓ Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lost modal ── */}
      {showLostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">❌ Marcar como Perdido</h3>
              <p className="text-sm text-gray-500 mt-1">¿Por qué se perdió este lead?</p>
            </div>
            <div className="p-6 space-y-2">
              {[
                { value: 'PRECIO', label: '💰 Precio muy alto' },
                { value: 'COMPETENCIA', label: '🏢 Eligió otra inmobiliaria' },
                { value: 'SIN_PRESUPUESTO', label: '🚫 Sin presupuesto disponible' },
                { value: 'TIEMPO', label: '⏰ No era el momento' },
                { value: 'NO_CONTACTA', label: '📵 No responde' },
                { value: 'OTRO', label: '🔹 Otro motivo' },
              ].map(r => (
                <button key={r.value} onClick={() => setLostReason(r.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${lostReason === r.value ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setShowLostModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={markLost} disabled={!lostReason || changingStage}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
                Confirmar pérdida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ── */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="font-bold text-gray-900 text-lg">Eliminar Lead</h3>
            <p className="text-gray-500 text-sm mt-2">¿Eliminar a <strong>{lead.firstName} {lead.lastName}</strong>? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDelete(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={deleteLead} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Schedule Visit (detail page) ───────────────────────────────────────────
function ScheduleVisitDetailModal({ lead, agents, onClose, onScheduled }: {
  lead: Lead; agents: Array<{id:string;name:string}>
  onClose: () => void
  onScheduled: (ev: { id: string; title: string; type: string; date: string; status: string; agentId: string | null }) => void
}) {
  const [form, setForm] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000)
    return {
      date: tomorrow.toISOString().slice(0,10), time:'10:00',
      type:'VISITA', agentId: lead.agentId||'', notes:'',
    }
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    const dateTime = new Date(`${form.date}T${form.time}`)
    const typeLabel: Record<string,string> = {VISITA:'Visita',LLAMADA:'Llamada',REUNION:'Reunión'}
    const [ev] = await Promise.all([
      fetch('/api/calendar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        title:`${typeLabel[form.type]||form.type}: ${lead.firstName} ${lead.lastName}`,
        type:form.type, date:dateTime.toISOString(),
        endDate:new Date(dateTime.getTime()+60*60*1000).toISOString(),
        leadId:lead.id, agentId:form.agentId||null, projectId:lead.projectId||null,
        description:form.notes||null, status:'PENDIENTE', priority:'ALTA',
      })}).then(r=>r.json()),
      fetch('/api/activities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        leadId:lead.id,type:form.type,
        description:`${typeLabel[form.type]||form.type} agendada para ${dateTime.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})} a las ${form.time}${form.notes?` — ${form.notes}`:''}`,
      })}),
    ])
    setSaving(false)
    onScheduled({...ev, agentId:form.agentId})
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div><h3 className="font-bold text-gray-900">📅 Agendar Cita</h3>
          <p className="text-sm text-gray-500 mt-0.5">{lead.firstName} {lead.lastName}</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            {[['VISITA','🏠 Visita'],['LLAMADA','📞 Llamada'],['REUNION','🤝 Reunión'],['CIERRE','🏆 Cierre']].map(([v,l])=>(
              <button key={v} onClick={()=>setForm(p=>({...p,type:v}))}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${form.type===v?'bg-blue-600 text-white border-blue-600':'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fecha</label>
              <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Hora</label>
              <input type="time" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Asignar a asesora</label>
            <select value={form.agentId} onChange={e=>setForm(p=>({...p,agentId:e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              <option value="">Sin asignar</option>
              {agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notas</label>
            <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2}
              placeholder="Detalles adicionales, proyecto a mostrar, unidad..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
          </div>
        </div>
        <div className="p-5 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
          <button onClick={submit} disabled={saving||!form.date||!form.time}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-sm py-2.5 rounded-xl">
            {saving?'Agendando...':'✓ Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Inline note editor ──────────────────────────────────────────────────────
function NoteEditor({ leadId, initialNotes, onSaved }: {
  leadId: string; initialNotes: string; onSaved: (n: string) => void
}) {
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function save(value: string) {
    setSaving(true)
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: value }),
    })
    setSaving(false)
    setSaved(true)
    onSaved(value)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleChange(v: string) {
    setNotes(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(v), 1500)
  }

  return (
    <div>
      <textarea value={notes} onChange={e => handleChange(e.target.value)}
        placeholder="Notas internas sobre este lead (se guardan automáticamente)..."
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-24"
        rows={4} />
      <div className="text-xs text-right mt-1 text-gray-400">
        {saving ? '💾 Guardando...' : saved ? '✅ Guardado' : 'Auto-guardado'}
      </div>
    </div>
  )
}

// ── Create Reservation Modal ─────────────────────────────────────────────────
function CreateReservationModal({
  lead,
  projects,
  agents,
  onClose,
  onCreated,
}: {
  lead: { id: string; firstName: string; lastName: string; budget: number | null; projectId: string | null }
  projects: Array<{ id: string; name: string }>
  agents: Array<{ id: string; name: string }>
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [form, setForm] = useState({
    projectId: lead.projectId || (projects[0]?.id || ''),
    agentId: '',
    unitNumber: '',
    unitType: 'DEPARTAMENTO',
    floor: '',
    area: '',
    price: lead.budget ? String(lead.budget) : '',
    currency: 'USD',
    reserveAmount: '',
    commissionPct: '3',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!form.projectId || !form.price) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          projectId: form.projectId,
          agentId: form.agentId || null,
          unitNumber: form.unitNumber || null,
          unitType: form.unitType,
          floor: form.floor || null,
          area: form.area || null,
          price: parseFloat(form.price),
          currency: form.currency,
          reserveAmount: form.reserveAmount || null,
          commissionPct: parseFloat(form.commissionPct),
          notes: form.notes || null,
          stage: 'RESERVA',
        }),
      })
      const reservation = await res.json()
      onCreated(reservation.id)
    } finally {
      setSubmitting(false)
    }
  }

  const commission = form.price ? parseFloat(form.price) * parseFloat(form.commissionPct || '3') / 100 : 0

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-900">🏆 Crear Reserva</h3>
            <p className="text-sm text-gray-500 mt-0.5">{lead.firstName} {lead.lastName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Project & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Proyecto *</label>
              <select
                value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Seleccionar proyecto...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Unidad</label>
              <input
                value={form.unitNumber}
                onChange={e => setForm(f => ({ ...f, unitNumber: e.target.value }))}
                placeholder="Ej: 405"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Tipo</label>
              <select
                value={form.unitType}
                onChange={e => setForm(f => ({ ...f, unitType: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
              >
                <option value="DEPARTAMENTO">Departamento</option>
                <option value="CASA">Casa</option>
                <option value="PENTHOUSE">Penthouse</option>
                <option value="OFICINA">Oficina</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Piso</label>
              <input
                type="number"
                value={form.floor}
                onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                placeholder="Ej: 4"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Superficie (m²)</label>
              <input
                type="number"
                value={form.area}
                onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                placeholder="Ej: 65"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Precio venta *</label>
              <div className="flex gap-2">
                <select
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-20 px-2 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
                >
                  <option>USD</option>
                  <option>UF</option>
                  <option>CLP</option>
                </select>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Monto reserva</label>
              <input
                type="number"
                value={form.reserveAmount}
                onChange={e => setForm(f => ({ ...f, reserveAmount: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Comisión (%)</label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={form.commissionPct}
                onChange={e => setForm(f => ({ ...f, commissionPct: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Asesor</label>
              <select
                value={form.agentId}
                onChange={e => setForm(f => ({ ...f, agentId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
              >
                <option value="">Sin asignar</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Commission preview */}
          {commission > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-green-700">Comisión estimada ({form.commissionPct}%)</span>
              <span className="text-base font-bold text-green-700">
                {form.currency} {commission.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Notas</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Observaciones sobre la reserva..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>Esta acción marcará al lead como <strong>GANADO</strong> y creará la reserva</span>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.projectId || !form.price || submitting}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🏆'}
            {submitting ? 'Creando...' : 'Crear Reserva'}
          </button>
        </div>
      </div>
    </div>
  )
}
