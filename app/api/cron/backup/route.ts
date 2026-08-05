import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import nodemailer from 'nodemailer'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runBackup()
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (body.secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runBackup()
}

async function runBackup() {
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  const toEmail   = process.env.BACKUP_EMAIL || gmailUser

  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ error: 'Faltan GMAIL_USER o GMAIL_APP_PASSWORD en las variables de entorno' }, { status: 500 })
  }

  const now     = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = now.toLocaleString('es-PA', { timeZone: 'America/Panama', dateStyle: 'full', timeStyle: 'short' })

  // ── Recoger todos los datos ──────────────────────────────────────────────
  const [
    leads, projects, units, reservations,
    agents, events, activities, campaigns,
    documents, brokers, brokerProjects, brokerActivities,
    sequences, automations, marketingRecords,
    manualCommissions, pasosDeRed,
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
    prisma.manualCommission.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.pasoDeRed.findMany({ orderBy: { createdAt: 'desc' } }),
  ])

  const counts = {
    leads:             leads.length,
    projects:          projects.length,
    units:             units.length,
    reservations:      reservations.length,
    agents:            agents.length,
    events:            events.length,
    activities:        activities.length,
    campaigns:         campaigns.length,
    documents:         documents.length,
    brokers:           brokers.length,
    brokerProjects:    brokerProjects.length,
    brokerActivities:  brokerActivities.length,
    sequences:         sequences.length,
    automations:       automations.length,
    marketingRecords:  marketingRecords.length,
    manualCommissions: manualCommissions.length,
    pasosDeRed:        pasosDeRed.length,
  }

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0)

  const backup = {
    meta: { version: '2.0', generatedAt: now.toISOString(), platform: 'SI CRM', counts },
    data: {
      leads, projects, units, reservations, agents, events, activities,
      campaigns, documents, brokers, brokerProjects, brokerActivities,
      sequences, automations, marketingRecords, manualCommissions, pasosDeRed,
    },
  }

  const jsonContent = JSON.stringify(backup, null, 2)

  // ── Enviar email ─────────────────────────────────────────────────────────
  // Usar SMTP explícito (más fiable en servidores que service:'gmail')
  const cleanPass = gmailPass.replace(/\s/g, '') // elimina espacios si los tiene
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: cleanPass },
  })

  const row = (label: string, value: number) =>
    `<tr style="border-bottom:1px solid #f3f4f6">
       <td style="padding:5px 12px 5px 0;color:#6b7280;font-size:13px">${label}</td>
       <td style="font-weight:600;text-align:right;font-size:13px">${value.toLocaleString()}</td>
     </tr>`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#1f2937">

      <div style="background:linear-gradient(135deg,#1e40af,#4338ca);padding:28px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700">🛡️ Backup diario — SI CRM</h1>
        <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px">${timeStr}</p>
      </div>

      <div style="background:#f9fafb;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">

        <p style="margin:0 0 20px;font-size:14px;color:#374151">
          El backup diario se generó correctamente. El archivo JSON con todos los datos va adjunto a este correo.
        </p>

        <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin-bottom:16px">
          <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827">
            🗄️ Base de datos — <span style="color:#2563eb">${totalRecords.toLocaleString()} registros totales</span>
          </h3>
          <table style="width:100%;border-collapse:collapse">
            ${row('Leads / Clientes',       counts.leads)}
            ${row('Proyectos',              counts.projects)}
            ${row('Unidades / Lotes',       counts.units)}
            ${row('Separaciones / CPP',     counts.reservations)}
            ${row('Asesores',               counts.agents)}
            ${row('Brokers externos',       counts.brokers)}
            ${row('Actividades',            counts.activities)}
            ${row('Eventos / Citas',        counts.events)}
            ${row('Comisiones manuales',    counts.manualCommissions)}
            ${row('Pasos de red',           counts.pasosDeRed)}
            ${row('Campañas de marketing',  counts.campaigns)}
            ${row('Documentos',             counts.documents)}
          </table>
        </div>

        <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin-bottom:16px">
          <h3 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#111827">💻 Código fuente</h3>
          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
            Repositorio en GitHub:<br>
            <a href="https://github.com/FNjr13/repocrmsi" style="color:#2563eb">github.com/FNjr13/repocrmsi</a><br><br>
            Descargar ZIP del código:<br>
            <a href="https://github.com/FNjr13/repocrmsi/archive/refs/heads/main.zip" style="color:#2563eb">main.zip (siempre actualizado)</a>
          </p>
        </div>

        <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;line-height:1.6">
          📎 Archivo adjunto: <strong>si-crm-backup-${dateStr}.json</strong><br>
          Se recomienda guardar una copia en Google Drive o Dropbox.<br>
          Enviado automáticamente todos los días a las 11:00 PM (hora Panamá).
        </p>

      </div>
    </div>
  `

  try {
    await transporter.sendMail({
      from:        `"SI CRM Backups" <${gmailUser}>`,
      to:          toEmail,
      subject:     `🛡️ Backup SI CRM — ${dateStr} — ${totalRecords.toLocaleString()} registros`,
      html,
      attachments: [{
        filename:    `si-crm-backup-${dateStr}.json`,
        content:     Buffer.from(jsonContent, 'utf-8'),
        contentType: 'application/json',
      }],
    })
  } catch (emailError: unknown) {
    const msg = emailError instanceof Error ? emailError.message : String(emailError)
    return NextResponse.json({ error: 'EMAIL_FAILED', detail: msg, counts }, { status: 500 })
  }

  return NextResponse.json({ ok: true, date: dateStr, to: toEmail, totalRecords, counts })
}
