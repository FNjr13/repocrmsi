import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { isAdminRole } from '@/lib/auth'
import UsuariosClient from '@/components/admin/UsuariosClient'

export default async function UsuariosPage() {
  const session = await getSession()
  if (!session || session.isGuest || !isAdminRole(session.role)) {
    redirect('/dashboard')
  }

  const agents = await prisma.agent.findMany({ orderBy: { name: 'asc' } })

  const users = agents.map(({ passwordHash, createdAt, ...rest }) => ({
    ...rest,
    hasPassword: !!passwordHash,
    createdAt: createdAt.toISOString(),
  }))

  return <UsuariosClient initialUsers={users} currentUserId={session.agentId} />
}
