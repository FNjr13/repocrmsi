'use client'

import { useState } from 'react'

interface WaConfig {
  id: string
  phoneNumberId: string
  wabaId: string
  accessToken: string
  verifyToken: string
  phoneNumber: string | null
  displayName: string | null
  isActive: boolean
}

function SetupStep({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <div className="text-sm text-gray-600">{children}</div>
      </div>
    </div>
  )
}

export default function WhatsAppConfigClient({ initialConfig }: { initialConfig: WaConfig | null }) {
  const [config, setConfig] = useState<WaConfig | null>(initialConfig)
  const [form, setForm] = useState({
    phoneNumberId: initialConfig?.phoneNumberId ?? '',
    wabaId: initialConfig?.wabaId ?? '',
    accessToken: initialConfig?.accessToken ?? '',
    verifyToken: initialConfig?.verifyToken ?? 'wh_verify_token',
    phoneNumber: initialConfig?.phoneNumber ?? '',
    displayName: initialConfig?.displayName ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'config' | 'guide'>('config')

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/whatsapp`
    : '/api/webhooks/whatsapp'

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json() as WaConfig
      setConfig(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    if (!config) return
    const res = await fetch('/api/whatsapp/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !config.isActive }),
    })
    const data = await res.json() as WaConfig
    setConfig(data)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Business</h1>
            <p className="text-sm text-gray-500">Integración oficial con la API de WhatsApp Business</p>
          </div>
          {config && (
            <div className="ml-auto">
              <button
                onClick={handleToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  config.isActive
                    ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${config.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                {config.isActive ? 'Conectado' : 'Desconectado'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
          {(['config', 'guide'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'config' ? '⚙️ Configuración' : '📖 Guía de configuración'}
            </button>
          ))}
        </div>

        {tab === 'config' ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Credenciales de la API</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Obtén estos datos desde{' '}
                <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Meta for Developers
                </a>
              </p>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID *</label>
                  <input
                    value={form.phoneNumberId}
                    onChange={e => setForm(f => ({ ...f, phoneNumberId: e.target.value }))}
                    placeholder="123456789012345"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WABA ID *</label>
                  <input
                    value={form.wabaId}
                    onChange={e => setForm(f => ({ ...f, wabaId: e.target.value }))}
                    placeholder="123456789012345"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access Token permanente *</label>
                <input
                  value={form.accessToken}
                  onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))}
                  type="password"
                  placeholder="EAAxxxxxx..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Genera un token que no expire desde la configuración del sistema</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de teléfono</label>
                  <input
                    value={form.phoneNumber}
                    onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                    placeholder="+507 6000-0000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de pantalla</label>
                  <input
                    value={form.displayName}
                    onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                    placeholder="VM Proyectos"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 font-mono break-all">
                    {webhookUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(webhookUrl)}
                    className="flex-shrink-0 px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                  >
                    Copiar
                  </button>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verify Token</label>
                  <div className="flex items-center gap-2">
                    <input
                      value={form.verifyToken}
                      onChange={e => setForm(f => ({ ...f, verifyToken: e.target.value }))}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(form.verifyToken)}
                      className="flex-shrink-0 px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Usa exactamente este valor al configurar el webhook en Meta</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  {saved && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Guardado correctamente
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar configuración'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <h2 className="font-semibold text-gray-900 text-lg">Cómo configurar WhatsApp Business API</h2>

            <div className="space-y-5">
              <SetupStep number={1} title="Crear cuenta en Meta for Developers">
                Ve a{' '}
                <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  developers.facebook.com
                </a>{' '}
                y crea una cuenta de desarrollador si no tienes una. Necesitas una página de Facebook y una cuenta de Business Manager.
              </SetupStep>

              <SetupStep number={2} title="Crear una App de tipo Business">
                En el panel de Meta for Developers, crea una nueva App. Selecciona el tipo <strong>Business</strong>. Dale un nombre como &quot;SI CRM&quot;.
              </SetupStep>

              <SetupStep number={3} title="Agregar el producto WhatsApp">
                Dentro de tu App, busca el producto <strong>WhatsApp</strong> y haz clic en &quot;Configurar&quot;. Esto te dará acceso a WhatsApp Business API.
              </SetupStep>

              <SetupStep number={4} title="Obtener Phone Number ID y WABA ID">
                En la sección de WhatsApp {'>'} Configuración de la API, encontrarás:
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600">
                  <li><strong>Phone Number ID</strong> — el ID del número de teléfono</li>
                  <li><strong>WhatsApp Business Account ID (WABA ID)</strong></li>
                </ul>
              </SetupStep>

              <SetupStep number={5} title="Generar Access Token permanente">
                En <strong>Configuración {'>'} Avanzada</strong>, genera un token de acceso del sistema que no expire. Este es tu Access Token.
              </SetupStep>

              <SetupStep number={6} title="Configurar el Webhook">
                En <strong>WhatsApp {'>'} Configuración {'>'} Webhooks</strong>:
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600">
                  <li>URL de callback: <code className="bg-gray-100 px-1 rounded text-xs">{webhookUrl}</code></li>
                  <li>Token de verificación: el mismo que configuraste arriba</li>
                  <li>Suscribirse a: <strong>messages</strong></li>
                </ul>
              </SetupStep>

              <SetupStep number={7} title="Verificar y probar">
                Pega todos los datos en la pestaña de Configuración y guarda. Luego envía un mensaje de prueba desde un lead.
              </SetupStep>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-700">
                <strong>Nota:</strong> Para recibir mensajes en producción, tu dominio debe ser HTTPS con un certificado SSL válido.
                En desarrollo, usa{' '}
                <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer" className="underline">ngrok</a>{' '}
                para exponer tu servidor local.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
