import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Called when an advisor marks a lead as GANADO.
// Creates a SALE_WON notification that all users will see.
export async function POST(req: NextRequest) {
  const { leadId, leadName, agentName } = await req.json()
  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

  await prisma.notification.create({
    data: {
      type: 'SALE_WON',
      title: `🏆 ¡Venta ganada! — ${leadName ?? 'Lead'}`,
      message: agentName
        ? `${agentName} cerró la venta con ${leadName ?? 'un lead'}. ¡Felicidades al equipo!`
        : `Se cerró la venta con ${leadName ?? 'un lead'}. ¡Felicidades al equipo!`,
      leadId,
      isRead: false,
    },
  })

  return NextResponse.json({ ok: true })
}
