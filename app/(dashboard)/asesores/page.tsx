import { prisma } from '@/lib/db'
import AsesoresClient from '@/components/asesores/AsesoresClient'

async function getAsesoresData() {
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    include: {
      leads: {
        include: {
          project: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return agents.map(agent => {
    const totalLeads = agent.leads.length
    const wonLeads = agent.leads.filter(l => l.stage === 'GANADO').length
    const activeLeads = agent.leads.filter(l => !['GANADO', 'PERDIDO'].includes(l.stage)).length
    const lostLeads = agent.leads.filter(l => l.stage === 'PERDIDO').length
    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100) : 0

    // Leads por etapa
    const byStage = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'VISITA', 'NEGOCIACION', 'GANADO', 'PERDIDO'].reduce((acc, stage) => {
      acc[stage] = agent.leads.filter(l => l.stage === stage).length
      return acc
    }, {} as Record<string, number>)

    // Leads por proyecto
    const byProject: Record<string, number> = {}
    agent.leads.forEach(lead => {
      if (lead.project) {
        byProject[lead.project.name] = (byProject[lead.project.name] || 0) + 1
      }
    })

    return {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      role: agent.role,
      hasPassword: !!agent.passwordHash,
      totalLeads,
      wonLeads,
      activeLeads,
      lostLeads,
      conversionRate,
      byStage,
      byProject,
    }
  })
}

export default async function AsesoresPage() {
  const asesores = await getAsesoresData()
  return <AsesoresClient asesores={asesores} />
}
