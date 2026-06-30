import { prisma } from '@/lib/db'
import DashboardClient from '@/components/dashboard/DashboardClient'

async function getDashboardData() {
  const [
    totalLeads,
    leadsThisMonth,
    wonLeadsThisMonth,
    activeProjects,
    campaignStats,
    leadsByStage,
    leadsBySource,
    recentLeads,
    projects,
    agents,
    reservationStats,
    unreadNotifications,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({
      where: {
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.lead.count({
      where: { stage: 'GANADO' },
    }),
    prisma.project.count({ where: { status: { not: 'ENTREGADO' } } }),
    prisma.campaign.aggregate({
      where: { status: 'ACTIVA' },
      _sum: { budget: true, spent: true, leads: true, clicks: true, impressions: true, conversions: true },
    }),
    prisma.lead.groupBy({ by: ['stage'], _count: { stage: true } }),
    prisma.lead.groupBy({ by: ['source'], _count: { source: true } }),
    prisma.lead.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { name: true } },
        agent: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, status: true, progress: true,
        totalUnits: true, availableUnits: true, soldUnits: true, reservedUnits: true,
        priceMin: true, priceMax: true, type: true, location: true, currency: true,
        deliveryDate: true,
      },
    }),
    prisma.agent.findMany({
      where: { isActive: true },
      include: { leads: { select: { stage: true } } },
    }),
    prisma.reservation.aggregate({
      where: { stage: { not: 'CAIDA' } },
      _count: { id: true },
      _sum: { price: true },
    }),
    prisma.notification.count({ where: { isRead: false } }),
  ])

  // Monthly trend (last 6 months)
  const now = new Date()
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const [leadsCount, wonCount] = await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
      prisma.lead.count({ where: { stage: 'GANADO', updatedAt: { gte: monthStart, lte: monthEnd } } }),
    ])
    monthlyData.push({
      month: monthStart.toLocaleDateString('es-CL', { month: 'short' }),
      leads: leadsCount,
      ventas: wonCount,
    })
  }

  return {
    stats: {
      totalLeads,
      leadsThisMonth,
      wonLeadsThisMonth,
      activeProjects,
      totalBudget: campaignStats._sum.budget || 0,
      totalSpent: campaignStats._sum.spent || 0,
      totalCampaignLeads: campaignStats._sum.leads || 0,
      totalClicks: campaignStats._sum.clicks || 0,
      totalImpressions: campaignStats._sum.impressions || 0,
      totalConversions: campaignStats._sum.conversions || 0,
      activeReservations: reservationStats._count.id || 0,
      reservationVolume: reservationStats._sum.price || 0,
      unreadNotifications,
    },
    leadsByStage,
    leadsBySource,
    recentLeads,
    projects: projects.map(p => ({
      ...p,
      deliveryDate: p.deliveryDate ? p.deliveryDate.toISOString() : null,
    })),
    monthlyData,
    agentStats: agents.map(a => ({
      id: a.id, name: a.name,
      total: a.leads.length,
      won: a.leads.filter((l: { stage: string }) => l.stage === 'GANADO').length,
      active: a.leads.filter((l: { stage: string }) => !['GANADO', 'PERDIDO'].includes(l.stage)).length,
    })),
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  return <DashboardClient data={data} />
}
