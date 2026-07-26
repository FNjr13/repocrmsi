import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { isAdminRole } from '@/lib/auth'

// Filtro de notificaciones para el usuario actual:
// - Notificaciones globales (agentId IS NULL)
// - Notificaciones dirigidas a este agente (agentId = session.agentId)
function userFilter(agentId: string | null) {
  if (!agentId) return { OR: [{ agentId: null }] }
  return { OR: [{ agentId: null }, { agentId }] }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  const agentId = session?.agentId ?? null

  // Admin: puede ver TODAS las notificaciones de admin para el historial
  const { searchParams } = new URL(req.url)
  const adminView = searchParams.get('adminView') === 'true'
  if (adminView && session && isAdminRole(session.role)) {
    const sent = await prisma.notification.findMany({
      where: { sentBy: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ sent })
  }

  const where = userFilter(agentId)

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const unreadCount = await prisma.notification.count({
    where: { ...where, isRead: false },
  })

  return NextResponse.json({ notifications, unreadCount })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !isAdminRole(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { title, message, agentId, emoji } = body

  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Título y mensaje requeridos' }, { status: 400 })
  }

  const icon = emoji || '📣'
  const fullTitle = `${icon} ${title.trim()}`
  const sentBy = session.name

  if (agentId === 'ALL') {
    // Masiva: crear una notificación por cada agente activo
    const agents = await prisma.agent.findMany({ where: { isActive: true } })
    await Promise.all(agents.map(a =>
      prisma.notification.create({
        data: {
          type: 'ADMIN_MESSAGE',
          title: fullTitle,
          message: message.trim(),
          agentId: a.id,
          sentBy,
        },
      })
    ))
    return NextResponse.json({ ok: true, sent: agents.length })
  }

  if (agentId === 'GLOBAL') {
    // Global: una sola notificación que ve todo el mundo (agentId = null)
    await prisma.notification.create({
      data: {
        type: 'ADMIN_MESSAGE',
        title: fullTitle,
        message: message.trim(),
        agentId: null,
        sentBy,
      },
    })
    return NextResponse.json({ ok: true, sent: 1 })
  }

  // Individual: dirigida a un agente específico
  await prisma.notification.create({
    data: {
      type: 'ADMIN_MESSAGE',
      title: fullTitle,
      message: message.trim(),
      agentId,
      sentBy,
    },
  })
  return NextResponse.json({ ok: true, sent: 1 })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  const agentId = session?.agentId ?? null
  const body = await req.json()

  if (body.markAllRead) {
    const where = userFilter(agentId)
    await prisma.notification.updateMany({
      where: { ...where, isRead: false },
      data: { isRead: true },
    })
    return NextResponse.json({ ok: true })
  }

  if (body.id) {
    await prisma.notification.update({
      where: { id: body.id },
      data: { isRead: true },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  const agentId = session?.agentId ?? null
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (id) {
    await prisma.notification.delete({ where: { id } })
  } else {
    const where = userFilter(agentId)
    await prisma.notification.deleteMany({ where: { ...where, isRead: true } })
  }

  return NextResponse.json({ ok: true })
}
