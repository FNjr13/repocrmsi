import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const rules = await prisma.automationRule.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const rule = await prisma.automationRule.create({
    data: {
      name: body.name,
      description: body.description || null,
      trigger: body.trigger,
      triggerValue: body.triggerValue || null,
      filterStage: body.filterStage || null,
      filterTemp: body.filterTemp || null,
      action: body.action,
      actionData: body.actionData ? JSON.stringify(body.actionData) : null,
      isActive: body.isActive ?? true,
    },
  })
  return NextResponse.json(rule, { status: 201 })
}
