'use client'

import Link from 'next/link'
import { useState } from 'react'

const SECTIONS = [
  {
    id: 'inicio',
    icon: '🚀',
    title: 'Primeros pasos',
    color: 'blue',
    steps: [
      {
        num: '01',
        title: 'Accede al Dashboard',
        desc: 'Al iniciar sesión llegas al Dashboard Ejecutivo. Aquí ves el resumen global: proyectos activos, leads del mes, pipeline y rendimiento del equipo.',
        tip: 'Haz clic en cualquier proyecto en las pestañas superiores para ver sus métricas específicas.',
        link: '/dashboard',
        linkLabel: 'Ir al Dashboard',
      },
      {
        num: '02',
        title: 'Agrega tu primer lead',
        desc: 'Ve al CRM y haz clic en "+ Nuevo Lead". Completa nombre, teléfono, fuente y proyecto de interés. El sistema lo asignará automáticamente a un asesor.',
        tip: 'También puedes importar leads masivamente desde un archivo CSV con el botón "📥 Importar".',
        link: '/crm',
        linkLabel: 'Ir al CRM',
      },
      {
        num: '03',
        title: 'Configura tu equipo',
        desc: 'En Equipo puedes agregar asesores, ver su rendimiento y el pipeline de cada uno. Los leads nuevos se asignan en round-robin automáticamente.',
        tip: 'Cada asesor tiene una URL de perfil con sus métricas de conversión.',
        link: '/asesores',
        linkLabel: 'Ver Equipo',
      },
    ],
  },
  {
    id: 'crm',
    icon: '👥',
    title: 'CRM y Leads',
    color: 'cyan',
    steps: [
      {
        num: '01',
        title: 'Vistas del CRM',
        desc: 'El CRM tiene 3 vistas: **Kanban** (tablero visual por etapas), **Lista** (tabla con todos los campos y ordenación), y **Stats** (análisis de embudo y métricas).',
        tip: 'En la vista Kanban puedes seleccionar múltiples leads haciendo clic en la casilla y aplicar acciones masivas.',
        link: '/crm',
        linkLabel: 'Ver CRM',
      },
      {
        num: '02',
        title: 'Etapas del pipeline',
        desc: 'Los leads pasan por: Nuevo → Contactado → Interesado → Visita agendada → Negociación → Ganado. También existe "Perdido" con registro de motivo.',
        tip: 'Filtra por "En negociación" para ver los leads más avanzados y priorizarlos.',
      },
      {
        num: '03',
        title: 'Temperatura del lead',
        desc: '🔥 Hot (muy interesado, urgente), ☀️ Warm (interesado), 😐 Normal, 🧊 Cold (poco interés). Úsala para priorizar el seguimiento diario.',
        tip: 'El filtro "Hot sin contactar" muestra leads calientes que llevan más de 3 días sin actividad.',
      },
      {
        num: '04',
        title: 'Registro de actividades',
        desc: 'En cada lead puedes registrar: Llamada, WhatsApp, Email, Visita, Reunión o Nota. Todo queda en el historial con fecha y hora.',
        tip: 'Usa Ctrl+Enter para guardar una actividad rápidamente.',
      },
      {
        num: '05',
        title: 'Acciones masivas',
        desc: 'Selecciona múltiples leads y aplica: cambiar etapa, asignar asesor, cambiar temperatura, exportar CSV, o enviar WhatsApp masivo con template personalizado.',
        tip: 'El WhatsApp masivo usa variables {{nombre}}, {{apellido}} para personalizar cada mensaje.',
      },
      {
        num: '06',
        title: 'Precalificación bancaria',
        desc: 'Desde el detalle del lead, haz clic en "🏦 Precalificar". El sistema calcula si el lead califica para financiamiento según salario, deuda y estabilidad laboral.',
        tip: 'El resultado (APROBABLE / REVISAR / NO CALIFICABLE) queda guardado en el lead.',
      },
    ],
  },
  {
    id: 'whatsapp',
    icon: '💬',
    title: 'WhatsApp Business',
    color: 'green',
    steps: [
      {
        num: '01',
        title: 'Activar la integración',
        desc: 'Ve a WhatsApp en el menú lateral → Pestaña "Guía de configuración". Sigue los 7 pasos para crear tu App en Meta for Developers y obtener las credenciales.',
        tip: 'Necesitas: Phone Number ID, WABA ID, Access Token permanente, y configurar el Webhook.',
        link: '/whatsapp',
        linkLabel: 'Configurar WhatsApp',
      },
      {
        num: '02',
        title: 'Chatear con un lead',
        desc: 'Abre cualquier lead → Pestaña "💬 WhatsApp". Escribe tu mensaje y envía. El historial completo de la conversación aparece ahí.',
        tip: 'Usa las "Respuestas rápidas" (⚡) para insertar mensajes pre-escritos con un clic.',
      },
      {
        num: '03',
        title: 'WhatsApp masivo',
        desc: 'En el CRM selecciona varios leads → "💬 WhatsApp masivo". Escribe un template con variables y envía a todos de una vez.',
        tip: 'Variables disponibles: {{nombre}}, {{apellido}}, {{nombre_completo}}',
      },
      {
        num: '04',
        title: 'Mensajes entrantes',
        desc: 'Cuando un cliente te responde, el mensaje aparece en la pestaña WhatsApp del lead y recibes una notificación en la campana 🔔 del header.',
        tip: 'Los mensajes entrantes se matching automáticamente con el lead por número de teléfono.',
      },
    ],
  },
  {
    id: 'formularios',
    icon: '📋',
    title: 'Formularios y QR',
    color: 'orange',
    steps: [
      {
        num: '01',
        title: 'Crear un formulario',
        desc: 'Ve a Formularios → "+ Nuevo formulario". Elige el tipo (General, Feria, Inversionista, Visita, Precalificación), el tema de color y el proyecto.',
        tip: 'El slug se genera automáticamente del título, pero puedes personalizarlo.',
        link: '/formularios',
        linkLabel: 'Ver Formularios',
      },
      {
        num: '02',
        title: 'Obtener el QR',
        desc: 'Haz clic en el ícono 🔲 en la tarjeta del formulario. Aparece el código QR junto con el enlace directo. Descarga el QR en PNG para imprimirlo.',
        tip: 'El QR apunta a tu dominio + /forms/nombre-del-formulario',
      },
      {
        num: '03',
        title: 'Ver los envíos',
        desc: 'Cada formulario muestra el contador de envíos. Los leads captados aparecen en el CRM con la fuente marcada y asignados automáticamente a un asesor.',
        tip: 'Para ferias: crea un formulario tipo "FERIA" con tema naranja, imprime el QR grande y ponlo en el stand.',
      },
    ],
  },
  {
    id: 'secuencias',
    icon: '🔄',
    title: 'Secuencias Automáticas',
    color: 'purple',
    steps: [
      {
        num: '01',
        title: 'Qué son las secuencias',
        desc: 'Una secuencia es un flujo automático de acciones a lo largo de los días. Ej: Día 0 → notificar al asesor, Día 1 → enviar WhatsApp, Día 3 → recordatorio.',
        tip: 'Las secuencias se activan automáticamente cuando entra un nuevo lead (o según el trigger configurado).',
        link: '/secuencias',
        linkLabel: 'Ver Secuencias',
      },
      {
        num: '02',
        title: 'Crear una secuencia',
        desc: 'Haz clic en "+ Nueva secuencia". Define el trigger (nuevo lead, cambio de etapa, manual), los filtros (temperatura, etapa) y agrega los pasos con sus días.',
        tip: 'Tipos de pasos: Notificación interna, WhatsApp template, Crear tarea, Cambiar temperatura.',
      },
      {
        num: '03',
        title: 'Ejecutar secuencias',
        desc: 'Haz clic en "▶ Ejecutar ahora" para procesar todos los pasos pendientes inmediatamente. Normalmente se ejecutan automáticamente cada cierto tiempo.',
        tip: 'Puedes enrolar manualmente un lead en una secuencia desde su ficha.',
      },
    ],
  },
  {
    id: 'reservas',
    icon: '📝',
    title: 'Reservas y Portal del Cliente',
    color: 'indigo',
    steps: [
      {
        num: '01',
        title: 'Crear una reserva',
        desc: 'Cuando un lead llega a Negociación o Ganado, aparece el botón "🏆 Crear Reserva" en su ficha. Completa unidad, precio, fechas y documentos requeridos.',
        tip: 'Las reservas tienen etapas: Reserva → Promesa → Escritura → Entregado.',
        link: '/reservas',
        linkLabel: 'Ver Reservas',
      },
      {
        num: '02',
        title: 'Portal del cliente',
        desc: 'En la lista de reservas, cada fila tiene el botón "🔗 Portal". Al hacer clic, copia un enlace único. Envíaselo al cliente para que vea el progreso de su compra.',
        tip: 'El portal muestra: etapa actual, fechas clave (promesa, escritura, entrega) y documentos pendientes.',
      },
      {
        num: '03',
        title: 'Documentos de la reserva',
        desc: 'Cada reserva puede tener documentos asociados: Reserva firmada, Promesa, Escritura, Contrato hipotecario. Marca su estado (Pendiente, Enviado, Firmado).',
        tip: 'Los documentos con estado pendiente se muestran en el portal del cliente como tareas a completar.',
      },
    ],
  },
  {
    id: 'tareas',
    icon: '✅',
    title: 'Tareas y Calendario',
    color: 'amber',
    steps: [
      {
        num: '01',
        title: 'Crear una tarea',
        desc: 'Ve a Tareas → "+ Nueva tarea". Asigna tipo (llamada, visita, reunión), prioridad (Alta/Normal/Baja), fecha, asesor y lead relacionado.',
        tip: 'Las tareas vencidas aparecen en rojo. El dashboard muestra las urgentes de la semana.',
        link: '/tareas',
        linkLabel: 'Ver Tareas',
      },
      {
        num: '02',
        title: 'Completar tareas',
        desc: 'Marca la casilla ☑️ al lado de cada tarea para marcarla como completada. Puedes filtrar por pendientes, completadas, prioridad y asesor.',
        tip: 'Las tareas vinculadas a un lead también aparecen en el historial del lead.',
      },
      {
        num: '03',
        title: 'Calendario del equipo',
        desc: 'El Calendario muestra todas las actividades agendadas del equipo en vista mensual. Puedes filtrar por asesor y ver visitas, llamadas y reuniones.',
        tip: 'Al agendar una visita desde un lead, aparece automáticamente en el calendario.',
        link: '/calendar',
        linkLabel: 'Ver Calendario',
      },
    ],
  },
]

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  badge: 'bg-blue-600' },
  cyan:   { bg: 'bg-cyan-50',   text: 'text-cyan-700',   border: 'border-cyan-200',  badge: 'bg-cyan-600' },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200', badge: 'bg-green-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200',badge: 'bg-orange-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200',badge: 'bg-purple-600' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200',badge: 'bg-indigo-600' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', badge: 'bg-amber-500' },
}

