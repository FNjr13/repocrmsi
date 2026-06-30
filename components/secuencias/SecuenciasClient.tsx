'use client'

import { useState } from 'react'

interface SequenceStep {
  id?: string
  stepOrder: number
  dayOffset: number
  actionType: string
  actionData: Record<string, string>
}

interface Sequence {
  id: string
  name: string
  description: string | null
  isActive: boolean
  triggerType: string
  triggerValue: string | null
  filterTemp: string | null
  filterStage: string | null
  enrolledCount: number
  createdAt: string
  steps: (SequenceStep & { id: string; createdAt: string })[]
}

const ACTION_TYPES = [
  { value: 'NOTIFICATION', label: '🔔 Notificación interna', desc: 'Alerta al equipo de ventas' },
  { value: 'WHATSAPP_TEMPLATE', label: '💬 Mensaje WhatsApp', desc: 'Template de mensaje al lead' },
  { value: 'CREATE_TASK', label: '✅ Crear tarea', desc: 'Tarea en el calendario' },
  { value: 'CHANGE_TEMP', label: '🌡️ Cambiar temperatura', desc: 'HOT, WARM, NORMAL, COLD' },
]

const TRIGGER_TYPES = [
  { value: 'NEW_LEAD', label: '👤 Nuevo lead', desc: 'Al crear un lead' },
  { value: 'STAGE_CHANGE', label: '🔄 Cambio de etapa', desc: 'Al mover de etapa' },
  { value: 'TEMPERATURE_CHANGE', label: '🌡️ Cambio de temperatura', desc: 'Al cambiar temperatura' },
  { value: 'MANUAL', label: '🖐️ Manual', desc: 'Solo por asignación manual' },
]

const STAGES = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'VISITA', 'NEGOCIACION']
const TEMPS = ['HOT', 'WARM', 'NORMAL', 'COLD']

const DEFAULT_STEPS: SequenceStep[] = [
  { stepOrder: 0, dayOffset: 0, actionType: 'NOTIFICATION', actionData: { message: 'Nuevo lead requiere contacto inmediato' } },
  { stepOrder: 1, dayOffset: 1, actionType: 'WHATSAPP_TEMPLATE', actionData: { template: 'Hola {{nombre}}, gracias por tu interés en nuestros proyectos.' } },
  { stepOrder: 2, dayOffset: 3, actionType: 'NOTIFICATION', actionData: { message: 'Lead sin respuesta a los 3 días' } },
  { stepOrder: 3, dayOffset: 7, actionType: 'WHATSAPP_TEMPLATE', actionData: { template: 'Hola {{nombre}}, ¿te gustaría agendar una visita a nuestro proyecto?' } },
]

function StepCard({
  step, index, onChange, onDelete,
}: {
  step: SequenceStep; index: number
  onChange: (s: SequenceStep) => void
  onDelete: () => void
}) {
  const action = ACTION_TYPES.find(a => a.value === step.actionType)
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 relative">
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Día</label>
              <input type="number" min={0} value={step.dayOffset}
                onChange={e => onChange({ ...step, dayOffset: parseInt(e.target.value) || 0 })}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Acción</label>
              <select value={step.actionType}
                onChange={e => onChange({ ...step, actionType: e.target.value, actionData: {} })}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>

          {/* Action data fields */}
          {(step.actionType === 'NOTIFICATION') && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mensaje de la notificación</label>
              <input type="text" value={step.actionData.message || ''}
                onChange={e => onChange({ ...step, actionData: { ...step.actionData, message: e.target.value } })}
                placeholder="ej: Lead sin actividad en 3 días"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
          )}

          {(step.actionType === 'WHATSAPP_TEMPLATE') && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mensaje WhatsApp <span className="normal-case font-normal text-gray-400">(usa {'{{nombre}}'}, {'{{proyecto}}'})</span></label>
              <textarea value={step.actionData.template || ''}
                onChange={e => onChange({ ...step, actionData: { ...step.actionData, template: e.target.value } })}
                rows={2} placeholder="Hola {{nombre}}, ¿te gustaría conocer más?"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"/>
            </div>
          )}

          {(step.actionType === 'CREATE_TASK') && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Título de la tarea</label>
              <input type="text" value={step.actionData.taskTitle || ''}
                onChange={e => onChange({ ...step, actionData: { ...step.actionData, taskTitle: e.target.value } })}
                placeholder="ej: Llamar al lead"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
          )}

          {(step.actionType === 'CHANGE_TEMP') && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nueva temperatura</label>
              <select value={step.actionData.temperature || 'COLD'}
                onChange={e => onChange({ ...step, actionData: { ...step.actionData, temperature: e.target.value } })}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {TEMPS.map(t => <option key={t} value={t}>{t === 'HOT' ? '🔥 HOT' : t === 'WARM' ? '☀️ WARM' : t === 'NORMAL' ? '😐 NORMAL' : '🧊 COLD'}</option>)}
              </select>
            </div>
          )}
        </div>
        <button onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors mt-1 flex-shrink-0">✕</button>
      </div>
      {action && <div className="text-[10px] text-gray-400 mt-2">{action.desc}</div>}
    </div>
  )
}

