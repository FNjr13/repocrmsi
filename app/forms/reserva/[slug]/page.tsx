'use client'

import { useState, useEffect, use } from 'react'
import Image from 'next/image'

interface FormField {
  id: string; label: string; type: string; required: boolean; options?: string[]
}
interface FormSection {
  id: string; title: string; fields: FormField[]
}
interface ReservationFormData {
  id: string; slug: string; name: string; isActive: boolean
  sections: FormSection[]
  project: { name: string } | null
}

export default function PublicReservationForm({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [form, setForm] = useState<ReservationFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [values, setValues] = useState<Record<string, string>>({})
  const [printed, setPrinted] = useState(false)

  useEffect(() => {
    fetch(`/api/forms/reserva/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: ReservationFormData | null) => {
        if (data) {
          setForm(data)
          // Pre-fill Proyecto if linked to a project
          if (data.project) {
            const proyectoField = data.sections.flatMap(s => s.fields).find(f => f.label === 'Proyecto')
            if (proyectoField) setValues(v => ({ ...v, [proyectoField.id]: data.project!.name }))
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [slug])

  function handlePrint() {
    window.print()
    setPrinted(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!form || !form.isActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">📄</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Formulario no disponible</h1>
          <p className="text-gray-500 text-sm">Este formulario no está activo o no existe.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { padding: 0 !important; background: white !important; }
          body { font-size: 11px; }
          input, select, textarea { border: none !important; border-bottom: 1px solid #999 !important; background: transparent !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 print-page">
        {/* Header */}
        <div className="bg-indigo-700 text-white py-6 px-4 no-print">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Image src="/logo.png" alt="SI CRM" width={36} height={36} className="rounded-lg" />
            <div>
              <p className="text-indigo-200 text-xs font-medium uppercase tracking-wide">SI CRM</p>
              <h1 className="font-bold text-lg leading-tight">{form.name}</h1>
              {form.project && <p className="text-indigo-200 text-sm">{form.project.name}</p>}
            </div>
          </div>
        </div>

        {/* Print header (only visible when printing) */}
        <div className="hidden print:block p-6 border-b-2 border-gray-800 mb-4">
          <h1 className="text-xl font-bold">{form.name}</h1>
          {form.project && <p className="text-sm text-gray-600">{form.project.name}</p>}
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {form.sections.map(section => (
            <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-3">
                <h2 className="font-bold text-indigo-800 text-sm uppercase tracking-wide">{section.title}</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-4">
                {section.fields.map(field => (
                  <div key={field.id} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={values[field.id] ?? ''}
                        onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
                        rows={2}
                        className="w-full border-b-2 border-gray-200 focus:border-indigo-500 outline-none text-sm py-1 resize-none bg-transparent transition-colors"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={values[field.id] ?? ''}
                        onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
                        className="w-full border-b-2 border-gray-200 focus:border-indigo-500 outline-none text-sm py-1 bg-transparent transition-colors">
                        <option value=""></option>
                        {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={values[field.id] ?? ''}
                        onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
                        className="w-full border-b-2 border-gray-200 focus:border-indigo-500 outline-none text-sm py-1 bg-transparent transition-colors"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Signatures */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="grid grid-cols-2 gap-12">
              <div>
                <div className="border-b-2 border-gray-800 mb-2 h-10" />
                <p className="text-xs text-gray-500 text-center">Firma del cliente</p>
              </div>
              <div>
                <div className="border-b-2 border-gray-800 mb-2 h-10" />
                <p className="text-xs text-gray-500 text-center">Firma de la promotora</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 no-print pb-8">
            <button
              onClick={handlePrint}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm">
              🖨️ Imprimir / Guardar PDF
            </button>
            <button
              onClick={() => { setValues({}); setPrinted(false) }}
              className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
              Limpiar
            </button>
          </div>

          {printed && (
            <p className="text-center text-xs text-gray-400 no-print -mt-4 pb-4">
              Ventana de impresión abierta. Puedes guardar como PDF desde ahí.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
