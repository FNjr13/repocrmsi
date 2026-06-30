import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const config = await prisma.whatsAppConfig.findFirst()
  if (!config) return NextResponse.json(null)

  // Mask access token
  return NextResponse.json({
    ...config,
    accessToken: config.accessToken ? '***' + config.accessToken.slice(-6) : '',
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { phoneNumberId, wabaId, accessToken, verifyToken, phoneNumber, displayName } = body

  const existing = await prisma.whatsAppConfig.findFirst()

  if (existing) {
    const updated = await prisma.whatsAppConfig.update({
      where: { id: existing.id },
      data: {
        phoneNumberId,
        wabaId,
        accessToken: accessToken.startsWith('***') ? existing.accessToken : accessToken,
        verifyToken: verifyToken || existing.verifyToken,
        phoneNumber,
        displayName,
        isActive: true,
      },
    })
    return NextResponse.json({ ...updated, accessToken: '***' + updated.accessToken.slice(-6) })
  }

  const config = await prisma.whatsAppConfig.create({
    data: { phoneNumberId, wabaId, accessToken, verifyToken: verifyToken || 'wh_verify_token', phoneNumber, displayName, isActive: true },
  })
  return NextResponse.json({ ...config, accessToken: '***' + config.accessToken.slice(-6) })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const existing = await prisma.whatsAppConfig.findFirst()
  if (!existing) return NextResponse.json({ error: 'No config found' }, { status: 404 })

  const updated = await prisma.whatsAppConfig.update({
    where: { id: existing.id },
    data: body,
  })
  return NextResponse.json({ ...updated, accessToken: '***' + updated.accessToken.slice(-6) })
}
