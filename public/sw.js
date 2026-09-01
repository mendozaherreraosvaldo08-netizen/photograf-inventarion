const CACHE_NAME = "photograf-cache-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estrategia: red primero (para tener siempre lo más nuevo si hay internet),
// y si falla (sin conexión), sirve lo que haya en caché — así la app sigue
// funcionando sin internet en la bodega.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
  );
});

/* ---------------------------------------------------------------------
   NOTIFICACIONES PUSH REALES (con la app cerrada)
   Esto ya deja la estructura lista, pero para que de verdad lleguen avisos
   con el celular bloqueado hace falta conectar un servicio de push real
   (Firebase Cloud Messaging o OneSignal son las opciones más sencillas y
   gratuitas) que mande el evento "push" de abajo. Sin ese servicio
   conectado, este bloque no hace nada por sí solo — es la base para
   cuando se agregue.
--------------------------------------------------------------------- */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    if (event.data) payload = event.data.json();
  } catch (e) {
    // Si el push no viene en JSON, se usa el mensaje genérico de abajo.
  }
  // Firebase Cloud Messaging manda { notification: { title, body } };
  // se soportan también formatos planos { title, body } por si acaso.
  const titulo = payload.notification?.title || payload.title || "Photograf";
  const cuerpo = payload.notification?.body || payload.body || "Tienes una alerta nueva.";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: cuerpo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return self.clients.openWindow("/");
    })
  );
});
