import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const record = await prisma.marketingRecord.update({
    where: { id },
    data: {
      projectId: body.projectId ?? undefined,
      channel: body.channel ?? undefined,
      period: body.period ?? undefined,
      date: body.date ? new Date(body.date) : undefined,
      spend: body.spend !== undefined ? Number(body.spend) : undefined,
      impressions: body.impressions !== undefined ? Number(body.impressions) : undefined,
      reach: body.reach !== undefined ? Number(body.reach) : undefined,
      clicks: body.clicks !== undefined ? Number(body.clicks) : undefined,
      leads: body.leads !== undefined ? Number(body.leads) : undefined,
      conversions: body.conversions !== undefined ? Number(body.conversions) : undefined,
      notes: body.notes ?? undefined,
    },
    include: { project: { select: { id: true, name: true } } },
  })
  return NextResponse.json(record)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.marketingRecord.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
