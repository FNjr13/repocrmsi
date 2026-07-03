'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

// ─── Types ────────────────────────────────────────────────────────────────────
export type FieldType = 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea'

export interface FormField {
  id: string
  label: string
  type: FieldType
  required: boolean
  options?: string[] // for select
}

export interface FormSection {
  id: string
  title: string
  fields: FormField[]
}

export interface ReservationForm {
  id: string
  slug: string | null
  name: string
  projectId: string | null
  sections: FormSection[]
  isActive: boolean
  createdAt: string
  project: { id: string; name: string } | null
}

interface Project { id: string; name: string }

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto',
  email: 'Correo',
  number: 'Número',
  date: 'Fecha',
  select: 'Lista',
  textarea: 'Área de texto',
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ─── QR Modal ────────────────────────────────────────────────────────────────
function QRModal({ form, onClose }: { form: ReservationForm; onClose: () => void }) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const formUrl = `${baseUrl}/forms/reserva/${form.slug ?? ''}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(formUrl)}`
  const [copied, setCopied] = useState(false)

  function copyUrl() {
    navigator.clipboard.writeText(formUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">QR & Enlace del formulario</h2>
            <p className="text-xs text-gray-500 mt-0.5">{form.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 flex flex-col items-center gap-5">
          <div className="p-3 border-2 border-gray-200 rounded-xl bg-white">
            <Image src={qrUrl} alt="QR Code" width={240} height={240} className="rounded" unoptimized />
          </div>
          <p className="text-xs text-gray-500 text-center">Escanea el QR para abrir y completar el formulario</p>
          <div className="w-full">
            <label className="block text-xs font-medium text-gray-600 mb-1">Enlace directo</label>
            <div className="flex items-center gap-2">
              <input readOnly value={formUrl}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 truncate" />
              <button onClick={copyUrl}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                {copied ? '✓' : 'Copiar'}
              </button>
            </div>
          </div>
          <div className="flex gap-3 w-full">
            <a href={formUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center py-2 px-4 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              Abrir formulario
            </a>
            <button onClick={() => { const a = document.createElement('a'); a.href = qrUrl; a.download = `qr-reserva-${form.slug}.png`; a.click() }}
              className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors">
              Descargar QR
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Print Modal ──────────────────────────────────────────────────────────────
function PrintModal({ form, onClose }: { form: ReservationForm; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null)
  const [values, setValues] = useState<Record<string, string>>({})

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win || !printRef.current) return
    win.document.write(`
      <html><head><title>${form.name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
        h1 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
        .subtitle { font-size: 11px; color: #666; margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 8px; }
        .section { margin-bottom: 16px; }
        .section-title { font-size: 12px; font-weight: bold; background: #f0f0f0; padding: 4px 8px; border-left: 3px solid #333; margin-bottom: 8px; }
        .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
        .field { border-bottom: 1px solid #ccc; padding-bottom: 2px; }
        .field-label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.03em; }
        .field-value { font-size: 12px; min-height: 16px; padding: 1px 0; }
        .field.full { grid-column: 1 / -1; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 32px; border-top: 1px solid #ccc; padding-top: 16px; }
        .sig-line { border-bottom: 1px solid #111; margin-bottom: 4px; height: 32px; }
        .sig-label { font-size: 10px; color: #666; }
      </style></head><body>`)
    win.document.write(`<h1>${form.name}</h1>`)
    win.document.write(`<p class="subtitle">Formulario de Reserva${form.project ? ' — ' + form.project.name : ''}</p>`)

    for (const sec of form.sections) {
      win.document.write(`<div class="section"><div class="section-title">${sec.title}</div><div class="fields">`)
      for (const f of sec.fields) {
        const isWide = f.type === 'textarea'
        win.document.write(`<div class="field${isWide ? ' full' : ''}">
          <div class="field-label">${f.label}${f.required ? ' *' : ''}</div>
          <div class="field-value">${values[f.id] || '&nbsp;'}</div>
        </div>`)
      }
      win.document.write('</div></div>')
    }

    win.document.write(`<div class="signatures">
      <div><div class="sig-line"></div><div class="sig-label">Firma del cliente</div></div>
      <div><div class="sig-line"></div><div class="sig-label">Firma de la promotora</div></div>
    </div>`)
    win.document.write('</body></html>')
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">{form.name}</h2>
            {form.project && <p className="text-xs text-gray-500 mt-0.5">{form.project.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors">
              🖨️ Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-2">✕</button>
          </div>
        </div>

        <div ref={printRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {form.sections.map(sec => (
            <div key={sec.id}>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 pb-1 border-b border-gray-200">
                {sec.title}
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {sec.fields.map(f => (
                  <div key={f.id} className={f.type === 'textarea' ? 'col-span-2' : ''}>
                    <label className="block text-xs text-gray-500 mb-1">
                      {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea
                        value={values[f.id] ?? ''}
                        onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))}
                        rows={2}
                        className="w-full border-b border-gray-300 focus:border-gray-800 outline-none text-sm py-1 resize-none bg-transparent"
                      />
                    ) : f.type === 'select' ? (
                      <select
                        value={values[f.id] ?? ''}
                        onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))}
                        className="w-full border-b border-gray-300 focus:border-gray-800 outline-none text-sm py-1 bg-transparent">
                        <option value=""></option>
                        {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={f.type}
                        value={values[f.id] ?? ''}
                        onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))}
                        className="w-full border-b border-gray-300 focus:border-gray-800 outline-none text-sm py-1 bg-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-16 pt-8 border-t border-gray-200">
            <div>
              <div className="border-b border-gray-800 mb-1 h-8" />
              <p className="text-xs text-gray-500">Firma del cliente</p>
            </div>
            <div>
              <div className="border-b border-gray-800 mb-1 h-8" />
              <p className="text-xs text-gray-500">Firma de la promotora</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Field Editor Row ─────────────────────────────────────────────────────────
function FieldRow({
  field,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: FormField
  onChange: (f: FormField) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const [showOptions, setShowOptions] = useState(false)
  const [optText, setOptText] = useState((field.options ?? []).join('\n'))

  function saveOptions() {
    onChange({ ...field, options: optText.split('\n').map(s => s.trim()).filter(Boolean) })
    setShowOptions(false)
  }

  return (
    <div className="bg-gray-50 rounded-xl p-3 group">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp} disabled={isFirst}
            className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
          <button onClick={onMoveDown} disabled={isLast}
            className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
        </div>
        <input
          value={field.label}
          onChange={e => onChange({ ...field, label: e.target.value })}
          className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={field.type}
          onChange={e => onChange({ ...field, type: e.target.value as FieldType })}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map(t => (
            <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={field.required}
            onChange={e => onChange({ ...field, required: e.target.checked })}
            className="rounded" />
          Req.
        </label>
        {field.type === 'select' && (
          <button onClick={() => setShowOptions(v => !v)}
            className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 bg-white">
            Opciones
          </button>
        )}
        <button onClick={onDelete}
          className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 px-1">
          🗑
        </button>
      </div>
      {field.type === 'select' && showOptions && (
        <div className="mt-2 pl-6">
          <p className="text-xs text-gray-400 mb-1">Una opción por línea:</p>
          <textarea
            value={optText}
            onChange={e => setOptText(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={saveOptions}
            className="mt-1 text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Guardar opciones
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Form Builder Modal ───────────────────────────────────────────────────────
function BuilderModal({
  form,
  projects,
  onClose,
  onSaved,
}: {
  form: ReservationForm | null
  projects: Project[]
  onClose: () => void
  onSaved: (f: ReservationForm) => void
}) {
  const isNew = !form
  const [name, setName] = useState(form?.name ?? '')
  const [projectId, setProjectId] = useState(form?.projectId ?? '')
  const [sections, setSections] = useState<FormSection[]>(form?.sections ?? [])
  const [saving, setSaving] = useState(false)

  function updateSection(idx: number, sec: FormSection) {
    setSections(prev => prev.map((s, i) => i === idx ? sec : s))
  }

  function addSection() {
    setSections(prev => [...prev, { id: uid(), title: 'Nueva sección', fields: [] }])
  }

  function deleteSection(idx: number) {
    setSections(prev => prev.filter((_, i) => i !== idx))
  }

  function addField(secIdx: number) {
    const newField: FormField = { id: uid(), label: 'Nuevo campo', type: 'text', required: false }
    setSections(prev => prev.map((s, i) => i === secIdx
      ? { ...s, fields: [...s.fields, newField] }
      : s))
  }

  function updateField(secIdx: number, fieldIdx: number, field: FormField) {
    setSections(prev => prev.map((s, i) => i === secIdx
      ? { ...s, fields: s.fields.map((f, fi) => fi === fieldIdx ? field : f) }
      : s))
  }

  function deleteField(secIdx: number, fieldIdx: number) {
    setSections(prev => prev.map((s, i) => i === secIdx
      ? { ...s, fields: s.fields.filter((_, fi) => fi !== fieldIdx) }
      : s))
  }

  function moveField(secIdx: number, fieldIdx: number, dir: -1 | 1) {
    setSections(prev => prev.map((s, i) => {
      if (i !== secIdx) return s
      const arr = [...s.fields]
      const target = fieldIdx + dir
      if (target < 0 || target >= arr.length) return s;
      [arr[fieldIdx], arr[target]] = [arr[target], arr[fieldIdx]]
      return { ...s, fields: arr }
    }))
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const body = { name, projectId: projectId || null, sections }
      const res = isNew
        ? await fetch('/api/reservation-forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch(`/api/reservation-forms/${form.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const saved = await res.json() as ReservationForm
      saved.sections = typeof saved.sections === 'string' ? JSON.parse(saved.sections) : saved.sections
      onSaved(saved)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900">{isNew ? 'Nuevo formulario de reserva' : 'Editar formulario'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Nombre y proyecto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre del formulario *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ej: Formulario de Reserva – Altos de Casa Mía"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Proyecto (opcional)</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sin proyecto</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Secciones */}
          <div className="space-y-4">
            {sections.map((sec, secIdx) => (
              <div key={sec.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <input
                    value={sec.title}
                    onChange={e => updateSection(secIdx, { ...sec, title: e.target.value })}
                    className="flex-1 font-semibold text-sm bg-transparent focus:outline-none text-gray-800"
                  />
                  <button onClick={() => deleteSection(secIdx)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded-lg transition-colors">
                    Eliminar sección
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  {sec.fields.map((field, fi) => (
                    <FieldRow
                      key={field.id}
                      field={field}
                      onChange={f => updateField(secIdx, fi, f)}
                      onDelete={() => deleteField(secIdx, fi)}
                      onMoveUp={() => moveField(secIdx, fi, -1)}
                      onMoveDown={() => moveField(secIdx, fi, 1)}
                      isFirst={fi === 0}
                      isLast={fi === sec.fields.length - 1}
                    />
                  ))}
                  <button onClick={() => addField(secIdx)}
                    className="w-full py-2 text-xs text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                    + Agregar campo
                  </button>
                </div>
              </div>
            ))}

            <button onClick={addSection}
              className="w-full py-2.5 text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">
              + Agregar sección
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => { void save() }} disabled={saving || !name.trim()}
            className="px-5 py-2.5 text-sm bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando...' : isNew ? 'Crear formulario' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Form Card ────────────────────────────────────────────────────────────────
function ReservationFormCard({
  form,
  onEdit,
  onDelete,
  onToggle,
  onPrint,
  onQR,
}: {
  form: ReservationForm
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  onPrint: () => void
  onQR: () => void
}) {
  const totalFields = form.sections.reduce((acc, s) => acc + s.fields.length, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="h-1.5 rounded-t-xl bg-indigo-500" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                form.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}>
                {form.isActive ? 'Activo' : 'Inactivo'}
              </span>
              <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full font-medium">
                Reserva
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{form.name}</h3>
            {form.project && (
              <p className="text-xs text-gray-500 mt-0.5">{form.project.name}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onQR} title="QR y enlace"
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm">🔗</button>
            <button onClick={onEdit} title="Editar"
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm">✏️</button>
            <button onClick={onDelete} title="Eliminar"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm">🗑</button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{form.sections.length}</div>
            <div className="text-[10px] text-gray-500">secciones</div>
          </div>
          <div className="h-8 w-px bg-gray-100" />
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{totalFields}</div>
            <div className="text-[10px] text-gray-500">campos</div>
          </div>
          {form.project && (
            <>
              <div className="h-8 w-px bg-gray-100" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-400">Proyecto</div>
                <div className="text-xs text-gray-700 truncate">{form.project.name}</div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onToggle}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
              form.isActive
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-100'
            }`}>
            {form.isActive ? 'Desactivar' : 'Activar'}
          </button>
          <button onClick={onPrint}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-center text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
            📋 Llenar / Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReservationFormsClient({
  initialForms,
  projects,
}: {
  initialForms: ReservationForm[]
  projects: Project[]
}) {
  const [forms, setForms] = useState<ReservationForm[]>(
    initialForms.map(f => ({
      ...f,
      sections: typeof f.sections === 'string' ? JSON.parse(f.sections as unknown as string) : f.sections,
    }))
  )
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingForm, setEditingForm] = useState<ReservationForm | null>(null)
  const [printForm, setPrintForm] = useState<ReservationForm | null>(null)
  const [qrForm, setQrForm] = useState<ReservationForm | null>(null)

  function handleSaved(saved: ReservationForm) {
    setForms(prev => {
      const idx = prev.findIndex(f => f.id === saved.id)
      if (idx >= 0) return prev.map(f => f.id === saved.id ? saved : f)
      return [saved, ...prev]
    })
    setShowBuilder(false)
    setEditingForm(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este formulario de reserva?')) return
    await fetch(`/api/reservation-forms/${id}`, { method: 'DELETE' })
    setForms(prev => prev.filter(f => f.id !== id))
  }

  async function handleToggle(form: ReservationForm) {
    const res = await fetch(`/api/reservation-forms/${form.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !form.isActive }),
    })
    const updated = await res.json() as ReservationForm
    updated.sections = typeof updated.sections === 'string' ? JSON.parse(updated.sections) : updated.sections
    setForms(prev => prev.map(f => f.id === form.id ? updated : f))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Formularios de Reserva</h2>
          <p className="text-sm text-gray-500 mt-0.5">Templates editables para capturar datos de reserva de cada proyecto</p>
        </div>
        <button
          onClick={() => { setEditingForm(null); setShowBuilder(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          + Nuevo formulario
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">📄</div>
          <p className="text-gray-500 text-sm mb-4">Aún no tienes formularios de reserva.</p>
          <button
            onClick={() => { setEditingForm(null); setShowBuilder(true) }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
            Crear primer formulario
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(form => (
            <ReservationFormCard
              key={form.id}
              form={form}
              onEdit={() => { setEditingForm(form); setShowBuilder(true) }}
              onDelete={() => { void handleDelete(form.id) }}
              onToggle={() => { void handleToggle(form) }}
              onPrint={() => setPrintForm(form)}
              onQR={() => setQrForm(form)}
            />
          ))}
        </div>
      )}

      {showBuilder && (
        <BuilderModal
          form={editingForm}
          projects={projects}
          onClose={() => { setShowBuilder(false); setEditingForm(null) }}
          onSaved={handleSaved}
        />
      )}
      {printForm && (
        <PrintModal form={printForm} onClose={() => setPrintForm(null)} />
      )}
      {qrForm && (
        <QRModal form={qrForm} onClose={() => setQrForm(null)} />
      )}
    </div>
  )
}
