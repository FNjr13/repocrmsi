import { prisma } from '@/lib/db'
import WhatsAppConfigClient from '@/components/whatsapp/WhatsAppConfigClient'

export const dynamic = 'force-dynamic'

export default async function WhatsAppPage() {
  const config = await prisma.whatsAppConfig.findFirst()

  const serialized = config
    ? {
        ...config,
        accessToken: config.accessToken ? '***' + config.accessToken.slice(-6) : '',
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      }
    : null

  return <WhatsAppConfigClient initialConfig={serialized} />
}
