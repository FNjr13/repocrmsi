import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const sequences = await prisma.automationSequence.findMany({
    orderBy: { createdAt: 'desc' },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  })
  return NextResponse.json(sequences)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, triggerType, triggerValue, filterTemp, filterStage, steps } = body

  const sequence = await prisma.automationSequence.create({
    data: {
      name, description: description || null,
      triggerType, triggerValue: triggerValue || null,
      filterTemp: filterTemp || null, filterStage: filterStage || null,
      steps: {
        create: (steps || []).map((s: { stepOrder: number; dayOffset: number; actionType: string; actionData: Record<string, unknown> }, i: number) => ({
          stepOrder: s.stepOrder ?? i,
          dayOffset: s.dayOffset ?? 0,
          actionType: s.actionType,
          actionData: JSON.stringify(s.actionData || {}),
        })),
      },
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  })

  return NextResponse.json(sequence)
}
