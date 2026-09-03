/* =========================================================================
   Función serverless (Vercel) — envía notificaciones push reales.
   La app (src/App.jsx) le llama por fetch cuando pasa algo que le importa a
   otra sucursal: al enviar una transferencia (avisa al destino) y al
   confirmarla (avisa a quien la envió). El administrador recibe copia de
   ambas siempre, sin importar la sucursal.

   Corre en el servidor (no en el navegador) porque necesita la llave
   privada de Firebase (Admin SDK) para poder mandar el push — esa llave
   nunca debe llegar al navegador. Se configura con 3 variables de entorno
   en Vercel: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y
   FIREBASE_PRIVATE_KEY (ver README para el paso a paso de dónde sacarlas).

   Quién recibe cada push: cualquier celular que haya tocado "Activar
   notificaciones" queda guardado en Firestore (colección fcm_tokens) con
   la sucursal a la que pertenece — "queretaro", "salinas", o "admin" para
   quien lo activó desde el Panel de Administrador. Aquí solo se le manda
   a los tokens de las sucursales que pide quien llama a esta función.
   ========================================================================= */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const SUCURSALES_VALIDAS = ["queretaro", "salinas", "admin"];

function appAdmin() {
  if (getApps().length) return getApps()[0];
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método no permitido" });
    return;
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    // Todavía no se configuraron las variables de entorno en Vercel — no es
    // un error del código, es el paso manual pendiente (ver README).
    res.status(500).json({ ok: false, error: "Faltan las variables de entorno de Firebase en Vercel" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const { sucursales, titulo, cuerpo } = body || {};

  if (!Array.isArray(sucursales) || sucursales.length === 0 || !titulo || !cuerpo) {
    res.status(400).json({ ok: false, error: "Faltan datos (sucursales, titulo, cuerpo)" });
    return;
  }
  const destinos = [...new Set(sucursales)].filter((s) => SUCURSALES_VALIDAS.includes(s));
  if (destinos.length === 0) {
    res.status(400).json({ ok: false, error: "Sucursales inválidas" });
    return;
  }

  try {
    const app = appAdmin();
    const db = getFirestore(app);
    const snap = await db.collection("fcm_tokens").where("sucursal", "in", destinos).get();
    const tokens = snap.docs.map((d) => d.id);

    if (tokens.length === 0) {
      res.status(200).json({ ok: true, enviados: 0 });
      return;
    }

    const messaging = getMessaging(app);
    // sendEachForMulticast acepta hasta 500 tokens por llamada — se
    // reparte en lotes por si algún día hay más celulares que ese límite.
    const lotes = [];
    for (let i = 0; i < tokens.length; i += 500) lotes.push(tokens.slice(i, i + 500));

    // Se mandan con URL completa (no "/icons/...") porque esto no lo
    // procesa una página del sitio — lo entrega el sistema operativo
    // directo. Van dos íconos distintos a propósito: "icon" (el grande,
    // a color, dentro de la notificación) usa la versión con fondo
    // blanco para sobrevivir el recorte circular de Android; "badge" (el
    // chiquito de la barra de estado) tiene que ser la versión con fondo
    // TRANSPARENTE, porque ahí Android pinta usando solo la
    // transparencia de la imagen — con fondo sólido pintaba el cuadro
    // entero de blanco en vez de la silueta del logo.
    const origen = `https://${req.headers.host}`;
    const iconoNotificacion = `${origen}/icons/icon-maskable-192.png`;
    const badgeNotificacion = `${origen}/icons/icon-192.png`;

    let enviados = 0;
    const tokensInvalidos = [];
    for (const lote of lotes) {
      const resultado = await messaging.sendEachForMulticast({
        tokens: lote,
        notification: {
          title: String(titulo).slice(0, 200),
          body: String(cuerpo).slice(0, 500),
        },
        webpush: {
          fcmOptions: { link: "/" },
          notification: { icon: iconoNotificacion, badge: badgeNotificacion },
        },
      });
      enviados += resultado.successCount;
      resultado.responses.forEach((r, i) => {
        if (!r.success) {
          const code = r.error?.code || "";
          // Celular que desinstaló la app, borró datos del navegador, o
          // revocó el permiso — el token ya no sirve, se limpia solo.
          if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
            tokensInvalidos.push(lote[i]);
          }
        }
      });
    }

    if (tokensInvalidos.length) {
      await Promise.all(tokensInvalidos.map((t) => db.collection("fcm_tokens").doc(t).delete().catch(() => {})));
    }

    res.status(200).json({ ok: true, enviados, invalidos: tokensInvalidos.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "Error enviando notificación" });
  }
}
