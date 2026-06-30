import { prisma } from '@/lib/db'
import ReservasClient from '@/components/reservas/ReservasClient'

export const dynamic = 'force-dynamic'

export default async function ReservasPage() {
  const reservations = await prisma.reservation.findMany({
    include: {
      lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, budget: true } },
      project: { select: { id: true, name: true, currency: true } },
      agent: { select: { id: true, name: true } },
      documents: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Serialize dates
  const serialized = reservations.map(r => ({
    ...r,
    reserveDate: r.reserveDate.toISOString(),
    promiseDate: r.promiseDate?.toISOString() || null,
    closingDate: r.closingDate?.toISOString() || null,
    deliveryDate: r.deliveryDate?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    documents: r.documents.map(d => ({
      ...d,
      dueDate: d.dueDate?.toISOString() || null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
  }))

  return <ReservasClient initialReservations={serialized} />
}
