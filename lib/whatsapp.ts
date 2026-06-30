import { prisma } from '@/lib/db'

// Elige qué línea de WhatsApp usar para enviar: la de la asesora que tiene la
// sesión abierta, si no la del agente asignado al lead, si no la línea
// general/compartida (agentId null).
export async function resolveWhatsAppConfig(sessionAgentId: string | null | undefined, leadAgentId?: string | null) {
  const candidateIds = [sessionAgentId, leadAgentId].filter((id): id is string => !!id)

  if (candidateIds.length > 0) {
    const own = await prisma.whatsAppConfig.findFirst({
      where: { agentId: { in: candidateIds }, isActive: true },
    })
    if (own) return own
  }

  return prisma.whatsAppConfig.findFirst({ where: { agentId: null, isActive: true } })
}
