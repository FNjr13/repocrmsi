import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ManualCommission" (
      "id"               TEXT NOT NULL,
      "clientName"       TEXT NOT NULL,
      "projectId"        TEXT,
      "agentId"          TEXT,
      "unitNumber"       TEXT,
      "description"      TEXT,
      "salePrice"        DOUBLE PRECISION,
      "currency"         TEXT NOT NULL DEFAULT 'USD',
      "commissionPct"    DOUBLE PRECISION,
      "commissionAmount" DOUBLE PRECISION NOT NULL,
      "status"           TEXT NOT NULL DEFAULT 'PENDIENTE',
      "commissionDate"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "notes"            TEXT,
      "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ManualCommission_pkey" PRIMARY KEY ("id")
    )
  `)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { clientName, projectId, agentId, unitNumber, description,
          salePrice, currency, commissionPct, commissionAmount,
          status, commissionDate, notes } = body

  if (!clientName || typeof commissionAmount !== 'number') {
    return NextResponse.json({ error: 'clientName y commissionAmount son requeridos' }, { status: 400 })
  }

  // Crea la tabla si no existe antes de insertar
  await ensureTable()

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
