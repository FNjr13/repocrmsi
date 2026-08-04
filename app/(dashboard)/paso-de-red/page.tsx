import { prisma } from '@/lib/db'
import PasoDeRedClient from '@/components/paso-de-red/PasoDeRedClient'

async function getData() {
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  return { agents }
}

export default async function PasoDeRedPage() {
  const { agents } = await getData()
  return <PasoDeRedClient agents={agents} />
}
