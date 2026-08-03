import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { clientName, projectId, agentId, unitNumber, description,
          salePrice, currency, commissionPct, commissionAmount,
          status, commissionDate, notes } = body

  if (!clientName || typeof commissionAmount !== 'number') {
    return NextResponse.json({ error: 'clientName y commissionAmount son requeridos' }, { status: 400 })
  }

  const record = await prisma.manualCommission.create({
    data: {
      clientName,
      projectId:        projectId   || null,
      agentId:          agentId     || null,
      unitNumber:       unitNumber  || null,
      description:      description || null,
      salePrice:        typeof salePrice === 'number' ? salePrice : null,
      currency:         currency    || 'USD',
      commissionPct:    typeof commissionPct === 'number' ? commissionPct : null,
      commissionAmount,
      status:           status      || 'PENDIENTE',
      commissionDate:   commissionDate ? new Date(commissionDate) : new Date(),
      notes:            notes       || null,
    },
    include: {
      agent:   { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({
    id:               record.id,
    source:           'MANUAL',
    clientName:       record.clientName,
    projectId:        record.projectId,
    projectName:      record.project?.name ?? null,
    agentId:          record.agentId,
    agentName:        record.agent?.name ?? null,
    unitNumber:       record.unitNumber,
    floor:            null,
    salePrice:        record.salePrice,
    currency:         record.currency,
    stage:            null,
    commissionPct:    record.commissionPct,
    commissionAmount: record.commissionAmount,
    commissionStatus: record.status,
    date:             record.commissionDate,
    description:      record.description,
    notes:            record.notes,
  }, { status: 201 })
}
