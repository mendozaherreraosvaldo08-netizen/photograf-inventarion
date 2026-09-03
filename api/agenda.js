/* =========================================================================
   Función serverless (Vercel) — trae los próximos eventos del Google
   Calendar de cada sucursal, para poder verlos dentro de la pantalla de
   Calendario de la app sin tener que volver a escribirlos a mano.

   ES DE SOLO LECTURA: nunca crea, edita ni borra nada en el Google
   Calendar real — solo consulta y regresa una lista simple. Armar el
   evento con su lista de equipo (y guardarlo) sigue pasando dentro de la
   app, como ya funcionaba.

   Usa las MISMAS 3 variables de entorno que ya existen para las
   notificaciones (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
   FIREBASE_PRIVATE_KEY): son, en el fondo, las credenciales de una cuenta
   de servicio de Google — sirven para más que solo Firebase. Para que
   esto funcione hace falta, una sola vez:

     1) Habilitar la Google Calendar API en el mismo proyecto de Google
        Cloud que ya usa Firebase (console.cloud.google.com → APIs y
        servicios → Habilitar APIs y servicios → buscar "Google Calendar
        API" → Habilitar).
     2) En Google Calendar, compartir el calendario de cada sucursal con
        el correo de FIREBASE_CLIENT_EMAIL (Configuración del calendario →
        "Compartir con determinadas personas" → agregar ese correo con
        permiso "Ver todos los detalles del evento").
     3) Pegar el ID de cada calendario en la app: Panel de Administrador →
        Ajustes → Google Calendar. El ID está en esa misma pantalla de
        Google, más abajo, en "Integrar calendario".

   Mientras el paso 3 no esté hecho para una sucursal, este endpoint
   regresa una lista vacía sin marcar error — la sección de Google
   Calendar simplemente no aparece en la app para esa sucursal.
   ========================================================================= */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { JWT } from "google-auth-library";

const SUCURSALES_VALIDAS = ["queretaro", "salinas"];

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
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Método no permitido" });
    return;
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    res.status(500).json({ ok: false, error: "Faltan las variables de entorno de Firebase en Vercel" });
    return;
  }

  const sucursal = String(req.query.sucursal || "");
  if (!SUCURSALES_VALIDAS.includes(sucursal)) {
    res.status(400).json({ ok: false, error: "Sucursal inválida" });
    return;
  }

  try {
    const app = appAdmin();
    const db = getFirestore(app);
    const snap = await db.collection("photograf").doc("inventario-datos").get();
    const calendarId = snap.exists() ? snap.data()?.config?.calendarios?.[sucursal] : null;

    if (!calendarId) {
      // Todavía no se conectó el calendario de esta sucursal — no es un
      // error, solo falta el paso 3 del README de arriba.
      res.status(200).json({ ok: true, configurado: false, eventos: [] });
      return;
    }

    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    const cliente = new JWT({
      email: process.env.FIREBASE_CLIENT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });
    const { token } = await cliente.getAccessToken();

    const ahora = new Date();
    const en60Dias = new Date(ahora.getTime() + 60 * 86400000);
    const params = new URLSearchParams({
      timeMin: ahora.toISOString(),
      timeMax: en60Dias.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "25",
    });

    const respuesta = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!respuesta.ok) {
      // El caso más común: el calendario no se compartió con el correo de
      // servicio, o el ID se copió mal.
      res.status(200).json({
        ok: true,
        configurado: true,
        error: `Google Calendar respondió con un error (${respuesta.status}). Revisa que el calendario esté compartido con ${process.env.FIREBASE_CLIENT_EMAIL} y que el ID esté bien copiado.`,
        eventos: [],
      });
      return;
    }

    const datos = await respuesta.json();
    const eventos = (datos.items || [])
      .filter((ev) => ev.status !== "cancelled")
      .map((ev) => ({
        id: ev.id,
        titulo: ev.summary || "(Sin título)",
        fecha: (ev.start?.date || ev.start?.dateTime || "").slice(0, 10),
        lugar: ev.location || "",
        todoElDia: !!ev.start?.date,
      }))
      .filter((ev) => ev.fecha);

    res.status(200).json({ ok: true, configurado: true, eventos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "Error consultando Google Calendar" });
  }
}
