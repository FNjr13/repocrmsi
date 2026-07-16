import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  const investors = await prisma.investor.findMany({
    include: {
      properties: { include: { project: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      activities: { orderBy: { date: 'desc' }, take: 1 },
      _count: { select: { properties: true, activities: true } },
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(investors)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const investor = await prisma.investor.create({
    data: {
      id: randomUUID(),
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      country: body.country || null,
      city: body.city || null,
      type: body.type || 'COMPRADOR',
      status: body.status || 'ACTIVO',
      budget: body.budget ? parseFloat(body.budget) : null,
      notes: body.notes || null,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
    },
  })
  return NextResponse.json(investor)
}
