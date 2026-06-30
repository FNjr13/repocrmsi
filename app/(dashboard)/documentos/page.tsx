import { prisma } from '@/lib/db'
import DocumentosClient from '@/components/documentos/DocumentosClient'

export const dynamic = 'force-dynamic'

export default async function DocumentosPage() {
  const [docs, projects] = await Promise.all([
    prisma.document.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.project.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const serialized = docs.map(d => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }))

  return <DocumentosClient initialDocs={serialized} projects={projects} />
}
