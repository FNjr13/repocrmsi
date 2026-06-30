import { prisma } from '@/lib/db'
import AutomatizacionesClient from '@/components/automatizaciones/AutomatizacionesClient'

export const dynamic = 'force-dynamic'

export default async function AutomatizacionesPage() {
  const rules = await prisma.automationRule.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const serialized = rules.map(r => ({
    ...r,
    lastRun: r.lastRun?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  return <AutomatizacionesClient initialRules={serialized} />
}
