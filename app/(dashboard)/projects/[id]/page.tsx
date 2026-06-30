import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { STATUS_CONFIG, PROJECT_TYPE_CONFIG, STAGE_CONFIG, SOURCE_CONFIG, formatDate, formatPrice } from '@/lib/utils'
import BrokersSection from '@/components/projects/BrokersSection'
import MetasSection from '@/components/projects/MetasSection'
import UnitsSection from '@/components/projects/UnitsSection'

const UNIT_LABEL_BY_TYPE: Record<string, string> = {
  CASAS: 'Lote',
  DEPARTAMENTOS: 'Unidad',
  OFICINAS: 'Oficina',
  MIXTO: 'Unidad',
}

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      leads: {
        include: {
          agent: { select: { id: true, name: true } },
          activities: { orderBy: { date: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      },
      campaigns: {
        orderBy: { startDate: 'desc' },
      },
      brokers: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()

  const statusCfg = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG]
  const typeCfg = PROJECT_TYPE_CONFIG[project.type as keyof typeof PROJECT_TYPE_CONFIG]
  const soldPct = Math.round((project.soldUnits / project.totalUnits) * 100)
  const leadsActive = project.leads.filter(l => !['GANADO', 'PERDIDO'].includes(l.stage)).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600 text-sm">← Proyectos</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600">{project.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
              {typeCfg?.icon || '🏢'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusCfg?.color || ''}`}>
                  {statusCfg?.label}
                </span>
                <span className="text-sm text-gray-500">📍 {project.location}</span>
                <span className="text-sm text-gray-500">{typeCfg?.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total unidades', value: project.totalUnits, color: 'text-gray-900' },
            { label: 'Vendidas', value: `${project.soldUnits} (${soldPct}%)`, color: 'text-green-600' },
            { label: 'Reservadas', value: project.reservedUnits, color: 'text-yellow-600' },
            { label: 'Disponibles', value: project.availableUnits, color: 'text-blue-600' },
            { label: 'Leads activos', value: leadsActive, color: 'text-purple-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Project info */}
          <div className="space-y-5">
            <MetasSection projectId={project.id} />

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Información del Proyecto</h3>
              <div className="space-y-3 text-sm">
                {project.description && <p className="text-gray-600">{project.description}</p>}
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between"><span className="text-gray-500">Precio mín.</span><span className="font-medium">{formatPrice(project.priceMin, project.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Precio máx.</span><span className="font-medium">{formatPrice(project.priceMax, project.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Inicio obras</span><span className="font-medium">{formatDate(project.startDate)}</span></div>
                  {project.deliveryDate && <div className="flex justify-between"><span className="text-gray-500">Entrega</span><span className="font-medium">{formatDate(project.deliveryDate)}</span></div>}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Avance de obra</span>
                  <span className="text-xs font-bold">{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Units bar */}
              <div className="mt-4">
                <div className="flex h-4 rounded-lg overflow-hidden gap-0.5">
                  <div className="bg-green-500" style={{ width: `${Math.round((project.soldUnits / project.totalUnits) * 100)}%` }} />
                  <div className="bg-yellow-400" style={{ width: `${Math.round((project.reservedUnits / project.totalUnits) * 100)}%` }} />
                  <div className="bg-gray-200 flex-1" />
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Vendido</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Reservado</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Disponible</span>
                </div>
              </div>
            </div>

            {/* Campaigns summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Campañas</h3>
              {project.campaigns.length === 0 ? (
                <p className="text-sm text-gray-400">No hay campañas registradas</p>
              ) : (
                <div className="space-y-2">
                  {project.campaigns.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.channel} · {c.leads} leads</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.status === 'ACTIVA' ? 'bg-green-100 text-green-700' :
                        c.status === 'PAUSADA' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Leads list */}
          <div className="col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Leads del Proyecto</h3>
                <span className="text-sm text-gray-500">{project.leads.length} total</span>
              </div>
              <div className="space-y-2">
                {project.leads.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-8">No hay leads para este proyecto</p>
                )}
                {project.leads.map(lead => {
                  const stageCfg = STAGE_CONFIG[lead.stage as keyof typeof STAGE_CONFIG]
                  const sourceCfg = SOURCE_CONFIG[lead.source as keyof typeof SOURCE_CONFIG]
                  return (
                    <Link
                      key={lead.id}
                      href={`/crm/${lead.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {lead.firstName[0]}{lead.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900">{lead.firstName} {lead.lastName}</div>
                        <div className="text-xs text-gray-500">{sourceCfg?.icon} {lead.phone}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {lead.agent && (
                          <span className="text-xs text-gray-500">{lead.agent.name}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageCfg?.color || ''}`}>
                          {stageCfg?.label || lead.stage}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Unidades / Lotes */}
        <div className="mt-6">
          <UnitsSection projectId={project.id} unitLabel={UNIT_LABEL_BY_TYPE[project.type] || 'Unidad'} />
        </div>

        {/* Brokers externos */}
        <BrokersSection
          projectId={project.id}
          initialBrokers={project.brokers}
          totalUnits={project.totalUnits}
          priceMin={project.priceMin}
          priceMax={project.priceMax}
          currency={project.currency ?? 'USD'}
        />
      </div>
    </div>
  )
}
