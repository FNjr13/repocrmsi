import { prisma } from '@/lib/db'
import CalendarClient from '@/components/calendar/CalendarClient'

export default async function CalendarPage() {
  const [agents, projects, leads] = await Promise.all([
    prisma.agent.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, firstName: true, lastName: true } }),
  ])
  return <CalendarClient agents={agents} projects={projects} leads={leads} />
}
