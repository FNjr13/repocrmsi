import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      lead: {
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          stage: true, activities: {
            orderBy: { date: 'desc' },
            take: 10,
            select: { id: true, type: true, description: true, date: true },
          },
        },
      },
      project: {
        select: { id: true, name: true, location: true, type: true, currency: true },
      },
      agent: { select: { id: true, name: true } },
      documents: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, type: true, status: true, notes: true, dueDate: true, createdAt: true },
      },
    },
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    ...reservation,
    reserveDate: reservation.reserveDate.toISOString(),
    promiseDate: reservation.promiseDate?.toISOString() ?? null,
    closingDate: reservation.closingDate?.toISOString() ?? null,
    deliveryDate: reservation.deliveryDate?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    lead: {
      ...reservation.lead,
      activities: reservation.lead.activities.map(a => ({
        ...a,
        date: new Date(a.date).toISOString(),
      })),
    },
    documents: reservation.documents.map(d => ({
      ...d,
      dueDate: d.dueDate?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
  })
}
