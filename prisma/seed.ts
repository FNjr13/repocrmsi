import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const adapter = new PrismaBetterSqlite3({ url: `file:${path.join(__dirname, 'dev.db')}` })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  console.log('🌱 Seeding database...')

  // Create Agents — las 2 asesoras de ventas reales
  const agents = await Promise.all([
    prisma.agent.upsert({
      where: { email: 'steffi.torres@vm.cl' },
      update: { name: 'Steffi Torres', role: 'VENDEDOR' },
      create: {
        id: 'agent-steffi',
        name: 'Steffi Torres',
        email: 'steffi.torres@vm.cl',
        phone: '+56 9 8123 4567',
        role: 'VENDEDOR',
      },
    }),
    prisma.agent.upsert({
      where: { email: 'alexania.castillo@vm.cl' },
      update: { name: 'Alexania Castillo', role: 'VENDEDOR' },
      create: {
        id: 'agent-alexania',
        name: 'Alexania Castillo',
        email: 'alexania.castillo@vm.cl',
        phone: '+56 9 9234 5678',
        role: 'VENDEDOR',
      },
    }),
  ])

  // Create Projects
  const projects = await Promise.all([
    prisma.project.upsert({
      where: { id: 'proj-1' },
      update: {},
      create: {
        id: 'proj-1',
        name: 'Torre Andes',
        description: 'Moderno edificio de departamentos en el corazón de Providencia',
        location: 'Providencia, Santiago',
        type: 'DEPARTAMENTOS',
        totalUnits: 120,
        availableUnits: 45,
        reservedUnits: 18,
        soldUnits: 57,
        priceMin: 3200,
        priceMax: 8500,
        startDate: new Date('2024-01-15'),
        deliveryDate: new Date('2026-06-30'),
        status: 'EN_CONSTRUCCION',
        progress: 68,
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-2' },
      update: {},
      create: {
        id: 'proj-2',
        name: 'Parque Las Condes',
        description: 'Casas con amplios jardines y colegios cercanos',
        location: 'Las Condes, Santiago',
        type: 'CASAS',
        totalUnits: 48,
        availableUnits: 12,
        reservedUnits: 8,
        soldUnits: 28,
        priceMin: 9500,
        priceMax: 18000,
        startDate: new Date('2023-09-01'),
        deliveryDate: new Date('2025-12-31'),
        status: 'EN_CONSTRUCCION',
        progress: 88,
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-3' },
      update: {},
      create: {
        id: 'proj-3',
        name: 'Vitacura Prime',
        description: 'Departamentos de lujo con vista panorámica',
        location: 'Vitacura, Santiago',
        type: 'DEPARTAMENTOS',
        totalUnits: 60,
        availableUnits: 28,
        reservedUnits: 5,
        soldUnits: 27,
        priceMin: 12000,
        priceMax: 35000,
        startDate: new Date('2025-03-01'),
        deliveryDate: new Date('2027-03-01'),
        status: 'ACTIVO',
        progress: 15,
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-4' },
      update: {},
      create: {
        id: 'proj-4',
        name: 'Ñuñoa Central',
        description: 'Departamentos céntricos cerca del metro',
        location: 'Ñuñoa, Santiago',
        type: 'DEPARTAMENTOS',
        totalUnits: 85,
        availableUnits: 52,
        reservedUnits: 10,
        soldUnits: 23,
        priceMin: 2800,
        priceMax: 5500,
        startDate: new Date('2025-06-01'),
        deliveryDate: new Date('2027-08-01'),
        status: 'ACTIVO',
        progress: 8,
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-5' },
      update: {},
      create: {
        id: 'proj-5',
        name: 'Maipú Familiar',
        description: 'Casas y departamentos con subsidio disponible',
        location: 'Maipú, Santiago',
        type: 'MIXTO',
        totalUnits: 200,
        availableUnits: 98,
        reservedUnits: 35,
        soldUnits: 67,
        priceMin: 1200,
        priceMax: 3800,
        startDate: new Date('2024-06-01'),
        deliveryDate: new Date('2026-12-31'),
        status: 'EN_CONSTRUCCION',
        progress: 45,
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-6' },
      update: {},
      create: {
        id: 'proj-6',
        name: 'Oficinas Huechuraba',
        description: 'Oficinas y locales comerciales en zona empresarial',
        location: 'Huechuraba, Santiago',
        type: 'OFICINAS',
        totalUnits: 40,
        availableUnits: 22,
        reservedUnits: 4,
        soldUnits: 14,
        priceMin: 4500,
        priceMax: 12000,
        startDate: new Date('2024-11-01'),
        deliveryDate: new Date('2026-09-01'),
        status: 'EN_CONSTRUCCION',
        progress: 30,
      },
    }),
  ])

  // Create Campaigns
  await Promise.all([
    prisma.campaign.upsert({
      where: { id: 'camp-1' },
      update: {},
      create: {
        id: 'camp-1',
        name: 'Torre Andes - Instagram Spring',
        channel: 'META',
        projectId: 'proj-1',
        budget: 2500000,
        spent: 1850000,
        impressions: 245000,
        clicks: 4820,
        leads: 156,
        conversions: 12,
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-31'),
        status: 'ACTIVA',
      },
    }),
    prisma.campaign.upsert({
      where: { id: 'camp-2' },
      update: {},
      create: {
        id: 'camp-2',
        name: 'Parque Las Condes - Google Search',
        channel: 'GOOGLE',
        projectId: 'proj-2',
        budget: 1800000,
        spent: 1620000,
        impressions: 89000,
        clicks: 2340,
        leads: 89,
        conversions: 8,
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-31'),
        status: 'ACTIVA',
      },
    }),
    prisma.campaign.upsert({
      where: { id: 'camp-3' },
      update: {},
      create: {
        id: 'camp-3',
        name: 'Vitacura Prime - Launch',
        channel: 'META',
        projectId: 'proj-3',
        budget: 5000000,
        spent: 2100000,
        impressions: 380000,
        clicks: 6200,
        leads: 203,
        conversions: 5,
        startDate: new Date('2026-04-15'),
        endDate: new Date('2026-06-15'),
        status: 'ACTIVA',
      },
    }),
    prisma.campaign.upsert({
      where: { id: 'camp-4' },
      update: {},
      create: {
        id: 'camp-4',
        name: 'Maipú Familiar - Google Display',
        channel: 'GOOGLE',
        projectId: 'proj-5',
        budget: 1200000,
        spent: 980000,
        impressions: 520000,
        clicks: 3100,
        leads: 145,
        conversions: 18,
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-31'),
        status: 'ACTIVA',
      },
    }),
  ])

  // Steffi = agents[0], Alexania = agents[1]
  const steffi = agents[0]
  const alexania = agents[1]

  // Create Leads with activities — asignados entre Steffi y Alexania
  const leadData = [
    { firstName: 'Juan', lastName: 'Pérez', phone: '+56 9 1111 2222', email: 'juan.perez@gmail.com', source: 'META', stage: 'NEGOCIACION', projectId: 'proj-1', agentId: steffi.id, budget: 4500 },
    { firstName: 'Carmen', lastName: 'Torres', phone: '+56 9 2222 3333', email: 'ctorres@hotmail.com', source: 'GOOGLE', stage: 'VISITA', projectId: 'proj-2', agentId: alexania.id, budget: 12000 },
    { firstName: 'Diego', lastName: 'Muñoz', phone: '+56 9 3333 4444', email: null, source: 'WHATSAPP', stage: 'INTERESADO', projectId: 'proj-1', agentId: steffi.id, budget: 3500 },
    { firstName: 'Sofía', lastName: 'Ramos', phone: '+56 9 4444 5555', email: 'sofia.ramos@gmail.com', source: 'WEB', stage: 'CONTACTADO', projectId: 'proj-3', agentId: alexania.id, budget: 18000 },
    { firstName: 'Andrés', lastName: 'Vega', phone: '+56 9 5555 6666', email: 'avega@empresa.cl', source: 'META', stage: 'NUEVO', projectId: 'proj-4', agentId: null, budget: null },
    { firstName: 'Paula', lastName: 'Castro', phone: '+56 9 6666 7777', email: 'pcastro@gmail.com', source: 'GOOGLE', stage: 'GANADO', projectId: 'proj-1', agentId: steffi.id, budget: 5200 },
    { firstName: 'Marcos', lastName: 'Herrera', phone: '+56 9 7777 8888', email: null, source: 'WHATSAPP', stage: 'NUEVO', projectId: 'proj-5', agentId: null, budget: 1800 },
    { firstName: 'Valentina', lastName: 'Díaz', phone: '+56 9 8888 9999', email: 'vdiaz@gmail.com', source: 'META', stage: 'INTERESADO', projectId: 'proj-3', agentId: alexania.id, budget: 25000 },
    { firstName: 'Felipe', lastName: 'Moreno', phone: '+56 9 9999 0000', email: 'fmoreno@outlook.com', source: 'WEB', stage: 'CONTACTADO', projectId: 'proj-5', agentId: steffi.id, budget: 2200 },
    { firstName: 'Isabel', lastName: 'Fuentes', phone: '+56 9 1234 5678', email: 'ifuentes@gmail.com', source: 'REFERIDO', stage: 'VISITA', projectId: 'proj-2', agentId: alexania.id, budget: 15000 },
    { firstName: 'Rodrigo', lastName: 'Soto', phone: '+56 9 2345 6789', email: null, source: 'META', stage: 'NUEVO', projectId: 'proj-6', agentId: null, budget: null },
    { firstName: 'Catalina', lastName: 'Vargas', phone: '+56 9 3456 7890', email: 'cvargas@empresa.cl', source: 'GOOGLE', stage: 'NEGOCIACION', projectId: 'proj-6', agentId: steffi.id, budget: 8500 },
    { firstName: 'Tomás', lastName: 'Reyes', phone: '+56 9 4567 8901', email: 'treyes@gmail.com', source: 'META', stage: 'PERDIDO', projectId: 'proj-1', agentId: alexania.id, budget: 3800 },
    { firstName: 'Natalia', lastName: 'Ortiz', phone: '+56 9 5678 9012', email: 'nortiz@hotmail.com', source: 'WEB', stage: 'INTERESADO', projectId: 'proj-4', agentId: alexania.id, budget: 4200 },
    { firstName: 'Gonzalo', lastName: 'Pizarro', phone: '+56 9 6789 0123', email: null, source: 'WHATSAPP', stage: 'CONTACTADO', projectId: 'proj-5', agentId: steffi.id, budget: 1600 },
  ]

  for (const lead of leadData) {
    await prisma.lead.upsert({
      where: { id: `lead-${lead.firstName.toLowerCase()}-${lead.lastName.toLowerCase()}` },
      update: {},
      create: {
        id: `lead-${lead.firstName.toLowerCase()}-${lead.lastName.toLowerCase()}`,
        ...lead,
        activities: {
          create: [
            {
              type: 'NOTA',
              description: `Lead ingresado desde ${lead.source}. Interesado en ${projects.find(p => p.id === lead.projectId)?.name}.`,
              date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            }
          ]
        }
      },
    })
  }

  console.log('✅ Database seeded successfully!')
  console.log(`  - ${agents.length} agentes creados`)
  console.log(`  - ${projects.length} proyectos creados`)
  console.log(`  - ${leadData.length} leads creados`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
