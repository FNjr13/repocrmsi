'use client'

import { useState, useCallback, useMemo } from 'react'
import { DndContext, DragOverlay, useDroppable, useDraggable, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { STAGE_CONFIG, SOURCE_CONFIG, formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
type Lead = {
  id: string; firstName: string; lastName: string; email: string | null
  phone: string; source: string; stage: string; temperature: string
  budget: number | null; notes: string | null; propertyInterest: string | null
  financingType: string | null; followUpDate: string | null; lostReason: string | null
  createdAt: Date | string; updatedAt: Date | string
  project: { id: string; name: string } | null
  agent: { id: string; name: string } | null
  activities: Array<{ id: string; type: string; description: string; date: Date | string }>
}
type Agent = { id: string; name: string }
type Project = { id: string; name: string }
interface CRMData { leads: Lead[]; agents: Agent[]; projects: Project[] }

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES = ['NUEVO','CONTACTADO','INTERESADO','VISITA','NEGOCIACION','GANADO','PERDIDO'] as const
const VISIBLE_STAGES = ['NUEVO','CONTACTADO','INTERESADO','VISITA','NEGOCIACION','GANADO'] as const

const ACTIVITY_TYPES = [
  { value: 'LLAMADA', label: '📞 Llamada' }, { value: 'WHATSAPP', label: '💬 WhatsApp' },
  { value: 'VISITA', label: '🏠 Visita' }, { value: 'REUNION', label: '🤝 Reunión' },
  { value: 'NOTA', label: '📝 Nota' },
]
const ACTIVITY_ICONS: Record<string, string> = {
  LLAMADA:'📞', WHATSAPP:'💬', EMAIL:'📧', VISITA:'🏠', REUNION:'🤝', NOTA:'📝',
}
const TEMP_CONFIG = {
  HOT:    { label: '🔥 Hot',    short: '🔥', color: 'bg-red-100 text-red-700 border-red-200',     bar: 'bg-red-500' },
  WARM:   { label: '☀️ Warm',   short: '☀️', color: 'bg-orange-100 text-orange-700 border-orange-200', bar: 'bg-orange-400' },
  NORMAL: { label: '😐 Normal', short: '😐', color: 'bg-blue-100 text-blue-700 border-blue-200',   bar: 'bg-blue-400' },
  COLD:   { label: '🧊 Cold',   short: '🧊', color: 'bg-slate-100 text-slate-600 border-slate-200', bar: 'bg-slate-400' },
}
const COLUMN_COLORS: Record<string, string> = {
  NUEVO:'border-t-gray-400', CONTACTADO:'border-t-blue-400',
  INTERESADO:'border-t-yellow-400', VISITA:'border-t-purple-400',
  NEGOCIACION:'border-t-orange-400', GANADO:'border-t-green-500',
}

// ─── WhatsApp Templates ───────────────────────────────────────────────────────
const WA_TEMPLATES: Record<string, Array<{ label: string; text: string }>> = {
  NUEVO: [
    { label: '👋 Bienvenida', text: 'Hola {{nombre}}, soy {{asesora}} de SI CRM. Vi que te interesó {{proyecto}}. ¿Cuándo tienes unos minutos para contarte sobre las unidades disponibles? 🏠' },
    { label: '📋 Información', text: 'Hola {{nombre}}, te comparto información sobre {{proyecto}}. Tenemos unidades ¿Te gustaría recibir el brochure completo?' },
  ],
  CONTACTADO: [
    { label: '📄 Enviar brochure', text: 'Hola {{nombre}}, como quedamos, te envío el brochure de {{proyecto}}. ¿Cuál sería el mejor horario para conversar sobre las unidades disponibles? 📲' },
    { label: '🔄 Seguimiento', text: 'Hola {{nombre}}, ¿pudiste revisar la información de {{proyecto}}? Quedamos a tu disposición para cualquier consulta.' },
  ],
  INTERESADO: [
    { label: '📅 Agendar visita', text: 'Hola {{nombre}}, ¡excelente! Podemos agendar una visita a {{proyecto}} cuando quieras. ¿Tienes disponibilidad esta semana? 🗓️' },
  ],
  VISITA: [
    { label: '✅ Confirmar visita', text: 'Hola {{nombre}}, confirmo tu visita a {{proyecto}} para mañana. Te espero a la hora acordada. ¿Necesitas las indicaciones para llegar? 📍' },
    { label: '🏠 Post-visita', text: 'Hola {{nombre}}, fue un placer mostrarte {{proyecto}} hoy. ¿Quedaste con alguna duda? Estoy a tu disposición. 😊' },
  ],
  NEGOCIACION: [
    { label: '⏰ Oferta limitada', text: 'Hola {{nombre}}, quería avisarte que tenemos disponibilidad limitada en {{proyecto}} y la oferta actual vence pronto. ¿Podemos avanzar esta semana? 🏃' },
  ],
  GANADO: [
    { label: '🎉 Felicitaciones', text: '¡Felicitaciones {{nombre}}! Es un placer darte la bienvenida como parte de la familia {{proyecto}}. Cualquier consulta sobre el proceso, aquí estaré. 🎊' },
  ],
  PERDIDO: [
    { label: '🔄 Reactivar', text: 'Hola {{nombre}}, ¿cómo estás? Quería avisarte que tenemos novedades en {{proyecto}} que podrían interesarte. ¿Sigue en tus planes buscar propiedad? 🏡' },
  ],
}

// ─── Lead Scoring ─────────────────────────────────────────────────────────────
function calcScore(lead: Lead): number {
  let s = 0
  const tScores: Record<string,number> = { HOT:30, WARM:20, NORMAL:10, COLD:0 }
  s += tScores[lead.temperature] ?? 10
  const stScores: Record<string,number> = { NEGOCIACION:25, VISITA:20, INTERESADO:15, CONTACTADO:10, NUEVO:5 }
  s += stScores[lead.stage] ?? 0
  if (lead.budget) s += lead.budget>200000?20 : lead.budget>100000?15 : lead.budget>50000?10 : 5
  const lastA = lead.activities[0]
  if (lastA) {
    const d = Math.floor((Date.now()-new Date(lastA.date as string).getTime())/86400000)
    s += d===0?15 : d<=2?12 : d<=7?8 : d<=14?4 : 0
  }
  if (lead.followUpDate) {
    const diff = Math.floor((new Date(lead.followUpDate).getTime()-Date.now())/86400000)
    s += diff<0 ? -10 : diff<=3 ? 10 : 0
  }
  return Math.max(0, Math.min(100, s))
}

function scoreColor(s: number): string {
  if (s >= 75) return 'bg-green-500'
  if (s >= 50) return 'bg-yellow-400'
  if (s >= 25) return 'bg-orange-400'
  return 'bg-red-300'
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(leads: Lead[], filename = 'leads') {
  const headers = ['Nombre','Apellido','Teléfono','Email','Fuente','Etapa','Temperatura','Score','Proyecto','Asesora','Tipo interés','Financiamiento','Follow-up','Notas','Creado']
  const rows = leads.map(l => [
    l.firstName, l.lastName, l.phone, l.email||'',
    l.source, l.stage, l.temperature, String(calcScore(l)),
    
    l.project?.name||'', l.agent?.name||'',
    l.propertyInterest||'', l.financingType||'',
    l.followUpDate ? new Date(l.followUpDate).toLocaleDateString('es-CL') : '',
    (l.notes||'').replace(/[\n\r]/g,' '),
    new Date(l.createdAt as string).toLocaleDateString('es-CL'),
  ])
  const csv = [headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8;'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${filename}-${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ─── Import CSV Modal ────────────────────────────────────────────────────────
function ImportModal({ agents, projects, onClose, onImported }: {
  agents: Agent[]; projects: Project[]
  onClose: () => void; onImported: (leads: Lead[]) => void
}) {
  const [step, setStep] = useState<'input'|'preview'|'importing'>('input')
  const [csvText, setCsvText] = useState('')
  const [rows, setRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string,string>>({})
  const [defaultProjectId, setDefaultProjectId] = useState('')
  const [defaultAgentId, setDefaultAgentId] = useState('')
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<string[]>([])

  const FIELDS = [
    {key:'firstName',label:'Nombre *'},{key:'lastName',label:'Apellido *'},
    {key:'phone',label:'Teléfono *'},{key:'email',label:'Email'},
    {key:'source',label:'Fuente'},{key:'budget',label:'Presupuesto'},
    {key:'notes',label:'Notas'},{key:'propertyInterest',label:'Tipo propiedad'},
    {key:'_ignore',label:'— Ignorar —'},
  ]

  // Common CSV column name auto-detection
  const AUTO_MAP: Record<string,string> = {
    nombre:'firstName',name:'firstName',first_name:'firstName',firstname:'firstName',
    apellido:'lastName',last_name:'lastName',lastname:'lastName',surname:'lastName',
    telefono:'phone',teléfono:'phone',phone:'phone',cel:'phone',celular:'phone',movil:'phone',
    email:'email',correo:'email',mail:'email',
    fuente:'source',source:'source',origen:'source',canal:'source',
    presupuesto:'budget',budget:'budget',precio:'budget',price:'budget',
    notas:'notes',notes:'notes',comentarios:'notes',observaciones:'notes',
    tipo:'propertyInterest',interes:'propertyInterest',propiedad:'propertyInterest',
  }

  function parseCsv(text: string) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return
    const parseRow = (line: string) => {
      const result: string[] = []
      let cur = ''; let inQ = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (c === '"') { inQ = !inQ }
        else if ((c === ',' || c === ';') && !inQ) { result.push(cur.trim()); cur = '' }
        else { cur += c }
      }
      result.push(cur.trim())
      return result
    }
    const hdrs = parseRow(lines[0])
    setHeaders(hdrs)
    setRows(lines.slice(1).map(parseRow))
    // Auto-map
    const m: Record<string,string> = {}
    hdrs.forEach((h, i) => {
      const k = h.toLowerCase().trim().replace(/[^a-záéíóúñ_]/g,'')
      m[String(i)] = AUTO_MAP[k] || '_ignore'
    })
    setMapping(m)
    setStep('preview')
  }

  function getVal(row: string[], fieldKey: string) {
    for (const [colIdx, fk] of Object.entries(mapping)) {
      if (fk === fieldKey && row[Number(colIdx)] !== undefined) return row[Number(colIdx)].trim()
    }
    return ''
  }

  async function doImport() {
    setStep('importing')
    setProgress(0)
    const newLeads: Lead[] = []
    const errs: string[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const firstName = getVal(row,'firstName')
      const lastName = getVal(row,'lastName')
      const phone = getVal(row,'phone')
      if (!firstName || !phone) { errs.push(`Fila ${i+2}: falta nombre o teléfono`); setProgress(Math.round(((i+1)/rows.length)*100)); continue }
      const body = {
        firstName, lastName: lastName||'—', phone,
        email: getVal(row,'email')||null,
        source: getVal(row,'source')||'OTRO',
        budget: getVal(row,'budget') ? parseFloat(getVal(row,'budget').replace(/[^0-9.]/g,''))||null : null,
        notes: getVal(row,'notes')||null,
        propertyInterest: getVal(row,'propertyInterest')||null,
        projectId: defaultProjectId||null, agentId: defaultAgentId||null,
      }
      try {
        const res = await fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
        if (res.ok) newLeads.push(await res.json())
        else errs.push(`Fila ${i+2}: error al crear`)
      } catch { errs.push(`Fila ${i+2}: error de red`) }
      setProgress(Math.round(((i+1)/rows.length)*100))
    }
    setErrors(errs)
    if (newLeads.length > 0) onImported(newLeads)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-100 z-10">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">📥 Importar Leads desde CSV</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {step==='input'?'Paso 1: Pega o carga tu CSV':step==='preview'?`Paso 2: Revisar ${rows.length} registros`:`Importando... ${progress}%`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>

        {step==='input' && (
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              <strong>Columnas reconocidas automáticamente:</strong> nombre, apellido, telefono, email, fuente, presupuesto, notas, tipo_propiedad
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Pegar contenido CSV</label>
              <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} rows={10}
                placeholder={'nombre,apellido,telefono,email\nJuan,Pérez,+56912345678,juan@email.com\n...'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Proyecto por defecto</label>
                <select value={defaultProjectId} onChange={e=>setDefaultProjectId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  <option value="">Sin asignar</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Asesora por defecto</label>
                <select value={defaultAgentId} onChange={e=>setDefaultAgentId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  <option value="">Sin asignar</option>
                  {agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="px-5 py-2.5 text-sm text-gray-600 font-medium">Cancelar</button>
              <button onClick={()=>parseCsv(csvText)} disabled={!csvText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold px-6 py-2.5 rounded-xl">
                Analizar CSV →
              </button>
            </div>
          </div>
        )}

        {step==='preview' && (
          <div className="p-6 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="text-xs w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((h,i)=>(
                      <th key={i} className="px-3 py-2 text-left font-semibold text-gray-600">
                        <div className="text-gray-400 mb-1 truncate max-w-[80px]">{h}</div>
                        <select value={mapping[String(i)]||'_ignore'} onChange={e=>setMapping(p=>({...p,[String(i)]:e.target.value}))}
                          className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white w-full">
                          {FIELDS.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.slice(0,5).map((row,ri)=>(
                    <tr key={ri} className="hover:bg-gray-50">
                      {row.map((cell,ci)=><td key={ci} className="px-3 py-2 text-gray-700 max-w-[100px] truncate">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length>5 && <p className="text-xs text-gray-400 text-center">+ {rows.length-5} filas más...</p>}
            <div className="flex gap-3 justify-between">
              <button onClick={()=>setStep('input')} className="px-5 py-2.5 text-sm text-gray-600 font-medium border border-gray-200 rounded-xl">← Volver</button>
              <button onClick={doImport}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl">
                ✓ Importar {rows.length} leads
              </button>
            </div>
          </div>
        )}

        {step==='importing' && (
          <div className="p-8 text-center space-y-4">
            <div className="text-4xl mb-2">{progress===100?'✅':'⏳'}</div>
            <h4 className="font-bold text-gray-900">{progress===100?'¡Importación completa!':'Importando leads...'}</h4>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{width:`${progress}%`}}/>
            </div>
            <p className="text-sm text-gray-500">{progress}%</p>
            {progress===100 && errors.length>0 && (
              <div className="text-left bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 max-h-32 overflow-y-auto">
                {errors.map((e,i)=><div key={i}>{e}</div>)}
              </div>
            )}
            {progress===100 && (
              <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">
                Cerrar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Schedule Visit Modal ─────────────────────────────────────────────────────
function ScheduleVisitModal({ lead, agents, onClose, onScheduled }: {
  lead: Lead; agents: Agent[]
  onClose: () => void; onScheduled: () => void
}) {
  const [form, setForm] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000)
    return {
      date: tomorrow.toISOString().slice(0, 10),
      time: '10:00',
      type: 'VISITA' as string,
      agentId: lead.agent?.id || '',
      notes: '',
    }
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    const dateTime = new Date(`${form.date}T${form.time}`)
    await fetch('/api/calendar', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        title: `${form.type === 'VISITA' ? 'Visita' : form.type === 'LLAMADA' ? 'Llamada' : 'Reunión'}: ${lead.firstName} ${lead.lastName}`,
        type: form.type,
        date: dateTime.toISOString(),
        endDate: new Date(dateTime.getTime()+60*60*1000).toISOString(),
        leadId: lead.id,
        agentId: form.agentId || null,
        projectId: lead.project?.id || null,
        description: form.notes || null,
        status: 'PENDIENTE',
        priority: 'ALTA',
      }),
    })
    // Also log activity
    await fetch('/api/activities', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        leadId: lead.id, type: form.type,
        description: `${form.type === 'VISITA' ? 'Visita agendada' : 'Cita agendada'} para ${dateTime.toLocaleDateString('es-CL',{day:'numeric',month:'long'})} a las ${form.time}${form.notes ? ` — ${form.notes}` : ''}`,
      }),
    })
    setSaving(false)
    onScheduled()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">📅 Agendar Cita</h3>
            <p className="text-sm text-gray-500 mt-0.5">{lead.firstName} {lead.lastName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            {[['VISITA','🏠 Visita'],['LLAMADA','📞 Llamada'],['REUNION','🤝 Reunión']].map(([v,l])=>(
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
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notas (opcional)</label>
            <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2}
              placeholder="Proyecto a mostrar, unidad, instrucciones..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
          </div>
        </div>
        <div className="p-5 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
          <button onClick={submit} disabled={saving||!form.date||!form.time}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
            {saving?'Agendando...':'✓ Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Stats View ───────────────────────────────────────────────────────────────
function StatsView({ leads, agents }: { leads: Lead[]; agents: Agent[] }) {
  const activeLeads = leads.filter(l => !['GANADO','PERDIDO'].includes(l.stage))
  const wonLeads = leads.filter(l => l.stage==='GANADO')
  const lostLeads = leads.filter(l => l.stage==='PERDIDO')
  const pipelineValue = activeLeads.reduce((s,l)=>s+(l.budget||0),0)
  const wonValue = wonLeads.reduce((s,l)=>s+(l.budget||0),0)

  // Funnel data
  const funnel = ['NUEVO','CONTACTADO','INTERESADO','VISITA','NEGOCIACION'].map(s => ({
    stage: s, label: STAGE_CONFIG[s as keyof typeof STAGE_CONFIG]?.label||s,
    count: leads.filter(l=>l.stage===s).length,
    color: STAGE_CONFIG[s as keyof typeof STAGE_CONFIG]?.color||'',
  }))
  const maxFunnel = Math.max(...funnel.map(f=>f.count), 1)

  // By source
  const bySource = Object.keys(SOURCE_CONFIG).map(k => {
    const src = leads.filter(l=>l.source===k)
    return { key:k, ...SOURCE_CONFIG[k as keyof typeof SOURCE_CONFIG],
      count: src.length, won: src.filter(l=>l.stage==='GANADO').length,
      convRate: src.length > 0 ? Math.round((src.filter(l=>l.stage==='GANADO').length/src.length)*100) : 0 }
  }).filter(s=>s.count>0).sort((a,b)=>b.count-a.count)

  // By temperature (active)
  const byTemp = Object.entries(TEMP_CONFIG).map(([k,v]) => ({
    key:k, ...v, count: activeLeads.filter(l=>l.temperature===k).length,
  }))

  // By agent
  const byAgent = agents.map(a => {
    const aLeads = leads.filter(l=>l.agent?.id===a.id)
    return {
      ...a, total:aLeads.length,
      active: aLeads.filter(l=>!['GANADO','PERDIDO'].includes(l.stage)).length,
      won: aLeads.filter(l=>l.stage==='GANADO').length,
      lost: aLeads.filter(l=>l.stage==='PERDIDO').length,
      avgScore: aLeads.length>0 ? Math.round(aLeads.reduce((s,l)=>s+calcScore(l),0)/aLeads.length) : 0,
    }
  }).filter(a=>a.total>0)

  // Inactivity alerts
  // eslint-disable-next-line react-hooks/purity
  const nowTs = Date.now()
  const needAttention = activeLeads.filter(l => {
    const lastAct = l.activities[0]
    if (!lastAct) return true
    return Math.floor((nowTs-new Date(lastAct.date as string).getTime())/86400000) >= 7
  }).sort((a,b) => {
    const da = a.activities[0] ? new Date(a.activities[0].date as string).getTime() : 0
    const db = b.activities[0] ? new Date(b.activities[0].date as string).getTime() : 0
    return da - db
  }).slice(0, 8)

  // Top leads by budget
  const topByScore = [...activeLeads].sort((a,b)=>calcScore(b)-calcScore(a)).slice(0,5)

  // Monthly new leads (last 6 months)
  const now = new Date()
  const monthly = Array.from({length:6},(_,i) => {
    const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1)
    const end = new Date(now.getFullYear(), now.getMonth()-5+i+1, 0)
    return {
      label: d.toLocaleDateString('es-CL',{month:'short'}),
      new: leads.filter(l => { const c=new Date(l.createdAt as string); return c>=d&&c<=end }).length,
      won: leads.filter(l => l.stage==='GANADO' && (() => { const u=new Date(l.updatedAt as string); return u>=d&&u<=end })()).length,
    }
  })
  const maxMonthly = Math.max(...monthly.map(m=>Math.max(m.new,m.won)),1)

  // Conversion by stage
  const stageConv = funnel.map((f,i) => {
    const prev = i===0 ? leads.length : funnel[i-1].count
    return { ...f, pct: prev>0 ? Math.round((f.count/prev)*100) : 0 }
  })

  // Lost reasons
  const LOST_LABELS: Record<string,string> = {
    PRECIO:'💰 Precio alto', COMPETENCIA:'🏢 Competencia', SIN_PRESUPUESTO:'🚫 Sin presupuesto',
    TIEMPO:'⏰ Mal momento', NO_CONTACTA:'📵 No contactable', OTRO:'🔹 Otro',
  }
  const lostByReason = Object.entries(
    lostLeads.reduce((acc: Record<string,number>, l) => {
      const k = l.lostReason || 'OTRO'; acc[k] = (acc[k]||0)+1; return acc
    }, {})
  ).sort((a,b)=>b[1]-a[1])
  const maxLost = Math.max(...lostByReason.map(([,n])=>n), 1)

  // Pipeline forecast (weighted by stage probability)
  const STAGE_PROB: Record<string,number> = {NUEVO:0.10,CONTACTADO:0.20,INTERESADO:0.40,VISITA:0.60,NEGOCIACION:0.80,GANADO:1,PERDIDO:0}
  const forecastValue = activeLeads.reduce((s,l) => s + (l.budget||0)*(STAGE_PROB[l.stage]||0.1), 0)
  const forecastByStage = funnel.map(f => ({
    ...f,
    prob: Math.round((STAGE_PROB[f.stage]||0)*100),
    weighted: leads.filter(l=>l.stage===f.stage).reduce((s,l)=>s+(l.budget||0)*(STAGE_PROB[f.stage]||0),0),
  }))

  // By property interest
  const byInterest = ['DEPARTAMENTO','CASA','PENTHOUSE','OFICINA','OTRO'].map(k => ({
    key: k,
    count: leads.filter(l=>l.propertyInterest===k).length,
    won: leads.filter(l=>l.propertyInterest===k && l.stage==='GANADO').length,
  })).filter(k=>k.count>0).sort((a,b)=>b.count-a.count)
  const maxInterest = Math.max(...byInterest.map(k=>k.count), 1)

  function fmtM(n: number) { if(n>=1000000) return `$${(n/1000000).toFixed(1)}M`; if(n>=1000) return `$${Math.round(n/1000)}K`; return `$${n}` }

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Top KPIs */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label:'Total Leads', v: leads.length, sub:`${wonLeads.length} ganados`, color:'text-gray-800', bg:'bg-white' },
          { label:'Pipeline Activo', v: activeLeads.length, sub:'en seguimiento', color:'text-blue-600', bg:'bg-blue-50' },
          { label:'Leads Ganados', v: wonLeads.length, sub:'ventas cerradas', color:'text-green-600', bg:'bg-green-50' },
          { label:'Tasa Conversión', v: `${leads.length>0?((wonLeads.length/leads.length)*100).toFixed(1):'0'}%`, sub:`${lostLeads.length} perdidos`, color:'text-purple-600', bg:'bg-purple-50' },
          { label:'Score Promedio', v: leads.length>0?Math.round(leads.reduce((s,l)=>s+calcScore(l),0)/leads.length):0, sub:'del pipeline activo', color:'text-orange-600', bg:'bg-orange-50' },
        ].map(k=>(
          <div key={k.label} className={`${k.bg} rounded-2xl border border-gray-200 p-5`}>
            <div className={`text-2xl font-bold ${k.color}`}>{k.v}</div>
            <div className="text-xs font-semibold text-gray-700 mt-0.5">{k.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-4">🔽 Embudo de Conversión</h3>
          <div className="space-y-3">
            {funnel.map((f,i) => (
              <div key={f.stage}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.color}`}>{f.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{f.count}</span>
                    {i>0 && <span className="text-xs text-gray-400">{stageConv[i].pct}% del anterior</span>}
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{width:`${(f.count/maxFunnel)*100}%`}}/>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
              <span className="text-gray-500">Total ganados</span>
              <span className="font-bold text-green-600">{wonLeads.length}</span>
            </div>
          </div>
        </div>

        {/* Monthly trend */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-4">📈 Tendencia Mensual</h3>
          <div className="space-y-3">
            {monthly.map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="font-semibold text-gray-700 capitalize">{m.label}</span>
                  <div className="flex gap-3">
                    <span className="text-blue-600">{m.new} nuevos</span>
                    <span className="text-green-600">{m.won} ganados</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full flex gap-0.5 overflow-hidden">
                  <div className="bg-blue-300 h-full transition-all" style={{width:`${(m.new/maxMonthly)*100}%`}}/>
                  <div className="bg-green-500 h-full transition-all" style={{width:`${(m.won/maxMonthly)*100}%`}}/>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-300 rounded-sm inline-block"/>Nuevos</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-500 rounded-sm inline-block"/>Ganados</span>
          </div>
        </div>

        {/* Temperature distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-4">🌡️ Temperatura del Pipeline</h3>
          <div className="space-y-3">
            {byTemp.map(t => (
              <div key={t.key} className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full border font-semibold min-w-20 text-center ${t.color}`}>{t.label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full">
                  <div className={`${t.bar} h-full rounded-full transition-all`} style={{width:`${activeLeads.length>0?(t.count/activeLeads.length)*100:0}%`}}/>
                </div>
                <span className="text-sm font-bold text-gray-800 w-6 text-right">{t.count}</span>
              </div>
            ))}
            {activeLeads.filter(l=>l.temperature==='HOT').length > 0 && (
              <div className="mt-3 p-3 bg-red-50 rounded-xl text-xs text-red-600 border border-red-200">
                🔥 <strong>{activeLeads.filter(l=>l.temperature==='HOT').length} leads HOT</strong> — requieren atención inmediata
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Source analysis */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-4">📡 Rendimiento por Fuente</h3>
          <div className="space-y-3">
            {bySource.map(s => (
              <div key={s.key} className="flex items-center gap-3">
                <span className="text-lg w-7 text-center">{s.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800">{s.label}</span>
                    <div className="flex gap-2 text-xs">
                      <span className="text-blue-600 font-semibold">{s.count} leads</span>
                      <span className="text-green-600 font-semibold">{s.won} ganados</span>
                      <span className={`font-bold ${s.convRate>=20?'text-green-600':s.convRate>=10?'text-yellow-600':'text-gray-500'}`}>{s.convRate}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full flex gap-0.5">
                    <div className="bg-blue-400 h-full rounded-full" style={{width:`${(s.count/leads.length)*100}%`}}/>
                    <div className="bg-green-500 h-full rounded-full" style={{width:`${leads.length>0?(s.won/leads.length)*100:0}%`}}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent performance */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-4">👩‍💼 Rendimiento del Equipo</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                {['Asesora','Total','Activos','Ganados','Conv.','Score'].map(h=>(
                  <th key={h} className="pb-2 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {byAgent.sort((a,b)=>b.won-a.won).map((a,i)=>{
                const conv = a.total>0?Math.round((a.won/a.total)*100):0
                const avatarColors = ['from-violet-500 to-purple-600','from-pink-500 to-rose-600','from-blue-500 to-cyan-600','from-orange-500 to-amber-600']
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColors[i%4]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {a.name.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
                        </div>
                        <span className="font-medium text-gray-800 text-xs">{a.name.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-xs font-semibold text-gray-800">{a.total}</td>
                    <td className="py-2.5 text-xs text-blue-600 font-semibold">{a.active}</td>
                    <td className="py-2.5 text-xs text-green-600 font-bold">{a.won}</td>
                    <td className="py-2.5">
                      <span className={`text-xs font-bold ${conv>=20?'text-green-600':conv>=10?'text-yellow-600':'text-gray-500'}`}>{conv}%</span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full">
                          <div className={`h-full rounded-full ${scoreColor(a.avgScore)}`} style={{width:`${a.avgScore}%`}}/>
                        </div>
                        <span className="text-xs text-gray-500">{a.avgScore}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {byAgent.length===0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">Sin asesoras con leads asignados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Needs attention */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-1">⚠️ Requieren Atención</h3>
          <p className="text-xs text-gray-400 mb-4">Sin actividad en 7+ días</p>
          {needAttention.length===0
            ? <div className="text-center py-8 text-green-500"><div className="text-3xl mb-2">✅</div><p className="text-sm">¡Todos los leads al día!</p></div>
            : <div className="space-y-2">
                {needAttention.map(l => {
                  const lastA = l.activities[0]
                  const days = lastA ? Math.floor((nowTs-new Date(lastA.date as string).getTime())/86400000) : Math.floor((nowTs-new Date(l.createdAt as string).getTime())/86400000)
                  const tempCfg = TEMP_CONFIG[l.temperature as keyof typeof TEMP_CONFIG] || TEMP_CONFIG.NORMAL
                  return (
                    <div key={l.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0">
                        {l.firstName[0]}{l.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">{l.firstName} {l.lastName}</div>
                        <div className="text-xs text-gray-500 truncate">{l.project?.name||'Sin proyecto'} · {STAGE_CONFIG[l.stage as keyof typeof STAGE_CONFIG]?.label}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-xs font-bold ${days>=14?'text-red-600':'text-amber-600'}`}>hace {days}d</div>
                        <span className={`text-xs px-1.5 rounded-full border ${tempCfg.color}`}>{tempCfg.short}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>

        {/* Top leads by score */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-1">🏆 Top Leads por Score</h3>
          <p className="text-xs text-gray-400 mb-4">Leads más prometedores del pipeline</p>
          {topByScore.length===0
            ? <p className="text-sm text-gray-400 text-center py-8">Sin leads activos</p>
            : <div className="space-y-2">
                {topByScore.map((l,i) => {
                  const score = calcScore(l)
                  const tempCfg = TEMP_CONFIG[l.temperature as keyof typeof TEMP_CONFIG] || TEMP_CONFIG.NORMAL
                  return (
                    <Link key={l.id} href={`/crm/${l.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {i+1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">{l.firstName} {l.lastName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500 truncate">{l.project?.name||'Sin proyecto'}</span>
                          <span className={`text-xs px-1.5 rounded-full border ${tempCfg.color}`}>{tempCfg.short}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`font-bold text-sm ${scoreColor(score).replace('bg-','text-')}`}>{score} pts</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="w-14 h-1.5 bg-gray-200 rounded-full"><div className={`h-full rounded-full ${scoreColor(score)}`} style={{width:`${score}%`}}/></div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
          }
        </div>
      </div>

      {/* ── Row 4: Forecast + Lost Reasons + Property Interest ── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Pipeline Forecast */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 p-5">
          <h3 className="font-bold text-gray-900 mb-1">🎯 Probabilidad de Cierre</h3>
          <p className="text-xs text-gray-500 mb-4">Leads por etapa y probabilidad estimada</p>
          <div className="text-3xl font-bold text-indigo-700 mb-1">{activeLeads.length}</div>
          <p className="text-xs text-indigo-500 mb-4">leads activos en pipeline</p>
          <div className="space-y-2.5">
            {forecastByStage.filter(f=>f.count>0).map(f=>(
              <div key={f.stage} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STAGE_CONFIG[f.stage as keyof typeof STAGE_CONFIG]?.dot||'bg-gray-400'}`}/>
                  <span className="text-gray-700 font-medium">{f.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{f.prob}% prob.</span>
                  <span className="font-bold text-indigo-700">{f.count} leads</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lost Reasons */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-1">❌ Razones de Pérdida</h3>
          <p className="text-xs text-gray-400 mb-4">{lostLeads.length} leads perdidos en total</p>
          {lostByReason.length===0
            ? <div className="text-center py-6 text-green-500"><div className="text-3xl mb-2">🏆</div><p className="text-sm">¡Sin pérdidas registradas!</p></div>
            : <div className="space-y-3">
                {lostByReason.map(([reason, count])=>(
                  <div key={reason}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{LOST_LABELS[reason]||reason}</span>
                      <span className="font-bold text-gray-800">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-red-400 rounded-full transition-all" style={{width:`${(count/maxLost)*100}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Property Interest Distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-1">🏠 Tipo de Propiedad</h3>
          <p className="text-xs text-gray-400 mb-4">Interés declarado por los leads</p>
          {byInterest.length===0
            ? <p className="text-sm text-gray-400 text-center py-6">Sin datos de interés registrados</p>
            : <div className="space-y-3">
                {byInterest.map(k=>(
                  <div key={k.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{k.key}</span>
                      <div className="flex gap-2 text-xs">
                        <span className="text-blue-600 font-semibold">{k.count}</span>
                        {k.won>0 && <span className="text-green-600 font-bold">{k.won}✓</span>}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-purple-400 rounded-full transition-all" style={{width:`${(k.count/maxInterest)*100}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}

// ─── Form Field Input (shared by NewLeadModal) ───────────────────────────────
function FormFieldInput({ label, field, type = 'text', required = false, value, error, onUpdate }: {
  label: string; field: string; type?: string; required?: boolean
  value: string; error?: string
  onUpdate: (field: string, value: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={value}
        onChange={e => onUpdate(field, e.target.value)}
        className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}/>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ─── New Lead Modal ───────────────────────────────────────────────────────────
function NewLeadModal({ agents, projects, onClose, onCreated }: {
  agents: Agent[]; projects: Project[]
  onClose: () => void; onCreated: (lead: Lead) => void
}) {
  const [form, setForm] = useState({
    firstName:'', lastName:'', phone:'', email:'', source:'WHATSAPP', temperature:'NORMAL',
    budget:'', projectId:'', agentId:'', propertyInterest:'', financingType:'',
    followUpDate:'', notes:'',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [duplicate, setDuplicate] = useState<{id:string;firstName:string;lastName:string;phone:string}|null>(null)
  const [checkingDup, setCheckingDup] = useState(false)

  async function checkDuplicate(phone: string) {
    if (phone.length < 7) { setDuplicate(null); return }
    setCheckingDup(true)
    const res = await fetch(`/api/leads?search=${encodeURIComponent(phone)}`)
    if (res.ok) {
      const leads = await res.json()
      const match = leads.find((l: { phone: string; id: string; firstName: string; lastName: string }) => l.phone.replace(/\D/g,'') === phone.replace(/\D/g,''))
      setDuplicate(match || null)
    }
    setCheckingDup(false)
  }

  async function submit() {
    const e: Record<string,string> = {}
    if (!form.firstName.trim()) e.firstName='Requerido'
    if (!form.lastName.trim()) e.lastName='Requerido'
    if (!form.phone.trim()) e.phone='Requerido'
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    const res = await fetch('/api/leads', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({...form, budget:form.budget||null, projectId:form.projectId||null, agentId:form.agentId||null}),
    })
    if (res.ok) { onCreated(await res.json()) }
    setSaving(false)
  }

  function updateField(field: string, value: string) {
    setForm(p=>({...p,[field]:value}))
    setErrors(p=>({...p,[field]:''}))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-100">
          <div><h3 className="font-bold text-gray-900 text-lg">➕ Nuevo Lead</h3>
          <p className="text-sm text-gray-400 mt-0.5">Registrar nuevo prospecto</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">👤 Datos personales</p>
            <div className="grid grid-cols-2 gap-3">
              <FormFieldInput label="Nombre" field="firstName" required value={form.firstName} error={errors.firstName} onUpdate={updateField}/>
              <FormFieldInput label="Apellido" field="lastName" required value={form.lastName} error={errors.lastName} onUpdate={updateField}/>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Teléfono<span className="text-red-500 ml-0.5">*</span></label>
                <input type="tel" value={form.phone}
                  onChange={e=>{ setForm(p=>({...p,phone:e.target.value})); setErrors(p=>({...p,phone:''})) }}
                  onBlur={e=>checkDuplicate(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone?'border-red-400 bg-red-50':'border-gray-200'}`}/>
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                {checkingDup && <p className="text-xs text-gray-400 mt-1">Verificando duplicados...</p>}
                {duplicate && (
                  <div className="mt-1.5 bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-xs">
                    <strong className="text-amber-700">⚠️ Este teléfono ya existe:</strong>
                    <Link href={`/crm/${duplicate.id}`} className="block text-amber-600 hover:text-amber-800 font-semibold mt-0.5">
                      {duplicate.firstName} {duplicate.lastName} → Ver lead →
                    </Link>
                  </div>
                )}
              </div>
              <FormFieldInput label="Email" field="email" type="email" value={form.email} error={errors.email} onUpdate={updateField}/>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">📡 Origen y temperatura</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fuente</label>
                <select value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {[['META','📘 Meta Ads'],['GOOGLE','🔍 Google'],['WHATSAPP','💬 WhatsApp'],['WEB','🌐 Web'],['REFERIDO','👥 Referido'],['OTRO','📌 Otro']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Temperatura inicial</label>
                <div className="flex gap-1.5">
                  {Object.entries(TEMP_CONFIG).map(([k,c])=>(
                    <button key={k} onClick={()=>setForm(p=>({...p,temperature:k}))}
                      className={`flex-1 py-2 rounded-xl text-sm border transition-all ${form.temperature===k?c.color+' ring-2 ring-offset-1':'border-gray-200 hover:bg-gray-50'}`}>{c.short}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🏘️ Proyecto y asesora</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Proyecto</label>
                <select value={form.projectId} onChange={e=>setForm(p=>({...p,projectId:e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin asignar</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Asesora</label>
                <select value={form.agentId} onChange={e=>setForm(p=>({...p,agentId:e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin asignar</option>
                  {agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">💰 Perfil financiero</p>
            <div className="grid grid-cols-2 gap-3">
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tipo de propiedad</label>
                <select value={form.propertyInterest} onChange={e=>setForm(p=>({...p,propertyInterest:e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No definido</option>
                  {['DEPARTAMENTO','CASA','PENTHOUSE','OFICINA','OTRO'].map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Financiamiento</label>
                <select value={form.financingType} onChange={e=>setForm(p=>({...p,financingType:e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No definido</option>
                  {['CONTADO','FINANCIADO','HIPOTECARIO'].map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <FormFieldInput label="Próximo seguimiento" field="followUpDate" type="date" value={form.followUpDate} error={errors.followUpDate} onUpdate={updateField}/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notas iniciales</label>
            <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Primera impresión, contexto..."/>
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 font-medium">Cancelar</button>
          <button onClick={submit} disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
            {saving?'Guardando...':'✓ Crear Lead'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Lead Panel ───────────────────────────────────────────────────────────────
function LeadPanel({ lead, onClose, onStageChange, onActivityAdded, onTemperatureChange, onScheduleVisit }: {
  lead: Lead
  onClose: () => void
  onStageChange: (id: string, stage: string) => void
  onActivityAdded: (leadId: string, activity: Lead['activities'][0]) => void
  onTemperatureChange: (id: string, temp: string) => void
  onScheduleVisit: (lead: Lead) => void
}) {
  const stageCfg = STAGE_CONFIG[lead.stage as keyof typeof STAGE_CONFIG]
  const tempCfg = TEMP_CONFIG[lead.temperature as keyof typeof TEMP_CONFIG] || TEMP_CONFIG.NORMAL
  const [actType, setActType] = useState('LLAMADA')
  const [actDesc, setActDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [showLostModal, setShowLostModal] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [activeTab, setActiveTab] = useState<'actividad'|'templates'>('actividad')
  const [copiedIdx, setCopiedIdx] = useState<number|null>(null)

  const stageIndex = STAGES.indexOf(lead.stage as typeof STAGES[number])
  const nextStage = stageIndex < STAGES.length-2 ? STAGES[stageIndex+1] : null
  const canGoNext = nextStage && !['GANADO','PERDIDO'].includes(lead.stage)
  const score = calcScore(lead)
  const followUpOverdue = lead.followUpDate && new Date(lead.followUpDate) < new Date()

  async function logActivity() {
    if (!actDesc.trim()) return
    setSaving(true)
    const res = await fetch('/api/activities', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({leadId:lead.id, type:actType, description:actDesc}),
    })
    if (res.ok) { const act = await res.json(); onActivityAdded(lead.id,act); setActDesc('') }
    setSaving(false)
  }

  async function markLost() {
    await fetch(`/api/leads/${lead.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({stage:'PERDIDO', lostReason}),
    })
    onStageChange(lead.id,'PERDIDO')
    setShowLostModal(false)
  }

  function getTemplate(t: { label: string; text: string }) {
    return t.text
      .replace('{{nombre}}', lead.firstName)
      .replace('{{asesora}}', lead.agent?.name?.split(' ')[0] || 'tu asesora')
      .replace('{{proyecto}}', lead.project?.name || 'nuestro proyecto')
      
  }

  function copyTemplate(t: { label: string; text: string }, idx: number) {
    navigator.clipboard.writeText(getTemplate(t))
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const cleanPhone = lead.phone.replace(/\D/g,'')
  const templates = WA_TEMPLATES[lead.stage] || WA_TEMPLATES.NUEVO

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose}/>
      <div className="fixed right-0 top-0 h-full w-[440px] bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 text-white flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                {lead.firstName[0]}{lead.lastName[0]}
              </div>
              <div>
                <div className="font-bold text-lg leading-tight">{lead.firstName} {lead.lastName}</div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${tempCfg.color}`}>{tempCfg.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageCfg?.color}`}>{stageCfg?.label}</span>
                  
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl">✕</button>
          </div>
          {/* Score bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Lead Score</span>
              <span className="font-bold text-white">{score}/100</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full">
              <div className={`h-full rounded-full ${scoreColor(score)} transition-all`} style={{width:`${score}%`}}/>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
              💬 WhatsApp
            </a>
            <a href={`tel:${lead.phone}`}
              className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
              📞 Llamar
            </a>
          </div>
          <button onClick={()=>onScheduleVisit(lead)}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2 rounded-xl transition-colors">
            📅 Agendar visita / cita
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Info strip */}
          <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 border-b border-gray-200 text-xs">
            <div><span className="text-gray-400 block">Proyecto</span><div className="font-semibold text-gray-800 truncate">{lead.project?.name||<span className="text-gray-400">Sin asignar</span>}</div></div>
            <div><span className="text-gray-400 block">Fuente</span><div className="font-semibold text-gray-800">{SOURCE_CONFIG[lead.source as keyof typeof SOURCE_CONFIG]?.icon} {SOURCE_CONFIG[lead.source as keyof typeof SOURCE_CONFIG]?.label||lead.source}</div></div>
            {lead.propertyInterest && <div><span className="text-gray-400 block">Tipo interés</span><div className="font-semibold text-gray-800">{lead.propertyInterest}</div></div>}
            {lead.financingType && <div><span className="text-gray-400 block">Financiamiento</span><div className="font-semibold text-gray-800">{lead.financingType}</div></div>}
            {lead.followUpDate && (
              <div className={`col-span-2 ${followUpOverdue?'text-red-600':''}`}>
                <span className={`block ${followUpOverdue?'text-red-400':'text-gray-400'}`}>{followUpOverdue?'⚠️ Follow-up vencido':'📅 Próximo seguimiento'}</span>
                <div className={`font-semibold ${followUpOverdue?'text-red-600':'text-gray-800'}`}>
                  {new Date(lead.followUpDate).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})}
                </div>
              </div>
            )}
          </div>

          {/* Temperature */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🌡️ Temperatura</p>
            <div className="flex gap-2">
              {Object.entries(TEMP_CONFIG).map(([k,c])=>(
                <button key={k} onClick={()=>onTemperatureChange(lead.id,k)}
                  className={`flex-1 py-1.5 rounded-lg text-xs border font-medium transition-all ${lead.temperature===k?c.color+' ring-2 ring-offset-1':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {c.short}
                </button>
              ))}
            </div>
          </div>

          {/* Stage */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📊 Etapa</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {STAGES.filter(s=>s!=='PERDIDO').map(s=>{
                const cfg = STAGE_CONFIG[s as keyof typeof STAGE_CONFIG]
                const isA = lead.stage===s
                const idx = STAGES.indexOf(s as typeof STAGES[number])
                const isPast = STAGES.indexOf(lead.stage as typeof STAGES[number])>idx && lead.stage!=='PERDIDO'
                return (
                  <button key={s} onClick={()=>onStageChange(lead.id,s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${isA?(cfg?.color||'bg-blue-100 text-blue-700')+' ring-2 ring-offset-1':isPast?'bg-gray-100 text-gray-400':'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {cfg?.label||s}
                  </button>
                )
              })}
            </div>
            {canGoNext && nextStage!=='PERDIDO' && (
              <button onClick={()=>onStageChange(lead.id,nextStage!)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                Avanzar → {STAGE_CONFIG[nextStage as keyof typeof STAGE_CONFIG]?.label}
              </button>
            )}
            {lead.stage==='NEGOCIACION' && (
              <button onClick={()=>onStageChange(lead.id,'GANADO')}
                className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                🏆 Marcar como Ganado
              </button>
            )}
            {!['GANADO','PERDIDO'].includes(lead.stage) && (
              <button onClick={()=>setShowLostModal(true)}
                className="mt-2 w-full text-xs text-red-400 hover:text-red-600 hover:bg-red-50 py-2 rounded-xl transition-colors">
                ✕ Marcar como perdido
              </button>
            )}
          </div>

          {/* Activity / Templates tabs */}
          <div className="p-4">
            <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
              <button onClick={()=>setActiveTab('actividad')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab==='actividad'?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
                ⚡ Registrar actividad
              </button>
              <button onClick={()=>setActiveTab('templates')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab==='templates'?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
                💬 Templates WhatsApp
              </button>
            </div>

            {activeTab==='actividad' && (
              <div>
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {ACTIVITY_TYPES.map(t=>(
                    <button key={t.value} onClick={()=>setActType(t.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${actType===t.value?'bg-blue-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea value={actDesc} onChange={e=>setActDesc(e.target.value)} rows={2}
                    placeholder="¿Qué pasó? (Ctrl+Enter para guardar)"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    onKeyDown={e=>{ if(e.key==='Enter'&&e.ctrlKey){e.preventDefault();logActivity()} }}/>
                  <button onClick={logActivity} disabled={saving||!actDesc.trim()}
                    className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl text-sm font-semibold self-end py-2">
                    {saving?'...':'✓'}
                  </button>
                </div>
                <div className="mt-3 space-y-2.5">
                  {lead.activities.slice(0,6).map(a=>(
                    <div key={a.id} className="flex gap-2">
                      <span className="text-base flex-shrink-0 mt-0.5">{ACTIVITY_ICONS[a.type]||'📝'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-snug">{a.description}</p>
                        <span className="text-xs text-gray-400">{formatRelativeTime(a.date as string)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab==='templates' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 mb-3">Templates para etapa: <strong className="text-gray-600">{STAGE_CONFIG[lead.stage as keyof typeof STAGE_CONFIG]?.label||lead.stage}</strong></p>
                {templates.map((t, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">{t.label}</span>
                      <button onClick={()=>copyTemplate(t,idx)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${copiedIdx===idx?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'}`}>
                        {copiedIdx===idx ? '✓ Copiado' : '📋 Copiar'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{getTemplate(t)}</p>
                  </div>
                ))}
                <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer"
                  className="block w-full text-center bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors mt-2">
                  💬 Abrir WhatsApp →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 flex-shrink-0">
          <Link href={`/crm/${lead.id}`}
            className="block w-full text-center bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold py-3 rounded-xl transition-colors">
            📋 Ver perfil completo →
          </Link>
        </div>
      </div>

      {/* Lost modal */}
      {showLostModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-100"><h3 className="font-bold text-gray-900">❌ Razón de pérdida</h3></div>
            <div className="p-5 space-y-2">
              {[['PRECIO','💰 Precio muy alto'],['COMPETENCIA','🏢 Eligió otra inmobiliaria'],['SIN_PRESUPUESTO','🚫 Sin presupuesto'],['TIEMPO','⏰ No era el momento'],['NO_CONTACTA','📵 No responde'],['OTRO','🔹 Otro']].map(([v,l])=>(
                <button key={v} onClick={()=>setLostReason(v)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${lostReason===v?'bg-red-50 border-red-300 text-red-700':'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button onClick={()=>setShowLostModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
              <button onClick={markLost} disabled={!lostReason}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold text-sm px-4 py-2.5 rounded-xl">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Lead Card ────────────────────────────────────────────────────────────────
function LeadCard({ lead, selected, onSelect, onToggle, isDragOverlay }: {
  lead: Lead; selected?: boolean
  onSelect: (l: Lead) => void; onToggle?: (id: string) => void
  isDragOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id })
  const sourceCfg = SOURCE_CONFIG[lead.source as keyof typeof SOURCE_CONFIG]
  const tempCfg = TEMP_CONFIG[lead.temperature as keyof typeof TEMP_CONFIG] || TEMP_CONFIG.NORMAL
  const lastActivity = lead.activities[0]
  // eslint-disable-next-line react-hooks/purity
  const cardNow = Date.now()
  const daysSince = lastActivity
    ? Math.floor((cardNow-new Date(lastActivity.date as string).getTime())/86400000)
    : Math.floor((cardNow-new Date(lead.createdAt as string).getTime())/86400000)
  const followUpOverdue = lead.followUpDate && new Date(lead.followUpDate) < new Date()
  const score = calcScore(lead)

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
      onClick={()=>onSelect(lead)}
      className={`bg-white rounded-xl border border-l-4 ${tempCfg.bar.replace('bg-','border-l-')} p-3.5 cursor-pointer hover:shadow-md transition-all ${selected?'ring-2 ring-blue-400 border-blue-300':''} border-gray-200 ${isDragging && !isDragOverlay ? 'opacity-30 scale-95' : ''} ${isDragOverlay ? 'shadow-2xl rotate-2 scale-105' : ''} touch-none`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {onToggle && (
            <div onClick={e=>{e.stopPropagation();onToggle(lead.id)}} className={`w-4 h-4 rounded border-2 flex-shrink-0 ${selected?'bg-blue-500 border-blue-500':'border-gray-300'} flex items-center justify-center`}>
              {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
            </div>
          )}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {lead.firstName[0]}{lead.lastName[0]}
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-900 leading-tight">{lead.firstName} {lead.lastName}</div>
            <div className="text-xs text-gray-400">{lead.phone}</div>
          </div>
        </div>
        <span className="text-sm">{sourceCfg?.icon||'📌'}</span>
      </div>

      {lead.project && <div className="text-xs text-gray-500 truncate mb-1.5">🏢 {lead.project.name}</div>}
      <div className="flex items-center justify-between mb-2">
        
        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${tempCfg.color}`}>{tempCfg.short}</span>
      </div>

      {lastActivity && (
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-2 py-1.5 mb-2 truncate">
          {ACTIVITY_ICONS[lastActivity.type]} {lastActivity.description}
        </div>
      )}

      {/* Score bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-gray-400">Score</span>
          <span className={`font-bold ${score>=75?'text-green-600':score>=50?'text-yellow-600':'text-gray-500'}`}>{score}</span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full">
          <div className={`h-full rounded-full ${scoreColor(score)}`} style={{width:`${score}%`}}/>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          {followUpOverdue && <span className="text-xs text-red-500 font-semibold">⚠️</span>}
          <span className={`text-xs ${daysSince>7?'text-orange-500 font-semibold':'text-gray-400'}`}>
            {daysSince===0?'Hoy':`hace ${daysSince}d`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {lead.activities.length>0 && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 rounded-full">{lead.activities.length}✓</span>}
          {lead.agent && <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold" title={lead.agent.name}>{lead.agent.name[0]}</div>}
        </div>
      </div>
    </div>
  )
}

// ─── Bulk WhatsApp Modal ───────────────────────────────────────────────────────
function BulkWhatsAppModal({ leads, onClose, onSent }: {
  leads: Lead[]
  onClose: () => void
  onSent: () => void
}) {
  const [template, setTemplate] = useState('Hola {{nombre}}, te contactamos desde nuestro equipo de ventas. ¿Te gustaría recibir más información sobre nuestros proyectos?')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)

  const preview = template
    .replace(/\{\{nombre\}\}/g, leads[0]?.firstName ?? 'Nombre')
    .replace(/\{\{apellido\}\}/g, leads[0]?.lastName ?? 'Apellido')
    .replace(/\{\{nombre_completo\}\}/g, `${leads[0]?.firstName ?? 'Nombre'} ${leads[0]?.lastName ?? 'Apellido'}`)

  async function send() {
    setSending(true)
    try {
      const res = await fetch('/api/whatsapp/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: leads.map(l => l.id), template }),
      })
      const data = await res.json() as { sent: number; failed: number }
      setResult(data)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">💬 WhatsApp masivo</h3>
            <p className="text-sm text-gray-500 mt-0.5">{leads.length} leads seleccionados</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {result ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-3">{result.failed === 0 ? '✅' : '⚠️'}</div>
            <p className="text-lg font-bold text-gray-900 mb-1">
              {result.sent} mensajes enviados
            </p>
            {result.failed > 0 && (
              <p className="text-sm text-red-500">{result.failed} fallaron</p>
            )}
            <button onClick={onSent} className="mt-5 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
              Cerrar
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje template{' '}
                <span className="text-gray-400 font-normal text-xs">
                  — variables: {'{'}{'{'} nombre {'}'}{'}'}, {'{'}{'{'} apellido {'}'}{'}'}, {'{'}{'{'} nombre_completo {'}'}{'}'}
                </span>
              </label>
              <textarea
                value={template}
                onChange={e => setTemplate(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-xs font-medium text-green-700 mb-2">Vista previa (primer lead)</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{preview}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto">
              <p className="text-xs font-medium text-gray-500 mb-2">Destinatarios ({leads.length})</p>
              <div className="space-y-1">
                {leads.slice(0, 8).map(l => (
                  <div key={l.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    {l.firstName} {l.lastName} · {l.phone}
                  </div>
                ))}
                {leads.length > 8 && (
                  <p className="text-xs text-gray-400">y {leads.length - 8} más...</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => { void send() }}
                disabled={sending || !template.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {sending ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
                ) : (
                  <>💬 Enviar a {leads.length} leads</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ stage, leads, onSelect, selected, onToggle }: {
  stage: string; leads: Lead[]; onSelect: (l: Lead) => void
  selected: Set<string>; onToggle: (id: string) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `column-${stage}` })
  const cfg = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]
  const hotCount = leads.filter(l=>l.temperature==='HOT').length

  return (
    <div className={`flex-shrink-0 w-[260px] rounded-xl border border-gray-200 border-t-4 ${COLUMN_COLORS[stage]||'border-t-gray-300'} transition-colors ${isOver ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-200' : 'bg-gray-50/80'}`}>
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-800">{cfg?.label||stage}</h3>
          <div className="flex items-center gap-1.5">
            {hotCount>0 && <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded-full font-bold">🔥{hotCount}</span>}
            <span className="w-6 h-6 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-full flex items-center justify-center">{leads.length}</span>
          </div>
        </div>
      </div>
      <div ref={setNodeRef} className="p-2 space-y-2 min-h-20 max-h-[calc(100vh-300px)] overflow-y-auto">
        {leads.map(l=><LeadCard key={l.id} lead={l} selected={selected.has(l.id)} onSelect={onSelect} onToggle={onToggle}/>)}
        {leads.length===0 && (
          <div className={`text-center py-8 text-xs border-2 border-dashed rounded-xl ${isOver ? 'border-blue-300 text-blue-400 bg-blue-50' : 'border-gray-200 text-gray-300'}`}>
            {isOver ? 'Soltar aquí' : 'Sin leads'}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main CRM ─────────────────────────────────────────────────────────────────
export default function CRMClient({ data, initialFilter }: {
  data: CRMData
  initialFilter?: { agentId?: string; projectId?: string; source?: string }
}) {
  const [leads, setLeads] = useState<Lead[]>(data.leads)
  const [filter, setFilter] = useState({
    source: initialFilter?.source||'', projectId: initialFilter?.projectId||'',
    agentId: initialFilter?.agentId||'', temperature:'', search:'', showLost:false, preset:'',
  })
  const [showModal, setShowModal] = useState(false)
  const [view, setView] = useState<'kanban'|'list'|'stats'>('kanban')
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [selectedLead, setSelectedLead] = useState<Lead|null>(null)
  const [sortList, setSortList] = useState<'updatedAt'|'budget'|'score'|'createdAt'>('updatedAt')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState('')
  const [bulkAgentId, setBulkAgentId] = useState('')
  const [bulkStage, setBulkStage] = useState('')
  const [bulkTemp, setBulkTemp] = useState('')
  const [applyingBulk, setApplyingBulk] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showBulkWA, setShowBulkWA] = useState(false)
  const [scheduleVisitFor, setScheduleVisitFor] = useState<Lead|null>(null)

  const handleStageChange = useCallback(async (leadId: string, stage: string) => {
    setLeads(prev => prev.map(l => l.id===leadId ? {...l, stage} : l))
    if (selectedLead?.id===leadId) setSelectedLead(prev => prev ? {...prev, stage} : null)
    await fetch(`/api/leads/${leadId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({stage}) })
  }, [selectedLead])

  const handleTemperatureChange = useCallback(async (leadId: string, temperature: string) => {
    setLeads(prev => prev.map(l => l.id===leadId ? {...l, temperature} : l))
    if (selectedLead?.id===leadId) setSelectedLead(prev => prev ? {...prev, temperature} : null)
    await fetch(`/api/leads/${leadId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({temperature}) })
  }, [selectedLead])

  const handleActivityAdded = useCallback((leadId: string, activity: Lead['activities'][0]) => {
    setLeads(prev => prev.map(l => l.id===leadId ? {...l, activities:[activity,...l.activities]} : l))
    setSelectedLead(prev => prev?.id===leadId ? {...prev, activities:[activity,...prev.activities]} : prev)
  }, [])

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  function toggleSelectAll(leads: Lead[]) {
    if (leads.every(l => selectedIds.has(l.id))) setSelectedIds(prev => { const n=new Set(prev); leads.forEach(l=>n.delete(l.id)); return n })
    else setSelectedIds(prev => { const n=new Set(prev); leads.forEach(l=>n.add(l.id)); return n })
  }

  async function applyBulk() {
    if (selectedIds.size === 0) return
    setApplyingBulk(true)
    const payload: Record<string,unknown> = {}
    if (bulkAction==='stage' && bulkStage) payload.stage = bulkStage
    if (bulkAction==='agent') payload.agentId = bulkAgentId || null
    if (bulkAction==='temp' && bulkTemp) payload.temperature = bulkTemp
    if (Object.keys(payload).length > 0) {
      await Promise.all([...selectedIds].map(id =>
        fetch(`/api/leads/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
      ))
      setLeads(prev => prev.map(l => selectedIds.has(l.id) ? {...l,...payload} : l))
    }
    if (bulkAction==='delete') {
      const ok = window.confirm(`¿Eliminar ${selectedIds.size} leads? Esta acción no se puede deshacer.`)
      if (ok) {
        await Promise.all([...selectedIds].map(id => fetch(`/api/leads/${id}`, { method:'DELETE' })))
        setLeads(prev => prev.filter(l => !selectedIds.has(l.id)))
      }
    }
    if (bulkAction==='export') {
      exportCSV(leads.filter(l=>selectedIds.has(l.id)), 'leads-seleccion')
    }
    if (bulkAction==='whatsapp') {
      setShowBulkWA(true)
      setApplyingBulk(false)
      return
    }
    setSelectedIds(new Set())
    setBulkAction('')
    setApplyingBulk(false)
  }

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find(l => l.id === event.active.id)
    if (lead) setDraggedLead(lead)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedLead(null)
    const { active, over } = event
    if (!over) return
    const overId = String(over.id)
    if (!overId.startsWith('column-')) return
    const newStage = overId.replace('column-', '')
    const leadId = String(active.id)
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.stage === newStage) return
    handleStageChange(leadId, newStage)
  }

  const now = useMemo(() => new Date(), [])

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (!filter.showLost && l.stage==='PERDIDO') return false
      if (filter.source && l.source!==filter.source) return false
      if (filter.projectId && l.project?.id!==filter.projectId) return false
      if (filter.agentId && l.agent?.id!==filter.agentId) return false
      if (filter.temperature && l.temperature!==filter.temperature) return false
      if (filter.preset) {
        if (filter.preset==='hot_inactive') {
          if (l.temperature!=='HOT' || ['GANADO','PERDIDO'].includes(l.stage)) return false
          const d = l.activities[0] ? Math.floor((now.getTime()-new Date(l.activities[0].date as string).getTime())/86400000) : 999
          if (d < 3) return false
        }
        if (filter.preset==='followup_overdue') {
          if (!l.followUpDate || new Date(l.followUpDate)>=now || ['GANADO','PERDIDO'].includes(l.stage)) return false
        }
        if (filter.preset==='no_activity_7d') {
          if (['GANADO','PERDIDO'].includes(l.stage)) return false
          const d = l.activities[0] ? Math.floor((now.getTime()-new Date(l.activities[0].date as string).getTime())/86400000) : Math.floor((now.getTime()-new Date(l.createdAt as string).getTime())/86400000)
          if (d < 7) return false
        }
        if (filter.preset==='high_budget') {
          if (!l.budget || l.budget < 150000) return false
        }
        if (filter.preset==='negociacion') {
          if (l.stage !== 'NEGOCIACION') return false
        }
        if (filter.preset==='no_agent') {
          if (l.agent || ['GANADO','PERDIDO'].includes(l.stage)) return false
        }
      }
      if (filter.search) {
        const s = filter.search.toLowerCase()
        if (!`${l.firstName} ${l.lastName}`.toLowerCase().includes(s) &&
          !l.phone.includes(s) && !(l.email||'').toLowerCase().includes(s) &&
          !(l.project?.name||'').toLowerCase().includes(s)) return false
      }
      return true
    })
  }, [leads, filter, now])

  const stats = useMemo(() => {
    const weekAgo = new Date(now.getTime()-7*86400000)
    return {
      total: leads.length,
      active: leads.filter(l=>!['GANADO','PERDIDO'].includes(l.stage)).length,
      hot: leads.filter(l=>l.temperature==='HOT'&&!['GANADO','PERDIDO'].includes(l.stage)).length,
      thisWeek: leads.filter(l=>new Date(l.createdAt as string)>=weekAgo).length,
      negociacion: leads.filter(l=>l.stage==='NEGOCIACION').length,
      ganados: leads.filter(l=>l.stage==='GANADO').length,
      convRate: leads.length>0?((leads.filter(l=>l.stage==='GANADO').length/leads.length)*100).toFixed(1):'0.0',
      followUpOverdue: leads.filter(l=>l.followUpDate&&new Date(l.followUpDate)<now&&!['GANADO','PERDIDO'].includes(l.stage)).length,
      noActivity7d: leads.filter(l=>{
        if(['GANADO','PERDIDO'].includes(l.stage)) return false
        const d=l.activities[0]?Math.floor((now.getTime()-new Date(l.activities[0].date as string).getTime())/86400000):999
        return d>=7
      }).length,
      noAgent: leads.filter(l=>!l.agent&&!['GANADO','PERDIDO'].includes(l.stage)).length,
    }
  }, [leads, now])

  const leadsByStage = useMemo(() => VISIBLE_STAGES.reduce((acc,s) => {
    acc[s] = filteredLeads.filter(l=>l.stage===s); return acc
  }, {} as Record<string,Lead[]>), [filteredLeads])

  const sortedList = useMemo(() => [...filteredLeads].sort((a,b) => {
    if (sortList==='budget') return (b.budget||0)-(a.budget||0)
    if (sortList==='score') return calcScore(b)-calcScore(a)
    if (sortList==='createdAt') return new Date(b.createdAt as string).getTime()-new Date(a.createdAt as string).getTime()
    return new Date(b.updatedAt as string).getTime()-new Date(a.updatedAt as string).getTime()
  }), [filteredLeads, sortList])

  const PRESETS = [
    { key:'', label:'Todos' },
    { key:'hot_inactive', label:'🔥 Hot sin contactar', count: stats.hot },
    { key:'followup_overdue', label:'⚠️ Follow-up vencido', count: stats.followUpOverdue },
    { key:'no_activity_7d', label:'📵 Sin actividad 7d+', count: stats.noActivity7d },
    { key:'negociacion', label:'💼 En negociación', count: stats.negociacion },
    { key:'high_budget', label:'💰 Alto presupuesto', count: null },
    { key:'no_agent', label:'👤 Sin asesora', count: stats.noAgent },
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 lg:py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <div>
            <h1 className="text-base md:text-xl font-bold text-gray-900">CRM · Pipeline</h1>
            <p className="text-gray-500 text-xs md:text-sm">{stats.active} activos · {stats.ganados} ganados</p>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2">
            <div className="flex bg-gray-100 rounded-xl p-1">
              {[['kanban','📋'],['list','📄'],['stats','📊']].map(([v,l])=>(
                <button key={v} onClick={()=>setView(v as 'kanban'|'list'|'stats')}
                  className={`px-2.5 lg:px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${view===v?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
                  <span>{l}</span>
                  <span className="hidden lg:inline ml-1">{v==='kanban'?'Kanban':v==='list'?'Lista':'Stats'}</span>
                </button>
              ))}
            </div>
            <button onClick={()=>setShowImport(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              📥 <span className="hidden md:inline">Importar</span>
            </button>
            <button onClick={()=>exportCSV(filteredLeads)} title="Exportar CSV"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              ⬇️ <span className="hidden md:inline">CSV</span>
            </button>
            <button onClick={()=>setShowModal(true)}
              className="flex items-center gap-1.5 lg:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              <span className="hidden sm:inline">Nuevo Lead</span>
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {[
            {label:'Total leads', value:stats.total, sub:'en el CRM', color:'text-gray-700', bg:'bg-gray-50'},
            {label:'🔥 Hot leads', value:stats.hot, sub:'activos', color:'text-red-600', bg:'bg-red-50'},
            {label:'Esta semana', value:stats.thisWeek, sub:'nuevos', color:'text-blue-600', bg:'bg-blue-50'},
            {label:'En negociación', value:stats.negociacion, sub:'avanzados', color:'text-orange-600', bg:'bg-orange-50'},
            {label:'Conversión', value:`${stats.convRate}%`, sub:'ganados', color:'text-green-600', bg:'bg-green-50'},
            {label:'⚠️ Follow-up', value:stats.followUpOverdue, sub:'vencidos', color:'text-amber-600', bg:'bg-amber-50'},
          ].map(s=>(
            <div key={s.label} className={`${s.bg} rounded-xl p-3 border border-gray-200 cursor-default`}>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs font-semibold text-gray-600 mt-0.5 leading-tight">{s.label}</div>
              <div className="text-xs text-gray-400">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Preset filters */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 flex-nowrap">
          {PRESETS.map(p=>(
            <button key={p.key} onClick={()=>setFilter(f=>({...f,preset:f.preset===p.key&&p.key!==''?'':p.key}))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all flex-shrink-0
                ${filter.preset===p.key && p.key!=='' ? 'bg-blue-600 text-white border-blue-600' : p.key==='' && filter.preset==='' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {p.label}
              {p.count != null && p.count > 0 && <span className={`px-1.5 rounded-full text-xs font-bold ${filter.preset===p.key&&p.key!==''?'bg-white/20 text-white':'bg-gray-200 text-gray-600'}`}>{p.count}</span>}
            </button>
          ))}
        </div>

        {/* Main filters */}
        {view !== 'stats' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input type="text" placeholder="Buscar por nombre, tel, proyecto..." value={filter.search}
                onChange={e=>setFilter(f=>({...f,search:e.target.value}))}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-64"/>
            </div>
            <select value={filter.source} onChange={e=>setFilter(f=>({...f,source:e.target.value}))}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-600">
              <option value="">Todos los canales</option>
              {[['META','📘 Meta'],['GOOGLE','🔍 Google'],['WHATSAPP','💬 WhatsApp'],['WEB','🌐 Web'],['REFERIDO','👥 Referido'],['OTRO','📌 Otro']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filter.projectId} onChange={e=>setFilter(f=>({...f,projectId:e.target.value}))}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none text-gray-600">
              <option value="">Todos los proyectos</option>
              {data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filter.agentId} onChange={e=>setFilter(f=>({...f,agentId:e.target.value}))}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none text-gray-600">
              <option value="">Todas las asesoras</option>
              {data.agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {/* Temperature pills */}
            <div className="flex gap-1 border border-gray-200 rounded-xl p-1 bg-white">
              <button onClick={()=>setFilter(f=>({...f,temperature:''}))}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filter.temperature===''?'bg-gray-900 text-white':'text-gray-500 hover:bg-gray-100'}`}>Todos</button>
              {Object.entries(TEMP_CONFIG).map(([k,c])=>(
                <button key={k} onClick={()=>setFilter(f=>({...f,temperature:f.temperature===k?'':k}))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${filter.temperature===k?c.color+' border-current':'border-transparent text-gray-500 hover:bg-gray-100'}`}>
                  {c.short}
                </button>
              ))}
            </div>
            <button onClick={()=>setFilter(f=>({...f,showLost:!f.showLost}))}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${filter.showLost?'bg-red-50 text-red-600 border-red-200':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {filter.showLost?'✕':'+'}  Perdidos
            </button>
            {(filter.search||filter.source||filter.projectId||filter.agentId||filter.temperature||filter.preset) && (
              <button onClick={()=>setFilter({source:'',projectId:'',agentId:'',temperature:'',search:'',showLost:false,preset:''})}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2">Limpiar</button>
            )}
            <span className="text-xs text-gray-400 ml-auto">{filteredLeads.length} leads</span>
          </div>
        )}
      </div>

      {/* ── Stats view ── */}
      {view==='stats' && <StatsView leads={leads} agents={data.agents}/>}

      {/* ── Kanban ── */}
      {view==='kanban' && (
        <div className="flex-1 overflow-x-auto p-5">
          {selectedIds.size>0 && (
            <div className="mb-3 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-blue-700">{selectedIds.size} seleccionados</span>
              <div className="flex gap-2 flex-1 flex-wrap">
                {[
                  {key:'stage',label:'Cambiar etapa'},
                  {key:'agent',label:'Asignar asesora'},
                  {key:'temp',label:'Cambiar temperatura'},
                  {key:'whatsapp',label:'💬 WhatsApp masivo'},
                  {key:'export',label:'⬇️ Exportar'},
                  {key:'delete',label:'🗑️ Eliminar'},
                ].map(a=>(
                  <button key={a.key} onClick={()=>setBulkAction(a.key)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${bulkAction===a.key?'bg-blue-600 text-white border-blue-600':'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}>
                    {a.label}
                  </button>
                ))}
                {bulkAction==='stage' && (
                  <select value={bulkStage} onChange={e=>setBulkStage(e.target.value)} className="text-xs border border-blue-200 rounded-lg px-2 py-1 bg-white">
                    <option value="">Selecciona etapa...</option>
                    {STAGES.map(s=><option key={s} value={s}>{STAGE_CONFIG[s as keyof typeof STAGE_CONFIG]?.label||s}</option>)}
                  </select>
                )}
                {bulkAction==='agent' && (
                  <select value={bulkAgentId} onChange={e=>setBulkAgentId(e.target.value)} className="text-xs border border-blue-200 rounded-lg px-2 py-1 bg-white">
                    <option value="">Sin asesora</option>
                    {data.agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
                {bulkAction==='temp' && (
                  <select value={bulkTemp} onChange={e=>setBulkTemp(e.target.value)} className="text-xs border border-blue-200 rounded-lg px-2 py-1 bg-white">
                    <option value="">Selecciona...</option>
                    {Object.entries(TEMP_CONFIG).map(([k,c])=><option key={k} value={k}>{c.label}</option>)}
                  </select>
                )}
                {bulkAction && (
                  <button onClick={applyBulk} disabled={applyingBulk}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {applyingBulk?'Aplicando...':'Aplicar'}
                  </button>
                )}
              </div>
              <button onClick={()=>{setSelectedIds(new Set());setBulkAction('')}} className="text-blue-400 hover:text-blue-600 text-sm">✕</button>
            </div>
          )}
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 min-w-max h-full">
              {VISIBLE_STAGES.map(s=>(
                <KanbanColumn key={s} stage={s} leads={leadsByStage[s]||[]} onSelect={setSelectedLead} selected={selectedIds} onToggle={toggleSelect}/>
              ))}
              {filter.showLost && (
                <div className="flex-shrink-0 w-[260px] bg-red-50/50 rounded-xl border border-red-200 border-t-4 border-t-red-400">
                  <div className="p-3 border-b border-red-200 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-red-700">Perdidos</h3>
                    <span className="w-6 h-6 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-full flex items-center justify-center">{filteredLeads.filter(l=>l.stage==='PERDIDO').length}</span>
                  </div>
                  <div className="p-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {filteredLeads.filter(l=>l.stage==='PERDIDO').map(l=><LeadCard key={l.id} lead={l} onSelect={setSelectedLead} selected={selectedIds.has(l.id)} onToggle={toggleSelect}/>)}
                  </div>
                </div>
              )}
            </div>
            <DragOverlay>
              {draggedLead && <LeadCard lead={draggedLead} onSelect={()=>{}} isDragOverlay />}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* ── List ── */}
      {view==='list' && (
        <div className="flex-1 overflow-y-auto p-5">
          {/* Bulk bar */}
          {selectedIds.size>0 && (
            <div className="mb-3 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-blue-700">{selectedIds.size} seleccionados</span>
              <div className="flex gap-2 flex-wrap flex-1">
                {[{key:'stage',label:'Cambiar etapa'},{key:'agent',label:'Asignar asesora'},{key:'temp',label:'Temperatura'},{key:'whatsapp',label:'💬 WhatsApp masivo'},{key:'export',label:'⬇️ Exportar selección'},{key:'delete',label:'🗑️ Eliminar'}].map(a=>(
                  <button key={a.key} onClick={()=>setBulkAction(a.key)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${bulkAction===a.key?'bg-blue-600 text-white border-blue-600':'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}>
                    {a.label}
                  </button>
                ))}
                {bulkAction==='stage' && <select value={bulkStage} onChange={e=>setBulkStage(e.target.value)} className="text-xs border border-blue-200 rounded-lg px-2 py-1 bg-white"><option value="">Etapa...</option>{STAGES.map(s=><option key={s} value={s}>{STAGE_CONFIG[s as keyof typeof STAGE_CONFIG]?.label||s}</option>)}</select>}
                {bulkAction==='agent' && <select value={bulkAgentId} onChange={e=>setBulkAgentId(e.target.value)} className="text-xs border border-blue-200 rounded-lg px-2 py-1 bg-white"><option value="">Sin asesora</option>{data.agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>}
                {bulkAction==='temp' && <select value={bulkTemp} onChange={e=>setBulkTemp(e.target.value)} className="text-xs border border-blue-200 rounded-lg px-2 py-1 bg-white"><option value="">Temperatura...</option>{Object.entries(TEMP_CONFIG).map(([k,c])=><option key={k} value={k}>{c.label}</option>)}</select>}
                {bulkAction && <button onClick={applyBulk} disabled={applyingBulk} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">{applyingBulk?'Aplicando...':'Aplicar'}</button>}
              </div>
              <button onClick={()=>{setSelectedIds(new Set());setBulkAction('')}} className="text-blue-400 hover:text-blue-600 text-sm">✕</button>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <div onClick={()=>toggleSelectAll(sortedList)} className={`w-4 h-4 rounded border-2 cursor-pointer ${sortedList.every(l=>selectedIds.has(l.id))&&sortedList.length>0?'bg-blue-500 border-blue-500':'border-gray-300'} flex items-center justify-center`}>
                  {sortedList.every(l=>selectedIds.has(l.id))&&sortedList.length>0 && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                </div>
                <span className="text-sm font-semibold text-gray-700">{filteredLeads.length} leads</span>
              </div>
              <select value={sortList} onChange={e=>setSortList(e.target.value as 'updatedAt'|'budget'|'score'|'createdAt')}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none text-gray-600">
                <option value="updatedAt">Reciente actividad</option>
                
                <option value="score">Mayor score</option>
                <option value="createdAt">Más nuevos</option>
              </select>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-xs text-gray-500 uppercase">
                  <th className="w-8 px-3 py-3"/>
                  {['Lead','Canal','Proyecto','Asesora','Temp.','Etapa','Score','Interés','Follow-up','Última act.',''].map(h=>(
                    <th key={h} className="text-left px-3 py-3 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedList.map(l=>{
                  const stageCfg = STAGE_CONFIG[l.stage as keyof typeof STAGE_CONFIG]
                  const sourceCfg = SOURCE_CONFIG[l.source as keyof typeof SOURCE_CONFIG]
                  const tempCfg2 = TEMP_CONFIG[l.temperature as keyof typeof TEMP_CONFIG] || TEMP_CONFIG.NORMAL
                  const lastAct = l.activities[0]
                  const followUpOD = l.followUpDate && new Date(l.followUpDate) < now
                  const score = calcScore(l)
                  const isSelected = selectedIds.has(l.id)
                  return (
                    <tr key={l.id} className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${isSelected?'bg-blue-50':''}`}
                      onClick={()=>setSelectedLead(l)}>
                      <td className="px-3 py-3" onClick={e=>{e.stopPropagation();toggleSelect(l.id)}}>
                        <div className={`w-4 h-4 rounded border-2 cursor-pointer ${isSelected?'bg-blue-500 border-blue-500':'border-gray-300'} flex items-center justify-center`}>
                          {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {l.firstName[0]}{l.lastName[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{l.firstName} {l.lastName}</div>
                            <div className="text-xs text-gray-400">{l.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">{sourceCfg?.icon} {sourceCfg?.label}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 max-w-[110px] truncate">{l.project?.name||'—'}</td>
                      <td className="px-3 py-3 text-xs text-gray-600">{l.agent?.name?.split(' ')[0]||<span className="text-red-400">Sin asignar</span>}</td>
                      <td className="px-3 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tempCfg2.color}`}>{tempCfg2.short}</span></td>
                      <td className="px-3 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${stageCfg?.color||''}`}>{stageCfg?.label||l.stage}</span></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1.5 bg-gray-200 rounded-full"><div className={`h-full rounded-full ${scoreColor(score)}`} style={{width:`${score}%`}}/></div>
                          <span className={`text-xs font-bold ${score>=75?'text-green-600':score>=50?'text-yellow-600':'text-gray-500'}`}>{score}</span>
                        </div>
                      </td>
                      
                      <td className="px-3 py-3 text-xs text-gray-500">{l.propertyInterest||'—'}</td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {l.followUpDate ? <span className={followUpOD?'text-red-600 font-semibold':'text-gray-600'}>{followUpOD?'⚠️ ':''}{new Date(l.followUpDate).toLocaleDateString('es-CL',{day:'numeric',month:'short'})}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400 max-w-[130px] truncate">
                        {lastAct?<span>{ACTIVITY_ICONS[lastAct.type]} {lastAct.description}</span>:<span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/crm/${l.id}`} onClick={e=>e.stopPropagation()} className="text-xs text-blue-500 hover:text-blue-700 font-medium whitespace-nowrap">Ver →</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {sortedList.length===0 && (
              <div className="py-16 text-center text-gray-400">
                <div className="text-4xl mb-3">🔍</div>
                <p>No hay leads con estos filtros</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Slide-over ── */}
      {selectedLead && (
        <LeadPanel lead={selectedLead}
          onClose={()=>setSelectedLead(null)} onStageChange={handleStageChange}
          onActivityAdded={handleActivityAdded} onTemperatureChange={handleTemperatureChange}
          onScheduleVisit={l=>setScheduleVisitFor(l)}/>
      )}

      {/* ── New Lead ── */}
      {showModal && <NewLeadModal agents={data.agents} projects={data.projects} onClose={()=>setShowModal(false)} onCreated={lead=>{setLeads(p=>[lead,...p]);setShowModal(false)}}/>}

      {/* ── Import CSV ── */}
      {showImport && <ImportModal agents={data.agents} projects={data.projects} onClose={()=>setShowImport(false)} onImported={newLeads=>{setLeads(p=>[...newLeads,...p]);setShowImport(false)}}/>}

      {/* ── Bulk WhatsApp ── */}
      {showBulkWA && (
        <BulkWhatsAppModal
          leads={leads.filter(l=>selectedIds.has(l.id))}
          onClose={()=>setShowBulkWA(false)}
          onSent={()=>{ setShowBulkWA(false); setSelectedIds(new Set()); setBulkAction('') }}
        />
      )}

      {/* ── Schedule Visit ── */}
      {scheduleVisitFor && (
        <ScheduleVisitModal lead={scheduleVisitFor} agents={data.agents} onClose={()=>setScheduleVisitFor(null)}
          onScheduled={()=>{ setScheduleVisitFor(null) }}/>
      )}
    </div>
  )
}
