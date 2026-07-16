'use client'

import { useState } from 'react'

interface Counts {
  leads: number; projects: number; units: number; reservations: number
  agents: number; brokers: number; activities: number
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{value.toLocaleString()}</span>
    </div>
  )
}

export default function BackupClient({ counts }: { counts: Counts }) {
  const [downloading, setDownloading] = useState(false)
  const [lastDownload, setLastDownload] = useState<string | null>(null)

  const totalRecords = counts.leads + counts.projects + counts.units + counts.reservations + counts.agents + counts.brokers + counts.activities

  async function downloadDB() {
    setDownloading(true)
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) throw new Error('Error al generar backup')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().slice(0, 10)
      a.download = `si-crm-backup-${date}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setLastDownload(new Date().toLocaleString('es-PA'))
    } catch (e) {
      alert('Error al descargar el backup. Intenta de nuevo.')
    }
    setDownloading(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* DATABASE BACKUP */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🗄️</div>
            <div>
              <h2 className="text-lg font-bold">Backup de Base de Datos</h2>
              <p className="text-blue-100 text-sm">Exporta todos los datos del CRM en formato JSON</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contenido del backup</h3>
              <StatRow label="🎯 Leads / Contactos" value={counts.leads} />
              <StatRow label="🏗️ Proyectos" value={counts.projects} />
              <StatRow label="🏠 Unidades / Lotes" value={counts.units} />
              <StatRow label="📋 Reservas / CPP" value={counts.reservations} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Más datos incluidos</h3>
              <StatRow label="👤 Asesores" value={counts.agents} />
              <StatRow label="🤝 Brokers externos" value={counts.brokers} />
              <StatRow label="📝 Actividades" value={counts.activities} />
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">+ citas, campañas, documentos, secuencias...</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-4 flex items-start gap-3">
            <span className="text-blue-500 text-lg mt-0.5">ℹ️</span>
            <div className="text-sm text-blue-700">
              <strong>Incluye {totalRecords.toLocaleString()}+ registros.</strong> El archivo JSON contiene toda la información del CRM y puede importarse de vuelta o abrirse con cualquier herramienta de datos. Guárdalo en un lugar seguro.
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              {lastDownload && (
                <p className="text-xs text-gray-400">Última descarga: {lastDownload}</p>
              )}
            </div>
            <button
              onClick={downloadDB}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {downloading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generando...
                </>
              ) : (
                <>⬇️ Descargar backup de datos</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PLATFORM / CODE BACKUP */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">💻</div>
            <div>
              <h2 className="text-lg font-bold">Backup de Plataforma</h2>
              <p className="text-gray-300 text-sm">Código fuente completo del CRM — alojado en GitHub</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Repositorio</span>
              <a href="https://github.com/FNjr13/repocrmsi" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">github.com/FNjr13/repocrmsi</a>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Rama principal</span>
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">main</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Auto-deploy</span>
              <span className="text-green-600 font-medium">✓ Vercel (push → deploy automático)</span>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 mb-4 flex items-start gap-3">
            <span className="text-amber-500 text-lg mt-0.5">💡</span>
            <div className="text-sm text-amber-700">
              El código está versionado en GitHub — cada cambio queda registrado con historial. Puedes descargarlo como ZIP en cualquier momento con el botón de abajo.
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="https://github.com/FNjr13/repocrmsi/archive/refs/heads/main.zip"
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              ⬇️ Descargar código como ZIP
            </a>
            <a
              href="https://github.com/FNjr13/repocrmsi/commits/main"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors text-sm"
            >
              📋 Ver historial de cambios
            </a>
          </div>
        </div>
      </div>

      {/* TIPS */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3">📌 Recomendaciones de backup</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Descarga el backup de datos <strong>semanalmente</strong> y guárdalo en Google Drive o Dropbox.</li>
          <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Neon (base de datos) tiene backups automáticos diarios del servidor — esto es un respaldo adicional.</li>
          <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>El código en GitHub ya está versionado. Cada deploy es un punto de restauración.</li>
          <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">ℹ️</span>El archivo JSON puede abrirse en Excel (importar → desde JSON) para ver los datos en tabla.</li>
        </ul>
      </div>

    </div>
  )
}
