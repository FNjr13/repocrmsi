import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const where = projectId ? { projectId } : {}
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalLeads, leadsThisMonth, wonLeads, leadsByStage, leadsBySource, recentLeads, agents] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, createdAt: { gte: monthStart } } }),
    prisma.lead.count({ where: { ...where, stage: 'GANADO' } }),
    prisma.lead.groupBy({ by: ['stage'], where, _count: { stage: true } }),
    prisma.lead.groupBy({ by: ['source'], where, _count: { source: true } }),
    prisma.lead.findMany({ where, take: 8, orderBy: { createdAt: 'desc' }, include: { project: { select: { name: true } }, agent: { select: { name: true } } } }),
    prisma.agent.findMany({ where: { isActive: true }, include: { leads: { where, select: { stage: true } } } }),
  ])

  const campaignWhere = projectId ? { projectId } : {}
  const campaigns = await prisma.campaign.findMany({ where: campaignWhere, orderBy: { startDate: 'desc' } })
  const campaignStats = campaigns.reduce((acc, c) => ({
    budget: acc.budget + c.budget, spent: acc.spent + c.spent,
    leads: acc.leads + c.leads, clicks: acc.clicks + c.clicks,
    impressions: acc.impressions + c.impressions, conversions: acc.conversions + c.conversions,
  }), { budget: 0, spent: 0, leads: 0, clicks: 0, impressions: 0, conversions: 0 })

  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const [lc, wc] = await Promise.all([
      prisma.lead.count({ where: { ...where, createdAt: { gte: mStart, lte: mEnd } } }),
      prisma.lead.count({ where: { ...where, stage: 'GANADO', updatedAt: { gte: mStart, lte: mEnd } } }),
    ])
    monthlyData.push({ month: mStart.toLocaleDateString('es-CL', { month: 'short' }), leads: lc, ventas: wc })
  }

  return NextResponse.json({
    stats: { totalLeads, leadsThisMonth, wonLeads, ...campaignStats },
    leadsByStage, leadsBySource, recentLeads, campaigns, monthlyData,
    agentStats: agents.map(a => ({
      id: a.id, name: a.name,
      total: a.leads.length,
      won: a.leads.filter(l => l.stage === 'GANADO').length,
      active: a.leads.filter(l => !['GANADO','PERDIDO'].includes(l.stage)).length,
      lost: a.leads.filter(l => l.stage === 'PERDIDO').length,
    })),
  })
}
