import { prisma } from '@/lib/db'
import CRMClient from '@/components/crm/CRMClient'

async function getLeadsData() {
  const [leads, agents, projects] = await Promise.all([
    prisma.lead.findMany({
      include: {
        project: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        activities: { orderBy: { date: 'desc' }, take: 3 },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.agent.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return { leads, agents, projects }
}

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string; projectId?: string; source?: string }>
}) {
  const params = await searchParams
  const data = await getLeadsData()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <CRMClient data={data as any} initialFilter={params} />
}
