import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  try {
    const { goalId } = await params
    const body = await request.json()
    const { label, target, current } = body

    const item = await prisma.projectGoalItem.update({
      where: { id: goalId },
      data: {
        ...(label !== undefined && { label: label.trim() }),
        ...(target !== undefined && { target: Number(target) || 0 }),
        ...(current !== undefined && { current: Number(current) || 0 }),
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating project goal:', error)
    return NextResponse.json({ error: 'Error updating project goal' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  try {
    const { goalId } = await params
    await prisma.projectGoalItem.delete({ where: { id: goalId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project goal:', error)
    return NextResponse.json({ error: 'Error deleting project goal' }, { status: 500 })
  }
}
