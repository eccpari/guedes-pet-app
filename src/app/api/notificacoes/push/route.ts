import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

export async function POST(req: NextRequest) {
  try {
    // Inicializar dentro da função para não executar no build
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:contato@guedespet.com.br',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || ''
    )

    const { titulo, corpo, url, paraAdmin } = await req.json()

    const supabase = await createClient()

    let query = supabase.from('push_subscriptions').select('*')

    if (paraAdmin) {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin'])

      const adminIds = admins?.map((a: any) => a.id) || []
      if (adminIds.length > 0) {
        query = query.in('user_id', adminIds)
      }
    }

    const { data: subscriptions } = await query

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ ok: true, enviados: 0 })
    }

    const payload = JSON.stringify({
      title: titulo || 'Guedes Pet App',
      body: corpo || 'Nova notificação',
      url: url || '/',
    })

    const resultados = await Promise.allSettled(
      subscriptions.map((sub: any) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    )

    const enviados = resultados.filter(r => r.status === 'fulfilled').length
    return NextResponse.json({ ok: true, enviados })
  } catch (err) {
    console.error('[Push] Erro:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
