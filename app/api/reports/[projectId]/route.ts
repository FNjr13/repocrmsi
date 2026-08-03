import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date()
  to.setHours(23, 59, 59, 999)

  const [project, leadsInPeriod, activitiesInPeriod, allLeads, reservations] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        campaigns: true,
        brokers: true,
      },
    }),
    prisma.lead.findMany({
      where: {
        projectId,
        createdAt: { gte: from, lte: to },
      },
      include: {
        agent: { select: { id: true, name: true } },
        activities: { orderBy: { date: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.activity.findMany({
      where: {
        date: { gte: from, lte: to },
        lead: { projectId },
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, agentId: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.lead.findMany({
      where: { projectId },
      include: { agent: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.reservation.findMany({
      where: { projectId, reserveDate: { gte: from, lte: to } },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        agent: { select: { id: true, name: true } },
      },
      orderBy: { reserveDate: 'desc' },
    }),
  ])

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // === LEADS DEL PERÍODO ===
  const totalLeads = leadsInPeriod.length
  const wonLeads = leadsInPeriod.filter(l => l.stage === 'GANADO').length
  const lostLeads = leadsInPeriod.filter(l => l.stage === 'PERDIDO').length
  const activeLeads = leadsInPeriod.filter(l => !['GANADO', 'PERDIDO'].includes(l.stage)).length
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0

  // Por fuente
  const bySource: Record<string, number> = {}
  leadsInPeriod.forEach(l => { bySource[l.source] = (bySource[l.source] || 0) + 1 })

  // Por etapa (período)
  const byStage: Record<string, number> = {}
  leadsInPeriod.forEach(l => { byStage[l.stage] = (byStage[l.stage] || 0) + 1 })

  // Por temperatura (período)
  const byTemperature: Record<string, number> = {}
  leadsInPeriod.forEach(l => {
    const temp = l.temperature ?? 'NORMAL'
    byTemperature[temp] = (byTemperature[temp] || 0) + 1
  })

  // === ACTIVIDADES DEL PERÍODO ===
  const totalActivities = activitiesInPeriod.length
  const byActivityType: Record<string, number> = {}
  activitiesInPeriod.forEach(a => { byActivityType[a.type] = (byActivityType[a.type] || 0) + 1 })

  // === POR ASESORA ===
  const agents = await prisma.agent.findMany({ where: { isActive: true } })
  const byAgent = agents.map(agent => {
    const agentLeads = leadsInPeriod.filter(l => l.agentId === agent.id)
    const agentActivities = activitiesInPeriod.filter(a => a.lead.agentId === agent.id)
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      department: (agent as { department?: string }).department ?? 'VENTAS',
      leads: agentLeads.length,
      won: agentLeads.filter(l => l.stage === 'GANADO').length,
      lost: agentLeads.filter(l => l.stage === 'PERDIDO').length,
      active: agentLeads.filter(l => !['GANADO', 'PERDIDO'].includes(l.stage)).length,
      activities: agentActivities.length,
      conversionRate: agentLeads.length > 0 ? Math.round((agentLeads.filter(l => l.stage === 'GANADO').length / agentLeads.length) * 100) : 0,
    }
  })

  // === CAMPAÑAS ACTIVAS EN EL PERÍODO ===
  const campaignsInPeriod = project.campaigns.filter(c => {
    const start = new Date(c.startDate)
    const end = c.endDate ? new Date(c.endDate) : new Date()
    return start <= to && end >= from
  })

  // === LEADS RECIENTES CON ACTIVIDAD ===
  const recentLeads = leadsInPeriod.slice(0, 30).map(l => ({
    id: l.id,
    name: `${l.firstName} ${l.lastName}`,
    source: l.source,
    stage: l.stage,
    temperature: l.temperature ?? null,
    followUpDate: l.followUpDate ? l.followUpDate.toISOString() : null,
    agent: l.agent?.name ?? null,
    createdAt: l.createdAt,
    activitiesCount: l.activities.filter(a => a.date >= from && a.date <= to).length,
  }))

  // === PIPELINE GENERAL DEL PROYECTO (todos los leads) ===
  const pipelineAll: Record<string, number> = {}
  allLeads.forEach(l => { pipelineAll[l.stage] = (pipelineAll[l.stage] || 0) + 1 })

  // === TEMPERATURA DE TODOS LOS LEADS ACTIVOS ===
  const activeAllLeads = allLeads.filter(l => !['GANADO', 'PERDIDO'].includes(l.stage))
  const allLeadsByTemperature: Record<string, number> = { HOT: 0, WARM: 0, NORMAL: 0, COLD: 0 }
  activeAllLeads.forEach(l => {
    const temp = l.temperature ?? 'NORMAL'
    allLeadsByTemperature[temp] = (allLeadsByTemperature[temp] || 0) + 1
  })

  // === PRÓXIMOS A CERRAR ===
  const TEMP_ORDER: Record<string, number> = { HOT: 0, WARM: 1, NORMAL: 2, COLD: 3 }
  const proximosACerrar = activeAllLeads
    .filter(l => {
      const temp = l.temperature ?? 'NORMAL'
      return l.stage === 'NEGOCIACION' || temp === 'HOT' || temp === 'WARM'
    })
    .map(l => ({
      id: l.id,
      name: `${l.firstName} ${l.lastName}`,
      stage: l.stage,
      temperature: l.temperature ?? null,
      followUpDate: l.followUpDate ? l.followUpDate.toISOString() : null,
      agent: l.agent?.name ?? null,
      budget: (l as { budget?: number | null }).budget ?? null,
    }))
    .sort((a, b) => {
      const tA = TEMP_ORDER[a.temperature ?? 'NORMAL'] ?? 2
      const tB = TEMP_ORDER[b.temperature ?? 'NORMAL'] ?? 2
      if (tA !== tB) return tA - tB
      if (a.followUpDate && b.followUpDate) return new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime()
      if (a.followUpDate) return -1
      if (b.followUpDate) return 1
      return 0
    })
    .slice(0, 25)

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      location: project.location,
      status: project.status,
      totalUnits: project.totalUnits,
      soldUnits: project.soldUnits,
      reservedUnits: project.reservedUnits,
      availableUnits: project.availableUnits,
      progress: project.progress,
      currency: project.currency,
      priceMin: project.priceMin,
      priceMax: project.priceMax,
    },
    period: { from: from.toISOString(), to: to.toISOString() },
    summary: { totalLeads, wonLeads, lostLeads, activeLeads, conversionRate, totalActivities },
    bySource,
    byStage,
    byTemperature,
    byActivityType,
    byAgent,
    campaignsInPeriod: campaignsInPeriod.map(c => ({
      id: c.id, name: c.name, channel: c.channel, status: c.status,
      budget: c.budget, spent: c.spent, leads: c.leads, clicks: c.clicks,
      impressions: c.impressions, conversions: c.conversions,
    })),
    recentLeads,
    pipelineAll,
    allLeadsByTemperature,
    proximosACerrar,
    brokers: project.brokers,
    reservations: reservations.map(r => ({
      id: r.id,
      unitNumber: r.unitNumber,
      unitType: r.unitType,
      floor: r.floor,
      area: r.area,
      price: r.price,
      currency: r.currency,
      stage: r.stage,
      reserveDate: r.reserveDate,
      clientName: `${r.lead.firstName} ${r.lead.lastName}`,
      agentName: r.agent?.name ?? null,
      commissionPct: r.commissionPct,
      commissionAmount: r.price * r.commissionPct / 100,
      commissionStatus: r.commissionStatus,
    })),
    generatedAt: new Date().toISOString(),
  })
}