function Step({ step, color }: { step: typeof SECTIONS[0]['steps'][0]; color: string }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
      <div className="flex items-start gap-4">
        <div className={`w-8 h-8 rounded-xl ${c.badge} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
          {step.num}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${c.text} mb-1`}>{step.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
          {step.tip && (
            <div className="mt-3 flex gap-2 bg-white/70 rounded-xl px-3 py-2 border border-white">
              <span className="text-base flex-shrink-0">💡</span>
              <p className="text-xs text-gray-500 leading-relaxed">{step.tip}</p>
            </div>
          )}
          {step.link && (
            <Link
              href={step.link}
              className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold ${c.text} hover:opacity-75 transition-opacity`}
            >
              {step.linkLabel} →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AyudaPage() {
  const [active, setActive] = useState('inicio')
  const [showTour, setShowTour] = useState(false)

  const currentSection = SECTIONS.find(s => s.id === active) ?? SECTIONS[0]

  function resetTour() {
    localStorage.removeItem('vm_tour_done')
    setShowTour(true)
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Centro de Ayuda</h1>
            <p className="text-sm text-gray-500 mt-0.5">Aprende a usar todas las funciones de SI CRM</p>
          </div>
          <button
            onClick={resetTour}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            🎯 Ver tour guiado
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Sidebar nav */}
        <div className="hidden md:block w-52 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-3 sticky top-6">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Secciones</p>
            <nav className="space-y-0.5">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left ${
                    active === s.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span>{s.icon}</span>
                  <span className="truncate">{s.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Mobile section picker */}
        <div className="md:hidden w-full">
          <select
            value={active}
            onChange={e => setActive(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SECTIONS.map(s => (
              <option key={s.id} value={s.id}>{s.icon} {s.title}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{currentSection.icon}</span>
              <h2 className="text-xl font-bold text-gray-900">{currentSection.title}</h2>
            </div>
          </div>

          <div className="space-y-3">
            {currentSection.steps.map(step => (
              <Step key={step.num} step={step} color={currentSection.color} />
            ))}
          </div>

          {/* Navigation between sections */}
          <div className="flex justify-between mt-6">
            {SECTIONS.findIndex(s => s.id === active) > 0 && (
              <button
                onClick={() => {
                  const idx = SECTIONS.findIndex(s => s.id === active)
                  setActive(SECTIONS[idx - 1].id)
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ← Anterior
              </button>
            )}
            <div className="flex-1" />
            {SECTIONS.findIndex(s => s.id === active) < SECTIONS.length - 1 && (
              <button
                onClick={() => {
                  const idx = SECTIONS.findIndex(s => s.id === active)
                  setActive(SECTIONS[idx + 1].id)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Siguiente sección →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick reference card at bottom */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-8">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
          <h3 className="font-bold text-lg mb-4">⌨️ Atajos de teclado</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: '⌘K / Ctrl+K', desc: 'Búsqueda global' },
              { key: '⌘+Enter', desc: 'Guardar actividad' },
              { key: 'Esc', desc: 'Cerrar modal' },
              { key: '← →', desc: 'Navegar tour' },
            ].map(s => (
              <div key={s.key} className="bg-white/10 rounded-xl p-3">
                <kbd className="text-sm font-mono font-bold text-blue-300">{s.key}</kbd>
                <p className="text-xs text-gray-300 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
