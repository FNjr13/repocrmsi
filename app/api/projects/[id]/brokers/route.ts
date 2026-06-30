import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brokers = await prisma.externalBroker.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(brokers)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const broker = await prisma.externalBroker.create({
    data: {
      projectId: id,
      name: body.name,
      company: body.company || null,
      phone: body.phone || null,
      email: body.email || null,
      commissionPct: body.commissionPct ? Number(body.commissionPct) : 3,
      soldUnits: body.soldUnits ? Number(body.soldUnits) : 0,
      reservedUnits: body.reservedUnits ? Number(body.reservedUnits) : 0,
      status: body.status || 'ACTIVO',
      notes: body.notes || null,
    },
  })
  return NextResponse.json(broker, { status: 201 })
}