function SequenceBuilder({ onClose, onSave, initial }: {
  onClose: () => void
  onSave: (s: Sequence) => void
  initial?: Sequence
}) {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [triggerType, setTriggerType] = useState(initial?.triggerType || 'NEW_LEAD')
  const [triggerValue, setTriggerValue] = useState(initial?.triggerValue || '')
  const [filterTemp, setFilterTemp] = useState(initial?.filterTemp || '')
  const [filterStage, setFilterStage] = useState(initial?.filterStage || '')
  const [steps, setSteps] = useState<SequenceStep[]>(
    initial?.steps.map(s => ({ ...s, actionData: JSON.parse(s.actionData as unknown as string || '{}') })) || DEFAULT_STEPS
  )
  const [saving, setSaving] = useState(false)

  function addStep() {
    const lastDay = steps[steps.length - 1]?.dayOffset || 0
    setSteps(prev => [...prev, { stepOrder: prev.length, dayOffset: lastDay + 3, actionType: 'NOTIFICATION', actionData: { message: '' } }])
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name, description: description || null, triggerType, triggerValue: triggerValue || null,
        filterTemp: filterTemp || null, filterStage: filterStage || null,
        steps: steps.map((s, i) => ({ ...s, stepOrder: i })),
      }
      const url = initial ? `/api/sequences/${initial.id}` : '/api/sequences'
      const method = initial ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const saved = await res.json()
      onSave(saved)
    } finally {
      setSaving(false)
    }
  }

  const trigger = TRIGGER_TYPES.find(t => t.value === triggerType)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{initial ? '✏️ Editar' : '➕ Nueva'} Secuencia</h3>
            <p className="text-sm text-gray-400">Automatiza el seguimiento paso a paso</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre de la secuencia *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="ej: Seguimiento lead nuevo" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Descripción (opcional)</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="¿Para qué sirve esta secuencia?" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>

          {/* Trigger */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">⚡ Disparador</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {TRIGGER_TYPES.map(t => (
                <button key={t.value} onClick={() => setTriggerType(t.value)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${triggerType === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="text-sm font-semibold text-gray-800">{t.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
            {triggerType === 'STAGE_CHANGE' && (
              <select value={triggerValue} onChange={e => setTriggerValue(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Cualquier cambio de etapa</option>
                {STAGES.map(s => <option key={s} value={s}>Al entrar a: {s}</option>)}
              </select>
            )}
            {triggerType === 'TEMPERATURE_CHANGE' && (
              <select value={triggerValue} onChange={e => setTriggerValue(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Cualquier cambio</option>
                {TEMPS.map(t => <option key={t} value={t}>Al volverse {t}</option>)}
              </select>
            )}
          </div>

          {/* Filters */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🎯 Filtros (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Solo leads en etapa</label>
                <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Todas las etapas</option>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Solo leads con temperatura</label>
                <select value={filterTemp} onChange={e => setFilterTemp(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Todas las temperaturas</option>
                  {TEMPS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Steps timeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">📅 Pasos de la secuencia</p>
              <button onClick={addStep}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
                + Agregar paso
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <p className="text-sm">Sin pasos. Agrega el primer paso.</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                {steps.length > 1 && (
                  <div className="absolute left-0 top-6 bottom-6 w-px bg-blue-200 ml-[-1.5rem]"/>
                )}
                <div className="space-y-3 ml-8">
                  {steps.map((step, i) => (
                    <StepCard key={i} step={step} index={i}
                      onChange={s => setSteps(prev => prev.map((st, idx) => idx === i ? s : st))}
                      onDelete={() => setSteps(prev => prev.filter((_, idx) => idx !== i))}/>
                  ))}
                </div>
              </div>
            )}
          </div>

          {trigger && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
              <strong>📋 Resumen:</strong> Esta secuencia se activará <strong>{trigger.label}</strong>
              {triggerValue && ` (${triggerValue})`} y ejecutará <strong>{steps.length} pasos</strong> durante
              {steps.length > 0 ? ` ${Math.max(...steps.map(s => s.dayOffset))} días.` : ' el período configurado.'}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-gray-600 font-medium border border-gray-200 rounded-xl">Cancelar</button>
          <button onClick={save} disabled={saving || !name.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
            {saving ? 'Guardando...' : `${initial ? '✓ Guardar cambios' : '✓ Crear secuencia'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SecuenciasClient({ initialSequences }: { initialSequences: Sequence[] }) {
  const [sequences, setSequences] = useState(initialSequences)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editing, setEditing] = useState<Sequence | null>(null)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<{ processed: number } | null>(null)

  async function toggleActive(seq: Sequence) {
    const res = await fetch(`/api/sequences/${seq.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !seq.isActive }),
    })
    const updated = await res.json()
    setSequences(prev => prev.map(s => s.id === seq.id ? { ...s, isActive: updated.isActive } : s))
  }

  async function deleteSeq(id: string) {
    if (!confirm('¿Eliminar esta secuencia?')) return
    await fetch(`/api/sequences/${id}`, { method: 'DELETE' })
    setSequences(prev => prev.filter(s => s.id !== id))
  }

  async function runEngine() {
    setRunning(true)
    const res = await fetch('/api/sequences/run', { method: 'POST' })
    const data = await res.json()
    setRunResult(data)
    setRunning(false)
    setTimeout(() => setRunResult(null), 4000)
  }

  const TRIGGER_LABELS: Record<string, string> = {
    NEW_LEAD: '👤 Nuevo lead', STAGE_CHANGE: '🔄 Cambio etapa',
    TEMPERATURE_CHANGE: '🌡️ Cambio temp.', MANUAL: '🖐️ Manual',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🔁 Secuencias de Seguimiento</h1>
            <p className="text-gray-500 text-sm mt-0.5">Automatiza el contacto en múltiples pasos y días</p>
          </div>
          <div className="flex items-center gap-3">
            {runResult && (
              <div className="bg-green-100 text-green-700 text-sm font-medium px-4 py-2 rounded-xl">
                ✅ {runResult.processed} pasos ejecutados
              </div>
            )}
            <button onClick={runEngine} disabled={running}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              {running ? '⏳ Ejecutando...' : '▶️ Ejecutar ahora'}
            </button>
            <button onClick={() => { setEditing(null); setShowBuilder(true) }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              + Nueva secuencia
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {sequences.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🔁</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin secuencias creadas</h3>
            <p className="text-gray-400 mb-6">Crea tu primera secuencia para automatizar el seguimiento de leads</p>
            <button onClick={() => setShowBuilder(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-semibold">
              + Crear primera secuencia
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sequences.map(seq => (
              <div key={seq.id} className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${!seq.isActive ? 'opacity-60' : ''}`}>
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{seq.name}</h3>
                      {seq.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{seq.description}</p>}
                    </div>
                    <button onClick={() => toggleActive(seq)}
                      className={`ml-2 flex-shrink-0 w-10 h-5 rounded-full transition-all relative ${seq.isActive ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <div className={`absolute w-4 h-4 rounded-full bg-white shadow top-0.5 transition-all ${seq.isActive ? 'left-5' : 'left-0.5'}`}/>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {TRIGGER_LABELS[seq.triggerType] || seq.triggerType}
                    </span>
                    {seq.triggerValue && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">→ {seq.triggerValue}</span>
                    )}
                    {seq.filterTemp && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">🌡️ {seq.filterTemp}</span>
                    )}
                  </div>
                </div>

                {/* Timeline preview */}
                <div className="p-4 space-y-2">
                  {seq.steps.slice(0, 4).map((step, i) => {
                    const actionData = JSON.parse(step.actionData as unknown as string || '{}') as Record<string, string>
                    return (
                      <div key={step.id} className="flex items-center gap-2 text-xs">
                        <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">{i + 1}</div>
                        <div className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded font-medium flex-shrink-0">Día {step.dayOffset}</div>
                        <div className="text-gray-600 truncate">
                          {step.actionType === 'NOTIFICATION' ? `🔔 ${actionData.message || 'Notificación'}` :
                           step.actionType === 'WHATSAPP_TEMPLATE' ? `💬 ${actionData.template || 'Mensaje WA'}` :
                           step.actionType === 'CREATE_TASK' ? `✅ ${actionData.taskTitle || 'Tarea'}` :
                           `🌡️ → ${actionData.temperature || ''}`}
                        </div>
                      </div>
                    )
                  })}
                  {seq.steps.length > 4 && (
                    <div className="text-xs text-gray-400 text-center">+{seq.steps.length - 4} pasos más</div>
                  )}
                </div>

                <div className="px-4 pb-4 pt-2 border-t border-gray-50 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    <span className="font-medium text-gray-600">{seq.steps.length}</span> pasos ·
                    <span className="font-medium text-gray-600 ml-1">{seq.enrolledCount}</span> leads inscritos
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditing(seq); setShowBuilder(true) }}
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50">
                      ✏️
                    </button>
                    <button onClick={() => deleteSeq(seq.id)}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBuilder && (
        <SequenceBuilder
          onClose={() => { setShowBuilder(false); setEditing(null) }}
          initial={editing || undefined}
          onSave={saved => {
            if (editing) setSequences(prev => prev.map(s => s.id === saved.id ? saved : s))
            else setSequences(prev => [saved, ...prev])
            setShowBuilder(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
