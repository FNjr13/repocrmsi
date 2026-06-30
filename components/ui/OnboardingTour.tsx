'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STEPS = [
  {
    title: '¡Bienvenido a SI CRM! 🎉',
    emoji: '🏠',
    desc: 'Tu plataforma completa para gestión de ventas inmobiliarias. En 2 minutos aprenderás todo lo que necesitas para empezar.',
    hint: null,
    color: 'from-blue-600 to-blue-700',
  },
  {
    title: 'Dashboard — Vista general',
    emoji: '📊',
    desc: 'El dashboard muestra en tiempo real: proyectos activos, unidades vendidas/reservadas, pipeline de leads y rendimiento del equipo.',
    hint: '💡 Haz clic en cada proyecto del menú superior para ver sus métricas individuales.',
    color: 'from-violet-600 to-violet-700',
    link: '/dashboard',
  },
  {
    title: 'CRM — Gestión de Leads',
    emoji: '👥',
    desc: 'Todos tus prospectos en un tablero Kanban. Arrastra y suelta leads entre etapas, filtra por temperatura, canal o asesor, y registra actividades.',
    hint: '💡 Usa los filtros rápidos "Hot sin contactar" y "Follow-up vencido" para priorizar tu día.',
    color: 'from-blue-600 to-cyan-600',
    link: '/crm',
  },
  {
    title: 'Lead Detail — Ficha completa',
    emoji: '🧑‍💼',
    desc: 'Al hacer clic en un lead verás su historial completo, podrás registrar llamadas, visitas, WhatsApp y notas. También agendar, crear reservas y precalificar.',
    hint: '💡 La pestaña "WhatsApp" te permite chatear directamente si tienes la integración activa.',
    color: 'from-green-600 to-emerald-600',
    link: '/crm',
  },
  {
    title: 'WhatsApp Business',
    emoji: '💬',
    desc: 'Envía y recibe mensajes de WhatsApp directamente desde la plataforma. Configura tu API de Meta y empieza a comunicarte sin salir del CRM.',
    hint: '💡 Para activarlo necesitas una cuenta de Meta for Developers. Ve a WhatsApp → Guía de configuración.',
    color: 'from-green-500 to-green-700',
    link: '/whatsapp',
  },
  {
    title: 'Formularios Públicos + QR',
    emoji: '📋',
    desc: 'Crea formularios para ferias, landing pages y eventos. Cada formulario genera un código QR descargable. Los leads capturados entran directo al CRM.',
    hint: '💡 Crea un formulario tipo "FERIA" para tu próximo evento y muestra el QR en el stand.',
    color: 'from-orange-500 to-orange-700',
    link: '/formularios',
  },
  {
    title: 'Secuencias de Seguimiento',
    emoji: '🔄',
    desc: 'Automatiza el seguimiento: Día 1 notificación al asesor, Día 3 WhatsApp automático, Día 7 recordatorio. Se configuran una vez y trabajan solos.',
    hint: '💡 Crea una secuencia para leads nuevos con temperatura WARM para maximizar la conversión.',
    color: 'from-purple-600 to-purple-700',
    link: '/secuencias',
  },
  {
    title: 'Reservas & Contratos',
    emoji: '📝',
    desc: 'Cuando un lead avanza a negociación, crea una reserva. Lleva el seguimiento de promesa, escritura y entrega. Comparte el portal del cliente con un link.',
    hint: '💡 Copia el link del portal (botón 🔗) y envíaselo al cliente para que vea el avance de su proceso.',
    color: 'from-indigo-600 to-indigo-700',
    link: '/reservas',
  },
  {
    title: 'Tareas & Pendientes',
    emoji: '✅',
    desc: 'Organiza el trabajo diario del equipo. Crea tareas con prioridad, asígnalas a asesores y vincúlalas a leads específicos. El dashboard muestra las urgentes.',
    hint: '💡 Las tareas vencidas aparecen en rojo. Usa el filtro "Hoy" para ver qué hay que hacer ahora.',
    color: 'from-amber-500 to-amber-700',
    link: '/tareas',
  },
  {
    title: 'Búsqueda Global ⌘K',
    emoji: '🔍',
    desc: 'Presiona ⌘K (Mac) o Ctrl+K (Windows) desde cualquier página para buscar leads, proyectos y reservas al instante por nombre, teléfono o email.',
    hint: '💡 También puedes hacer clic en la barra de búsqueda del header.',
    color: 'from-gray-700 to-gray-900',
  },
  {
    title: '¡Todo listo para empezar! 🚀',
    emoji: '🎯',
    desc: 'Ya conoces las funciones principales. Explora cada sección con calma. Si tienes dudas, ve a Ayuda en el menú.',
    hint: null,
    color: 'from-blue-600 to-purple-600',
    link: '/crm',
    linkLabel: 'Ir al CRM →',
  },
]

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem('vm_tour_done')
    if (!done) {
      const timer = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else finish()
  }

  function prev() {
    if (step > 0) setStep(s => s - 1)
  }

  function finish() {
    localStorage.setItem('vm_tour_done', '1')
    setVisible(false)
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={finish} />

      {/* Card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Gradient header */}
        <div className={`bg-gradient-to-br ${current.color} px-6 pt-8 pb-6 text-white`}>
          <div className="text-5xl mb-3">{current.emoji}</div>
          <h2 className="text-xl font-bold leading-tight">{current.title}</h2>
          <p className="text-xs text-white/70 mt-1">{step + 1} de {STEPS.length}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <p className="text-gray-700 text-sm leading-relaxed">{current.desc}</p>

          {current.hint && (
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-blue-700 text-xs leading-relaxed">{current.hint}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center gap-3">
          {!isFirst && (
            <button
              onClick={prev}
              className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              ← Anterior
            </button>
          )}

          <div className="flex-1" />

          <button
            onClick={finish}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Saltar tour
          </button>

          {isLast && current.link ? (
            <Link
              href={current.link}
              onClick={finish}
              className={`px-5 py-2.5 bg-gradient-to-r ${current.color} text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm`}
            >
              {current.linkLabel ?? 'Empezar'}
            </Link>
          ) : (
            <button
              onClick={next}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              {isLast ? '¡Listo!' : 'Siguiente →'}
            </button>
          )}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pb-5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-200 ${
                i === step ? 'w-5 h-2 bg-blue-500' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
