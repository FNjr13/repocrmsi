import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (typeof body.commissionPct    === 'number') data.commissionPct    = body.commissionPct
  if (typeof body.commissionStatus === 'string') data.commissionStatus = body.commissionStatus

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data,
    select: { id: true, commissionPct: true, commissionStatus: true },
  })

  return NextResponse.json(reservation)
}
