import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const form = await prisma.publicForm.findUnique({ where: { slug } })
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let project = null
  if (form.projectId) {
    project = await prisma.project.findUnique({
      where: { id: form.projectId },
      select: { id: true, name: true, location: true, type: true, priceMin: true, priceMax: true, currency: true },
    })
  }

  return NextResponse.json({ ...form, project })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json()

  const form = await prisma.publicForm.findUnique({ where: { slug } })
  if (!form || !form.isActive) return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 })

  const { firstName, lastName, phone, email, budget, source, notes, financingType, propertyInterest } = body

  // Build source from form type
  const leadSource = source || (form.type === 'FERIA' ? 'OTRO' : form.type === 'PRECALIFICACION' ? 'WEB' : 'WEB')

  // Auto-assign agent (round robin)
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    select: { id: true, _count: { select: { leads: true } } },
    orderBy: { leads: { _count: 'asc' } },
  })

  const lead = await prisma.lead.create({
    data: {
      firstName: firstName || 'Sin',
      lastName: lastName || 'nombre',
      phone: phone || '',
      email: email || null,
      source: leadSource,
      projectId: form.projectId || null,
      agentId: agents[0]?.id || null,
      budget: budget ? parseFloat(String(budget)) : null,
      notes: notes || `Formulario: ${form.title}${body.extraInfo ? `\n${body.extraInfo}` : ''}`,
      financingType: financingType || null,
      propertyInterest: propertyInterest || null,
      temperature: 'WARM',
    },
  })

  // Create activity
  await prisma.activity.create({
    data: { leadId: lead.id, type: 'NOTA', description: `Lead captado vía formulario público: ${form.title}` },
  })

  // Notification
  await prisma.notification.create({
    data: {
      type: 'NEW_LEAD',
      title: `📋 Nuevo lead — Formulario ${form.title}`,
      message: `${lead.firstName} ${lead.lastName} · ${phone || 'Sin teléfono'}`,
      leadId: lead.id,
    },
  })

  // Increment submit count
  await prisma.publicForm.update({ where: { slug }, data: { submitCount: { increment: 1 } } })

  return NextResponse.json({ ok: true, leadId: lead.id })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json()
  const form = await prisma.publicForm.update({ where: { slug }, data: body })
  return NextResponse.json(form)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  await prisma.publicForm.delete({ where: { slug } })
  return NextResponse.json({ ok: true })
}
