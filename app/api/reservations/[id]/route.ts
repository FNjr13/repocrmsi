import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await prisma.reservation.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, budget: true } },
      project: { select: { id: true, name: true, currency: true, priceMin: true, priceMax: true } },
      agent: { select: { id: true, name: true } },
      documents: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!res) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(res)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.stage !== undefined) data.stage = body.stage
  if (body.unitNumber !== undefined) data.unitNumber = body.unitNumber
  if (body.unitType !== undefined) data.unitType = body.unitType
  if (body.floor !== undefined) data.floor = body.floor ? parseInt(body.floor) : null
  if (body.area !== undefined) data.area = body.area ? parseFloat(body.area) : null
  if (body.price !== undefined) data.price = parseFloat(body.price)
  if (body.reserveAmount !== undefined) data.reserveAmount = body.reserveAmount ? parseFloat(body.reserveAmount) : null
  if (body.commissionPct !== undefined) data.commissionPct = parseFloat(body.commissionPct)
  if (body.commissionStatus !== undefined) data.commissionStatus = body.commissionStatus
  if (body.promiseDate !== undefined) data.promiseDate = body.promiseDate ? new Date(body.promiseDate) : null
  if (body.closingDate !== undefined) data.closingDate = body.closingDate ? new Date(body.closingDate) : null
  if (body.deliveryDate !== undefined) data.deliveryDate = body.deliveryDate ? new Date(body.deliveryDate) : null
  if (body.agentId !== undefined) data.agentId = body.agentId || null
  if (body.notes !== undefined) data.notes = body.notes

  const updated = await prisma.reservation.update({
    where: { id }, data,
    include: {
      lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, budget: true } },
      project: { select: { id: true, name: true, currency: true, priceMin: true, priceMax: true } },
      agent: { select: { id: true, name: true } },
      documents: { orderBy: { createdAt: 'asc' } },
    },
  })

  // Handle adding a document
  if (body.addDocument) {
    await prisma.reservationDocument.create({
      data: {
        reservationId: id,
        name: body.addDocument.name,
        type: body.addDocument.type || 'OTRO',
        status: 'PENDIENTE',
        dueDate: body.addDocument.dueDate ? new Date(body.addDocument.dueDate) : null,
        notes: body.addDocument.notes || null,
      },
    })
  }

  // Handle updating a document status
  if (body.updateDocument) {
    await prisma.reservationDocument.update({
      where: { id: body.updateDocument.id },
      data: { status: body.updateDocument.status },
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.reservation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
