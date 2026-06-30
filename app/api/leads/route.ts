import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const projectId = searchParams.get('projectId')
    const agentId = searchParams.get('agentId')
    const temperature = searchParams.get('temperature')
    const source = searchParams.get('source')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (stage) where.stage = stage
    if (projectId) where.projectId = projectId
    if (agentId) where.agentId = agentId
    if (temperature) where.temperature = temperature
    if (source) where.source = source
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        activities: { orderBy: { date: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(leads)
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ error: 'Error fetching leads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const lead = await prisma.lead.create({
      data: {
        firstName:        body.firstName,
        lastName:         body.lastName,
        email:            body.email        || null,
        phone:            body.phone,
        source:           body.source       || 'OTRO',
        stage:            body.stage        || 'NUEVO',
        temperature:      body.temperature  || 'NORMAL',
        budget:           body.budget       ? parseFloat(String(body.budget)) : null,
        notes:            body.notes        || null,
        projectId:        body.projectId    || null,
        agentId:          body.agentId      || null,
        propertyInterest: body.propertyInterest || null,
        financingType:    body.financingType    || null,
        followUpDate:     body.followUpDate     ? new Date(body.followUpDate) : null,
        utmSource:        body.utmSource    || null,
        utmMedium:        body.utmMedium    || null,
        utmCampaign:      body.utmCampaign  || null,
      },
      include: {
        project: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        activities: { orderBy: { date: 'desc' }, take: 1 },
      },
    })

    const SOURCE_LABELS: Record<string, string> = {
      META: 'Meta Ads', GOOGLE: 'Google Ads', WHATSAPP: 'WhatsApp',
      WEB: 'Sitio Web', REFERIDO: 'Referido', OTRO: 'Otro',
    }
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: 'NOTA',
        description: `Lead ingresado desde ${SOURCE_LABELS[lead.source] || lead.source}.${lead.projectId ? '' : ' Sin proyecto asignado.'}`,
      },
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json({ error: 'Error creating lead' }, { status: 500 })
  }
}
