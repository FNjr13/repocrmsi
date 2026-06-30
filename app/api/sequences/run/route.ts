import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  const now = new Date()

  // Get enrollments due to run
  const enrollments = await prisma.leadSequenceEnrollment.findMany({
    where: { status: 'ACTIVE', nextRunAt: { lte: now } },
    include: {
      lead: true,
      sequence: { include: { steps: { orderBy: { stepOrder: 'asc' } } } },
    },
  })

  const results: { leadId: string; sequenceId: string; action: string }[] = []

  for (const enrollment of enrollments) {
    const steps = enrollment.sequence.steps
    const currentStep = enrollment.currentStep

    if (currentStep >= steps.length) {
      // Completed
      await prisma.leadSequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'COMPLETED', completedAt: now },
      })
      continue
    }

    const step = steps[currentStep]
    const actionData = JSON.parse(step.actionData || '{}') as Record<string, string>
    const lead = enrollment.lead

    // Execute step action
    if (step.actionType === 'NOTIFICATION') {
      await prisma.notification.create({
        data: {
          type: 'FOLLOW_UP',
          title: `📬 Secuencia: ${enrollment.sequence.name}`,
          message: actionData.message || `Paso ${currentStep + 1}: ${lead.firstName} ${lead.lastName}`,
          leadId: lead.id,
        },
      })
      results.push({ leadId: lead.id, sequenceId: enrollment.sequenceId, action: `Notificación paso ${currentStep + 1}` })
    }

    if (step.actionType === 'CHANGE_TEMP' && actionData.temperature) {
      await prisma.lead.update({ where: { id: lead.id }, data: { temperature: actionData.temperature } })
      results.push({ leadId: lead.id, sequenceId: enrollment.sequenceId, action: `Temperatura → ${actionData.temperature}` })
    }

    if (step.actionType === 'CREATE_TASK' && actionData.taskTitle) {
      await prisma.calendarEvent.create({
        data: {
          title: actionData.taskTitle,
          type: 'TAREA',
          date: now,
          leadId: lead.id,
          agentId: lead.agentId || null,
          status: 'PENDIENTE',
          priority: 'ALTA',
        },
      })
      results.push({ leadId: lead.id, sequenceId: enrollment.sequenceId, action: `Tarea: ${actionData.taskTitle}` })
    }

    if (step.actionType === 'WHATSAPP_TEMPLATE') {
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'WHATSAPP',
          description: `Secuencia automática: ${actionData.template || actionData.message || 'Mensaje de seguimiento'}`,
        },
      })
      results.push({ leadId: lead.id, sequenceId: enrollment.sequenceId, action: `Template WA enviado` })
    }

    // Advance to next step
    const nextStep = currentStep + 1
    if (nextStep >= steps.length) {
      await prisma.leadSequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { currentStep: nextStep, status: 'COMPLETED', completedAt: now, nextRunAt: null },
      })
    } else {
      const nextDayOffset = steps[nextStep].dayOffset
      const nextRun = new Date(enrollment.enrolledAt)
      nextRun.setDate(nextRun.getDate() + nextDayOffset)
      await prisma.leadSequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { currentStep: nextStep, nextRunAt: nextRun },
      })
    }
  }

  return NextResponse.json({ ok: true, processed: enrollments.length, results })
}

// Enroll a lead in a sequence
export async function PUT(req: Request) {
  const { leadId, sequenceId } = await req.json()

  const sequence = await prisma.automationSequence.findUnique({
    where: { id: sequenceId },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  })
  if (!sequence || sequence.steps.length === 0) {
    return NextResponse.json({ error: 'Sequence not found or has no steps' }, { status: 400 })
  }

  const firstStep = sequence.steps[0]
  const nextRunAt = new Date()
  nextRunAt.setDate(nextRunAt.getDate() + firstStep.dayOffset)

  const enrollment = await prisma.leadSequenceEnrollment.upsert({
    where: { leadId_sequenceId: { leadId, sequenceId } },
    update: { status: 'ACTIVE', currentStep: 0, enrolledAt: new Date(), nextRunAt },
    create: { leadId, sequenceId, nextRunAt },
  })

  await prisma.automationSequence.update({
    where: { id: sequenceId },
    data: { enrolledCount: { increment: 1 } },
  })

  return NextResponse.json(enrollment)
}
