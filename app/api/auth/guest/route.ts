import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Acceso de visitante deshabilitado' }, { status: 403 })
}
