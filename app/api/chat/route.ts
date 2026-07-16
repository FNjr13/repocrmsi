import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function buildCRMContext(agentId?: string) {
  const now = new Date()
  const todayStart = today()
  const in7Days = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [projects, agents, leadsByStage, overdueFollowUps, upcomingEvents, recentActivities, openReservations, piLeads] = await Promise.all([
    // Projects
    prisma.project.findMany({
      select: { name: true, location: true, status: true, totalUnits: true, soldUnits: true, reservedUnits: true, availableUnits: true, type: true },
      orderBy: { name: 'asc' },
    }),

    // Agents
    prisma.agent.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true, department: true },
    }),

    // Leads grouped by stage + project
    prisma.lead.groupBy({
      by: ['stage', 'projectId'],
      _count: { id: true },
    }),

    // Overdue follow-ups
    prisma.lead.findMany({
      where: {
        followUpDate: { lt: now },
        stage: { notIn: ['GANADO', 'PERDIDO', 'PI'] },
        ...(agentId ? { agentId } : {}),
      },
      select: {
        firstName: true, lastName: true, phone: true, stage: true, followUpDate: true,
        agent: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { followUpDate: 'asc' },
      take: 30,
    }),

    // Upcoming calendar events (next 7 days)
    prisma.calendarEvent.findMany({
      where: {
        date: { gte: todayStart, lte: in7Days },
        status: { not: 'CANCELADO' },
        ...(agentId ? { agentId } : {}),
      },
      select: {
        title: true, type: true, date: true, status: true,
        agent: { select: { name: true } },
        lead: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
      take: 30,
    }),

    // Recent activities (last 48h)
    prisma.activity.findMany({
      where: { date: { gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) } },
      include: {
        lead: {
          select: {
            firstName: true, lastName: true,
            agent: { select: { name: true } },
            project: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 20,
    }),

    // Open reservations
    prisma.reservation.findMany({
      where: { stage: { notIn: ['ESCRITURA', 'ENTREGADO', 'CAIDA'] } },
      include: {
        lead: { select: { firstName: true, lastName: true } },
        agent: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),

    // PI leads
    prisma.lead.findMany({
      where: { stage: 'PI' },
      select: {
        firstName: true, lastName: true, budget: true,
        agent: { select: { name: true } },
        project: { select: { name: true } },
      },
      take: 30,
    }),
  ])

  // Build project name lookup
  const projectNames: Record<string, string> = {}
  projects.forEach(p => { projectNames[(p as unknown as {id: string}).id] = p.name })

  // Leads by stage summary
  const stageMap: Record<string, Record<string, number>> = {}
  leadsByStage.forEach(r => {
    const proj = r.projectId ? (projectNames[r.projectId] || r.projectId) : 'Sin proyecto'
    if (!stageMap[r.stage]) stageMap[r.stage] = {}
    stageMap[r.stage][proj] = (stageMap[r.stage][proj] || 0) + r._count.id
  })

  const formatDate = (d: Date) => d.toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const lines: string[] = [
    `=== FECHA Y HORA ACTUAL: ${now.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ${now.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })} ===`,
    '',
    '--- PROYECTOS ---',
    ...projects.map(p =>
      `• ${p.name} (${p.location}) — ${p.status} | ${p.totalUnits} ${p.type === 'CASAS' ? 'lotes' : 'unidades'}: ${p.soldUnits} vendidas, ${p.reservedUnits} reservadas, ${p.availableUnits} disponibles`
    ),
    '',
    '--- PIPELINE DE LEADS POR ETAPA ---',
    ...Object.entries(stageMap).map(([stage, byProj]) =>
      `• ${stage}: ${Object.entries(byProj).map(([proj, count]) => `${count} en ${proj}`).join(', ')}`
    ),
    '',
    '--- SEGUIMIENTOS ATRASADOS (followUpDate vencida) ---',
    overdueFollowUps.length === 0 ? '• Ninguno' :
      overdueFollowUps.map(l =>
        `• ${l.firstName} ${l.lastName} | ${l.project?.name || 'sin proyecto'} | Etapa: ${l.stage} | Asesor: ${l.agent?.name || '—'} | Vencía: ${l.followUpDate ? formatDate(l.followUpDate) : '—'}`
      ).join('\n'),
    '',
    '--- CITAS Y TAREAS PRÓXIMAS (7 días) ---',
    upcomingEvents.length === 0 ? '• Ninguna' :
      upcomingEvents.map(e =>
        `• [${formatDate(e.date)}] ${e.title} (${e.type}) — ${e.agent?.name || '—'}${e.lead ? ` | Lead: ${e.lead.firstName} ${e.lead.lastName}` : ''}${e.project ? ` | Proyecto: ${e.project.name}` : ''} | Estado: ${e.status}`
      ).join('\n'),
    '',
    '--- ACTIVIDAD RECIENTE (últimas 48h) ---',
    recentActivities.length === 0 ? '• Sin actividad' :
      recentActivities.map(a =>
        `• ${formatDate(a.date)} | ${a.type}: ${a.description.slice(0, 80)} — Lead: ${a.lead.firstName} ${a.lead.lastName} | Asesor: ${a.lead.agent?.name || '—'} | Proyecto: ${a.lead.project?.name || '—'}`
      ).join('\n'),
    '',
    '--- RESERVAS ACTIVAS ---',
    openReservations.length === 0 ? '• Ninguna' :
      openReservations.map(r =>
        `• ${r.lead.firstName} ${r.lead.lastName} | ${r.project?.name || '—'} | Etapa: ${r.stage} | Asesor: ${r.agent?.name || '—'} | Precio: $${r.price.toLocaleString()}`
      ).join('\n'),
    '',
    '--- LEADS P.I. (Presupuesto Insuficiente) ---',
    piLeads.length === 0 ? '• Ninguno' :
      piLeads.map(l =>
        `• ${l.firstName} ${l.lastName} | ${l.project?.name || '—'} | Asesor: ${l.agent?.name || '—'}${l.budget ? ` | Presupuesto: $${l.budget.toLocaleString()}` : ''}`
      ).join('\n'),
    '',
    '--- EQUIPO ---',
    ...agents.map(a => `• ${a.name} (${a.role}, ${a.department})`),
  ]

  return lines.join('\n')
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'NO_API_KEY' }, { status: 503 })
  }

  const { message, history = [] }: { message: string; history: Message[] } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })

  const crmContext = await buildCRMContext()

  const systemPrompt = `Eres el asistente IA del CRM de SI Inmobiliaria (Panama). Tienes acceso completo y en tiempo real a la data del CRM.

Tu trabajo es ayudar al equipo de ventas a:
- Dar resúmenes del pipeline, proyectos y rendimiento por asesor
- Alertar sobre seguimientos atrasados y contactos olvidados
- Recordar citas y tareas próximas
- Responder preguntas sobre leads, proyectos, reservas y actividades
- Identificar oportunidades: leads calientes sin contactar, PI que podrían reactivarse, etc.
- Dar insights útiles del negocio

Reglas:
- Responde siempre en español, de forma concisa y directa
- Usa emojis con moderación para organizar la respuesta
- Cuando menciones nombres de leads o asesores, usa negritas (**)
- Si hay seguimientos atrasados, siempre menciónalo aunque no te pregunten
- Sé proactivo: si ves algo importante en los datos, señálalo
- Si no tienes datos suficientes para responder algo específico, dilo claramente
- Las fechas y montos deben estar en formato legible

DATA ACTUAL DEL CRM:
${crmContext}`

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history.slice(-10),
    { role: 'user', content: message },
  ]

  // Groq API (OpenAI-compatible, completamente gratis)
  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  })

  if (!groqRes.ok) {
    const err = await groqRes.text()
    console.error('Groq error:', err)
    return NextResponse.json({ error: 'Error del proveedor de IA' }, { status: 502 })
  }

  const data = await groqRes.json() as { choices: Array<{ message: { content: string } }> }
  const text = data.choices?.[0]?.message?.content ?? ''
  return NextResponse.json({ reply: text })
}
