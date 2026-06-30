import { prisma } from '@/lib/db'
import Link from 'next/link'
import { STATUS_CONFIG, PROJECT_TYPE_CONFIG, formatPrice } from '@/lib/utils'

async function getProjects() {
  return prisma.project.findMany({
    include: {
      _count: { select: { leads: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export default async function ProjectsPage() {
  const projects = await getProjects()

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-500 mt-1">{projects.length} proyectos activos</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {projects.map((project) => {
          const statusCfg = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG]
          const typeCfg = PROJECT_TYPE_CONFIG[project.type as keyof typeof PROJECT_TYPE_CONFIG]
          const soldPct = Math.round((project.soldUnits / project.totalUnits) * 100)
          const reservedPct = Math.round((project.reservedUnits / project.totalUnits) * 100)

          return (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
                {/* Header gradient */}
                <div className={`h-3 w-full ${
                  project.status === 'ENTREGADO' ? 'bg-gray-400' :
                  project.status === 'PREVENTA' ? 'bg-violet-500' : 'bg-green-500'
                }`} />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">
                        {typeCfg?.icon || '🏢'}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          📍 {project.location}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusCfg?.color || ''}`}>
                      {statusCfg?.label || project.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500 font-medium">Avance de obra</span>
                      <span className="text-xs font-bold text-gray-700">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Units stacked bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500 font-medium">Unidades</span>
                      <span className="text-xs text-gray-500">{project.totalUnits} total</span>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${soldPct}%` }}
                        title={`Vendido: ${project.soldUnits}`}
                      />
                      <div
                        className="bg-yellow-400 transition-all"
                        style={{ width: `${reservedPct}%` }}
                        title={`Reservado: ${project.reservedUnits}`}
                      />
                      <div
                        className="bg-gray-200 flex-1 transition-all"
                        title={`Disponible: ${project.availableUnits}`}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-gray-500">Vendido {project.soldUnits}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                        <span className="text-xs text-gray-500">Reservado {project.reservedUnits}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                        <span className="text-xs text-gray-500">Disponible {project.availableUnits}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Leads */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">Precio desde</p>
                      <p className="text-sm font-bold text-gray-900">{formatPrice(project.priceMin, project.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Leads activos</p>
                      <p className="text-sm font-bold text-gray-900">{project._count.leads}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
