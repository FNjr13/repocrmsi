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

  const senderId: string = session.agentId ?? ''
  const senderName: string = session.name ?? 'Alguien'
  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ChatMessage" ("id","roomId","senderId","content","type","taskDone","reminderAt","isPinned","createdAt")
     VALUES ($1,$2,$3,$4,$5,false,$6,false,NOW())`,
    id, roomId, senderId, content.trim(), type,
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

  // ── Notifications ────────────────────────────────────────────────────────
  try {
    const [room] = await prisma.$queryRaw<{ type: string }[]>`
      SELECT type FROM "ChatRoom" WHERE id = ${roomId} LIMIT 1
    `

    const trimmed = content.trim().slice(0, 120)

    // Parse @mentions (e.g. @Juan → 'juan')
    const mentionTokens = [...(content.match(/@(\w+)/g) ?? [])].map(m => m.slice(1).toLowerCase())
    const notifiedIds = new Set<string>()

    if (mentionTokens.length > 0) {
      const allAgents = await prisma.agent.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      })
      for (const token of mentionTokens) {
        const matched = allAgents.find(a =>
          a.name.toLowerCase().startsWith(token) || a.name.toLowerCase().includes(token)
        )
        if (matched && matched.id !== senderId && !notifiedIds.has(matched.id)) {
          notifiedIds.add(matched.id)
          await prisma.notification.create({
            data: {
              type:    'CHAT_MESSAGE',
              title:   `📣 ${senderName} te mencionó`,
              message: trimmed,
              agentId: matched.id,
              sentBy:  senderName,
            },
          })
        }
      }
    }

    if (room?.type === 'DIRECT') {
      // Notify DM recipient (if not already notified via mention)
      const members = await prisma.$queryRaw<{ agentId: string }[]>`
        SELECT "agentId" FROM "ChatRoomMember"
        WHERE "roomId" = ${roomId} AND "agentId" != ${senderId}
      `
      for (const m of members) {
        if (notifiedIds.has(m.agentId)) continue
        await prisma.notification.create({
          data: {
            type:    'CHAT_MESSAGE',
            title:   `💬 Mensaje de ${senderName}`,
            message: trimmed,
            agentId: m.agentId,
            sentBy:  senderName,
          },
        })
      }
    } else if (room?.type === 'GENERAL') {
      // Notify all active agents except sender and already-mentioned
      const allAgents = await prisma.agent.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      for (const agent of allAgents) {
        if (agent.id === senderId || notifiedIds.has(agent.id)) continue
        await prisma.notification.create({
          data: {
            type:    'CHAT_MESSAGE',
            title:   `💬 ${senderName} en #General`,
            message: trimmed,
            agentId: agent.id,
            sentBy:  senderName,
          },
        })
      }
    }
  } catch { /* non-critical — message already created */ }

  return NextResponse.json(msg, { status: 201 })
}
