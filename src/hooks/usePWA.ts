'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function usePWA() {
  useEffect(() => {
    registerServiceWorker()
  }, [])
}

async function registerServiceWorker() {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('[PWA] Service Worker registrado:', registration.scope)

    // Tentar registrar push se suportado
    if ('PushManager' in window) {
      await requestPushPermission(registration)
    }
  } catch (err) {
    console.error('[PWA] Falha ao registrar SW:', err)
  }
}

async function requestPushPermission(registration: ServiceWorkerRegistration) {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    // Salvar subscription no Supabase
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const sub = subscription.toJSON()
    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: sub.endpoint!,
      p256dh: sub.keys!.p256dh,
      auth: sub.keys!.auth,
    }, { onConflict: 'user_id,endpoint' })

    console.log('[PWA] Push subscription salva')
  } catch (err) {
    console.error('[PWA] Erro ao registrar push:', err)
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.charCodeAt(i)
  }
  return buffer.buffer
}
