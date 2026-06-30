import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Webhook receiver for real estate portals: Portalinmobiliario, Yapo, Properati, Toctoc
export async function POST(req: NextRequest) {
  const body = await req.json()
  const source = (req.headers.get('x-portal-source') || body.source || 'OTRO').toUpperCase()

  // Log raw webhook
  const log = await prisma.webhookLog.create({
    data: {
      source,
      payload: JSON.stringify(body),
      status: 'PROCESADO',
    },
  })

  try {
    // Normalize lead data from different portal formats
    const leadData = normalizePortalLead(source, body)

    // Check for duplicate by phone or email
    const existing = await prisma.lead.findFirst({
      where: {
        OR: [
          leadData.phone ? { phone: leadData.phone } : {},
          leadData.email ? { email: leadData.email } : {},
        ].filter(c => Object.keys(c).length > 0),
      },
    })

    if (existing) {
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { status: 'DUPLICADO', leadId: existing.id },
      })
      return NextResponse.json({ ok: true, status: 'duplicate', leadId: existing.id })
    }

    // Find matching project
    let projectId: string | null = null
    if (leadData.projectName) {
      const project = await prisma.project.findFirst({
        where: { name: { contains: leadData.projectName } },
      })
      projectId = project?.id || null
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        email: leadData.email || null,
        phone: leadData.phone || '',
        source: sourceToEnum(source),
        stage: 'NUEVO',
        temperature: 'NORMAL',
        notes: leadData.message || null,
        propertyInterest: leadData.propertyType || null,
        budget: leadData.budget || null,
        projectId,
        utmSource: source.toLowerCase(),
        utmMedium: 'portal',
        utmCampaign: leadData.campaignName || null,
      },
    })

    // Update log with lead id
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { leadId: lead.id },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'NEW_LEAD',
        title: `🔔 Nuevo lead de ${source}`,
        message: `${lead.firstName} ${lead.lastName} — ${leadData.projectName || 'sin proyecto'}`,
        leadId: lead.id,
      },
    })

    return NextResponse.json({ ok: true, status: 'created', leadId: lead.id }, { status: 201 })
  } catch (error) {
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: 'ERROR', error: String(error) },
    })
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source')
  const limit = parseInt(searchParams.get('limit') || '50')

  const logs = await prisma.webhookLog.findMany({
    where: source ? { source } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json(logs)
}

function sourceToEnum(source: string): string {
  const map: Record<string, string> = {
    PORTALINMOBILIARIO: 'PORTALINMOBILIARIO',
    PORTAL: 'PORTALINMOBILIARIO',
    YAPO: 'YAPO',
    PROPERATI: 'PROPERATI',
    TOCTOC: 'OTRO',
    META: 'META',
    FACEBOOK: 'META',
    GOOGLE: 'GOOGLE',
    WHATSAPP: 'WHATSAPP',
    WEB: 'WEB',
  }
  return map[source] || 'OTRO'
}

interface NormalizedLead {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  message?: string
  projectName?: string
  propertyType?: string
  budget?: number
  campaignName?: string
}

function normalizePortalLead(source: string, body: Record<string, unknown>): NormalizedLead {
  // Portalinmobiliario format
  if (source === 'PORTALINMOBILIARIO' || source === 'PORTAL') {
    const contact = (body.contact || body.contacto || {}) as Record<string, unknown>
    const fullName = String(contact.name || contact.nombre || body.name || body.nombre || 'Sin nombre')
    const parts = fullName.trim().split(' ')
    return {
      firstName: parts[0] || 'Sin',
      lastName: parts.slice(1).join(' ') || 'nombre',
      email: String(contact.email || body.email || ''),
      phone: String(contact.phone || contact.telefono || body.phone || ''),
      message: String(body.message || body.mensaje || body.comments || ''),
      projectName: String(body.project_name || body.proyecto || body.listing_title || ''),
      propertyType: String(body.property_type || body.tipo_propiedad || ''),
      budget: parseFloat(String(body.budget || body.precio || '0')) || undefined,
    }
  }

  // Yapo format
  if (source === 'YAPO') {
    const fullName = String(body.nombre || body.name || 'Sin nombre')
    const parts = fullName.trim().split(' ')
    return {
      firstName: parts[0] || 'Sin',
      lastName: parts.slice(1).join(' ') || 'nombre',
      email: String(body.email || ''),
      phone: String(body.telefono || body.phone || ''),
      message: String(body.mensaje || body.message || ''),
      projectName: String(body.titulo || body.title || ''),
    }
  }

  // Generic / Properati / others
  const firstName = String(body.first_name || body.firstName || body.nombre || '')
  const lastName = String(body.last_name || body.lastName || body.apellido || '')
  const fullName = firstName ? `${firstName} ${lastName}`.trim() : String(body.name || body.nombre || 'Sin nombre')
  const nameParts = fullName.split(' ')

  return {
    firstName: nameParts[0] || 'Sin',
    lastName: nameParts.slice(1).join(' ') || 'nombre',
    email: String(body.email || ''),
    phone: String(body.phone || body.telefono || body.mobile || ''),
    message: String(body.message || body.mensaje || body.notes || ''),
    projectName: String(body.project || body.proyecto || body.property || ''),
    propertyType: String(body.property_type || body.tipo || ''),
    budget: parseFloat(String(body.budget || body.price || '0')) || undefined,
    campaignName: String(body.utm_campaign || body.campaign || ''),
  }
}
