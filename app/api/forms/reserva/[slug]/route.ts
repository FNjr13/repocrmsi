import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const form = await prisma.reservationForm.findUnique({
    where: { slug },
    include: { project: { select: { name: true } } },
  })
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...form,
    sections: JSON.parse(form.sections),
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const form = await prisma.reservationForm.findUnique({ where: { slug } })
  if (!form || !form.isActive) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data = await req.json()
  await prisma.reservationFormSubmission.create({
    data: { formId: form.id, data: JSON.stringify(data) },
  })
  return NextResponse.json({ ok: true })
}
