'use client'

import { useState } from 'react'
import FormulariosClient from './FormulariosClient'
import ReservationFormsClient from './ReservationFormsClient'
import type { ReservationForm, FormSection } from './ReservationFormsClient'

interface PublicForm {
  id: string; slug: string; title: string; subtitle: string | null
  type: string; isActive: boolean; submitCount: number; theme: string
  projectId: string | null; createdAt: string; updatedAt: string
}
interface Project { id: string; name: string }

export default function FormulariosTabLayout({
  publicForms,
  reservationForms,
  projects,
}: {
  publicForms: PublicForm[]
  reservationForms: (Omit<ReservationForm, 'sections'> & { sections: FormSection[] })[]
  projects: Project[]
}) {
  const [tab, setTab] = useState<'captura' | 'reserva'>('captura')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Formularios</h1>

        {/* Tabs */}
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          <button
            onClick={() => setTab('captura')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'captura'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}>
            📋 Formularios de Captura
          </button>
          <button
            onClick={() => setTab('reserva')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'reserva'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}>
            📄 Formularios de Reserva
          </button>
        </div>
      </div>

      {tab === 'captura' && (
        <FormulariosClient initialForms={publicForms} projects={projects} embedded />
      )}
      {tab === 'reserva' && (
        <ReservationFormsClient initialForms={reservationForms} projects={projects} />
      )}
    </div>
  )
}
