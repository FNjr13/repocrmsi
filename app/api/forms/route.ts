import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const forms = await prisma.publicForm.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(forms)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, subtitle, projectId, type, theme, slug: customSlug } = body

  // Generate unique slug
  const base = customSlug || title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40)
  let slug = base
  let count = 0
  while (await prisma.publicForm.findUnique({ where: { slug } })) {
    count++
    slug = `${base}-${count}`
  }

  const form = await prisma.publicForm.create({
    data: {
      slug, title, subtitle: subtitle || null,
      projectId: projectId || null, type: type || 'GENERAL',
      theme: theme || 'blue',
    },
  })
  return NextResponse.json(form)
}
