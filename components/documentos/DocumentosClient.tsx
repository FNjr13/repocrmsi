'use client'

import { useState, useRef, useCallback } from 'react'

interface Document {
  id: string
  name: string
  fileName: string
  mimeType: string
  size: number
  url: string
  category: string
  projectId: string | null
  leadId: string | null
  isShared: boolean
  uploadedBy: string | null
  createdAt: string
}

interface Project { id: string; name: string }

const CATEGORIES = [
  { value: 'BROCHURE', label: '📋 Brochure', color: 'bg-blue-100 text-blue-700' },
  { value: 'PLANO', label: '📐 Plano', color: 'bg-purple-100 text-purple-700' },
  { value: 'CONTRATO', label: '📝 Contrato', color: 'bg-amber-100 text-amber-700' },
  { value: 'FOTO', label: '📸 Foto', color: 'bg-pink-100 text-pink-700' },
  { value: 'VIDEO', label: '🎬 Video', color: 'bg-red-100 text-red-700' },
  { value: 'OTRO', label: '📎 Otro', color: 'bg-gray-100 text-gray-600' },
]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const cls = className || 'w-8 h-8'
  if (mimeType.startsWith('image/')) return <span className={`${cls} text-2xl flex items-center justify-center`}>🖼️</span>
  if (mimeType === 'application/pdf') return <span className={`${cls} text-2xl flex items-center justify-center`}>📄</span>
  if (mimeType.startsWith('video/')) return <span className={`${cls} text-2xl flex items-center justify-center`}>🎬</span>
  if (mimeType.includes('word') || mimeType.includes('doc')) return <span className={`${cls} text-2xl flex items-center justify-center`}>📝</span>
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return <span className={`${cls} text-2xl flex items-center justify-center`}>📊</span>
  return <span className={`${cls} text-2xl flex items-center justify-center`}>📎</span>
}

