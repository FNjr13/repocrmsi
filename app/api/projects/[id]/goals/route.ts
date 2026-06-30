import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const now = new Date()
    const month = Number(searchParams.get('month')) || now.getMonth() + 1
    const year = Number(searchParams.get('year')) || now.getFullYear()

    const items = await prisma.projectGoalItem.findMany({
      where: { projectId: id, month, year },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching project goals:', error)
    return NextResponse.json({ error: 'Error fetching project goals' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { month, year, label, target, current } = body

    if (!month || !year || !label?.trim()) {
      return NextResponse.json({ error: 'month, year y label son requeridos' }, { status: 400 })
    }

    const count = await prisma.projectGoalItem.count({ where: { projectId: id, month, year } })

    const item = await prisma.projectGoalItem.create({
      data: {
        projectId: id,
        month,
        year,
        label: label.trim(),
        target: Number(target) || 0,
        current: Number(current) || 0,
        order: count,
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error creating project goal:', error)
    return NextResponse.json({ error: 'Error creating project goal' }, { status: 500 })
  }
}
