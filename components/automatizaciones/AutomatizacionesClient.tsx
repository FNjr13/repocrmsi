'use client'

import { useState } from 'react'

interface AutomationRule {
  id: string
  name: string
  description: string | null
  trigger: string
  triggerValue: string | null
  filterStage: string | null
  filterTemp: string | null
  action: string
  actionData: string | null
  isActive: boolean
  runCount: number
  lastRun: string | null
  createdAt: string
}

interface RunResult {
  ruleId: string
  ruleName: string
  affected: number
  actions: string[]
}

const TRIGGER_LABELS: Record<string, string> = {
  INACTIVITY_DAYS: 'Inactividad por días',
  FOLLOW_UP_OVERDUE: 'Seguimiento vencido',
  STAGE_CHANGE: 'Cambio de etapa',
  NEW_LEAD: 'Nuevo lead',
  HIGH_SCORE: 'Lead caliente/tibio',
}

const ACTION_LABELS: Record<string, string> = {
  ALERT: 'Crear alerta / notificación',
  CHANGE_TEMP: 'Cambiar temperatura',
  CREATE_TASK: 'Crear tarea',
  SEND_WHATSAPP_TEMPLATE: 'Enviar WhatsApp',
  ASSIGN_AGENT: 'Asignar asesor',
}

const TRIGGER_ICONS: Record<string, string> = {
  INACTIVITY_DAYS: '⏰',
  FOLLOW_UP_OVERDUE: '📅',
  STAGE_CHANGE: '🔄',
  NEW_LEAD: '👤',
  HIGH_SCORE: '🔥',
}

const ACTION_ICONS: Record<string, string> = {
  ALERT: '🔔',
  CHANGE_TEMP: '🌡️',
  CREATE_TASK: '✅',
  SEND_WHATSAPP_TEMPLATE: '💬',
  ASSIGN_AGENT: '👔',
}

interface NewRuleFormProps {
  onClose: () => void
  onSave: (rule: AutomationRule) => void
}