export default function DocumentosClient({
  initialDocs,
  projects,
}: {
  initialDocs: Document[]
  projects: Project[]
}) {
  const [docs, setDocs] = useState(initialDocs)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadForm, setUploadForm] = useState({ name: '', category: 'BROCHURE', projectId: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Document | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = docs.filter(d => {
    if (filterCategory && d.category !== filterCategory) return false
    if (filterProject && d.projectId !== filterProject) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) { setSelectedFile(file); setUploadForm(p => ({ ...p, name: file.name })); setShowUpload(true) }
  }, [])

  async function upload() {
    if (!selectedFile) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', selectedFile)
    fd.append('name', uploadForm.name || selectedFile.name)
    fd.append('category', uploadForm.category)
    if (uploadForm.projectId) fd.append('projectId', uploadForm.projectId)
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const doc = await res.json()
      setDocs(prev => [doc, ...prev])
      setShowUpload(false)
      setSelectedFile(null)
      setUploadForm({ name: '', category: 'BROCHURE', projectId: '' })
    } finally {
      setUploading(false)
    }
  }

  async function deleteDoc(id: string) {
    if (!confirm('¿Eliminar este documento?')) return
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    setDocs(prev => prev.filter(d => d.id !== id))
    if (preview?.id === id) setPreview(null)
  }

  async function toggleShared(doc: Document) {
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isShared: !doc.isShared }),
    })
    const updated = await res.json()
    setDocs(prev => prev.map(d => d.id === doc.id ? updated : d))
  }

  const getCatConfig = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1]

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">📁 Biblioteca de Documentos</h1>
            <p className="text-gray-500 text-sm">{docs.length} archivos · brochures, planos, contratos</p>
          </div>
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Subir archivo
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" placeholder="Buscar documentos..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 w-56"/>
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">Todos los proyectos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-2xl p-8 mb-6 text-center transition-all ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div className="text-4xl mb-2">📂</div>
            <p className="text-sm font-medium text-gray-600">Arrastra archivos aquí o</p>
            <button onClick={() => { setShowUpload(true); setTimeout(() => fileRef.current?.click(), 100) }}
              className="text-sm text-blue-600 hover:text-blue-800 font-semibold mt-1">
              selecciona desde tu computadora
            </button>
            <p className="text-xs text-gray-400 mt-1">PDF, imágenes, Word, Excel · máx. 50MB</p>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🗂️</div>
              <p className="text-gray-500 font-medium">No hay documentos</p>
              <p className="text-gray-400 text-sm mt-1">Sube tu primer archivo para comenzar</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map(doc => {
                const cat = getCatConfig(doc.category)
                const isImage = doc.mimeType.startsWith('image/')
                return (
                  <div key={doc.id}
                    className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer group ${preview?.id === doc.id ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setPreview(doc)}>
                    {/* Thumbnail */}
                    <div className="h-32 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={doc.url} alt={doc.name} className="w-full h-full object-cover"/>
                      ) : (
                        <FileIcon mimeType={doc.mimeType} className="w-12 h-12"/>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-800 truncate mb-1">{doc.name}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cat.color}`}>
                          {cat.label.split(' ')[1]}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatSize(doc.size)}</span>
                      </div>
                      {doc.isShared && (
                        <div className="text-[10px] text-green-600 font-medium mt-1">🔗 Compartido</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Preview panel */}
        {preview && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm truncate flex-1 mr-2">{preview.name}</h3>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Preview content */}
              <div className="bg-gray-50 rounded-xl h-48 flex items-center justify-center mb-4 border border-gray-100">
                {preview.mimeType.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.url} alt={preview.name} className="max-h-full max-w-full object-contain rounded-lg"/>
                ) : (
                  <FileIcon mimeType={preview.mimeType} className="w-16 h-16"/>
                )}
              </div>

              <div className="space-y-3 text-sm">
                {[
                  ['Nombre', preview.name],
                  ['Categoría', getCatConfig(preview.category).label],
                  ['Tamaño', formatSize(preview.size)],
                  ['Tipo', preview.mimeType],
                  ['Subido', new Date(preview.createdAt).toLocaleDateString('es-CL')],
                  ...(preview.uploadedBy ? [['Por', preview.uploadedBy]] : []),
                  ...(preview.projectId ? [['Proyecto', projects.find(p => p.id === preview.projectId)?.name || '—']] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500 flex-shrink-0">{k}</span>
                    <span className="font-medium text-gray-800 text-right ml-2 truncate">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-2">
                <a href={preview.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Descargar / Ver
                </a>
                <a href={`https://wa.me/?text=${encodeURIComponent(`${preview.name}: ${window?.location?.origin}${preview.url}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  💬 Compartir por WhatsApp
                </a>
                <button onClick={() => toggleShared(preview)}
                  className={`w-full text-sm font-medium py-2.5 rounded-xl border transition-colors ${preview.isShared ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {preview.isShared ? '🔒 Dejar de compartir' : '🔗 Marcar como compartido'}
                </button>
                <button onClick={() => deleteDoc(preview.id)}
                  className="w-full text-sm font-medium py-2.5 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors">
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-lg">📤 Subir archivo</h3>
              <button onClick={() => { setShowUpload(false); setSelectedFile(null) }} className="text-gray-400 text-xl">✕</button>
            </div>

            {/* File picker */}
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer mb-4 transition-all ${selectedFile ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              {selectedFile ? (
                <div>
                  <FileIcon mimeType={selectedFile.type} className="w-12 h-12 mx-auto mb-2"/>
                  <p className="font-semibold text-gray-800 text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatSize(selectedFile.size)}</p>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📂</div>
                  <p className="text-sm text-gray-600">Click para seleccionar archivo</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, imágenes, Word, Excel</p>
                </div>
              )}
              <input ref={fileRef} type="file" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) { setSelectedFile(f); setUploadForm(p => ({ ...p, name: f.name })) }
                }}/>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre del documento</label>
                <input type="text" value={uploadForm.name} onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="ej: Brochure Quarta 2024" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categoría</label>
                <select value={uploadForm.category} onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Proyecto (opcional)</label>
                <select value={uploadForm.projectId} onChange={e => setUploadForm(p => ({ ...p, projectId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin proyecto específico</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowUpload(false); setSelectedFile(null) }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">Cancelar</button>
              <button onClick={upload} disabled={uploading || !selectedFile}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                {uploading ? 'Subiendo...' : '📤 Subir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
