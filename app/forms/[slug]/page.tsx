'use client'

import { useState, useEffect, use } from 'react'

interface FormData {
  id: string
  slug: string
  title: string
  subtitle: string | null
  type: string
  theme: string
  isActive: boolean
  project: {
    name: string
    location: string
    type: string
    priceMin: number
    priceMax: number
    currency: string
  } | null
}

const THEMES: Record<string, { bg: string; card: string; button: string; accent: string; text: string }> = {
  blue: { bg: 'from-blue-600 to-blue-800', card: 'border-blue-100', button: 'bg-blue-600 hover:bg-blue-700', accent: 'text-blue-600', text: 'text-white' },
  green: { bg: 'from-green-600 to-green-800', card: 'border-green-100', button: 'bg-green-600 hover:bg-green-700', accent: 'text-green-600', text: 'text-white' },
  purple: { bg: 'from-purple-600 to-purple-800', card: 'border-purple-100', button: 'bg-purple-600 hover:bg-purple-700', accent: 'text-purple-600', text: 'text-white' },
  orange: { bg: 'from-orange-500 to-orange-700', card: 'border-orange-100', button: 'bg-orange-500 hover:bg-orange-600', accent: 'text-orange-500', text: 'text-white' },
  dark: { bg: 'from-gray-800 to-gray-950', card: 'border-gray-200', button: 'bg-gray-900 hover:bg-gray-700', accent: 'text-gray-900', text: 'text-white' },
}

const FORM_FIELDS: Record<string, { label: string; type: string; placeholder: string; required?: boolean }[]> = {
  GENERAL: [
    { label: 'Nombre *', type: 'text', placeholder: 'Tu nombre', required: true },
    { label: 'Apellido *', type: 'text', placeholder: 'Tu apellido', required: true },
    { label: 'Teléfono *', type: 'tel', placeholder: '+507 6000-0000', required: true },
    { label: 'Correo electrónico', type: 'email', placeholder: 'tu@correo.com' },
    { label: 'Presupuesto aproximado (USD)', type: 'number', placeholder: 'ej: 80000' },
    { label: 'Cómo nos conociste', type: 'select', placeholder: '' },
    { label: 'Comentarios', type: 'textarea', placeholder: 'Cuéntanos qué buscas...' },
  ],
  FERIA: [
    { label: 'Nombre *', type: 'text', placeholder: 'Tu nombre', required: true },
    { label: 'Apellido *', type: 'text', placeholder: 'Tu apellido', required: true },
    { label: 'Teléfono *', type: 'tel', placeholder: '+507 6000-0000', required: true },
    { label: 'Presupuesto aproximado (USD)', type: 'number', placeholder: 'ej: 80000' },
    { label: '¿Necesitas financiamiento?', type: 'radio', placeholder: '' },
  ],
  INVERSIONISTA: [
    { label: 'Nombre *', type: 'text', placeholder: 'Tu nombre', required: true },
    { label: 'Apellido *', type: 'text', placeholder: 'Tu apellido', required: true },
    { label: 'Teléfono *', type: 'tel', placeholder: '+507 6000-0000', required: true },
    { label: 'Correo electrónico', type: 'email', placeholder: 'tu@correo.com' },
    { label: 'Presupuesto de inversión (USD) *', type: 'number', placeholder: 'ej: 150000', required: true },
    { label: 'País de residencia', type: 'text', placeholder: 'ej: Colombia' },
    { label: 'Objetivo de inversión', type: 'textarea', placeholder: 'Airbnb, renta larga, valorización...' },
  ],
  VISITA: [
    { label: 'Nombre *', type: 'text', placeholder: 'Tu nombre', required: true },
    { label: 'Apellido *', type: 'text', placeholder: 'Tu apellido', required: true },
    { label: 'Teléfono *', type: 'tel', placeholder: '+507 6000-0000', required: true },
    { label: 'Correo electrónico', type: 'email', placeholder: 'tu@correo.com' },
    { label: 'Fecha preferida', type: 'date', placeholder: '' },
    { label: 'Tipo de visita', type: 'radio-visit', placeholder: '' },
    { label: 'Comentarios', type: 'textarea', placeholder: 'Cantidad de personas, preguntas...' },
  ],
  PRECALIFICACION: [
    { label: 'Nombre *', type: 'text', placeholder: 'Tu nombre', required: true },
    { label: 'Apellido *', type: 'text', placeholder: 'Tu apellido', required: true },
    { label: 'Teléfono *', type: 'tel', placeholder: '+507 6000-0000', required: true },
    { label: 'Correo electrónico', type: 'email', placeholder: 'tu@correo.com' },
    { label: 'Salario mensual (USD) *', type: 'number', placeholder: 'ej: 1500', required: true },
    { label: 'Tipo de empleo', type: 'radio-employment', placeholder: '' },
    { label: 'Tiempo trabajando (meses)', type: 'number', placeholder: 'ej: 24' },
    { label: 'Monto de deudas actuales (USD/mes)', type: 'number', placeholder: 'ej: 300' },
  ],
}

