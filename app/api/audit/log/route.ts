import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Sink interno: solo lo llama el middleware (vía event.waitUntil) para registrar
// cada escritura realizada en la plataforma, junto al usuario que la hizo.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, agentName, role, method, path } = body
    if (!method || !path) {
      return NextResponse.json({ error: 'method y path son requeridos' }, { status: 400 })
    }
    await prisma.auditLog.create({
      data: {
        agentId: agentId || null,
        agentName: agentName || 'Desconocido',
        role: role || '—',
        method,
        path,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error logging audit entry:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
