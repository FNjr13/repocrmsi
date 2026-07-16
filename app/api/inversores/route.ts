import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  const brokers = await prisma.externalBrokerAgent.findMany({
    include: {
      brokerProjects: { include: { project: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      activities: { orderBy: { date: 'desc' }, take: 1 },
      _count: { select: { brokerProjects: true, activities: true } },
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(brokers)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const broker = await prisma.externalBrokerAgent.create({
    data: {
      id: randomUUID(),
      name: body.name,
      company: body.company || null,
      phone: body.phone || null,
      email: body.email || null,
      country: body.country || null,
      city: body.city || null,
      type: body.type || 'AGENCIA',
      status: body.status || 'ACTIVO',
      licenseNumber: body.licenseNumber || null,
      commissionPct: body.commissionPct ? parseFloat(body.commissionPct) : 3,
      notes: body.notes || null,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
    },
  })
  return NextResponse.json(broker)
}
