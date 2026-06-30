import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

async function recalcProjectCounts(projectId: string) {
  const counts = await prisma.projectUnit.groupBy({
    by: ['status'],
    where: { projectId },
    _count: { status: true },
  })
  const sold = counts.find(c => c.status === 'VENDIDO')?._count.status ?? 0
  const reserved = counts.find(c => c.status === 'RESERVADO')?._count.status ?? 0
  const available = counts.find(c => c.status === 'DISPONIBLE')?._count.status ?? 0
  const unavailable = counts.find(c => c.status === 'NO_DISPONIBLE')?._count.status ?? 0
  const total = sold + reserved + available + unavailable

  await prisma.project.update({
    where: { id: projectId },
    data: { totalUnits: total, soldUnits: sold, reservedUnits: reserved, availableUnits: available },
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const units = await prisma.projectUnit.findMany({
    where: { projectId: id },
    orderBy: [{ floor: 'asc' }, { unitNumber: 'asc' }],
  })
  return NextResponse.json(units)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const unit = await prisma.projectUnit.create({
    data: {
      projectId: id,
      unitNumber: body.unitNumber,
      floor: body.floor ?? null,
      area: body.area ? parseFloat(body.area) : null,
      rooms: body.rooms ?? null,
      bathrooms: body.bathrooms ?? null,
      type: body.type || 'DEPARTAMENTO',
      status: body.status || 'DISPONIBLE',
      notes: body.notes || null,
    },
  })

  await recalcProjectCounts(id)

  return NextResponse.json(unit)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { unitId, ...data } = body
  const unit = await prisma.projectUnit.update({
    where: { id: unitId },
    data,
  })

  await recalcProjectCounts(id)

  return NextResponse.json(unit)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { unitId } = await req.json()
  await prisma.projectUnit.delete({ where: { id: unitId } })

  await recalcProjectCounts(id)

  return NextResponse.json({ ok: true })
}
