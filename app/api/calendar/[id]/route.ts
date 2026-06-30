import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.date !== undefined && { date: new Date(body.date) }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.allDay !== undefined && { allDay: body.allDay }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.agentId !== undefined && { agentId: body.agentId || null }),
      ...(body.leadId !== undefined && { leadId: body.leadId || null }),
      ...(body.projectId !== undefined && { projectId: body.projectId || null }),
    },
    include: {
      agent: { select: { id: true, name: true } },
      lead: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(event)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.calendarEvent.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
