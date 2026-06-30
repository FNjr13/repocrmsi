import { prisma } from '@/lib/db'
import WhatsAppConfigClient from '@/components/whatsapp/WhatsAppConfigClient'

export const dynamic = 'force-dynamic'

export default async function WhatsAppPage() {
  const [configs, agents] = await Promise.all([
    prisma.whatsAppConfig.findMany({
      include: { agent: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.agent.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const serialized = configs.map(c => ({
    ...c,
    accessToken: c.accessToken ? '***' + c.accessToken.slice(-6) : '',
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))

  return <WhatsAppConfigClient initialConfigs={serialized} agents={agents} />
}
