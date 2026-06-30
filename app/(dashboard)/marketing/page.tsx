import { prisma } from '@/lib/db'
import MarketingClient from '@/components/marketing/MarketingClient'

async function getMarketingData() {
  const [campaigns, leads] = await Promise.all([
    prisma.campaign.findMany({
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lead.groupBy({
      by: ['source'],
      _count: { source: true },
    }),
  ])

  const channelStats = await Promise.all(
    ['META', 'GOOGLE', 'WHATSAPP', 'WEB', 'REFERIDO'].map(async (channel) => {
      const [totalLeads, wonLeads, campStats] = await Promise.all([
        prisma.lead.count({ where: { source: channel } }),
        prisma.lead.count({ where: { source: channel, stage: 'GANADO' } }),
        prisma.campaign.aggregate({
          where: { channel, status: { not: 'FINALIZADA' } },
          _sum: { budget: true, spent: true, impressions: true, clicks: true, leads: true },
        }),
      ])
      return {
        channel,
        totalLeads,
        wonLeads,
        budget: campStats._sum.budget || 0,
        spent: campStats._sum.spent || 0,
        impressions: campStats._sum.impressions || 0,
        clicks: campStats._sum.clicks || 0,
        campaignLeads: campStats._sum.leads || 0,
      }
    })
  )

  return { campaigns, leads, channelStats }
}

export default async function MarketingPage() {
  const data = await getMarketingData()
  return <MarketingClient data={data} />
}
