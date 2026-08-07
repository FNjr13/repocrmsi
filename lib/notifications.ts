import { prisma } from './db'

export interface NotifInput {
  type: string
  title: string
  message: string
  agentId?: string | null   // null = visible a todos
  leadId?: string | null
  sentBy?: string | null
}

/**
 * Crea una o varias notificaciones. Nunca lanza excepción — los fallos se ignoran
 * para no romper la operación principal.
 */
export async function notify(input: NotifInput | NotifInput[]): Promise<void> {
  const items = Array.isArray(input) ? input : [input]
  for (const n of items) {
    try {
      await prisma.notification.create({
        data: {
          type:    n.type,
          title:   n.title,
          message: n.message,
          agentId: n.agentId ?? null,
          leadId:  n.leadId  ?? null,
          sentBy:  n.sentBy  ?? null,
        },
      })
    } catch { /* non-critical */ }
  }
}
