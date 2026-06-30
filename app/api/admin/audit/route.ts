import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { isAdminRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.isGuest || !isAdminRole(session.role)) {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const take = Math.min(Number(searchParams.get('take')) || 100, 500)

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take,
  })

  return NextResponse.json(logs)
}
