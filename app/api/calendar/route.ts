import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { notify } from '@/lib/notifications'

const EVENT_ICON: Record<string, string> = {
  LLAMADA: '📞', VISITA: '🏠', REUNION: '🤝', TAREA: '✅', CIERRE: '🔑', OTRO: '📅',
}
const EVENT_LABEL: Record<string, string> = {
  LLAMADA: 'Llamada', VISITA: 'Visita', REUNION: 'Reunión',
  TAREA: 'Tarea', CIERRE: 'Cierre', OTRO: 'Evento',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 30*24*60*60*1000)
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date(Date.now() + 30*24*60*60*1000)
  const agentId = searchParams.get('agentId')

  const where: { date: { gte: Date; lte: Date }; agentId?: string } = { date: { gte: from, lte: to } }
  if (agentId) where.agentId = agentId

  const events = await prisma.calendarEvent.findMany({
    where,
    include: {
      agent: { select: { id: true, name: true } },
      lead: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const event = await prisma.calendarEvent.create({
    data: {
      title: body.title,
      description: body.description || null,
      type: body.type || 'TAREA',
      date: new Date(body.date),
      endDate: body.endDate ? new Date(body.endDate) : null,
      allDay: body.allDay ?? false,
      status: body.status || 'PENDIENTE',
      priority: body.priority || 'NORMAL',
      agentId: body.agentId || null,
      leadId: body.leadId || null,
      projectId: body.projectId || null,
    },
    include: {
      agent: { select: { id: true, name: true } },
      lead: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true } },
    },
  })
  // ── Notificación al agente asignado ──────────────────────────────────────
  if (event.agentId) {
    const icon    = EVENT_ICON[event.type]  || '📅'
    const label   = EVENT_LABEL[event.type] || 'Evento'
    const dateStr = new Date(event.date).toLocaleDateString('es-PA', {
      weekday: 'short', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    })
    const leadPart = event.lead
      ? ` · ${event.lead.firstName} ${event.lead.lastName}`
      : ''
    await notify({
      type:    'TASK_ASSIGNED',
      title:   `${icon} ${label}: ${event.title}`,
      message: `${dateStr}${leadPart}`,
      agentId: event.agentId,
      leadId:  event.leadId || null,
    })
  }

  return NextResponse.json(event, { status: 201 })
}
