import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params

  const messages = await prisma.whatsAppMessage.findMany({
    where: { leadId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(messages.map(m => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  })))
}
