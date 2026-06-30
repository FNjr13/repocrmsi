import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function calcQualification(data: {
  salary: number
  employmentMonths: number
  employmentType: string
  currentDebt: number
  creditHistory: string
  hasPayslips: boolean
  requestedAmount?: number
}): { score: number; result: string; notes: string } {
  let score = 0
  const notes: string[] = []

  // 1. Ingresos (30 pts)
  if (data.salary >= 3000) { score += 30; notes.push('✅ Ingresos altos') }
  else if (data.salary >= 1500) { score += 20; notes.push('✅ Ingresos medios') }
  else if (data.salary >= 800) { score += 10; notes.push('⚠️ Ingresos bajos') }
  else { notes.push('❌ Ingresos insuficientes') }

  // 2. Estabilidad laboral (25 pts)
  if (data.employmentType === 'ASALARIADO') {
    if (data.employmentMonths >= 24) { score += 25; notes.push('✅ Asalariado estable +2 años') }
    else if (data.employmentMonths >= 12) { score += 18; notes.push('✅ Asalariado +1 año') }
    else if (data.employmentMonths >= 6) { score += 10; notes.push('⚠️ Asalariado reciente') }
    else { score += 5; notes.push('❌ Menos de 6 meses de empleo') }
  } else {
    if (data.employmentMonths >= 36) { score += 20; notes.push('✅ Independiente +3 años') }
    else if (data.employmentMonths >= 24) { score += 15; notes.push('✅ Independiente +2 años') }
    else { score += 5; notes.push('⚠️ Independiente con poco historial') }
  }

  // 3. Historial crediticio (25 pts)
  if (data.creditHistory === 'BUENO') { score += 25; notes.push('✅ Buen historial crediticio') }
  else if (data.creditHistory === 'REGULAR') { score += 12; notes.push('⚠️ Historial crediticio regular') }
  else { notes.push('❌ Historial crediticio malo') }

  // 4. Capacidad de endeudamiento (15 pts)
  const debtRatio = data.salary > 0 ? (data.currentDebt / data.salary) : 1
  if (debtRatio <= 0.3) { score += 15; notes.push('✅ Bajo nivel de deudas') }
  else if (debtRatio <= 0.5) { score += 8; notes.push('⚠️ Deudas moderadas') }
  else { notes.push('❌ Alto nivel de endeudamiento') }

  // 5. Documentos (5 pts)
  if (data.hasPayslips) { score += 5; notes.push('✅ Tiene talonarios/comprobantes') }
  else { notes.push('⚠️ Sin comprobantes de pago') }

  // Determinar resultado
  let result: string
  if (score >= 70) result = 'APROBABLE'
  else if (score >= 45) result = 'REVISAR'
  else result = 'NO_CALIFICABLE'

  return { score, result, notes: notes.join(' · ') }
}

export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get('leadId')
  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })
  const q = await prisma.bankQualification.findUnique({ where: { leadId } })
  return NextResponse.json(q)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { leadId, salary, employmentType, employmentMonths, company,
    currentDebt, bankPreference, creditHistory, hasPayslips, requestedAmount } = body

  const { score, result, notes } = calcQualification({
    salary, employmentType, employmentMonths, currentDebt, creditHistory, hasPayslips, requestedAmount,
  })

  const existing = await prisma.bankQualification.findUnique({ where: { leadId } })
  const q = existing
    ? await prisma.bankQualification.update({
        where: { leadId },
        data: { salary, employmentType, employmentMonths, company: company || null,
          currentDebt: currentDebt || 0, bankPreference: bankPreference || null,
          creditHistory, hasPayslips, requestedAmount: requestedAmount || null,
          score, result, notes },
      })
    : await prisma.bankQualification.create({
        data: { leadId, salary, employmentType, employmentMonths, company: company || null,
          currentDebt: currentDebt || 0, bankPreference: bankPreference || null,
          creditHistory, hasPayslips, requestedAmount: requestedAmount || null,
          score, result, notes },
      })

  // Activity log
  const resultLabel = result === 'APROBABLE' ? '✅ Aprobable' : result === 'REVISAR' ? '⚠️ Revisar' : '❌ No calificable'
  await prisma.activity.create({
    data: { leadId, type: 'NOTA', description: `Precalificación bancaria: ${resultLabel} (score ${score}/100)` },
  })

  return NextResponse.json(q)
}
