import { prisma } from '@/lib/db'
import ReportClient from '@/components/reports/ReportClient'

async function getProjects() {
  return prisma.project.findMany({
    select: { id: true, name: true, location: true, status: true, type: true },
    orderBy: { name: 'asc' },
  })
}

export default async function ReportsPage() {
  const projects = await getProjects()
  return <ReportClient projects={projects} />
}
