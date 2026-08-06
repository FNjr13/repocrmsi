import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const parts: string[] = []
  const vals: unknown[] = []
  let idx = 1

  if (body.taskDone !== undefined) { parts.push(`"taskDone" = $${idx++}`); vals.push(body.taskDone) }
  if (body.isPinned !== undefined) { parts.push(`"isPinned" = $${idx++}`); vals.push(body.isPinned) }

  if (parts.length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  vals.push(id)
  await prisma.$executeRawUnsafe(
    `UPDATE "ChatMessage" SET ${parts.join(', ')} WHERE id = $${idx}`,
    ...vals
  )

  const [msg] = await prisma.$queryRaw<{
    id: string; roomId: string; senderId: string; senderName: string;
    content: string; type: string; taskDone: boolean;
    reminderAt: Date | null; isPinned: boolean; createdAt: Date;
  }[]>`
    SELECT msg.id, msg."roomId", msg."senderId",
           a.name AS "senderName",
           msg.content, msg.type, msg."taskDone",
           msg."reminderAt", msg."isPinned", msg."createdAt"
    FROM "ChatMessage" msg
    JOIN "Agent" a ON a.id = msg."senderId"
    WHERE msg.id = ${id}
  `
  return NextResponse.json(msg)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [msg] = await prisma.$queryRaw<{ senderId: string }[]>`
    SELECT "senderId" FROM "ChatMessage" WHERE id = ${id} LIMIT 1
  `

  if (!msg) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (msg.senderId !== session.agentId && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  await prisma.$executeRawUnsafe(`DELETE FROM "ChatMessage" WHERE id = $1`, id)
  return NextResponse.json({ ok: true })
}
