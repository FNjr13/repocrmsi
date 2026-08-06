import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

const ENSURE_SQL = `
  CREATE TABLE IF NOT EXISTS "ChatRoom" (
    "id"        TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "name"      TEXT,
    "slug"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "ChatRoom_slug_key" ON "ChatRoom"("slug");

  CREATE TABLE IF NOT EXISTS "ChatRoomMember" (
    "id"       TEXT NOT NULL,
    "roomId"   TEXT NOT NULL,
    "agentId"  TEXT NOT NULL,
    "lastRead" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatRoomMember_pkey" PRIMARY KEY ("id")
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "ChatRoomMember_roomId_agentId_key" ON "ChatRoomMember"("roomId", "agentId");

  CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id"         TEXT NOT NULL,
    "roomId"     TEXT NOT NULL,
    "senderId"   TEXT NOT NULL,
    "content"    TEXT NOT NULL,
    "type"       TEXT NOT NULL DEFAULT 'TEXT',
    "taskDone"   BOOLEAN NOT NULL DEFAULT false,
    "reminderAt" TIMESTAMP(3),
    "isPinned"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
  );
`

async function ensureTables() {
  await prisma.$executeRawUnsafe(ENSURE_SQL)
}

async function ensureGeneralRoom() {
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ChatRoom" WHERE slug = 'general' LIMIT 1
  `
  if (existing.length === 0) {
    const id = `room_${Date.now()}_general`
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ChatRoom" ("id","type","name","slug","createdAt") VALUES ($1,'GENERAL','General','general',NOW())`,
      id
    )
  }
}

export async function GET() {
  await ensureTables()
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureGeneralRoom()

  const agentId: string = session.agentId ?? ''

  const rooms = await prisma.$queryRaw<{
    id: string; type: string; name: string | null; slug: string;
    lastRead: Date | null; unread: bigint; lastMsg: string | null; lastMsgAt: Date | null;
  }[]>`
    SELECT
      r.id, r.type, r.name, r.slug,
      m."lastRead",
      COALESCE((
        SELECT COUNT(*) FROM "ChatMessage" msg
        WHERE msg."roomId" = r.id
          AND msg."createdAt" > COALESCE(m."lastRead", '1970-01-01')
      ), 0) AS unread,
      (SELECT content FROM "ChatMessage" msg WHERE msg."roomId" = r.id ORDER BY msg."createdAt" DESC LIMIT 1) AS "lastMsg",
      (SELECT "createdAt" FROM "ChatMessage" msg WHERE msg."roomId" = r.id ORDER BY msg."createdAt" DESC LIMIT 1) AS "lastMsgAt"
    FROM "ChatRoom" r
    LEFT JOIN "ChatRoomMember" m ON m."roomId" = r.id AND m."agentId" = ${agentId}
    WHERE r.type = 'GENERAL'
       OR EXISTS (SELECT 1 FROM "ChatRoomMember" mb WHERE mb."roomId" = r.id AND mb."agentId" = ${agentId})
    ORDER BY "lastMsgAt" DESC NULLS LAST
  `

  return NextResponse.json(rooms.map(r => ({ ...r, unread: Number(r.unread) })))
}

export async function POST(req: NextRequest) {
  await ensureTables()
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetAgentId } = await req.json()
  if (!targetAgentId) return NextResponse.json({ error: 'targetAgentId requerido' }, { status: 400 })

  const myId: string = session.agentId ?? ''
  const ids = [myId, targetAgentId].sort()
  const slug = `dm-${ids[0]}-${ids[1]}`

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ChatRoom" WHERE slug = ${slug} LIMIT 1
  `

  let roomId: string
  if (existing.length > 0) {
    roomId = existing[0].id
  } else {
    roomId = `room_${Date.now()}_dm`
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ChatRoom" ("id","type","name","slug","createdAt") VALUES ($1,'DIRECT',NULL,$2,NOW())`,
      roomId, slug
    )
    for (const aid of ids) {
      const membId = `mem_${Date.now()}_${aid.slice(-4)}`
      await prisma.$executeRawUnsafe(
        `INSERT INTO "ChatRoomMember" ("id","roomId","agentId","lastRead") VALUES ($1,$2,$3,NOW()) ON CONFLICT DO NOTHING`,
        membId, roomId, aid
      )
    }
  }

  return NextResponse.json({ id: roomId, slug })
}
