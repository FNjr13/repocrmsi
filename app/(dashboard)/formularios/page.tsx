import { prisma } from '@/lib/db'
import FormulariosTabLayout from '@/components/formularios/FormulariosTabLayout'
import type { FormSection } from '@/components/formularios/ReservationFormsClient'

export const dynamic = 'force-dynamic'

export default async function FormulariosPage() {
  const [forms, projects, reservationForms] = await Promise.all([
    prisma.publicForm.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.reservationForm.findMany({
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <FormulariosTabLayout
      publicForms={forms.map(f => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      }))}
      reservationForms={reservationForms.map(f => ({
        ...f,
        sections: JSON.parse(f.sections) as FormSection[],
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      }))}
      projects={projects}
    />
  )
}
