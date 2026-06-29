import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://guedes-pet-app.vercel.app'
  const cadastroUrl = `${appUrl}/cadastro`

  return NextResponse.json({
    link: cadastroUrl,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cadastroUrl)}`,
  })
}
