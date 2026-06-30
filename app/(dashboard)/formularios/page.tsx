import { prisma } from '@/lib/db'
import FormulariosClient from '@/components/formularios/FormulariosClient'

export const dynamic = 'force-dynamic'

export default async function FormulariosPage() {
  const [forms, projects] = await Promise.all([
    prisma.publicForm.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  const serialized = forms.map(f => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }))

  return <FormulariosClient initialForms={serialized} projects={projects} />
}
