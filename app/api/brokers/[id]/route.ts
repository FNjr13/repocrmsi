import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const broker = await prisma.externalBroker.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.company !== undefined && { company: body.company }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.commissionPct !== undefined && { commissionPct: Number(body.commissionPct) }),
      ...(body.soldUnits !== undefined && { soldUnits: Number(body.soldUnits) }),
      ...(body.reservedUnits !== undefined && { reservedUnits: Number(body.reservedUnits) }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  })
  return NextResponse.json(broker)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.externalBroker.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
