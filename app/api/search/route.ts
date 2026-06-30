import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ leads: [], projects: [], reservations: [] })

  const [leads, projects, reservations] = await Promise.all([
    prisma.lead.findMany({
      where: {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: 6,
      select: {
        id: true, firstName: true, lastName: true, phone: true, stage: true, temperature: true,
        project: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      where: { name: { contains: q } },
      take: 4,
      select: { id: true, name: true, location: true, status: true, type: true },
    }),
    prisma.reservation.findMany({
      where: {
        OR: [
          { lead: { firstName: { contains: q } } },
          { lead: { lastName: { contains: q } } },
          { unitNumber: { contains: q } },
        ],
      },
      take: 4,
      include: {
        lead: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } },
      },
    }),
  ])

  return NextResponse.json({
    leads,
    projects,
    reservations: reservations.map(r => ({
      id: r.id,
      name: `${r.lead.firstName} ${r.lead.lastName}`,
      project: r.project.name,
      unit: r.unitNumber,
      stage: r.stage,
      price: r.price,
      currency: r.currency,
    })),
  })
}
