import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'plataforma-vm-meta-2024-secret'
const API_VERSION = process.env.META_API_VERSION || 'v19.0'

// ─────────────────────────────────────────────────────────────────
// GET — Verificación del webhook por Meta (step 1 de la configuración)
// Meta enviará: GET /api/webhooks/meta?hub.mode=subscribe&hub.challenge=XXX&hub.verify_token=YYY
// ─────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Meta Webhook] Verificación exitosa')
    return new Response(challenge, { status: 200 })
  }

  console.warn('[Meta Webhook] Verificación fallida', { mode, token })
  return new Response('Forbidden', { status: 403 })
}

// ─────────────────────────────────────────────────────────────────
// POST — Recepción de leads desde Meta Lead Ads (Instagram/Facebook)
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: MetaWebhookPayload

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Meta siempre espera un 200 rápido — procesamos en background
  procesarLeadsMeta(body).catch(e => console.error('[Meta] Error procesando leads:', e))

  return NextResponse.json({ ok: true }, { status: 200 })
}

// ─────────────────────────────────────────────────────────────────
// Procesamiento principal
// ─────────────────────────────────────────────────────────────────
async function procesarLeadsMeta(body: MetaWebhookPayload) {
  if (body.object !== 'page') return

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue

      const { leadgen_id, page_id, form_id, ad_id } = change.value

      // Evitar duplicados
      const existing = await prisma.metaLeadLog.findUnique({ where: { leadgenId: leadgen_id } })
      if (existing) {
        console.log(`[Meta] Lead duplicado: ${leadgen_id}`)
        continue
      }

      // Crear log inicial
      const log = await prisma.metaLeadLog.create({
        data: {
          leadgenId: leadgen_id,
          pageId: page_id,
          formId: form_id || null,
          adId: ad_id || null,
          rawPayload: JSON.stringify(change.value),
          status: 'PROCESADO',
        },
      })

      try {
        // Buscar configuración de la página
        const config = await prisma.metaPageConfig.findUnique({ where: { pageId: page_id } })

        if (!config || !config.isActive) {
          console.warn(`[Meta] Página sin configuración: ${page_id}`)
          await prisma.metaLeadLog.update({
            where: { id: log.id },
            data: { status: 'ERROR', error: 'Página no configurada en el sistema' },
          })
          continue
        }

        // Obtener datos del lead desde Meta Graph API
        const leadData = await fetchMetaLead(leadgen_id, config.accessToken)

        if (!leadData || leadData.error) {
          throw new Error(leadData?.error?.message || 'Error al obtener datos del lead de Meta')
        }

        // Parsear campos del formulario
        const parsed = parsearCamposFormulario(leadData.field_data || [])

        // Detectar duplicado por teléfono o email
        const duplicate = await prisma.lead.findFirst({
          where: {
            OR: [
              parsed.phone ? { phone: parsed.phone } : {},
              parsed.email ? { email: parsed.email } : {},
            ].filter(c => Object.keys(c).length > 0),
          },
        })

        if (duplicate) {
          await prisma.metaLeadLog.update({
            where: { id: log.id },
            data: { status: 'DUPLICADO', leadId: duplicate.id },
          })
          await prisma.metaPageConfig.update({
            where: { id: config.id },
            data: { leadsReceived: { increment: 1 }, lastLeadAt: new Date() },
          })
          continue
        }

        // Determinar asesor (auto-asignación)
        const agentId = config.agentId
          ? config.agentId
          : config.autoAssign
            ? await asignarAsesorAutomatico(config.projectId)
            : null

        // Construir notas con información adicional del formulario
        const notasAdicionales = construirNotas(parsed)

        // Temperatura inicial basada en respuestas del formulario
        const temperatura = detectarTemperatura(parsed)

        // Determinar si la respuesta indica interés en financiamiento
        const financingType = detectarFinanciamiento(parsed)

        // Crear el lead en CRM
        const lead = await prisma.lead.create({
          data: {
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            email: parsed.email || null,
            phone: parsed.phone || '',
            source: 'META',
            stage: 'NUEVO',
            temperature: temperatura,
            notes: notasAdicionales || null,
            propertyInterest: parsed.propertyInterest || null,
            financingType: financingType || null,
            budget: parsed.budget || null,
            projectId: config.projectId || null,
            agentId,
            utmSource: 'instagram',
            utmMedium: 'lead_ad',
            utmCampaign: ad_id || form_id || null,
          },
        })

        // Actualizar log con el lead creado
        await prisma.metaLeadLog.update({
          where: { id: log.id },
          data: { leadId: lead.id },
        })

        // Actualizar contador de la página
        await prisma.metaPageConfig.update({
          where: { id: config.id },
          data: { leadsReceived: { increment: 1 }, lastLeadAt: new Date() },
        })

        // Crear notificación en el sistema
        await prisma.notification.create({
          data: {
            type: 'NEW_LEAD',
            title: `📸 Nuevo lead de Instagram`,
            message: `${lead.firstName} ${lead.lastName} — ${config.pageName}${config.instagramHandle ? ` (@${config.instagramHandle})` : ''}`,
            leadId: lead.id,
          },
        })

        // Crear actividad automática de primer contacto
        await prisma.activity.create({
          data: {
            leadId: lead.id,
            type: 'NOTA',
            description: `Lead capturado automáticamente desde Instagram Lead Ad${form_id ? ` (Form ID: ${form_id})` : ''}. ${notasAdicionales ? `Respuestas del formulario:\n${notasAdicionales}` : ''}`,
          },
        })

        console.log(`[Meta] Lead creado: ${lead.id} — ${lead.firstName} ${lead.lastName}`)
      } catch (error) {
        await prisma.metaLeadLog.update({
          where: { id: log.id },
          data: { status: 'ERROR', error: String(error) },
        })
        console.error(`[Meta] Error procesando leadgen_id ${leadgen_id}:`, error)
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Llama a Meta Graph API para obtener datos del lead
// ─────────────────────────────────────────────────────────────────
async function fetchMetaLead(leadgenId: string, accessToken: string): Promise<MetaLeadData> {
  const url = `https://graph.facebook.com/${API_VERSION}/${leadgenId}?access_token=${accessToken}&fields=id,created_time,ad_id,form_id,field_data,is_organic`
  const res = await fetch(url)
  return res.json()
}

// ─────────────────────────────────────────────────────────────────
// Parsear los campos del formulario de Meta Lead Ads
// Meta usa nombres estándar como: full_name, first_name, last_name,
// phone_number, email, y preguntas personalizadas
// ─────────────────────────────────────────────────────────────────
function parsearCamposFormulario(fieldData: MetaFieldData[]): ParsedLead {
  const campos: Record<string, string> = {}

  for (const field of fieldData) {
    const valor = field.values?.[0] || ''
    campos[field.name.toLowerCase()] = valor
  }

  // Nombre completo
  let firstName = campos['first_name'] || ''
  let lastName = campos['last_name'] || ''

  if (!firstName && campos['full_name']) {
    const parts = campos['full_name'].trim().split(' ')
    firstName = parts[0] || 'Sin'
    lastName = parts.slice(1).join(' ') || 'nombre'
  }

  if (!firstName && campos['nombre']) {
    const parts = campos['nombre'].trim().split(' ')
    firstName = parts[0] || 'Sin'
    lastName = parts.slice(1).join(' ') || 'nombre'
  }

  if (!firstName) firstName = 'Lead'
  if (!lastName) lastName = 'Instagram'

  // Teléfono — normalizar a formato limpio
  let phone = campos['phone_number'] || campos['phone'] || campos['telefono'] || campos['número de teléfono'] || ''
  if (phone) {
    // Normalizar: remover espacios extra, asegurar + al inicio si hay código de país
    phone = phone.trim().replace(/\s+/g, ' ')
    if (!phone.startsWith('+') && phone.length >= 8) {
      // Si no tiene código de país, no modificar (el usuario puede tener configuración local)
    }
  }

  // Email
  const email = campos['email'] || campos['correo'] || campos['correo electrónico'] || ''

  // Presupuesto — buscar en campos de presupuesto/precio
  let budget: number | undefined
  const budgetKeys = ['budget', 'presupuesto', 'precio', 'cuánto puedes invertir', 'inversión']
  for (const key of budgetKeys) {
    if (campos[key]) {
      const num = parseFloat(campos[key].replace(/[^0-9.]/g, ''))
      if (!isNaN(num) && num > 0) { budget = num; break }
    }
  }

  // Tipo de propiedad
  let propertyInterest: string | undefined
  const propKeys = ['tipo de propiedad', 'property type', 'propiedad', '¿qué tipo de propiedad te interesa?']
  for (const key of propKeys) {
    if (campos[key]) {
      const val = campos[key].toUpperCase()
      if (val.includes('DEPTO') || val.includes('DEPARTAMENTO') || val.includes('APT')) propertyInterest = 'DEPARTAMENTO'
      else if (val.includes('CASA')) propertyInterest = 'CASA'
      else if (val.includes('PENTHOUSE')) propertyInterest = 'PENTHOUSE'
      else if (val.includes('OFICINA')) propertyInterest = 'OFICINA'
      break
    }
  }

  // Campos adicionales (preguntas personalizadas del formulario)
  const camposEstandar = new Set([
    'full_name', 'first_name', 'last_name', 'phone_number', 'phone',
    'email', 'nombre', 'telefono', 'correo', 'budget', 'presupuesto',
  ])

  const extras: Record<string, string> = {}
  for (const field of fieldData) {
    if (!camposEstandar.has(field.name.toLowerCase()) && field.values?.[0]) {
      extras[field.name] = field.values[0]
    }
  }

  return { firstName, lastName, phone, email, budget, propertyInterest, extras }
}

// ─────────────────────────────────────────────────────────────────
// Construir notas con información adicional del formulario
// ─────────────────────────────────────────────────────────────────
function construirNotas(parsed: ParsedLead): string {
  if (Object.keys(parsed.extras).length === 0) return ''

  const lineas = Object.entries(parsed.extras).map(([k, v]) => `• ${k}: ${v}`)
  return `Información del formulario de Instagram:\n${lineas.join('\n')}`
}

// ─────────────────────────────────────────────────────────────────
// Detectar temperatura según respuestas del formulario
// ─────────────────────────────────────────────────────────────────
function detectarTemperatura(parsed: ParsedLead): string {
  const textoCompleto = Object.values(parsed.extras).join(' ').toLowerCase()

  // Señales de alta intención
  const señalesHOT = ['ahora', 'inmediato', 'urgente', 'esta semana', 'ya', 'hoy', 'pronto', 'cuanto antes']
  const señalesWARM = ['próximo mes', 'en unos meses', 'este año', 'interesado', 'quiero saber']
  const señalesCOLD = ['solo información', 'curiosidad', 'explorando', 'no sé', 'tal vez', 'quizás']

  for (const s of señalesHOT) if (textoCompleto.includes(s)) return 'HOT'
  for (const s of señalesWARM) if (textoCompleto.includes(s)) return 'WARM'
  for (const s of señalesCOLD) if (textoCompleto.includes(s)) return 'COLD'

  // Si tienen presupuesto definido → WARM
  if (parsed.budget && parsed.budget > 0) return 'WARM'

  return 'NORMAL'
}

// ─────────────────────────────────────────────────────────────────
// Detectar tipo de financiamiento
// ─────────────────────────────────────────────────────────────────
function detectarFinanciamiento(parsed: ParsedLead): string | null {
  const textoCompleto = Object.values(parsed.extras).join(' ').toLowerCase()

  if (textoCompleto.includes('contado') || textoCompleto.includes('efectivo')) return 'CONTADO'
  if (textoCompleto.includes('hipotecario') || textoCompleto.includes('crédito') || textoCompleto.includes('banco')) return 'HIPOTECARIO'
  if (textoCompleto.includes('financiado') || textoCompleto.includes('financiamiento') || textoCompleto.includes('cuotas')) return 'FINANCIADO'

  return null
}

// ─────────────────────────────────────────────────────────────────
// Auto-asignación de asesor (round-robin por menos leads activos)
// ─────────────────────────────────────────────────────────────────
async function asignarAsesorAutomatico(projectId: string | null): Promise<string | null> {
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    include: {
      leads: {
        where: { stage: { notIn: ['GANADO', 'PERDIDO'] } },
        select: { id: true, projectId: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  if (agents.length === 0) return null

  // Si hay proyecto, priorizar agentes que ya tienen leads en ese proyecto
  if (projectId) {
    const agentesDelProyecto = agents.filter(a =>
      a.leads.some(l => l.projectId === projectId)
    )
    if (agentesDelProyecto.length > 0) {
      // El que tiene menos leads activos en el proyecto
      return agentesDelProyecto.sort((a, b) =>
        a.leads.filter(l => l.projectId === projectId).length -
        b.leads.filter(l => l.projectId === projectId).length
      )[0].id
    }
  }

  // Round-robin general: el agente con menos leads activos
  return agents.sort((a, b) => a.leads.length - b.leads.length)[0].id
}

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface MetaWebhookPayload {
  object: string
  entry: Array<{
    id: string
    time: number
    changes: Array<{
      field: string
      value: {
        leadgen_id: string
        page_id: string
        form_id?: string
        ad_id?: string
        adgroup_id?: string
        created_time?: number
      }
    }>
  }>
}

interface MetaFieldData {
  name: string
  values: string[]
}

interface MetaLeadData {
  id: string
  created_time?: number
  ad_id?: string
  form_id?: string
  field_data?: MetaFieldData[]
  is_organic?: boolean
  error?: { message: string; code: number }
}

interface ParsedLead {
  firstName: string
  lastName: string
  phone: string
  email: string
  budget?: number
  propertyInterest?: string
  extras: Record<string, string>
}
