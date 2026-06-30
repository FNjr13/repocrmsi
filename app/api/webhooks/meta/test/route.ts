import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/webhooks/meta/test
 * Simulates a Meta lead without calling the real Graph API.
 * Used by the UI "Enviar lead de prueba" button.
 */
export async function POST(req: NextRequest) {
  let body: {
    pageId: string
    configId?: string
    firstName: string
    lastName: string
    phone: string
    email?: string
    extras?: Record<string, string>
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { pageId, firstName, lastName, phone, email, extras = {} } = body

  if (!pageId || !firstName || !phone) {
    return NextResponse.json({ ok: false, error: 'pageId, firstName y phone son obligatorios' }, { status: 400 })
  }

  // Buscar configuración de la página
  const config = await prisma.metaPageConfig.findUnique({ where: { pageId } })

  if (!config || !config.isActive) {
    return NextResponse.json({ ok: false, error: 'Página no configurada o inactiva' }, { status: 404 })
  }

  // Detectar duplicado por teléfono o email
  const conditions: Array<{ phone?: string; email?: string }> = []
  if (phone) conditions.push({ phone })
  if (email) conditions.push({ email })

  const duplicate = conditions.length > 0
    ? await prisma.lead.findFirst({ where: { OR: conditions } })
    : null

  // Generar un leadgenId de prueba único
  const testLeadgenId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Crear el log de prueba
  const log = await prisma.metaLeadLog.create({
    data: {
      leadgenId: testLeadgenId,
      pageId,
      formId: 'test_form',
      adId: 'test_ad',
      rawPayload: JSON.stringify({ test: true, firstName, lastName, phone, email, extras }),
      status: 'PROCESADO',
    },
  })

  if (duplicate) {
    await prisma.metaLeadLog.update({
      where: { id: log.id },
      data: { status: 'DUPLICADO', leadId: duplicate.id },
    })
    await prisma.metaPageConfig.update({
      where: { id: config.id },
      data: { leadsReceived: { increment: 1 }, lastLeadAt: new Date() },
    })
    return NextResponse.json({
      ok: false,
      error: `Lead duplicado detectado (${duplicate.firstName} ${duplicate.lastName})`,
    })
  }

  // Auto-asignar asesor
  let agentId = config.agentId
  if (!agentId && config.autoAssign) {
    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      include: {
        leads: {
          where: { stage: { notIn: ['GANADO', 'PERDIDO'] } },
          select: { id: true, projectId: true },
        },
      },
      orderBy: { name: 'asc' },
    })
    if (agents.length > 0) {
      const projectId = config.projectId
      if (projectId) {
        const agentesProyecto = agents.filter(a => a.leads.some(l => l.projectId === projectId))
        if (agentesProyecto.length > 0) {
          agentId = agentesProyecto.sort((a, b) =>
            a.leads.filter(l => l.projectId === projectId).length -
            b.leads.filter(l => l.projectId === projectId).length
          )[0].id
        }
      }
      if (!agentId) {
        agentId = agents.sort((a, b) => a.leads.length - b.leads.length)[0].id
      }
    }
  }

  // Construir notas de extras
  const notasAdicionales = Object.keys(extras).length > 0
    ? `Información del formulario de Instagram (TEST):\n${Object.entries(extras).map(([k, v]) => `• ${k}: ${v}`).join('\n')}`
    : null

  // Crear el lead
  const lead = await prisma.lead.create({
    data: {
      firstName,
      lastName,
      email: email || null,
      phone,
      source: 'META',
      stage: 'NUEVO',
      temperature: 'WARM',
      notes: notasAdicionales,
      projectId: config.projectId || null,
      agentId: agentId || null,
      utmSource: 'instagram',
      utmMedium: 'lead_ad',
      utmCampaign: 'test_campaign',
    },
  })

  // Actualizar log
  await prisma.metaLeadLog.update({
    where: { id: log.id },
    data: { leadId: lead.id },
  })

  // Actualizar contador de la página
  await prisma.metaPageConfig.update({
    where: { id: config.id },
    data: { leadsReceived: { increment: 1 }, lastLeadAt: new Date() },
  })

  // Notificación
  await prisma.notification.create({
    data: {
      type: 'NEW_LEAD',
      title: `📸 Lead de prueba — Instagram`,
      message: `${lead.firstName} ${lead.lastName} — ${config.pageName}${config.instagramHandle ? ` (@${config.instagramHandle})` : ''} (TEST)`,
      leadId: lead.id,
    },
  })

  // Actividad
  await prisma.activity.create({
    data: {
      leadId: lead.id,
      type: 'NOTA',
      description: `Lead de PRUEBA creado desde la integración de Instagram. ${notasAdicionales || ''}`,
    },
  })

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    leadName: `${lead.firstName} ${lead.lastName}`,
  })
}
