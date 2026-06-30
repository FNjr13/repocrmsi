import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { resolveWhatsAppConfig } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const { leadIds, template } = await req.json() as {
    leadIds: string[]
    template: string
  }

  if (!Array.isArray(leadIds) || leadIds.length === 0 || !template.trim()) {
    return NextResponse.json({ error: 'leadIds and template required' }, { status: 400 })
  }

  const session = await getSession()

  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, firstName: true, lastName: true, phone: true, agentId: true },
  })

  const results: { leadId: string; name: string; status: string }[] = []

  for (const lead of leads) {
    const config = await resolveWhatsAppConfig(session?.agentId, lead.agentId)
    if (!config) {
      results.push({ leadId: lead.id, name: `${lead.firstName} ${lead.lastName}`, status: 'NOT_CONFIGURED' })
      continue
    }

    const phone = lead.phone.replace(/[\s\-()]/g, '').replace(/^00/, '+').replace(/^(?!\+)/, '+')

    // Replace template variables
    const message = template
      .replace(/\{\{nombre\}\}/g, lead.firstName)
      .replace(/\{\{apellido\}\}/g, lead.lastName)
      .replace(/\{\{nombre_completo\}\}/g, `${lead.firstName} ${lead.lastName}`)

    let waMsgId: string | null = null
    let status = 'SENT'

    try {
      const waRes = await fetch(
        `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: message },
          }),
        }
      )
      const waData = await waRes.json() as { messages?: Array<{ id: string }> }
      waMsgId = waData.messages?.[0]?.id ?? null
      if (!waRes.ok) status = 'FAILED'
    } catch {
      status = 'FAILED'
    }

    await prisma.whatsAppMessage.create({
      data: {
        leadId: lead.id,
        agentId: config.agentId,
        direction: 'OUTBOUND',
        content: message,
        type: 'text',
        status,
        waMsgId: waMsgId ?? `bulk_${Date.now()}_${lead.id}`,
      },
    })

    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: 'WHATSAPP',
        description: `WhatsApp masivo: ${message.slice(0, 80)}${message.length > 80 ? '...' : ''}`,
      },
    })

    results.push({ leadId: lead.id, name: `${lead.firstName} ${lead.lastName}`, status })
  }

  const sent = results.filter(r => r.status === 'SENT').length
  const failed = results.filter(r => r.status !== 'SENT').length

  return NextResponse.json({ ok: true, sent, failed, results })
}
