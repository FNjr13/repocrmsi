import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { isAdminRole } from '@/lib/auth'
import ActividadClient from '@/components/admin/ActividadClient'

export default async function ActividadPage() {
  const session = await getSession()
  if (!session || session.isGuest || !isAdminRole(session.role)) {
    redirect('/dashboard')
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const serialized = logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() }))

  return <ActividadClient initialLogs={serialized} />
}
