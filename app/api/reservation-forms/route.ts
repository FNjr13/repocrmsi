import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = toSlug(base) || 'reserva'
  let exists = await prisma.reservationForm.findUnique({ where: { slug } })
  let i = 2
  while (exists) {
    slug = `${toSlug(base)}-${i++}`
    exists = await prisma.reservationForm.findUnique({ where: { slug } })
  }
  return slug
}

export async function GET() {
  const forms = await prisma.reservationForm.findMany({
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(forms)
}

export async function POST(req: NextRequest) {
  const { name, projectId, sections } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name requerido' }, { status: 400 })

  const slug = await uniqueSlug(name)

  const form = await prisma.reservationForm.create({
    data: {
      slug,
      name: name.trim(),
      projectId: projectId || null,
      sections: JSON.stringify(sections ?? DEFAULT_SECTIONS),
      isActive: true,
    },
    include: { project: { select: { id: true, name: true } } },
  })
  return NextResponse.json(form)
}

const DEFAULT_SECTIONS = [
  {
    id: 's1', title: 'Datos Personales',
    fields: [
      { id: 'f1', label: 'Nombre', type: 'text', required: true },
      { id: 'f2', label: 'Cédula', type: 'text', required: true },
      { id: 'f3', label: 'Fecha de nacimiento', type: 'date', required: false },
      { id: 'f4', label: 'Edad', type: 'number', required: false },
      { id: 'f5', label: 'Celular', type: 'text', required: true },
      { id: 'f6', label: 'Correo', type: 'email', required: false },
      { id: 'f7', label: 'Estado civil', type: 'select', required: false, options: ['Soltero/a', 'Casado/a', 'Unido/a', 'Divorciado/a', 'Viudo/a'] },
      { id: 'f8', label: 'Referencia', type: 'text', required: false },
      { id: 'f9', label: 'Domicilio', type: 'textarea', required: false },
    ],
  },
  {
    id: 's2', title: 'Información Laboral',
    fields: [
      { id: 'f10', label: 'Tipo de empleo', type: 'select', required: false, options: ['Asalariado', 'Independiente'] },
      { id: 'f11', label: 'Lugar de trabajo', type: 'text', required: false },
      { id: 'f12', label: 'Nombre de empresa', type: 'text', required: false },
      { id: 'f13', label: 'Tiempo en el trabajo', type: 'text', required: false },
      { id: 'f14', label: 'Total de ingreso', type: 'text', required: false },
    ],
  },
  {
    id: 's3', title: 'Proyecto',
    fields: [
      { id: 'f15', label: 'Fecha de Reserva', type: 'date', required: true },
      { id: 'f16', label: 'Proyecto', type: 'text', required: false },
      { id: 'f17', label: 'Promotora', type: 'text', required: false },
      { id: 'f18', label: 'Lote o Unidad', type: 'text', required: false },
      { id: 'f19', label: 'Modelo', type: 'text', required: false },
      { id: 'f20', label: 'Precio de venta', type: 'text', required: false },
      { id: 'f21', label: 'Abono en proforma', type: 'text', required: false },
      { id: 'f22', label: 'Promoción', type: 'text', required: false },
    ],
  },
  {
    id: 's4', title: 'Financiamiento',
    fields: [
      { id: 'f23', label: 'Banco', type: 'text', required: false },
      { id: 'f24', label: 'Oficial', type: 'text', required: false },
      { id: 'f25', label: 'Correo', type: 'email', required: false },
    ],
  },
]
