// v3: el "badge" (el ícono chiquito que sale arriba en la barra de estado
// de Android) Android SIEMPRE lo pinta a partir de la transparencia de la
// imagen — ignora los colores por completo. Como icon-maskable-192 tiene
// fondo blanco SÓLIDO (para sobrevivir el recorte circular), Android veía
// la imagen entera "rellena" (sin nada transparente) y pintaba el
// cuadrito completo de blanco: por eso salía un cuadro blanco liso en vez
// del logo. La corrección de abajo separa: "icon" (grande, a color, la
// que se ve dentro de la notificación) sigue usando la versión con
// relleno; "badge" (chiquita, en la barra de estado) ahora usa la versión
// transparente — ahí Android sí puede dibujar la silueta del logo en vez
// de un cuadro sólido. Subir el número de versión fuerza a que el service
// worker viejo se dé de baja y descargue todo de cero.
const CACHE_NAME = "photograf-cache-v3";
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-192.png"];

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
      // "icon" (el que se ve grande, a color, dentro de la notificación):
      // la versión con relleno blanco, para que sobreviva el recorte
      // circular que le aplica Android.
      icon: "/icons/icon-maskable-192.png",
      // "badge" (el ícono chiquito de la barra de estado): tiene que ser
      // la versión CON FONDO TRANSPARENTE. Android pinta el badge usando
      // solo la transparencia de la imagen (le da igual el color) — si le
      // damos una imagen sin transparencia (como la de arriba) pinta el
      // cuadro entero de blanco liso. Con esta sí dibuja la silueta del
      // logo.
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
