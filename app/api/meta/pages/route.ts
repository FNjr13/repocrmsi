import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const API_VERSION = process.env.META_API_VERSION || 'v19.0'

export async function GET() {
  const pages = await prisma.metaPageConfig.findMany({
    orderBy: { createdAt: 'desc' },
  })

  // Serializar fechas
  const serialized = pages.map(p => ({
    ...p,
    lastLeadAt: p.lastLeadAt?.toISOString() || null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

  return NextResponse.json(serialized)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Validar que el token funciona antes de guardar
  if (body.accessToken && body.pageId) {
    const valid = await validatePageToken(body.pageId, body.accessToken)
    if (!valid.ok) {
      return NextResponse.json(
        { error: `Token inválido: ${valid.error}` },
        { status: 400 }
      )
    }
  }

  const page = await prisma.metaPageConfig.create({
    data: {
      pageId: body.pageId,
      pageName: body.pageName,
      instagramHandle: body.instagramHandle || null,
      projectId: body.projectId || null,
      agentId: body.agentId || null,
      accessToken: body.accessToken,
      autoAssign: body.autoAssign ?? true,
      isActive: true,
      notes: body.notes || null,
    },
  })

  return NextResponse.json({
    ...page,
    lastLeadAt: page.lastLeadAt?.toISOString() || null,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  }, { status: 201 })
}

// Validar que el token tiene acceso a la página
async function validatePageToken(
  pageId: string,
  accessToken: string
): Promise<{ ok: boolean; error?: string; pageName?: string }> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${pageId}?fields=name,id&access_token=${accessToken}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const data = await res.json()
    if (data.error) return { ok: false, error: data.error.message }
    if (data.id !== pageId) return { ok: false, error: 'El Page ID no coincide con el token' }
    return { ok: true, pageName: data.name }
  } catch (e) {
    return { ok: false, error: `No se pudo conectar con Meta: ${String(e)}` }
  }
}
