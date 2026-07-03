import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

// GET: devuelve las plantillas de la asesora en sesión + las compartidas (agentId null)
export async function GET() {
  const session = await getSession()
  const templates = await prisma.messageTemplate.findMany({
    where: {
      OR: [
        { agentId: session?.agentId ?? undefined },
        { agentId: null },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  const { label, text } = await req.json()
  if (!label?.trim() || !text?.trim()) {
    return NextResponse.json({ error: 'label y text son requeridos' }, { status: 400 })
  }
  const template = await prisma.messageTemplate.create({
    data: {
      agentId: session?.agentId ?? null,
      label: label.trim(),
      text: text.trim(),
    },
  })
  return NextResponse.json(template)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  const { id, label, text } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  // Solo puede editar la suya propia (o el admin edita compartidas)
  const existing = await prisma.messageTemplate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (existing.agentId && existing.agentId !== session?.agentId) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const updated = await prisma.messageTemplate.update({
    where: { id },
    data: { label: label?.trim(), text: text?.trim() },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const existing = await prisma.messageTemplate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (existing.agentId && existing.agentId !== session?.agentId) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  await prisma.messageTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
