import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.pageName !== undefined) data.pageName = body.pageName
  if (body.instagramHandle !== undefined) data.instagramHandle = body.instagramHandle || null
  if (body.projectId !== undefined) data.projectId = body.projectId || null
  if (body.agentId !== undefined) data.agentId = body.agentId || null
  if (body.accessToken !== undefined) data.accessToken = body.accessToken
  if (body.autoAssign !== undefined) data.autoAssign = body.autoAssign
  if (body.isActive !== undefined) data.isActive = body.isActive
  if (body.notes !== undefined) data.notes = body.notes || null

  const page = await prisma.metaPageConfig.update({
    where: { id },
    data,
  })

  return NextResponse.json({
    ...page,
    lastLeadAt: page.lastLeadAt?.toISOString() || null,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.metaPageConfig.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
