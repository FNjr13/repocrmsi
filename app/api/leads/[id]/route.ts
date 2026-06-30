import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        project: true,
        agent: true,
        activities: { orderBy: { date: 'desc' } },
        events: {
          orderBy: { date: 'asc' },
          include: { agent: { select: { id: true, name: true } } },
        },
      },
    })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json({ error: 'Error fetching lead' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const prevLead = body.stage !== undefined
      ? await prisma.lead.findUnique({ where: { id }, select: { stage: true } })
      : null

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(body.firstName        !== undefined && { firstName: body.firstName }),
        ...(body.lastName         !== undefined && { lastName: body.lastName }),
        ...(body.email            !== undefined && { email: body.email || null }),
        ...(body.phone            !== undefined && { phone: body.phone }),
        ...(body.stage            !== undefined && { stage: body.stage }),
        ...(body.temperature      !== undefined && { temperature: body.temperature }),
        ...(body.source           !== undefined && { source: body.source }),
        ...(body.budget           !== undefined && { budget: body.budget ? parseFloat(String(body.budget)) : null }),
        ...(body.notes            !== undefined && { notes: body.notes || null }),
        ...(body.projectId        !== undefined && { projectId: body.projectId || null }),
        ...(body.agentId          !== undefined && { agentId: body.agentId || null }),
        ...(body.propertyInterest !== undefined && { propertyInterest: body.propertyInterest || null }),
        ...(body.financingType    !== undefined && { financingType: body.financingType || null }),
        ...(body.followUpDate     !== undefined && { followUpDate: body.followUpDate ? new Date(body.followUpDate) : null }),
        ...(body.lostReason       !== undefined && { lostReason: body.lostReason || null }),
        ...(body.utmSource        !== undefined && { utmSource: body.utmSource || null }),
        ...(body.utmMedium        !== undefined && { utmMedium: body.utmMedium || null }),
        ...(body.utmCampaign      !== undefined && { utmCampaign: body.utmCampaign || null }),
      },
      include: {
        project: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        activities: { orderBy: { date: 'desc' } },
        events: { orderBy: { date: 'asc' }, include: { agent: { select: { id: true, name: true } } } },
      },
    })

    if (body.stage !== undefined && prevLead && prevLead.stage !== body.stage) {
      const LABELS: Record<string, string> = {
        NUEVO: 'Nuevo', CONTACTADO: 'Contactado', INTERESADO: 'Interesado',
        VISITA: 'Visita agendada', NEGOCIACION: 'En negociación',
        GANADO: '✅ Ganado', PERDIDO: '❌ Perdido',
      }
      await prisma.activity.create({
        data: {
          leadId: id,
          type: 'NOTA',
          description: `Etapa cambiada: "${LABELS[prevLead.stage] || prevLead.stage}" → "${LABELS[body.stage] || body.stage}"`,
        },
      })
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json({ error: 'Error updating lead' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.lead.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json({ error: 'Error deleting lead' }, { status: 500 })
  }
}
