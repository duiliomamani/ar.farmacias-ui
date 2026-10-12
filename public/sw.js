const CACHE_VERSION = 'condorjuy-v1'
const DATA_CACHE = `${CACHE_VERSION}-data`
const APP_CACHE = `${CACHE_VERSION}-app`
const APP_SHELL = ['/', '/manifest.webmanifest', '/condorjuy-icon.png', '/icon-192x192.png', '/icon-512x512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api/pharmacies/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(DATA_CACHE).then((cache) => cache.put(request, response.clone()))
          return response
        })
        .catch(async () => (await caches.match(request)) || Response.json({ isSuccessful: false, errors: [{ message: 'No hay datos guardados para esta búsqueda.' }] }, { status: 503 })),
    )
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(APP_CACHE).then((cache) => cache.put('/', response.clone()))
          return response
        })
        .catch(async () => (await caches.match('/')) || new Response(
          '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CondorJUY sin conexión</title><body><main><h1>Estás sin conexión</h1><p>Abrí CondorJUY una vez con internet para guardar los últimos turnos.</p></main></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        )),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(APP_CACHE).then((cache) => cache.put(request, response.clone()))
      return response
    })),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client)
      return existing ? existing.focus() : self.clients.openWindow(event.notification.data?.url || '/')
    }),
  )
})

