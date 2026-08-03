import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId') || undefined
  const agentId   = searchParams.get('agentId')   || undefined
  const status    = searchParams.get('status')     || undefined
  const fromStr   = searchParams.get('from')
  const toStr     = searchParams.get('to')
  const from = fromStr ? new Date(fromStr) : undefined
  const to   = toStr   ? new Date(toStr)   : undefined
  if (to) to.setHours(23, 59, 59, 999)

  const reservations = await prisma.reservation.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(agentId   ? { agentId }   : {}),
      ...(status    ? { commissionStatus: status } : {}),
      ...(from || to
        ? { reserveDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
      stage: { not: 'CAIDA' },
    },
    include: {
      lead:    { select: { id: true, firstName: true, lastName: true } },
      agent:   { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { reserveDate: 'desc' },
  })

  return NextResponse.json(
    reservations.map(r => ({
      id:               r.id,
      clientName:       `${r.lead.firstName} ${r.lead.lastName}`,
      leadId:           r.leadId,
      projectId:        r.projectId,
      projectName:      r.project.name,
      agentId:          r.agentId,
      agentName:        r.agent?.name ?? null,
      unitNumber:       r.unitNumber,
      unitType:         r.unitType,
      floor:            r.floor,
      price:            r.price,
      currency:         r.currency,
      stage:            r.stage,
      commissionPct:    r.commissionPct,
      commissionAmount: r.price * r.commissionPct / 100,
      commissionStatus: r.commissionStatus,
      reserveDate:      r.reserveDate,
    }))
  )
}
