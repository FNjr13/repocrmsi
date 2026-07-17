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
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok?: boolean; error?: string } | null>(null)
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
    } catch { alert('Error al descargar el backup.') }
    setDownloading(false)
  }

  async function testBackupEmail() {
    setTesting(true)
    setTestResult(null)
    try {
      const secret = prompt('Ingresa el CRON_SECRET que pusiste en Vercel:')
      if (!secret) { setTesting(false); return }
      const res = await fetch('/api/cron/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })
      const data = await res.json()
      if (data.ok) {
        setTestResult({ ok: true })
      } else {
        setTestResult({ error: data.error || 'Error desconocido' })
      }
    } catch (e) {
      setTestResult({ error: 'No se pudo conectar al servidor' })
    }
    setTesting(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* SETUP STEPS */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">⚙️ Configuración requerida (1 vez)</h3>
        <ol className="space-y-3 text-sm text-blue-800">
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
            <div>
              Ve a <a href="https://resend.com/signup" target="_blank" rel="noreferrer" className="underline font-semibold">resend.com/signup</a> — crea cuenta gratis con Google (30 seg.)
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
            <div>En Resend → <strong>API Keys</strong> → <strong>Create API Key</strong> → copia el key</div>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
            <div>
              En Vercel → tu proyecto → <strong>Settings → Environment Variables</strong>, agrega estas 3:
              <div className="mt-2 bg-white rounded-lg border border-blue-200 overflow-hidden text-xs font-mono">
                <div className="flex border-b border-blue-100 px-3 py-2"><span className="w-40 text-blue-600">RESEND_API_KEY</span><span className="text-gray-700">re_xxxxxxx (el key de Resend)</span></div>
                <div className="flex border-b border-blue-100 px-3 py-2"><span className="w-40 text-blue-600">BACKUP_EMAIL</span><span className="text-gray-700">francisconasta16@gmail.com</span></div>
                <div className="flex px-3 py-2"><span className="w-40 text-blue-600">CRON_SECRET</span><span className="text-gray-700">cualquier-palabra-secreta</span></div>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
            <div>Vercel → <strong>Deployments</strong> → <strong>Redeploy</strong> (para que tome las variables)</div>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">✓</span>
            <div>Haz clic en <strong>"Enviar backup de prueba ahora"</strong> para verificar que llegue el correo</div>
          </li>
        </ol>
      </div>

      {/* TEST BUTTON */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Prueba manual</h3>
            <p className="text-sm text-gray-500 mt-0.5">Envía el backup ahora mismo al correo configurado</p>
          </div>
          <button
            onClick={testBackupEmail}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {testing ? (
              <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Enviando...</>
            ) : '📧 Enviar backup de prueba ahora'}
          </button>
        </div>
        {testResult && (
          <div className={`mt-3 px-4 py-3 rounded-xl text-sm font-medium ${testResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {testResult.ok
              ? '✅ Backup enviado correctamente — revisa tu correo (puede tardar 1-2 min en llegar)'
              : `❌ Error: ${testResult.error === 'NO_RESEND_KEY' ? 'Falta configurar RESEND_API_KEY en Vercel' : testResult.error === 'NO_BACKUP_EMAIL' ? 'Falta configurar BACKUP_EMAIL en Vercel' : testResult.error}`}
          </div>
        )}
      </div>

      {/* DATABASE BACKUP */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🗄️</div>
            <div>
              <h2 className="text-lg font-bold">Backup de Base de Datos</h2>
              <p className="text-blue-100 text-sm">Automático diario a las 11 PM · También descargable manualmente</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contenido</p>
              <StatRow label="🎯 Leads / Contactos" value={counts.leads} />
              <StatRow label="🏗️ Proyectos" value={counts.projects} />
              <StatRow label="🏠 Unidades / Lotes" value={counts.units} />
              <StatRow label="📋 Reservas / CPP" value={counts.reservations} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Más incluido</p>
              <StatRow label="👤 Asesores" value={counts.agents} />
              <StatRow label="🤝 Brokers externos" value={counts.brokers} />
              <StatRow label="📝 Actividades" value={counts.activities} />
              <div className="py-2 text-xs text-gray-400">+ citas, campañas, documentos, secuencias...</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            {lastDownload
              ? <p className="text-xs text-gray-400">Última descarga manual: {lastDownload}</p>
              : <div />}
            <button onClick={downloadDB} disabled={downloading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-colors text-sm">
              {downloading
                ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generando...</>
                : '⬇️ Descargar ahora'}
            </button>
          </div>
        </div>
      </div>

      {/* PLATFORM BACKUP */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">💻</div>
            <div>
              <h2 className="text-lg font-bold">Backup de Plataforma</h2>
              <p className="text-gray-300 text-sm">Código fuente — versionado en GitHub, incluido en el email diario</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Repositorio</span><a href="https://github.com/FNjr13/repocrmsi" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">github.com/FNjr13/repocrmsi</a></div>
            <div className="flex justify-between"><span className="text-gray-500">Auto-deploy</span><span className="text-green-600 font-medium">✓ Vercel (cada push)</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Email diario</span><span className="text-green-600 font-medium">✓ Link incluido en backup</span></div>
          </div>
          <div className="flex gap-3">
            <a href="https://github.com/FNjr13/repocrmsi/archive/refs/heads/main.zip"
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl transition-colors text-sm">
              ⬇️ Descargar código como ZIP
            </a>
            <a href="https://github.com/FNjr13/repocrmsi/commits/main" target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors text-sm">
              📋 Historial de cambios
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3">📅 Programación automática</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-700">11:00 PM</div>
            <div className="text-xs text-green-600 mt-0.5">Hora de Panamá · Todos los días</div>
          </div>
          <div className="text-gray-400">→</div>
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-blue-700">📧 Email</div>
            <div className="text-xs text-blue-600 mt-0.5">JSON adjunto con todos los datos</div>
          </div>
          <div className="text-gray-400">→</div>
          <div className="flex-1 bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-purple-700">☁️ GitHub</div>
            <div className="text-xs text-purple-600 mt-0.5">Código siempre versionado</div>
          </div>
        </div>
      </div>

    </div>
  )
}
