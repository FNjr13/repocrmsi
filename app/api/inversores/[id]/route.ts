import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const investor = await prisma.investor.findUnique({
    where: { id },
    include: {
      properties: {
        include: { project: { select: { id: true, name: true, type: true } } },
        orderBy: { createdAt: 'desc' },
      },
      activities: { orderBy: { date: 'desc' } },
    },
  })
  if (!investor) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(investor)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()

  // Handle adding a property
  if (body._action === 'add_property') {
    const prop = await prisma.investorProperty.create({
      data: {
        id: randomUUID(),
        investorId: id,
        projectId: body.projectId || null,
        projectName: body.projectName,
        unitNumber: body.unitNumber || null,
        status: body.status || 'RESERVADO',
        price: body.price ? parseFloat(body.price) : null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        notes: body.notes || null,
      },
      include: { project: { select: { id: true, name: true, type: true } } },
    })
    return NextResponse.json(prop)
  }

  // Handle adding an activity
  if (body._action === 'add_activity') {
    const act = await prisma.investorActivity.create({
      data: {
        id: randomUUID(),
        investorId: id,
        type: body.type,
        description: body.description,
        date: body.date ? new Date(body.date) : new Date(),
      },
    })
    return NextResponse.json(act)
  }

  // Handle deleting a property
  if (body._action === 'delete_property') {
    await prisma.investorProperty.delete({ where: { id: body.propertyId } })
    return NextResponse.json({ ok: true })
  }

  // Update investor fields
  const investor = await prisma.investor.update({
    where: { id },
    data: {
      name: body.name,
      email: body.email ?? undefined,
      phone: body.phone ?? undefined,
      country: body.country ?? undefined,
      city: body.city ?? undefined,
      type: body.type ?? undefined,
      status: body.status ?? undefined,
      budget: body.budget !== undefined ? (body.budget ? parseFloat(body.budget) : null) : undefined,
      notes: body.notes ?? undefined,
      followUpDate: body.followUpDate !== undefined ? (body.followUpDate ? new Date(body.followUpDate) : null) : undefined,
    },
  })
  return NextResponse.json(investor)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.investor.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
