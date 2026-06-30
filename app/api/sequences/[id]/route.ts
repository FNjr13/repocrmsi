import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { steps, ...data } = body

  const sequence = await prisma.automationSequence.update({
    where: { id },
    data: {
      ...data,
      ...(steps !== undefined && {
        steps: {
          deleteMany: {},
          create: steps.map((s: { stepOrder: number; dayOffset: number; actionType: string; actionData: Record<string, unknown> }, i: number) => ({
            stepOrder: s.stepOrder ?? i,
            dayOffset: s.dayOffset ?? 0,
            actionType: s.actionType,
            actionData: JSON.stringify(s.actionData || {}),
          })),
        },
      }),
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  })

  return NextResponse.json(sequence)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.automationSequence.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
