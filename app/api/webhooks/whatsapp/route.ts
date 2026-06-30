import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Webhook verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // El verify token es a nivel de App de Meta (un solo webhook para todas las
  // líneas), así que basta con que coincida con cualquiera de las configuradas.
  const configs = await prisma.whatsAppConfig.findMany({ select: { verifyToken: true } })
  const validTokens = new Set([...configs.map(c => c.verifyToken), 'wh_verify_token'])

  if (mode === 'subscribe' && token && validTokens.has(token)) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Incoming messages (POST)
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    object?: string
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string }
          messages?: Array<{
            id: string
            from: string
            type: string
            text?: { body: string }
            timestamp: string
          }>
        }
      }>
    }>
  }

  if (body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true })
  }

  const entries = body.entry ?? []
  for (const entry of entries) {
    const changes = entry.changes ?? []
    for (const change of changes) {
      const phoneNumberId = change.value?.metadata?.phone_number_id
      const receivingConfig = phoneNumberId
        ? await prisma.whatsAppConfig.findUnique({ where: { phoneNumberId } })
        : null

      const messages = change.value?.messages ?? []
      for (const msg of messages) {
        const fromPhone = msg.from // e.g. "50760001234"
        const content = msg.type === 'text' ? (msg.text?.body ?? '') : `[${msg.type}]`

        // Match lead by phone
        const allLeads = await prisma.lead.findMany({
          where: { phone: { not: '' } },
          select: { id: true, phone: true },
        })

        const lead = allLeads.find(l => {
          const normalized = l.phone.replace(/[\s\-()+ ]/g, '')
          return normalized === fromPhone || normalized.endsWith(fromPhone)
        })

        if (!lead) continue

        // Avoid duplicate
        const existing = await prisma.whatsAppMessage.findUnique({ where: { waMsgId: msg.id } })
        if (existing) continue

        await prisma.whatsAppMessage.create({
          data: {
            leadId: lead.id,
            agentId: receivingConfig?.agentId ?? null,
            direction: 'INBOUND',
            content,
            type: msg.type,
            status: 'RECEIVED',
            waMsgId: msg.id,
          },
        })

        // Notification
        await prisma.notification.create({
          data: {
            type: 'NEW_LEAD',
            title: '💬 Mensaje WhatsApp recibido',
            message: `${content.slice(0, 60)}`,
            leadId: lead.id,
          },
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
