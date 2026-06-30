import { prisma } from '@/lib/db'
import TareasClient from '@/components/tareas/TareasClient'

export const dynamic = 'force-dynamic'

export default async function TareasPage() {
  const [events, agents, leads, projects] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: {
        agent: { select: { id: true, name: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.agent.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.lead.findMany({
      where: { stage: { notIn: ['GANADO', 'PERDIDO'] } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
      take: 200,
    }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  const serialized = events.map(e => ({
    ...e,
    date: e.date.toISOString(),
    endDate: e.endDate ? e.endDate.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }))

  return (
    <TareasClient
      initialTasks={serialized}
      agents={agents}
      leads={leads}
      projects={projects}
    />
  )
}