function NewRuleForm({ onClose, onSave }: NewRuleFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [trigger, setTrigger] = useState('INACTIVITY_DAYS')
  const [triggerValue, setTriggerValue] = useState('7')
  const [filterStage, setFilterStage] = useState('')
  const [filterTemp, setFilterTemp] = useState('')
  const [action, setAction] = useState('ALERT')
  const [actionTemp, setActionTemp] = useState('COLD')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name) return
    setSaving(true)
    try {
      const actionData = action === 'CHANGE_TEMP' ? { temperature: actionTemp } : null
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, trigger, triggerValue: triggerValue || null,
          filterStage: filterStage || null, filterTemp: filterTemp || null,
          action, actionData, isActive: true,
        }),
      })
      const rule = await res.json()
      onSave(rule)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-5">Nueva automatización</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nombre</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Alerta inactividad 7 días"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Descripción</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripción opcional..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">🎯 Condición (Cuando...)</p>
            <div className="space-y-3">
              <select
                value={trigger}
                onChange={e => setTrigger(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{TRIGGER_ICONS[k]} {v}</option>
                ))}
              </select>

              {trigger === 'INACTIVITY_DAYS' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sin actividad por</span>
                  <input
                    type="number"
                    min={1}
                    value={triggerValue}
                    onChange={e => setTriggerValue(e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-sm text-gray-600">días</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">🔍 Filtros (Solo aplica a...)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Etapa del lead</label>
                <select
                  value={filterStage}
                  onChange={e => setFilterStage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
                >
                  <option value="">Todas las etapas</option>
                  <option value="NUEVO">Nuevo</option>
                  <option value="CONTACTADO">Contactado</option>
                  <option value="INTERESADO">Interesado</option>
                  <option value="VISITA">Visita</option>
                  <option value="NEGOCIACION">Negociación</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Temperatura</label>
                <select
                  value={filterTemp}
                  onChange={e => setFilterTemp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
                >
                  <option value="">Cualquier temperatura</option>
                  <option value="HOT">🔥 Caliente</option>
                  <option value="WARM">🌤️ Tibio</option>
                  <option value="NORMAL">😐 Normal</option>
                  <option value="COLD">❄️ Frío</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">⚡ Acción (Entonces...)</p>
            <select
              value={action}
              onChange={e => setAction(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{ACTION_ICONS[k]} {v}</option>
              ))}
            </select>

            {action === 'CHANGE_TEMP' && (
              <div className="mt-3">
                <label className="block text-xs text-gray-500 mb-1">Cambiar temperatura a:</label>
                <select
                  value={actionTemp}
                  onChange={e => setActionTemp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
                >
                  <option value="HOT">🔥 Caliente</option>
                  <option value="WARM">🌤️ Tibio</option>
                  <option value="NORMAL">😐 Normal</option>
                  <option value="COLD">❄️ Frío</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Crear automatización
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AutomatizacionesClient({ initialRules }: { initialRules: AutomationRule[] }) {
  const [rules, setRules] = useState(initialRules)
  const [showNew, setShowNew] = useState(false)
  const [running, setRunning] = useState(false)
  const [runResults, setRunResults] = useState<RunResult[] | null>(null)
  const [showResults, setShowResults] = useState(false)

  const toggleRule = async (id: string, isActive: boolean) => {
    // Optimistic update
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive } : r))
    await fetch(`/api/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    })
  }

  const deleteRule = async (id: string) => {
    if (!confirm('¿Eliminar esta automatización?')) return
    setRules(prev => prev.filter(r => r.id !== id))
    await fetch(`/api/automations/${id}`, { method: 'DELETE' })
  }

  const runAll = async () => {
    setRunning(true)
    try {
      const res = await fetch('/api/automations/run', { method: 'POST' })
      const data = await res.json()
      setRunResults(data.results || [])
      setShowResults(true)
      // Update run counts
      const updatedRes = await fetch('/api/automations')
      const updatedRules = await updatedRes.json()
      setRules(updatedRules)
    } finally {
      setRunning(false)
    }
  }

  const activeCount = rules.filter(r => r.isActive).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automatizaciones</h1>
          <p className="text-sm text-gray-500 mt-1">Workflows inteligentes para tu equipo de ventas</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runAll}
            disabled={running || activeCount === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {running ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {running ? 'Ejecutando...' : 'Ejecutar ahora'}
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva regla
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Reglas activas', value: activeCount, icon: '⚡', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total reglas', value: rules.length, icon: '📋', color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: 'Ejecuciones totales', value: rules.reduce((s, r) => s + r.runCount, 0), icon: '🔄', color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl`}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-xl">⚙️</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">¿Cómo funcionan las automatizaciones?</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Las reglas se ejecutan manualmente con &quot;Ejecutar ahora&quot; o puedes programarlas. Cada regla evalúa todos los leads activos según las condiciones definidas y ejecuta la acción configurada.
          </p>
        </div>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <span className="text-5xl block mb-4">⚡</span>
            <p className="text-gray-600 font-semibold text-lg">No hay automatizaciones configuradas</p>
            <p className="text-gray-400 text-sm mt-2">Crea tu primera regla para automatizar el seguimiento de leads</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
            >
              + Crear primera automatización
            </button>
          </div>
        ) : (
          rules.map(rule => (
            <div
              key={rule.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${rule.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleRule(rule.id, !rule.isActive)}
                    className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors mt-0.5 relative ${rule.isActive ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${rule.isActive ? 'translate-x-5' : ''}`} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900">{rule.name}</h3>
                      {rule.isActive ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200">Activa</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Inactiva</span>
                      )}
                    </div>
                    {rule.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{rule.description}</p>
                    )}

                    {/* Condition → Action */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-medium border border-blue-100">
                        <span>{TRIGGER_ICONS[rule.trigger] || '⚡'}</span>
                        <span>{TRIGGER_LABELS[rule.trigger] || rule.trigger}</span>
                        {rule.triggerValue && <span className="font-bold">· {rule.triggerValue}d</span>}
                      </div>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <div className="flex items-center gap-1.5 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-xl text-xs font-medium border border-violet-100">
                        <span>{ACTION_ICONS[rule.action] || '⚡'}</span>
                        <span>{ACTION_LABELS[rule.action] || rule.action}</span>
                      </div>

                      {rule.filterStage && (
                        <div className="bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-100">
                          Solo: {rule.filterStage}
                        </div>
                      )}
                      {rule.filterTemp && (
                        <div className="bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-100">
                          Temp: {rule.filterTemp}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <span>{rule.runCount} ejecución{rule.runCount !== 1 ? 'es' : ''}</span>
                      {rule.lastRun && (
                        <span>Última vez: {new Date(rule.lastRun).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteRule(rule.id)}
                  className="flex-shrink-0 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Run results modal */}
      {showResults && runResults && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Resultado de ejecución</h3>
            <p className="text-sm text-gray-500 mb-5">Se procesaron {runResults.length} regla{runResults.length !== 1 ? 's' : ''}</p>

            <div className="space-y-3">
              {runResults.map(result => (
                <div key={result.ruleId} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-800">{result.ruleName}</p>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${result.affected > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {result.affected} afectado{result.affected !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {result.actions.length > 0 && (
                    <ul className="space-y-1">
                      {result.actions.map((action, i) => (
                        <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.affected === 0 && (
                    <p className="text-xs text-gray-400">No se encontraron leads que cumplan las condiciones</p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowResults(false)}
              className="w-full mt-5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showNew && (
        <NewRuleForm
          onClose={() => setShowNew(false)}
          onSave={rule => setRules(prev => [rule, ...prev])}
        />
      )}
    </div>
  )
}
