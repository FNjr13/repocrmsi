import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const pageId = searchParams.get('pageId')

  const logs = await prisma.metaLeadLog.findMany({
    where: pageId ? { pageId } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json(
    logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() }))
  )
}
