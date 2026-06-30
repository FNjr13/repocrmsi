import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  const rules = await prisma.automationRule.findMany({ where: { isActive: true } })
  const leads = await prisma.lead.findMany({
    where: { stage: { notIn: ['GANADO', 'PERDIDO'] } },
    include: { activities: { orderBy: { date: 'desc' }, take: 1 }, agent: { select: { id: true, name: true } } },
  })

  const results: { ruleId: string; ruleName: string; affected: number; actions: string[] }[] = []

  for (const rule of rules) {
    let matchedLeads = leads
    if (rule.filterStage) matchedLeads = matchedLeads.filter(l => l.stage === rule.filterStage)
    if (rule.filterTemp) matchedLeads = matchedLeads.filter(l => l.temperature === rule.filterTemp)

    const actions: string[] = []
    let affected = 0

    if (rule.trigger === 'INACTIVITY_DAYS') {
      const days = parseInt(rule.triggerValue || '7')
      const now = Date.now()
      matchedLeads = matchedLeads.filter(l => {
        const lastDate = l.activities[0]
          ? new Date(l.activities[0].date).getTime()
          : new Date(l.createdAt).getTime()
        return Math.floor((now - lastDate) / 86400000) >= days
      })
    }

    if (rule.trigger === 'FOLLOW_UP_OVERDUE') {
      const now = new Date()
      matchedLeads = matchedLeads.filter(l => l.followUpDate && new Date(l.followUpDate) < now)
    }

    if (rule.trigger === 'HIGH_SCORE') {
      matchedLeads = matchedLeads.filter(l => l.temperature === 'HOT' || l.temperature === 'WARM')
    }

    for (const lead of matchedLeads) {
      if (rule.action === 'ALERT') {
        await prisma.notification.create({
          data: {
            type: 'INACTIVITY',
            title: `⚡ ${rule.name}`,
            message: `${lead.firstName} ${lead.lastName} — ${rule.description || rule.name}`,
            leadId: lead.id,
          },
        })
        affected++
        actions.push(`Notificación creada para ${lead.firstName} ${lead.lastName}`)
      }

      if (rule.action === 'CHANGE_TEMP') {
        const actionData = rule.actionData ? JSON.parse(rule.actionData) : {}
        if (actionData.temperature) {
          await prisma.lead.update({ where: { id: lead.id }, data: { temperature: actionData.temperature } })
          affected++
          actions.push(`${lead.firstName} ${lead.lastName} → temperatura ${actionData.temperature}`)
        }
      }
    }

    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { lastRun: new Date(), runCount: { increment: matchedLeads.length } },
    })

    results.push({ ruleId: rule.id, ruleName: rule.name, affected, actions: actions.slice(0, 5) })
  }

  return NextResponse.json({ ok: true, results, totalRules: rules.length })
}
