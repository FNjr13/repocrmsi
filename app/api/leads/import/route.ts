import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface LeadRow {
  firstName: string
  lastName: string
  phone: string
  email?: string
  source?: string
  stage?: string
  temperature?: string
  budget?: string
  notes?: string
  projectId?: string
}

export async function POST(req: NextRequest) {
  const { leads, projectId: defaultProjectId } = await req.json() as {
    leads: LeadRow[]
    projectId?: string
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
  }

  // Auto-assign agents round robin
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    select: { id: true, _count: { select: { leads: true } } },
    orderBy: { leads: { _count: 'asc' } },
  })

  const created: string[] = []
  const errors: string[] = []

  for (let i = 0; i < leads.length; i++) {
    const row = leads[i]
    try {
      if (!row.firstName || !row.phone) {
        errors.push(`Fila ${i + 2}: nombre o teléfono vacío`)
        continue
      }

      const agentIdx = i % (agents.length || 1)
      const agentId = agents[agentIdx]?.id ?? null

      const lead = await prisma.lead.create({
        data: {
          firstName: row.firstName.trim(),
          lastName: (row.lastName || '').trim(),
          phone: row.phone.trim(),
          email: row.email?.trim() || null,
          source: row.source?.toUpperCase() || 'OTRO',
          stage: row.stage?.toUpperCase() || 'NUEVO',
          temperature: row.temperature?.toUpperCase() || 'NORMAL',
          budget: row.budget ? parseFloat(row.budget) : null,
          notes: row.notes || null,
          projectId: defaultProjectId || null,
          agentId,
        },
      })
      created.push(lead.id)
    } catch {
      errors.push(`Fila ${i + 2}: error al crear (${row.phone})`)
    }
  }

  // Bulk notification
  if (created.length > 0) {
    await prisma.notification.create({
      data: {
        type: 'NEW_LEAD',
        title: `📥 Importación masiva`,
        message: `${created.length} leads importados correctamente`,
      },
    })
  }

  return NextResponse.json({ created: created.length, errors })
}
