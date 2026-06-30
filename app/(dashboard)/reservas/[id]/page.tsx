import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import ReservationDetailClient from '@/components/reservas/ReservationDetailClient'

export const dynamic = 'force-dynamic'

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, budget: true } },
      project: { select: { id: true, name: true, currency: true, priceMin: true, priceMax: true } },
      agent: { select: { id: true, name: true } },
      documents: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!reservation) notFound()

  const serialized = {
    ...reservation,
    reserveDate: reservation.reserveDate.toISOString(),
    promiseDate: reservation.promiseDate?.toISOString() || null,
    closingDate: reservation.closingDate?.toISOString() || null,
    deliveryDate: reservation.deliveryDate?.toISOString() || null,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    documents: reservation.documents.map(d => ({
      ...d,
      dueDate: d.dueDate?.toISOString() || null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
  }

  return <ReservationDetailClient reservation={serialized} />
}
