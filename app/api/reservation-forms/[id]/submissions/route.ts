import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const submissions = await prisma.reservationFormSubmission.findMany({
    where: { formId: id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(
    submissions.map(s => ({ ...s, data: JSON.parse(s.data) }))
  )
}
