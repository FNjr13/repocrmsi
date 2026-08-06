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

export async function GET(req: NextRequest) {
  await ensureTable()
  const { searchParams } = new URL(req.url)
  const agentId  = searchParams.get('agentId')  || undefined
  const status   = searchParams.get('status')   || undefined
  const source   = searchParams.get('source')   || undefined
  const jobType  = searchParams.get('jobType')  || undefined
  const fromStr  = searchParams.get('from')
  const toStr    = searchParams.get('to')
  const from = fromStr ? new Date(fromStr) : undefined
  const to   = toStr   ? new Date(toStr)   : undefined
  if (to) to.setHours(23, 59, 59, 999)

  const dateFilter = from || to
    ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
    : undefined

  const items = await prisma.pasoDeRed.findMany({
    where: {
      ...(agentId  ? { agentId }  : {}),
      ...(status   ? { status }   : {}),
      ...(source   ? { source }   : {}),
      ...(jobType  ? { jobType }  : {}),
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    include: {
      agent: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(items.map(r => ({
    ...r,
    agentName: r.agent?.name ?? null,
  })))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    clientName, clientPhone, clientEmail,
    source, referredBy, jobType, description,
    amount, currency, commissionPct, commissionAmount,
    status, startDate, endDate, agentId, notes,
  } = body

  if (!clientName) {
    return NextResponse.json({ error: 'clientName es requerido' }, { status: 400 })
  }

  const record = await prisma.pasoDeRed.create({
    data: {
      clientName,
      clientPhone:      clientPhone      || null,
      clientEmail:      clientEmail      || null,
      source:           source           || 'OTRO',
      referredBy:       referredBy       || null,
      jobType:          jobType          || 'OTRO',
      description:      description      || null,
      amount:           typeof amount === 'number' ? amount : null,
      currency:         currency         || 'USD',
      commissionPct:    typeof commissionPct    === 'number' ? commissionPct    : null,
      commissionAmount: typeof commissionAmount === 'number' ? commissionAmount : null,
      status:           status           || 'NUEVO',
      startDate:        startDate ? new Date(startDate) : null,
      endDate:          endDate   ? new Date(endDate)   : null,
      agentId:          agentId   || null,
      notes:            notes     || null,
    },
    include: { agent: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ ...record, agentName: record.agent?.name ?? null }, { status: 201 })
}
