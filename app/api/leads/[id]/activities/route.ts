import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const activity = await prisma.activity.create({
      data: {
        leadId: id,
        type: body.type || 'NOTA',
        description: body.description,
        date: body.date ? new Date(body.date) : new Date(),
      },
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json({ error: 'Error creating activity' }, { status: 500 })
  }
}
