import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')
  const since  = searchParams.get('since')

  if (!roomId) return NextResponse.json({ error: 'roomId requerido' }, { status: 400 })

  const sinceClause = since
    ? `AND msg."createdAt" > '${new Date(since).toISOString()}'`
    : ''

  const messages = await prisma.$queryRawUnsafe<{
    id: string; roomId: string; senderId: string; senderName: string;
    content: string; type: string; taskDone: boolean;
    reminderAt: Date | null; isPinned: boolean; createdAt: Date;
  }[]>(`
    SELECT msg.id, msg."roomId", msg."senderId",
           a.name AS "senderName",
           msg.content, msg.type, msg."taskDone",
           msg."reminderAt", msg."isPinned", msg."createdAt"
    FROM "ChatMessage" msg
    JOIN "Agent" a ON a.id = msg."senderId"
    WHERE msg."roomId" = $1 ${sinceClause}
    ORDER BY msg."createdAt" ASC
    LIMIT 200
  `, roomId)

  return NextResponse.json(messages)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { roomId, content, type = 'TEXT', reminderAt } = body

  if (!roomId || !content?.trim()) {
    return NextResponse.json({ error: 'roomId y content son requeridos' }, { status: 400 })
  }

  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ChatMessage" ("id","roomId","senderId","content","type","taskDone","reminderAt","isPinned","createdAt")
     VALUES ($1,$2,$3,$4,$5,false,$6,false,NOW())`,
    id, roomId, session.agentId, content.trim(), type,
    reminderAt ? new Date(reminderAt) : null
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

  return NextResponse.json(msg, { status: 201 })
}
