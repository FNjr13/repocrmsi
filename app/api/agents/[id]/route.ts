import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [agent, leads] = await Promise.all([
      prisma.agent.findUnique({ where: { id } }),
      prisma.lead.findMany({
        where: { agentId: id },
        include: {
          project: { select: { id: true, name: true } },
          activities: { orderBy: { date: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const stats = {
      totalLeads: leads.length,
      activeLeads: leads.filter(l => !['GANADO', 'PERDIDO'].includes(l.stage)).length,
      wonLeads: leads.filter(l => l.stage === 'GANADO').length,
      lostLeads: leads.filter(l => l.stage === 'PERDIDO').length,
      conversionRate: leads.length > 0
        ? ((leads.filter(l => l.stage === 'GANADO').length / leads.length) * 100).toFixed(1)
        : '0.0',
    }

    const { passwordHash, ...safeAgent } = agent
    return NextResponse.json({ agent: { ...safeAgent, hasPassword: !!passwordHash }, leads, stats })
  } catch (error) {
    console.error('Error fetching agent:', error)
    return NextResponse.json({ error: 'Error fetching agent' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, phone, role, isActive, password } = body

    if (password !== undefined && password.length < 4) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 })
    }

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(role !== undefined && { role: role.trim() }),
        ...(isActive !== undefined && { isActive }),
        ...(password !== undefined && { passwordHash: await hashPassword(password) }),
      },
    })

    const { passwordHash, ...safeAgent } = agent
    return NextResponse.json({ ...safeAgent, hasPassword: !!passwordHash })
  } catch (error) {
    console.error('Error updating agent:', error)
    return NextResponse.json({ error: 'Error updating agent' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [leadCount, reservationCount, eventCount] = await Promise.all([
      prisma.lead.count({ where: { agentId: id } }),
      prisma.reservation.count({ where: { agentId: id } }),
      prisma.calendarEvent.count({ where: { agentId: id } }),
    ])

    if (leadCount > 0 || reservationCount > 0 || eventCount > 0) {
      return NextResponse.json({
        error: `No se puede eliminar: tiene ${leadCount} lead(s), ${reservationCount} reserva(s) y ${eventCount} evento(s) asociados. Desactívalo en su lugar para conservar el historial.`,
      }, { status: 409 })
    }

    await prisma.agent.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting agent:', error)
    return NextResponse.json({ error: 'Error deleting agent' }, { status: 500 })
  }
}
