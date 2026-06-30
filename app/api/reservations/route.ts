import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const reservations = await prisma.reservation.findMany({
    include: {
      lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      project: { select: { id: true, name: true, currency: true } },
      agent: { select: { id: true, name: true } },
      documents: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(reservations)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const reservation = await prisma.reservation.create({
    data: {
      leadId: body.leadId,
      projectId: body.projectId,
      agentId: body.agentId || null,
      unitNumber: body.unitNumber || null,
      unitType: body.unitType || null,
      floor: body.floor ? parseInt(body.floor) : null,
      area: body.area ? parseFloat(body.area) : null,
      price: parseFloat(body.price),
      currency: body.currency || 'USD',
      reserveAmount: body.reserveAmount ? parseFloat(body.reserveAmount) : null,
      stage: body.stage || 'RESERVA',
      reserveDate: body.reserveDate ? new Date(body.reserveDate) : new Date(),
      commissionPct: body.commissionPct ? parseFloat(body.commissionPct) : 3,
      notes: body.notes || null,
    },
    include: {
      lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      project: { select: { id: true, name: true, currency: true } },
      agent: { select: { id: true, name: true } },
      documents: true,
    },
  })

  // Mark lead as GANADO
  await prisma.lead.update({ where: { id: body.leadId }, data: { stage: 'GANADO' } })

  // Create notification
  await prisma.notification.create({
    data: {
      type: 'RESERVATION',
      title: '🏆 Nueva Reserva',
      message: `${reservation.lead.firstName} ${reservation.lead.lastName} — ${reservation.project.name} (${reservation.unitNumber || 'Sin unidad'})`,
      leadId: body.leadId,
    },
  })

  // Log default documents checklist
  const DOCS_BY_STAGE = [
    { name: 'Formulario de reserva', type: 'RESERVA' },
    { name: 'Copia de cédula / pasaporte', type: 'CONTRATO' },
    { name: 'Comprobante de pago reserva', type: 'RESERVA' },
  ]
  await Promise.all(DOCS_BY_STAGE.map(d =>
    prisma.reservationDocument.create({ data: { reservationId: reservation.id, ...d } })
  ))

  return NextResponse.json(reservation, { status: 201 })
}
