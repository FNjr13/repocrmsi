import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unread') === 'true'

  const notifications = await prisma.notification.findMany({
    where: unreadOnly ? { isRead: false } : {},
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const unreadCount = await prisma.notification.count({ where: { isRead: false } })

  return NextResponse.json({ notifications, unreadCount })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()

  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { isRead: false },
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
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (id) {
    await prisma.notification.delete({ where: { id } })
  } else {
    await prisma.notification.deleteMany({ where: { isRead: true } })
  }

  return NextResponse.json({ ok: true })
}
