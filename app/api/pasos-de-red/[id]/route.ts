import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PasoDeRed" (
      "id"               TEXT NOT NULL,
      "clientName"       TEXT NOT NULL,
      "clientPhone"      TEXT,
      "clientEmail"      TEXT,
      "source"           TEXT NOT NULL DEFAULT 'OTRO',
      "referredBy"       TEXT,
      "jobType"          TEXT NOT NULL DEFAULT 'OTRO',
      "description"      TEXT,
      "amount"           DOUBLE PRECISION,
      "currency"         TEXT NOT NULL DEFAULT 'USD',
      "commissionPct"    DOUBLE PRECISION,
      "commissionAmount" DOUBLE PRECISION,
      "status"           TEXT NOT NULL DEFAULT 'NUEVO',
      "startDate"        TIMESTAMP(3),
      "endDate"          TIMESTAMP(3),
      "agentId"          TEXT,
      "notes"            TEXT,
      "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PasoDeRed_pkey" PRIMARY KEY ("id")
    )
  `)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureTable()
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.clientName       !== undefined) data.clientName       = body.clientName
  if (body.clientPhone      !== undefined) data.clientPhone      = body.clientPhone      || null
  if (body.clientEmail      !== undefined) data.clientEmail      = body.clientEmail      || null
  if (body.source           !== undefined) data.source           = body.source
  if (body.referredBy       !== undefined) data.referredBy       = body.referredBy       || null
  if (body.jobType          !== undefined) data.jobType          = body.jobType
  if (body.description      !== undefined) data.description      = body.description      || null
  if (body.amount           !== undefined) data.amount           = body.amount !== '' ? Number(body.amount) : null
  if (body.currency         !== undefined) data.currency         = body.currency
  if (body.commissionPct    !== undefined) data.commissionPct    = body.commissionPct    !== '' ? Number(body.commissionPct)    : null
  if (body.commissionAmount !== undefined) data.commissionAmount = body.commissionAmount !== '' ? Number(body.commissionAmount) : null
  if (body.status           !== undefined) data.status           = body.status
  if (body.startDate        !== undefined) data.startDate        = body.startDate ? new Date(body.startDate) : null
  if (body.endDate          !== undefined) data.endDate          = body.endDate   ? new Date(body.endDate)   : null
  if (body.agentId          !== undefined) data.agentId          = body.agentId   || null
  if (body.notes            !== undefined) data.notes            = body.notes     || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const record = await prisma.pasoDeRed.update({
    where: { id },
    data,
    include: { agent: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ ...record, agentName: record.agent?.name ?? null })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.pasoDeRed.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
