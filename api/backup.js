/* =========================================================================
   Función serverless (Vercel) — guarda sola, todos los días, una copia
   completa del inventario dentro de la misma base de datos (colección
   "respaldos"). Así, si algún día se borra o se daña algo sin querer, hay
   de dónde recuperarlo sin depender de que alguien se acuerde de darle
   "Descargar respaldo" a mano en Ajustes.

   La dispara sola Vercel una vez al día (ver vercel.json → "crons").
   Nadie necesita llamarla a mano — y si alguien la visita por error no
   pasa nada grave, nada más se guarda de nuevo la copia de hoy.

   Usa las MISMAS 3 variables de entorno que ya existen para las
   notificaciones y Google Calendar (FIREBASE_PROJECT_ID,
   FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) — no hace falta configurar
   nada nuevo para que esto funcione.

   Protección opcional: si en Vercel se configura una variable de entorno
   llamada CRON_SECRET, Vercel se la manda solo a sí mismo en cada
   ejecución programada, y aquí se verifica — así nadie más por internet
   puede disparar respaldos a cada rato. Si no la configuras, la función
   sigue funcionando igual (queda abierta, como el resto de la app).
   ========================================================================= */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Cuántos días de respaldo se conservan — de ahí para atrás se van
// borrando solos, para no acumular copias para siempre.
const DIAS_A_CONSERVAR = 30;

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
      // Todavía no hay nada guardado (app recién instalada) — no es un
      // error, nada más no hay qué respaldar hoy.
      res.status(200).json({ ok: true, guardado: false, motivo: "Todavía no hay datos que respaldar" });
      return;
    }

    // YYYY-MM-DD en UTC — sirve como identificador único del respaldo de
    // hoy: si esta función corre dos veces el mismo día, la segunda nada
    // más sobreescribe la copia de hoy, no crea una repetida.
    const fecha = new Date().toISOString().slice(0, 10);

    await db.collection("respaldos").doc(fecha).set({
      fecha,
      creadoEn: FieldValue.serverTimestamp(),
      datos: snap.data(),
    });

    const viejos = await db.collection("respaldos").orderBy("fecha", "desc").offset(DIAS_A_CONSERVAR).get();
    if (!viejos.empty) {
      const lote = db.batch();
      viejos.docs.forEach((d) => lote.delete(d.ref));
      await lote.commit();
    }

    res.status(200).json({ ok: true, guardado: true, fecha, borrados: viejos.size });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "Error generando el respaldo" });
  }
}
