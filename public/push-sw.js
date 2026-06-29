/* Push-Handler für Cyclog – wird vom generierten Service Worker importiert.
   Zeigt eingehende Push-Nachrichten an und öffnet beim Klick die App. */

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = { body: event.data && event.data.text() } }

  const title = data.title || 'Cyclog'
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'cyclog',
    data: { url: data.url || '/' },
    vibrate: [80, 40, 80],
  }
  event.waitUntil((async () => {
    await self.registration.showNotification(title, options)
    // Offene App-Fenster zusätzlich informieren → In-App-Banner, falls die
    // System-Benachrichtigung im Vordergrund nicht angezeigt wird.
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of clients) c.postMessage({ type: 'cyclog-push', title, body: options.body, url: options.data.url })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          if ('navigate' in client) { try { client.navigate(url) } catch (e) {} }
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
