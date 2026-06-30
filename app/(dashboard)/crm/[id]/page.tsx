import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import LeadDetailClient from '@/components/crm/LeadDetailClient'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [lead, agents, projects] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        project: true,
        agent: true,
        activities: { orderBy: { date: 'desc' } },
        events: {
          orderBy: { date: 'asc' },
          include: { agent: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.agent.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, status: true },
    }),
  ])

  if (!lead) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <LeadDetailClient lead={lead as any} agents={agents} projects={projects} />
}
