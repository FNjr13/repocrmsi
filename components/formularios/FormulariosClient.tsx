'use client'

import { useState } from 'react'
import Image from 'next/image'

interface PublicForm {
  id: string
  slug: string
  title: string
  subtitle: string | null
  type: string
  isActive: boolean
  submitCount: number
  theme: string
  projectId: string | null
  createdAt: string
}

interface Project {
  id: string
  name: string
}

const TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  FERIA: 'Feria / Evento',
  INVERSIONISTA: 'Inversionista',
  VISITA: 'Agendar Visita',
  PRECALIFICACION: 'Precalificación',
}

const THEME_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  dark: 'bg-gray-800',
}

const THEMES = [
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'purple', label: 'Morado' },
  { value: 'orange', label: 'Naranja' },
  { value: 'dark', label: 'Oscuro' },
]

const TYPES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'FERIA', label: 'Feria / Evento' },
  { value: 'INVERSIONISTA', label: 'Inversionista' },
  { value: 'VISITA', label: 'Agendar Visita' },
  { value: 'PRECALIFICACION', label: 'Precalificación' },
]

function QRModal({ form, onClose }: { form: PublicForm; onClose: () => void }) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const formUrl = `${baseUrl}/forms/${form.slug}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(formUrl)}`

  const copyUrl = () => {
    navigator.clipboard.writeText(formUrl)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">QR & Enlace del formulario</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{form.title}</p>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {/* QR Code */}
          <div className="p-3 border-2 border-gray-200 rounded-xl bg-white">
            <Image
              src={qrUrl}
              alt="QR Code"
              width={240}
              height={240}
              className="rounded"
              unoptimized
            />
          </div>

          <p className="text-xs text-gray-500 text-center">
            Escanea el QR con tu teléfono para abrir el formulario
          </p>

          {/* URL */}
          <div className="w-full">
            <label className="block text-xs font-medium text-gray-600 mb-1">Enlace directo</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={formUrl}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700"
              />
              <button
                onClick={copyUrl}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Copiar
              </button>
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-2 px-4 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Abrir formulario
            </a>
            <button
              onClick={() => {
                const link = document.createElement('a')
                link.href = qrUrl
                link.download = `qr-${form.slug}.png`
                link.click()
              }}
              className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              Descargar QR
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateFormModal({
  projects,
  onClose,
  onCreated,
}: {
  projects: Project[]
  onClose: () => void
  onCreated: (form: PublicForm) => void
}) {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [type, setType] = useState('GENERAL')
  const [theme, setTheme] = useState('blue')
  const [projectId, setProjectId] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          type,
          theme,
          projectId: projectId || null,
          slug: customSlug.trim() || undefined,
        }),
      })
      const form = await res.json()
      onCreated(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Crear formulario</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ej: Formulario Feria Internacional 2025"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
            <input
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="ej: Completa tus datos y un asesor te contactará"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tema visual</label>
              <select
                value={theme}
                onChange={e => setTheme(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {THEMES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto (opcional)</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin proyecto específico</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug personalizado <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-400">/forms/</span>
              <input
                value={customSlug}
                onChange={e => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="mi-formulario"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Si se deja vacío, se genera automáticamente del título</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creando...' : 'Crear formulario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormCard({
  form,
  onToggle,
  onDelete,
  onShowQR,
}: {
  form: PublicForm
  onToggle: (id: string, active: boolean) => void
  onDelete: (slug: string) => void
  onShowQR: (form: PublicForm) => void
}) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const formUrl = `${baseUrl}/forms/${form.slug}`

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Color strip */}
      <div className={`h-1.5 rounded-t-xl ${THEME_COLORS[form.theme] ?? 'bg-blue-500'}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                form.isActive
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}>
                {form.isActive ? 'Activo' : 'Inactivo'}
              </span>
              <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-full">
                {TYPE_LABELS[form.type] ?? form.type}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{form.title}</h3>
            {form.subtitle && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{form.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onShowQR(form)}
              title="Ver QR"
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(form.slug)}
              title="Eliminar"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{form.submitCount}</div>
            <div className="text-[10px] text-gray-500">envíos</div>
          </div>
          <div className="h-8 w-px bg-gray-100" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-gray-400 mb-0.5">Enlace</div>
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline truncate block"
            >
              /forms/{form.slug}
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(form.id, !form.isActive)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
              form.isActive
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-100'
            }`}
          >
            {form.isActive ? 'Desactivar' : 'Activar'}
          </button>
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-center text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Ver formulario
          </a>
        </div>
      </div>
    </div>
  )
}

export default function FormulariosClient({
  initialForms,
  projects,
}: {
  initialForms: PublicForm[]
  projects: Project[]
}) {
  const [forms, setForms] = useState<PublicForm[]>(initialForms)
  const [showCreate, setShowCreate] = useState(false)
  const [qrForm, setQrForm] = useState<PublicForm | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('ALL')

  const filtered = forms.filter(f => {
    const matchSearch = f.title.toLowerCase().includes(search.toLowerCase()) || f.slug.includes(search.toLowerCase())
    const matchType = filterType === 'ALL' || f.type === filterType
    return matchSearch && matchType
  })

  const totalSubmits = forms.reduce((s, f) => s + f.submitCount, 0)
  const activeForms = forms.filter(f => f.isActive).length

  const handleToggle = async (id: string, active: boolean) => {
    const form = forms.find(f => f.id === id)
    if (!form) return
    await fetch(`/api/forms/${form.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: active }),
    })
    setForms(prev => prev.map(f => f.id === id ? { ...f, isActive: active } : f))
  }

  const handleDelete = async (slug: string) => {
    if (!confirm('¿Eliminar este formulario? Esta acción no se puede deshacer.')) return
    await fetch(`/api/forms/${slug}`, { method: 'DELETE' })
    setForms(prev => prev.filter(f => f.slug !== slug))
  }

  const handleCreated = (form: PublicForm) => {
    setForms(prev => [form, ...prev])
    setShowCreate(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Formularios Públicos</h1>
            <p className="text-sm text-gray-500 mt-0.5">Captura leads desde landing pages, ferias y eventos con código QR</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo formulario
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4 lg:mb-5">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-gray-900">{forms.length}</div>
            <div className="text-sm text-gray-500">Total formularios</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-green-600">{activeForms}</div>
            <div className="text-sm text-gray-500">Activos</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-blue-600">{totalSubmits}</div>
            <div className="text-sm text-gray-500">Total envíos</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar formulario..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos los tipos</option>
            {TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-gray-500 text-sm">
            {forms.length === 0
              ? 'Aún no tienes formularios. Crea el primero.'
              : 'No hay formularios que coincidan con la búsqueda.'}
          </p>
          {forms.length === 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Crear primer formulario
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(form => (
            <FormCard
              key={form.id}
              form={form}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onShowQR={setQrForm}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateFormModal
          projects={projects}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {qrForm && (
        <QRModal form={qrForm} onClose={() => setQrForm(null)} />
      )}
    </div>
  )
}
