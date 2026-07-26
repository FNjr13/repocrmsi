import { prisma } from '@/lib/db'
import NotifAdminClient from '@/components/admin/NotifAdminClient'

async function getAgents() {
  return prisma.agent.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true, department: true },
    orderBy: { name: 'asc' },
  })
}

export default async function NotificacionesAdminPage() {
  const agents = await getAgents()
  return <NotifAdminClient agents={agents} />
}
