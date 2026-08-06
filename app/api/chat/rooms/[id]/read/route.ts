import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: roomId } = await params

  // Upsert membership + update lastRead
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ChatRoomMember" WHERE "roomId" = ${roomId} AND "agentId" = ${session.agentId} LIMIT 1
  `

  if (existing.length > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE "ChatRoomMember" SET "lastRead" = NOW() WHERE id = $1`,
      existing[0].id
    )
  } else {
    const id = `mem_${Date.now()}_${session.agentId.slice(-4)}`
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ChatRoomMember" ("id","roomId","agentId","lastRead") VALUES ($1,$2,$3,NOW()) ON CONFLICT DO NOTHING`,
      id, roomId, session.agentId
    )
  }

  return NextResponse.json({ ok: true })
}
