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

  const dateFilter = from || to
    ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
    : undefined

  // AUTO: from reservations (existing)
  const [reservations, manualList] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(agentId   ? { agentId }   : {}),
        ...(status    ? { commissionStatus: status } : {}),
        ...(dateFilter ? { reserveDate: dateFilter } : {}),
        stage: { not: 'CAIDA' },
      },
      include: {
        lead:    { select: { id: true, firstName: true, lastName: true } },
        agent:   { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { reserveDate: 'desc' },
    }),

    // MANUAL: manually created commissions
    prisma.manualCommission.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(agentId   ? { agentId }   : {}),
        ...(status    ? { status }     : {}),
        ...(dateFilter ? { commissionDate: dateFilter } : {}),
      },
      include: {
        agent:   { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { commissionDate: 'desc' },
    }),
  ])

  const autoItems = reservations.map(r => ({
    id:               r.id,
    source:           'AUTO' as const,
    clientName:       `${r.lead.firstName} ${r.lead.lastName}`,
    projectId:        r.projectId,
    projectName:      r.project.name,
    agentId:          r.agentId,
    agentName:        r.agent?.name ?? null,
    unitNumber:       r.unitNumber,
    floor:            r.floor,
    salePrice:        r.price,
    currency:         r.currency,
    stage:            r.stage,
    commissionPct:    r.commissionPct,
    commissionAmount: r.price * r.commissionPct / 100,
    commissionStatus: r.commissionStatus,
    date:             r.reserveDate,
    description:      null,
    notes:            null,
  }))

  const manualItems = manualList.map(m => ({
    id:               m.id,
    source:           'MANUAL' as const,
    clientName:       m.clientName,
    projectId:        m.projectId,
    projectName:      m.project?.name ?? null,
    agentId:          m.agentId,
    agentName:        m.agent?.name ?? null,
    unitNumber:       m.unitNumber,
    floor:            null,
    salePrice:        m.salePrice,
    currency:         m.currency,
    stage:            null,
    commissionPct:    m.commissionPct,
    commissionAmount: m.commissionAmount,
    commissionStatus: m.status,
    date:             m.commissionDate,
    description:      m.description,
    notes:            m.notes,
  }))

  // Merge and sort by date desc
  const all = [...autoItems, ...manualItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return NextResponse.json(all)
}
