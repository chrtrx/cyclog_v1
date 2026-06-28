import { supabase } from './supabase'

// Öffentlicher VAPID-Schlüssel – darf im Frontend stehen (nicht geheim).
// Der zugehörige private Schlüssel liegt nur server-seitig (Versand-Funktion).
export const VAPID_PUBLIC_KEY =
  'BA--BYJCmCWT571hBSqLgFuXX88XKHifUTEx1OKboas69PSSrrHnc4DMLTAHRNR954U0MGzLsXTXocNsTnxtwk8'

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// 'on' | 'off' | 'denied' | 'unsupported'
export async function getPushState() {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'on' : 'off'
  } catch (e) {
    return 'off'
  }
}

export async function enablePush(userId) {
  if (!isPushSupported()) throw new Error('Push wird auf diesem Gerät nicht unterstützt.')

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt.')

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      subscription: json,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
}

export async function disablePush() {
  if (!isPushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  try { await sub.unsubscribe() } catch (e) {}
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}
