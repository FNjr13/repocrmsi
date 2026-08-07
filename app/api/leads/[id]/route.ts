import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { notify } from '@/lib/notifications'

const STAGE_LABELS: Record<string, string> = {
  NUEVO: 'Nuevo', CONTACTADO: 'Contactado', INTERESADO: 'Interesado',
  VISITA: 'Visita agendada', NEGOCIACION: 'En negociación',
  GANADO: 'Ganado ✅', PERDIDO: 'Perdido ❌',
}

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

    // Fetch prev state for change detection
    const prevLead = await prisma.lead.findUnique({
      where: { id },
      select: { stage: true, agentId: true, followUpDate: true, firstName: true, lastName: true },
    })

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
        agent:   { select: { id: true, name: true } },
        activities: { orderBy: { date: 'desc' } },
        events: { orderBy: { date: 'asc' }, include: { agent: { select: { id: true, name: true } } } },
      },
    })

    const leadName = `${lead.firstName} ${lead.lastName}`

    // ── 1. Stage change ─────────────────────────────────────────────────────
    if (body.stage !== undefined && prevLead && prevLead.stage !== body.stage) {
      await prisma.activity.create({
        data: {
          leadId: id,
          type: 'NOTA',
          description: `Etapa cambiada: "${STAGE_LABELS[prevLead.stage] || prevLead.stage}" → "${STAGE_LABELS[body.stage] || body.stage}"`,
        },
      })
      if (lead.agentId) {
        await notify({
          type:    'STAGE_CHANGE',
          title:   `📊 ${leadName} avanzó a "${STAGE_LABELS[body.stage] || body.stage}"`,
          message: `Antes: ${STAGE_LABELS[prevLead.stage] || prevLead.stage}`,
          agentId: lead.agentId,
          leadId:  id,
        })
      }
    }

    // ── 2. Lead assigned to a different agent ────────────────────────────────
    if (
      body.agentId !== undefined &&
      body.agentId &&
      prevLead &&
      body.agentId !== prevLead.agentId
    ) {
      await notify({
        type:    'LEAD_ASSIGNED',
        title:   `👤 Lead asignado: ${leadName}`,
        message: `${leadName} fue asignado a tu cartera${lead.project ? ' · ' + lead.project.name : ''}`,
        agentId: body.agentId,
        leadId:  id,
      })
    }

    // ── 3. Follow-up date set or changed ────────────────────────────────────
    if (body.followUpDate && lead.agentId && prevLead) {
      const newTs = new Date(body.followUpDate).getTime()
      const prevTs = prevLead.followUpDate ? new Date(prevLead.followUpDate).getTime() : 0
      if (newTs !== prevTs) {
        const dateStr = new Date(body.followUpDate).toLocaleDateString('es-PA', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
        await notify({
          type:    'FOLLOW_UP',
          title:   `🔔 Seguimiento programado: ${leadName}`,
          message: `Recordatorio el ${dateStr}`,
          agentId: lead.agentId,
          leadId:  id,
        })
      }
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
