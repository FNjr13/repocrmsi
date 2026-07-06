import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const records = await prisma.marketingRecord.findMany({
    include: { project: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const record = await prisma.marketingRecord.create({
    data: {
      projectId: body.projectId || null,
      channel: body.channel,
      period: body.period || 'MENSUAL',
      date: new Date(body.date),
      spend: Number(body.spend) || 0,
      impressions: Number(body.impressions) || 0,
      reach: Number(body.reach) || 0,
      clicks: Number(body.clicks) || 0,
      leads: Number(body.leads) || 0,
      conversions: Number(body.conversions) || 0,
      notes: body.notes || null,
    },
    include: { project: { select: { id: true, name: true } } },
  })
  return NextResponse.json(record)
}
