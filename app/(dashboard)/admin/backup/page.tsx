import { prisma } from '@/lib/db'
import BackupClient from '@/components/admin/BackupClient'

export const metadata = { title: 'Backups · SI CRM' }

export default async function BackupPage() {
  const [leads, projects, units, reservations, agents, brokers, activities] = await Promise.all([
    prisma.lead.count(),
    prisma.project.count(),
    prisma.projectUnit.count(),
    prisma.reservation.count(),
    prisma.agent.count(),
    prisma.externalBrokerAgent.count(),
    prisma.activity.count(),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">🛡️</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Backups y Respaldos</h1>
            <p className="text-xs text-gray-500">Descarga respaldos del código y de todos los datos del CRM</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <BackupClient counts={{ leads, projects, units, reservations, agents, brokers, activities }} />
      </div>
    </div>
  )
}
