import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.isActive !== undefined) data.isActive = body.isActive
  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.trigger !== undefined) data.trigger = body.trigger
  if (body.triggerValue !== undefined) data.triggerValue = body.triggerValue
  if (body.filterStage !== undefined) data.filterStage = body.filterStage
  if (body.filterTemp !== undefined) data.filterTemp = body.filterTemp
  if (body.action !== undefined) data.action = body.action
  if (body.actionData !== undefined) data.actionData = body.actionData ? JSON.stringify(body.actionData) : null

  const rule = await prisma.automationRule.update({ where: { id }, data })
  return NextResponse.json(rule)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.automationRule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
