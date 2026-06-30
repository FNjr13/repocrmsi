import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date()
  // Set to end of day
  to.setHours(23, 59, 59, 999)

  const [project, leadsInPeriod, activitiesInPeriod, allLeads] = await Promise.all([
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

  // Por etapa
  const byStage: Record<string, number> = {}
  leadsInPeriod.forEach(l => { byStage[l.stage] = (byStage[l.stage] || 0) + 1 })

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
  const recentLeads = leadsInPeriod.slice(0, 20).map(l => ({
    id: l.id,
    name: `${l.firstName} ${l.lastName}`,
    source: l.source,
    stage: l.stage,
    agent: l.agent?.name ?? null,
    createdAt: l.createdAt,
    activitiesCount: l.activities.filter(a => a.date >= from && a.date <= to).length,
  }))

  // === PIPELINE GENERAL DEL PROYECTO ===
  const pipelineAll: Record<string, number> = {}
  allLeads.forEach(l => { pipelineAll[l.stage] = (pipelineAll[l.stage] || 0) + 1 })

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
    byActivityType,
    byAgent,
    campaignsInPeriod: campaignsInPeriod.map(c => ({
      id: c.id, name: c.name, channel: c.channel, status: c.status,
      budget: c.budget, spent: c.spent, leads: c.leads, clicks: c.clicks,
      impressions: c.impressions, conversions: c.conversions,
    })),
    recentLeads,
    pipelineAll,
    brokers: project.brokers,
    generatedAt: new Date().toISOString(),
  })
}
