import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Webhook verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const config = await prisma.whatsAppConfig.findFirst()
  if (mode === 'subscribe' && token === (config?.verifyToken ?? 'wh_verify_token')) {
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