export default function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [formConfig, setFormConfig] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [financiamiento, setFinanciamiento] = useState('')
  const [visitType, setVisitType] = useState('')
  const [employmentType, setEmploymentType] = useState('ASALARIADO')
  const [howFound, setHowFound] = useState('')

  useEffect(() => {
    fetch(`/api/forms/${slug}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json() })
      .then(data => setFormConfig(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  const theme = THEMES[formConfig?.theme || 'blue'] || THEMES.blue
  const fields = FORM_FIELDS[formConfig?.type || 'GENERAL'] || FORM_FIELDS.GENERAL

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const extraParts: string[] = []
      if (financiamiento) extraParts.push(`Financiamiento: ${financiamiento}`)
      if (visitType) extraParts.push(`Tipo visita: ${visitType}`)
      if (howFound) extraParts.push(`Origen: ${howFound}`)
      if (employmentType) extraParts.push(`Empleo: ${employmentType}`)
      if (values['País de residencia']) extraParts.push(`País: ${values['País de residencia']}`)
      if (values['Objetivo de inversión']) extraParts.push(values['Objetivo de inversión'])
      if (values['Fecha preferida']) extraParts.push(`Fecha visita: ${values['Fecha preferida']}`)

      await fetch(`/api/forms/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: values['Nombre *'] || values['Nombre'],
          lastName: values['Apellido *'] || values['Apellido'],
          phone: values['Teléfono *'] || values['Teléfono'],
          email: values['Correo electrónico'],
          budget: values['Presupuesto aproximado (USD)'] || values['Presupuesto de inversión (USD) *'] || values['Presupuesto de inversión (USD)'],
          notes: values['Comentarios'],
          financingType: financiamiento === 'Sí' ? 'FINANCIADO' : financiamiento === 'No' ? 'CONTADO' : undefined,
          extraInfo: extraParts.join(' | '),
        }),
      })
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-gray-700">Formulario no encontrado</h1>
        <p className="text-gray-500 mt-2">El formulario que buscas no existe o fue desactivado.</p>
      </div>
    </div>
  )

  if (!formConfig?.isActive) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-gray-700">Formulario inactivo</h1>
        <p className="text-gray-500 mt-2">Este formulario no está disponible en este momento.</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg} flex items-center justify-center p-4`}>
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">¡Gracias!</h2>
        <p className="text-gray-600 leading-relaxed">
          Recibimos tu información. Un asesor te contactará pronto.
        </p>
        {formConfig.project && (
          <p className="text-sm text-gray-400 mt-4">
            Proyecto: <strong>{formConfig.project.name}</strong>
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg}`}>
      {/* Hero header */}
      <div className="px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-4">
          <span className="text-2xl">🏠</span>
        </div>
        <h1 className={`text-3xl font-bold ${theme.text} mb-2`}>{formConfig!.title}</h1>
        {formConfig!.subtitle && <p className={`${theme.text} opacity-80 text-lg`}>{formConfig!.subtitle}</p>}
        {formConfig!.project && (
          <div className={`inline-flex items-center gap-2 mt-3 bg-white/20 rounded-full px-4 py-1.5 ${theme.text} text-sm`}>
            📍 {formConfig!.project.name} · {formConfig!.project.location}
          </div>
        )}
      </div>

      {/* Form card */}
      <div className="px-4 pb-12">
        <div className={`bg-white rounded-3xl shadow-2xl max-w-lg mx-auto border ${theme.card} overflow-hidden`}>
          <form onSubmit={submit} className="p-8 space-y-5">
            {fields.map(field => {
              const key = field.label
              if (field.type === 'select') return (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{field.label}</label>
                  <select value={howFound} onChange={e => setHowFound(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">Selecciona...</option>
                    {['Instagram', 'Facebook', 'Google', 'Referido', 'Feria', 'WhatsApp', 'Otro'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              )
              if (field.type === 'radio') return (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">¿Necesitas financiamiento?</label>
                  <div className="flex gap-3">
                    {['Sí', 'No', 'Lo evalúo'].map(opt => (
                      <button key={opt} type="button" onClick={() => setFinanciamiento(opt)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${financiamiento === opt ? `border-blue-500 ${theme.accent} bg-blue-50` : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )
              if (field.type === 'radio-visit') return (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de visita</label>
                  <div className="flex gap-3">
                    {['Presencial', 'Virtual'].map(opt => (
                      <button key={opt} type="button" onClick={() => setVisitType(opt)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${visitType === opt ? `border-blue-500 ${theme.accent} bg-blue-50` : 'border-gray-200 text-gray-600'}`}>
                        {opt === 'Presencial' ? '🏠 Presencial' : '💻 Virtual'}
                      </button>
                    ))}
                  </div>
                </div>
              )
              if (field.type === 'radio-employment') return (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de empleo</label>
                  <div className="flex gap-3">
                    {['ASALARIADO', 'INDEPENDIENTE'].map(opt => (
                      <button key={opt} type="button" onClick={() => setEmploymentType(opt)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${employmentType === opt ? `border-blue-500 ${theme.accent} bg-blue-50` : 'border-gray-200 text-gray-600'}`}>
                        {opt === 'ASALARIADO' ? '👔 Asalariado' : '🏪 Independiente'}
                      </button>
                    ))}
                  </div>
                </div>
              )
              if (field.type === 'textarea') return (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{field.label}</label>
                  <textarea value={values[key] || ''} onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={field.placeholder} rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"/>
                </div>
              )
              return (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{field.label}</label>
                  <input type={field.type} required={field.required}
                    value={values[key] || ''}
                    onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                </div>
              )
            })}

            <button type="submit" disabled={submitting}
              className={`w-full ${theme.button} disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-lg mt-2`}>
              {submitting ? '⏳ Enviando...' : '✓ Enviar información'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Al enviar, aceptas que un asesor te contacte con información sobre el proyecto.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
