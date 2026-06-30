import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const doc = await prisma.document.update({ where: { id }, data: body })
  return NextResponse.json(doc)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete file from disk
  try {
    const filePath = join(process.cwd(), 'public', doc.url)
    await unlink(filePath)
  } catch {
    // File may not exist on disk, continue
  }

  await prisma.document.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
