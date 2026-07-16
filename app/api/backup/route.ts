import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const [
    leads, projects, units, reservations,
    agents, events, activities, campaigns,
    documents, brokers, brokerProjects, brokerActivities,
    sequences, automations, marketingRecords,
    auditLogs,
  ] = await Promise.all([
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.project.findMany(),
    prisma.projectUnit.findMany(),
    prisma.reservation.findMany({ include: { documents: true } }),
    prisma.agent.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.calendarEvent.findMany({ orderBy: { date: 'desc' } }),
    prisma.activity.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.campaign.findMany(),
    prisma.document.findMany(),
    prisma.externalBrokerAgent.findMany(),
    prisma.brokerProject.findMany(),
    prisma.brokerActivity.findMany({ orderBy: { date: 'desc' } }),
    prisma.automationSequence.findMany({ include: { steps: true } }),
    prisma.automationRule.findMany(),
    prisma.marketingRecord.findMany(),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5000 }),
  ])

  const backup = {
    meta: {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      platform: 'SI CRM',
      counts: {
        leads: leads.length,
        projects: projects.length,
        units: units.length,
        reservations: reservations.length,
        agents: agents.length,
        events: events.length,
        activities: activities.length,
        campaigns: campaigns.length,
        documents: documents.length,
        brokers: brokers.length,
        brokerProjects: brokerProjects.length,
        brokerActivities: brokerActivities.length,
        sequences: sequences.length,
        automations: automations.length,
        marketingRecords: marketingRecords.length,
        auditLogs: auditLogs.length,
      },
    },
    data: {
      leads,
      projects,
      units,
      reservations,
      agents,
      events,
      activities,
      campaigns,
      documents,
      brokers,
      brokerProjects,
      brokerActivities,
      sequences,
      automations,
      marketingRecords,
      auditLogs,
    },
  }

  const json = JSON.stringify(backup, null, 2)
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="si-crm-backup-${date}.json"`,
    },
  })
}
