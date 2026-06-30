import { prisma } from '@/lib/db'
import SecuenciasClient from '@/components/secuencias/SecuenciasClient'

export const dynamic = 'force-dynamic'

export default async function SecuenciasPage() {
  const sequences = await prisma.automationSequence.findMany({
    orderBy: { createdAt: 'desc' },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  })

  const serialized = sequences.map(s => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    steps: s.steps.map(st => {
      let actionData: Record<string, string> = {}
      try {
        actionData = JSON.parse(st.actionData) as Record<string, string>
      } catch {
        actionData = {}
      }
      return {
        ...st,
        actionData,
        createdAt: st.createdAt.toISOString(),
      }
    }),
  }))

  return <SecuenciasClient initialSequences={serialized} />
}
