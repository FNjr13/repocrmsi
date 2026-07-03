import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.projectId !== undefined) data.projectId = body.projectId || null
  if (body.sections !== undefined) data.sections = JSON.stringify(body.sections)
  if (body.isActive !== undefined) data.isActive = body.isActive

  const form = await prisma.reservationForm.update({
    where: { id },
    data,
    include: { project: { select: { id: true, name: true } } },
  })
  return NextResponse.json(form)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.reservationForm.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
