import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Resend } from 'resend'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runBackup()
}

// Also allow POST for manual trigger from the UI
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (body.secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runBackup()
}

async function runBackup() {
  const apiKey = process.env.RESEND_API_KEY
  const toEmail = process.env.BACKUP_EMAIL

  if (!apiKey)  return NextResponse.json({ error: 'NO_RESEND_KEY' }, { status: 500 })
  if (!toEmail) return NextResponse.json({ error: 'NO_BACKUP_EMAIL' }, { status: 500 })

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = now.toLocaleString('es-PA', { timeZone: 'America/Panama', dateStyle: 'full', timeStyle: 'short' })

  const [
    leads, projects, units, reservations,
    agents, events, activities, campaigns,
    documents, brokers, brokerProjects, brokerActivities,
    sequences, automations, marketingRecords,
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
  ])

  const counts = {
    leads: leads.length, projects: projects.length, units: units.length,
    reservations: reservations.length, agents: agents.length, events: events.length,
    activities: activities.length, campaigns: campaigns.length, documents: documents.length,
    brokers: brokers.length, brokerProjects: brokerProjects.length,
    brokerActivities: brokerActivities.length, sequences: sequences.length,
    automations: automations.length, marketingRecords: marketingRecords.length,
  }

  const backup = {
    meta: { version: '1.0', generatedAt: now.toISOString(), platform: 'SI CRM', counts },
    data: { leads, projects, units, reservations, agents, events, activities, campaigns, documents, brokers, brokerProjects, brokerActivities, sequences, automations, marketingRecords },
  }

  const jsonContent = JSON.stringify(backup, null, 2)
  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0)

  const resend = new Resend(apiKey)

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <div style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">🛡️ Backup Automático — SI CRM</h1>
        <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px">${timeStr}</p>
      </div>
      <div style="background:#f9fafb;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0 0 16px">El backup diario se generó exitosamente. Se adjunta el archivo con todos los datos.</p>

        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px">
          <h3 style="margin:0 0 12px;font-size:14px;color:#374151">🗄️ Base de Datos — ${totalRecords.toLocaleString()} registros totales</h3>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:4px 8px 4px 0;color:#6b7280">Leads</td><td style="font-weight:600;text-align:right">${counts.leads}</td></tr>
            <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:4px 8px 4px 0;color:#6b7280">Proyectos</td><td style="font-weight:600;text-align:right">${counts.projects}</td></tr>
            <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:4px 8px 4px 0;color:#6b7280">Unidades / Lotes</td><td style="font-weight:600;text-align:right">${counts.units}</td></tr>
            <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:4px 8px 4px 0;color:#6b7280">Reservas / CPP</td><td style="font-weight:600;text-align:right">${counts.reservations}</td></tr>
            <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:4px 8px 4px 0;color:#6b7280">Brokers externos</td><td style="font-weight:600;text-align:right">${counts.brokers}</td></tr>
            <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:4px 8px 4px 0;color:#6b7280">Actividades</td><td style="font-weight:600;text-align:right">${counts.activities}</td></tr>
            <tr><td style="padding:4px 8px 4px 0;color:#6b7280">Eventos / Citas</td><td style="font-weight:600;text-align:right">${counts.events}</td></tr>
          </table>
        </div>

        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px">
          <h3 style="margin:0 0 8px;font-size:14px;color:#374151">💻 Plataforma</h3>
          <p style="margin:0;font-size:13px;color:#6b7280">
            Repositorio: <a href="https://github.com/FNjr13/repocrmsi" style="color:#2563eb">github.com/FNjr13/repocrmsi</a><br>
            Descargar ZIP: <a href="https://github.com/FNjr13/repocrmsi/archive/refs/heads/main.zip" style="color:#2563eb">main.zip</a>
          </p>
        </div>

        <p style="margin:0;font-size:12px;color:#9ca3af">
          Enviado automáticamente todos los días a las 11:00 PM hora de Panamá.<br>
          Guarda el archivo adjunto en Google Drive o Dropbox.
        </p>
      </div>
    </div>
  `

  const result = await resend.emails.send({
    from: 'SI CRM Backups <onboarding@resend.dev>',
    to: [toEmail],
    subject: `🛡️ Backup SI CRM — ${dateStr}`,
    html,
    attachments: [
      {
        filename: `si-crm-backup-${dateStr}.json`,
        content: Buffer.from(jsonContent, 'utf-8'),
      },
    ],
  })

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, date: dateStr, emailId: result.data?.id, counts })
}
