import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const broker = await prisma.externalBrokerAgent.findUnique({
    where: { id },
    include: {
      brokerProjects: { include: { project: { select: { id: true, name: true, type: true } } }, orderBy: { createdAt: 'desc' } },
      activities: { orderBy: { date: 'desc' } },
    },
  })
  if (!broker) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(broker)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()

  if (body._action === 'add_project') {
    const proj = await prisma.brokerProject.create({
      data: {
        id: randomUUID(),
        brokerId: id,
        projectId: body.projectId || null,
        projectName: body.projectName,
        unitsSold: parseInt(body.unitsSold || '0'),
        unitsReserved: parseInt(body.unitsReserved || '0'),
        commissionPct: body.commissionPct ? parseFloat(body.commissionPct) : 3,
        notes: body.notes || null,
      },
      include: { project: { select: { id: true, name: true, type: true } } },
    })
    return NextResponse.json(proj)
  }

  if (body._action === 'update_project') {
    const proj = await prisma.brokerProject.update({
      where: { id: body.projectId },
      data: {
        unitsSold: parseInt(body.unitsSold ?? '0'),
        unitsReserved: parseInt(body.unitsReserved ?? '0'),
        commissionPct: body.commissionPct ? parseFloat(body.commissionPct) : undefined,
        notes: body.notes ?? undefined,
      },
    })
    return NextResponse.json(proj)
  }

  if (body._action === 'delete_project') {
    await prisma.brokerProject.delete({ where: { id: body.brokerProjectId } })
    return NextResponse.json({ ok: true })
  }

  if (body._action === 'add_activity') {
    const act = await prisma.brokerActivity.create({
      data: {
        id: randomUUID(),
        brokerId: id,
        type: body.type,
        description: body.description,
        date: body.date ? new Date(body.date) : new Date(),
      },
    })
    return NextResponse.json(act)
  }

  const broker = await prisma.externalBrokerAgent.update({
    where: { id },
    data: {
      name: body.name,
      company: body.company ?? undefined,
      phone: body.phone ?? undefined,
      email: body.email ?? undefined,
      country: body.country ?? undefined,
      city: body.city ?? undefined,
      type: body.type ?? undefined,
      status: body.status ?? undefined,
      licenseNumber: body.licenseNumber ?? undefined,
      commissionPct: body.commissionPct !== undefined ? (body.commissionPct ? parseFloat(body.commissionPct) : null) : undefined,
      notes: body.notes ?? undefined,
      followUpDate: body.followUpDate !== undefined ? (body.followUpDate ? new Date(body.followUpDate) : null) : undefined,
    },
  })
  return NextResponse.json(broker)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.externalBrokerAgent.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
