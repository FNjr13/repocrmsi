import { prisma } from '@/lib/db'
import InversoresClient from '@/components/inversores/InversoresClient'

export const metadata = { title: 'Brokers Externos · SI CRM' }

export default async function InversoresPage() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, type: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl">🤝</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Brokers Externos</h1>
            <p className="text-xs text-gray-500">Bienes raíces externos que venden nuestros proyectos</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <InversoresClient projects={projects} />
      </div>
    </div>
  )
}
