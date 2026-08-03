import { prisma } from '@/lib/db'
import ComisionesClient from '@/components/comisiones/ComisionesClient'

async function getData() {
  const [projects, agents] = await Promise.all([
    prisma.project.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.agent.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])
  return { projects, agents }
}

export default async function ComisionesPage() {
  const { projects, agents } = await getData()
  return <ComisionesClient projects={projects} agents={agents} />
}
