import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

function mask(config: { accessToken: string }) {
  return { ...config, accessToken: config.accessToken ? '***' + config.accessToken.slice(-6) : '' }
}

// GET: lista todas las líneas (con el nombre de la asesora asignada), o
// si se pasa ?mine=1, resuelve la línea de la sesión actual (la suya propia
// si tiene una conectada, si no la línea general compartida).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  if (searchParams.get('mine') === '1') {
    const session = await getSession()
    const config = session?.agentId
      ? await prisma.whatsAppConfig.findFirst({
          where: { OR: [{ agentId: session.agentId }, { agentId: null }], isActive: true },
          orderBy: { agentId: 'desc' }, // prioriza la propia (no-null) sobre la general
        })
      : await prisma.whatsAppConfig.findFirst({ where: { agentId: null, isActive: true } })
    return NextResponse.json(config ? mask(config) : null)
  }

  const configs = await prisma.whatsAppConfig.findMany({
    include: { agent: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(configs.map(mask))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { agentId, phoneNumberId, wabaId, accessToken, verifyToken, phoneNumber, displayName } = body

  if (!phoneNumberId || !wabaId || !accessToken) {
    return NextResponse.json({ error: 'phoneNumberId, wabaId y accessToken son requeridos' }, { status: 400 })
  }

  const normalizedAgentId = agentId || null

  try {
    const config = await prisma.whatsAppConfig.create({
      data: {
        agentId: normalizedAgentId,
        phoneNumberId,
        wabaId,
        accessToken,
        verifyToken: verifyToken || 'wh_verify_token',
        phoneNumber: phoneNumber || null,
        displayName: displayName || null,
        isActive: true,
      },
    })
    return NextResponse.json(mask(config))
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ese Phone Number ID ya está conectado, o esa asesora ya tiene una línea asignada' }, { status: 409 })
    }
    console.error('Error creating WhatsApp config:', error)
    return NextResponse.json({ error: 'Error al guardar la configuración' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 })

  if (data.accessToken?.startsWith('***')) delete data.accessToken

  const updated = await prisma.whatsAppConfig.update({ where: { id }, data })
  return NextResponse.json(mask(updated))
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  await prisma.whatsAppConfig.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
