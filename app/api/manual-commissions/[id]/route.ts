import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.clientName       !== undefined) data.clientName       = body.clientName
  if (body.projectId        !== undefined) data.projectId        = body.projectId || null
  if (body.agentId          !== undefined) data.agentId          = body.agentId   || null
  if (body.unitNumber       !== undefined) data.unitNumber       = body.unitNumber || null
  if (body.description      !== undefined) data.description      = body.description || null
  if (body.salePrice        !== undefined) data.salePrice        = body.salePrice   !== '' ? Number(body.salePrice) : null
  if (body.currency         !== undefined) data.currency         = body.currency
  if (body.commissionPct    !== undefined) data.commissionPct    = body.commissionPct !== '' ? Number(body.commissionPct) : null
  if (body.commissionAmount !== undefined) data.commissionAmount = Number(body.commissionAmount)
  if (body.status           !== undefined) data.status           = body.status
  if (body.commissionDate   !== undefined) data.commissionDate   = new Date(body.commissionDate)
  if (body.notes            !== undefined) data.notes            = body.notes || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const record = await prisma.manualCommission.update({
    where: { id },
    data,
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
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.manualCommission.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
