import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  const leadId = req.nextUrl.searchParams.get('leadId')
  const category = req.nextUrl.searchParams.get('category')

  const where: Record<string, unknown> = {}
  if (projectId) where.projectId = projectId
  if (leadId) where.leadId = leadId
  if (category) where.category = category

  const docs = await prisma.document.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(docs)
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const name = formData.get('name') as string
  const category = (formData.get('category') as string) || 'GENERAL'
  const projectId = formData.get('projectId') as string | null
  const leadId = formData.get('leadId') as string | null
  const uploadedBy = formData.get('uploadedBy') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Save to public/uploads
  const uploadsDir = join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadsDir, { recursive: true })

  const timestamp = Date.now()
  const safeFileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const filePath = join(uploadsDir, safeFileName)
  await writeFile(filePath, buffer)

  const doc = await prisma.document.create({
    data: {
      name: name || file.name,
      fileName: safeFileName,
      mimeType: file.type,
      size: file.size,
      url: `/uploads/${safeFileName}`,
      category,
      projectId: projectId || null,
      leadId: leadId || null,
      uploadedBy: uploadedBy || null,
    },
  })

  return NextResponse.json(doc)
}
