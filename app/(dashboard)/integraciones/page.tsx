import { prisma } from '@/lib/db'
import IntegracionesClient from '@/components/integraciones/IntegracionesClient'

export const dynamic = 'force-dynamic'

export default async function IntegracionesPage() {
  const [logs, projects, agents] = await Promise.all([
    prisma.webhookLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.project.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.agent.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const serializedLogs = logs.map(l => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }))

  return (
    <IntegracionesClient
      initialLogs={serializedLogs}
      projects={projects}
      agents={agents}
    />
  )
}
