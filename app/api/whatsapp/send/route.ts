import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { leadId, message, type = 'text' } = await req.json()

  if (!leadId || !message) {
    return NextResponse.json({ error: 'leadId and message required' }, { status: 400 })
  }

  const config = await prisma.whatsAppConfig.findFirst({ where: { isActive: true } })
  if (!config) {
    return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 503 })
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { phone: true, firstName: true, lastName: true } })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  // Normalize phone (remove spaces, dashes; ensure leading +)
  const phone = lead.phone.replace(/[\s\-()]/g, '').replace(/^00/, '+').replace(/^(?!\+)/, '+')

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
  } catch {
    status = 'FAILED'
  }

  const msg = await prisma.whatsAppMessage.create({
    data: {
      leadId,
      direction: 'OUTBOUND',
      content: message,
      type,
      status,
      waMsgId: waMsgId ?? `local_${Date.now()}`,
    },
  })

  // Log activity
  await prisma.activity.create({
    data: {
      leadId,
      type: 'WHATSAPP',
      description: `WhatsApp enviado: ${message.slice(0, 80)}${message.length > 80 ? '...' : ''}`,
    },
  })

  return NextResponse.json({ ok: true, messageId: msg.id, status })
}
