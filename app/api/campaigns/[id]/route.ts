import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.budget !== undefined && { budget: Number(body.budget) }),
      ...(body.spent !== undefined && { spent: Number(body.spent) }),
      ...(body.impressions !== undefined && { impressions: Number(body.impressions) }),
      ...(body.clicks !== undefined && { clicks: Number(body.clicks) }),
      ...(body.leads !== undefined && { leads: Number(body.leads) }),
      ...(body.conversions !== undefined && { conversions: Number(body.conversions) }),
      ...(body.status !== undefined && { status: body.status }),
    },
  })
  return NextResponse.json(campaign)
}
