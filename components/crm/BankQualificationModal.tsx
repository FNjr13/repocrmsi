'use client'

import { useState, useEffect } from 'react'

interface BankQualification {
  salary: number
  employmentType: string
  employmentMonths: number
  company?: string
  currentDebt: number
  bankPreference?: string
  creditHistory: string
  hasPayslips: boolean
  requestedAmount?: number
  result: string
  score: number
  notes?: string
  createdAt?: string
}

const RESULT_CONFIG = {
  APROBABLE: { label: '✅ Aprobable', color: 'bg-green-50 border-green-300 text-green-800', badge: 'bg-green-100 text-green-700', bar: 'bg-green-500' },
  REVISAR: { label: '⚠️ Revisar caso', color: 'bg-amber-50 border-amber-300 text-amber-800', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
  NO_CALIFICABLE: { label: '❌ No calificable', color: 'bg-red-50 border-red-300 text-red-800', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500' },
}

const BANKS = ['Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA', 'Scotiabank', 'BAC', 'Global Bank', 'Multibank', 'Banistmo', 'Otro']

export default function BankQualificationModal({
  leadId,
  leadName,
  onClose,
}: {
  leadId: string
  leadName: string
  onClose: () => void
}) {
  const [existing, setExisting] = useState<BankQualification | null>(null)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<BankQualification | null>(null)
  const [step, setStep] = useState<'form' | 'result'>('form')

  const [form, setForm] = useState({
    salary: '',
    employmentType: 'ASALARIADO',
    employmentMonths: '',
    company: '',
    currentDebt: '',
    bankPreference: '',
    creditHistory: 'BUENO',
    hasPayslips: true,
    requestedAmount: '',
  })

  useEffect(() => {
    fetch(`/api/qualifications?leadId=${leadId}`)
      .then(r => r.json())
      .then(data => {
        if (data?.result) {
          setExisting(data)
          setResult(data)
          setStep('result')
          setForm({
            salary: String(data.salary),
            employmentType: data.employmentType,
            employmentMonths: String(data.employmentMonths),
            company: data.company || '',
            currentDebt: String(data.currentDebt),
            bankPreference: data.bankPreference || '',
            creditHistory: data.creditHistory,
            hasPayslips: data.hasPayslips,
            requestedAmount: data.requestedAmount ? String(data.requestedAmount) : '',
          })
        }
      })
      .catch(() => null)
  }, [leadId])

  const f = (key: string, val: string | boolean) => setForm(p => ({ ...p, [key]: val }))

  async function submit() {
    if (!form.salary || !form.employmentMonths) return
    setSaving(true)
    try {
      const res = await fetch('/api/qualifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          salary: parseFloat(form.salary),
          employmentType: form.employmentType,
          employmentMonths: parseInt(form.employmentMonths),
          company: form.company || null,
          currentDebt: parseFloat(form.currentDebt || '0'),
          bankPreference: form.bankPreference || null,
          creditHistory: form.creditHistory,
          hasPayslips: form.hasPayslips,
          requestedAmount: form.requestedAmount ? parseFloat(form.requestedAmount) : null,
        }),
      })
      const data = await res.json()
      setResult(data)
      setStep('result')
    } finally {
      setSaving(false)
    }
  }

  const cfg = result ? RESULT_CONFIG[result.result as keyof typeof RESULT_CONFIG] : null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">🏦 Precalificación Bancaria</h3>
            <p className="text-sm text-gray-500 mt-0.5">{leadName}</p>
          </div>
          <div className="flex items-center gap-2">
            {step === 'result' && (
              <button onClick={() => setStep('form')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 border border-blue-200 rounded-lg">
                ✏️ Editar
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 text-xl">✕</button>
          </div>
        </div>

        {step === 'form' ? (
          <div className="p-6 space-y-5">
            {/* Ingresos */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">💰 Ingresos</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Salario mensual (USD) *</label>
                  <input type="number" value={form.salary} onChange={e => f('salary', e.target.value)}
                    placeholder="ej: 1500" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de empleo</label>
                  <select value={form.employmentType} onChange={e => f('employmentType', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="ASALARIADO">👔 Asalariado</option>
                    <option value="INDEPENDIENTE">🏪 Independiente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Meses trabajando *</label>
                  <input type="number" value={form.employmentMonths} onChange={e => f('employmentMonths', e.target.value)}
                    placeholder="ej: 24" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Empresa / negocio</label>
                  <input type="text" value={form.company} onChange={e => f('company', e.target.value)}
                    placeholder="Nombre de la empresa" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
            </div>

            {/* Deudas y crédito */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">📊 Perfil crediticio</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Deuda mensual actual (USD)</label>
                  <input type="number" value={form.currentDebt} onChange={e => f('currentDebt', e.target.value)}
                    placeholder="ej: 300" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Historial crediticio</label>
                  <select value={form.creditHistory} onChange={e => f('creditHistory', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="BUENO">✅ Bueno</option>
                    <option value="REGULAR">⚠️ Regular</option>
                    <option value="MALO">❌ Malo / en mora</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Banco preferido</label>
                  <select value={form.bankPreference} onChange={e => f('bankPreference', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Sin preferencia</option>
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Monto solicitado (USD)</label>
                  <input type="number" value={form.requestedAmount} onChange={e => f('requestedAmount', e.target.value)}
                    placeholder="ej: 80000" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
            </div>

            {/* Documentos */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">📄 Documentación</p>
              <button onClick={() => f('hasPayslips', !form.hasPayslips)}
                className={`flex items-center gap-3 w-full p-3.5 rounded-xl border-2 transition-all ${form.hasPayslips ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${form.hasPayslips ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                  {form.hasPayslips && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-800">Tiene talonarios / ficha de trabajo</div>
                  <div className="text-xs text-gray-500">Comprobantes de pago de salario</div>
                </div>
              </button>
            </div>

            <div className="pt-2 flex gap-3 justify-end">
              <button onClick={onClose} className="px-5 py-2.5 text-sm text-gray-600 font-medium">Cancelar</button>
              <button onClick={submit} disabled={saving || !form.salary || !form.employmentMonths}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
                {saving ? 'Calculando...' : '🔍 Calcular precalificación'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Resultado */}
            {result && cfg && (
              <div className="space-y-5">
                <div className={`border-2 rounded-2xl p-6 ${cfg.color}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Resultado</div>
                      <div className="text-2xl font-bold">{cfg.label}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Score</div>
                      <div className="text-4xl font-black">{result.score}<span className="text-lg font-normal opacity-60">/100</span></div>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-black/10 rounded-full mb-4">
                    <div className={`h-full rounded-full transition-all ${cfg.bar}`} style={{ width: `${result.score}%` }}/>
                  </div>
                  {result.notes && (
                    <div className="space-y-1">
                      {result.notes.split(' · ').map((note, i) => (
                        <div key={i} className="text-sm opacity-90">{note}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumen datos */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['💰 Salario', `$${result.salary.toLocaleString()}/mes`],
                    ['👔 Tipo empleo', result.employmentType === 'ASALARIADO' ? 'Asalariado' : 'Independiente'],
                    ['⏳ Antigüedad', `${result.employmentMonths} meses`],
                    ['💳 Deuda actual', `$${result.currentDebt.toLocaleString()}/mes`],
                    ['📊 APC', result.creditHistory === 'BUENO' ? '✅ Bueno' : result.creditHistory === 'REGULAR' ? '⚠️ Regular' : '❌ Malo'],
                    ['📋 Talonarios', result.hasPayslips ? '✅ Sí tiene' : '❌ No tiene'],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="text-xs text-gray-500 mb-0.5">{k}</div>
                      <div className="font-semibold text-gray-900 text-sm">{v}</div>
                    </div>
                  ))}
                </div>

                {result.requestedAmount && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="text-xs text-blue-600 font-semibold mb-1">Monto solicitado</div>
                    <div className="text-xl font-bold text-blue-800">${result.requestedAmount.toLocaleString()}</div>
                    {result.salary > 0 && (
                      <div className="text-xs text-blue-600 mt-1">
                        Cuota estimada: ~${Math.round(result.requestedAmount * 0.008).toLocaleString()}/mes
                        ({Math.round((result.requestedAmount * 0.008 / result.salary) * 100)}% del salario)
                      </div>
                    )}
                  </div>
                )}

                {existing && (
                  <p className="text-xs text-gray-400 text-center">
                    Calculado el {existing.createdAt ? new Date(existing.createdAt).toLocaleDateString('es-CL') : ''}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep('form')}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                    ✏️ Modificar datos
                  </button>
                  <button onClick={onClose}
                    className="flex-1 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
