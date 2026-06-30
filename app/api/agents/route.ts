import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    // No enviar el hash de la contraseña al cliente; sí indicar si ya tiene acceso configurado
    const safe = agents.map(({ passwordHash, ...rest }) => ({ ...rest, hasPassword: !!passwordHash }))

    return NextResponse.json(safe)
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json({ error: 'Error fetching agents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, role, password } = body

    if (!name?.trim() || !email?.trim() || !role?.trim()) {
      return NextResponse.json({ error: 'Nombre, email y rol son requeridos' }, { status: 400 })
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    const agent = await prisma.agent.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        role: role.trim(),
        passwordHash,
      },
    })

    return NextResponse.json({
      id: agent.id, name: agent.name, email: agent.email, phone: agent.phone,
      role: agent.role, avatar: agent.avatar, isActive: agent.isActive, createdAt: agent.createdAt,
    })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
    }
    console.error('Error creating agent:', error)
    return NextResponse.json({ error: 'Error creating agent' }, { status: 500 })
  }
}
