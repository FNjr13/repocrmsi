import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPrice(value: number, currency: string = 'USD'): string {
  const num = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

  switch (currency) {
    case 'UF': return `UF ${num}`
    case 'CLP': return `$${num} CLP`
    case 'EUR': return `€${num}`
    case 'USD':
    default: return `$${num}`
  }
}

export function formatUF(value: number): string {
  return `UF ${new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)}`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CL').format(value)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Hace menos de 1 hora'
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
  return formatDate(date)
}

export const STAGE_CONFIG = {
  NUEVO: { label: 'Nuevo', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  CONTACTADO: { label: 'Contactado', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  INTERESADO: { label: 'Interesado', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  VISITA: { label: 'Visita agendada', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  NEGOCIACION: { label: 'Negociación', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  GANADO: { label: 'Ganado ✓', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  PERDIDO: { label: 'Perdido', color: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
} as const

export const SOURCE_CONFIG = {
  META: { label: 'Meta Ads', color: 'bg-blue-500', icon: '📘' },
  GOOGLE: { label: 'Google Ads', color: 'bg-red-500', icon: '🔍' },
  WHATSAPP: { label: 'WhatsApp', color: 'bg-green-500', icon: '💬' },
  WEB: { label: 'Web', color: 'bg-purple-500', icon: '🌐' },
  REFERIDO: { label: 'Referido', color: 'bg-yellow-500', icon: '👥' },
  OTRO: { label: 'Otro', color: 'bg-gray-500', icon: '📌' },
} as const

export const PROJECT_TYPE_CONFIG = {
  DEPARTAMENTOS: { label: 'Departamentos', icon: '🏢' },
  CASAS: { label: 'Casas', icon: '🏠' },
  OFICINAS: { label: 'Oficinas', icon: '🏛️' },
  MIXTO: { label: 'Mixto', icon: '🏗️' },
} as const

export const STATUS_CONFIG = {
  ACTIVO: { label: 'En venta', color: 'bg-green-100 text-green-700' },
  EN_CONSTRUCCION: { label: 'En venta', color: 'bg-green-100 text-green-700' },
  PREVENTA: { label: 'Pre venta', color: 'bg-violet-100 text-violet-700' },
  ENTREGADO: { label: 'Entregado', color: 'bg-gray-100 text-gray-700' },
} as const
