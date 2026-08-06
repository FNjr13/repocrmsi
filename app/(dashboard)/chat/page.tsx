import { prisma } from '@/lib/db'
import ChatClient from '@/components/chat/ChatClient'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function ChatPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true, avatar: true },
    orderBy: { name: 'asc' },
  })

  return <ChatClient agents={agents} currentAgentId={session.agentId} currentAgentName={session.name ?? ''} />
}
