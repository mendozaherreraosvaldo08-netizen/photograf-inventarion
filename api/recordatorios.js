/* =========================================================================
   Función serverless (Vercel) — manda un push real, un día antes de cada
   evento agendado en Calendario, con la lista de equipo e indumentaria que
   hay que llevar. Así no depende de que alguien traiga la app abierta o se
   acuerde de revisar la pantalla de inicio.

   La dispara sola Vercel una vez al día (ver vercel.json → "crons"), por
   la mañana. Revisa los eventos de las dos sucursales y manda un push por
   cada uno cuya fecha caiga exactamente mañana — a los celulares de esa
   sucursal, más los del administrador (mismo criterio que ya se usa para
   las notificaciones de transferencias en api/notify.js).

   Usa las MISMAS variables de entorno que ya existen para las
   notificaciones, Google Calendar y el respaldo automático
   (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) — no
   hace falta configurar nada nuevo.

   Protección opcional: igual que api/backup.js, si se configura una
   variable CRON_SECRET en Vercel, aquí se verifica que la llamada venga
   de Vercel mismo.
   ========================================================================= */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const SUCURSALES = ["queretaro", "salinas"];

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

// YYYY-MM-DD de mañana, en UTC — mismo formato de fecha que ya usa toda
// la app (fmt(hoy) en src/App.jsx).
function manana() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ ok: false, error: "No autorizado" });
      return;
    }
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    res.status(500).json({ ok: false, error: "Faltan las variables de entorno de Firebase en Vercel" });
    return;
  }

  try {
    const app = appAdmin();
    const db = getFirestore(app);
    const snap = await db.collection("photograf").doc("inventario-datos").get();

    if (!snap.exists) {
      res.status(200).json({ ok: true, enviados: 0 });
      return;
    }

    const datos = snap.data();
    const fechaObjetivo = manana();

    // Un mensaje por evento de mañana, con a quién avisarle.
    const mensajes = [];
    for (const suc of SUCURSALES) {
      const d = datos.allData?.[suc];
      if (!d) continue;
      const eventosManana = (d.eventos || []).filter((ev) => ev.fecha === fechaObjetivo);
      for (const ev of eventosManana) {
        const nombresEquipo = (ev.equipoIds || []).map((id) => d.equipo?.find((e) => e.id === id)?.nombre).filter(Boolean);
        const nombresEquipoCantidad = (ev.equipoCantidades || [])
          .map(({ id, cantidad }) => {
            const item = (d.equipo || []).find((e) => e.id === id);
            return item ? `${item.nombre} ×${cantidad}` : null;
          })
          .filter(Boolean);
        const nombresIndumentaria = (ev.indumentaria || [])
          .map(({ id, cantidad }) => {
            const item = (d.indumentaria || []).find((i) => i.id === id);
            return item ? `${item.tipo}${item.detalle ? ` (${item.detalle})` : ""} ×${cantidad}` : null;
          })
          .filter(Boolean);
        const llevar = [...nombresEquipo, ...nombresEquipoCantidad, ...nombresIndumentaria];
        mensajes.push({
          sucursal: suc,
          titulo: `Mañana: ${ev.nombre}`,
          cuerpo: llevar.length ? `Llevar: ${llevar.join(", ")}` : "Todavía no se le asignó equipo ni indumentaria.",
          // Con esto, si el cron llegara a correr dos veces el mismo día
          // (un reintento de Vercel, por ejemplo), la segunda notificación
          // reemplaza a la primera en vez de amontonarse otra igual.
          tag: `pf-recordatorio-${suc}-${ev.id}-${fechaObjetivo}`,
        });
      }
    }

    if (mensajes.length === 0) {
      res.status(200).json({ ok: true, enviados: 0, eventos: 0 });
      return;
    }

    const messaging = getMessaging(app);
    const origen = `https://${req.headers.host}`;
    const iconoNotificacion = `${origen}/icons/icon-maskable-192.png`;
    const badgeNotificacion = `${origen}/icons/icon-192.png`;

    let enviados = 0;
    for (const msg of mensajes) {
      const destinos = [msg.sucursal, "admin"];
      const tokensSnap = await db.collection("fcm_tokens").where("sucursal", "in", destinos).get();
      const tokens = tokensSnap.docs.map((d) => d.id);
      if (tokens.length === 0) continue;

      const lotes = [];
      for (let i = 0; i < tokens.length; i += 500) lotes.push(tokens.slice(i, i + 500));

      for (const lote of lotes) {
        const resultado = await messaging.sendEachForMulticast({
          tokens: lote,
          notification: {
            title: msg.titulo.slice(0, 200),
            body: msg.cuerpo.slice(0, 500),
          },
          webpush: {
            fcmOptions: { link: "/" },
            notification: { icon: iconoNotificacion, badge: badgeNotificacion, tag: msg.tag },
          },
        });
        enviados += resultado.successCount;
      }
    }

    res.status(200).json({ ok: true, enviados, eventos: mensajes.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "Error mandando recordatorios" });
  }
}
