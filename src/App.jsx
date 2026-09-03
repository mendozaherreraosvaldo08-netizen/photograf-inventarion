import React, { useState, useMemo, useRef, useEffect, forwardRef } from "react";
import * as XLSX from "xlsx";
import { doc, onSnapshot, runTransaction, setDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { db, messaging, VAPID_KEY } from "./firebase";
import {
  Home,
  Camera,
  Warehouse,
  Package,
  User,
  Search,
  Plus,
  LogOut,
  Check,
  AlertTriangle,
  RotateCcw,
  Clock,
  Lock,
  Pencil,
  ArrowLeft,
  Truck,
  X,
  MoreHorizontal,
  Bell,
  BarChart3,
  Calendar as CalendarIcon,
  ClipboardCheck,
  Undo2,
  Moon,
  Sun,
  Share2,
  CameraIcon,
  ImagePlus,
  UserCircle,
  Shield,
  UserPlus,
  Trash2,
  Activity,
  Inbox,
  QrCode as QrCodeIcon,
  ScanLine,
  ChevronRight,
  Users,
  Wrench,
  Tag,
  History,
  ArrowUpRight,
  Shirt,
  Award,
  FileSignature,
  Monitor,
  Layers,
  Palette,
  Scissors,
  Grid2x2,
  Sliders,
  Download,
  Upload,
  Phone,
  Mail,
  MessageCircle,
  ShoppingCart,
  FileSpreadsheet,
} from "lucide-react";

/* =========================================================================
   TOKENS DE DISEÑO
   ========================================================================= */
/* Los colores reales del logo de Photograf (el obturador de cámara de 6
   aspas): azul, magenta, amarillo, naranja, verde y rojo. Se tomaron con
   pipeta directo del ícono de la app, no son un invento — cada aspa mapea
   a una función distinta, y de casualidad el rojo/naranja/verde ya
   coinciden con lo que error/warning/success necesitan de por sí. */
const LIGHT = {
  primary: "#0072BA",
  secondary: "#BA0E63",
  accent1: "#FCDC00",
  warning: "#F59A00",
  background: "#FFFFFF",
  surface: "#F8F9FB",
  foreground: "#1A1A1A",
  muted: "#757575",
  border: "#E8E8E8",
  success: "#00B532",
  error: "#FF0809",
};

const DARK = {
  primary: "#2698E0",
  secondary: "#E03489",
  accent1: "#FFFF26",
  warning: "#FFC026",
  background: "#121212",
  surface: "#1E1E1E",
  foreground: "#F5F5F5",
  muted: "#A0A0A0",
  border: "#2E2E2E",
  success: "#26DB58",
  error: "#FF2E2F",
};

const C = { ...LIGHT };

/* "hoy" tiene que poder cambiar sin recargar: la app se queda abierta días
   enteros en la tablet del mostrador, y antes la fecha se congelaba en el
   día que se abrió — eso hacía que los atrasos, la tolerancia de paquetes y
   las fechas de la bitácora se quedaran mal. Ahora es una variable viva que
   la app revisa cada minuto (ver refrescarHoy más abajo). */
let hoy = new Date();
const fmt = (d) => d.toISOString().slice(0, 10);
const enDias = (n) => {
  const d = new Date(hoy);
  d.setDate(d.getDate() + n);
  return fmt(d);
};
/* Devuelve true si ya cambió el día desde la última revisión, para que la
   app se vuelva a dibujar con la fecha nueva. */
function refrescarHoy() {
  const ahora = new Date();
  if (fmt(ahora) !== fmt(hoy)) {
    hoy = ahora;
    return true;
  }
  return false;
}

/* Un saludo que cambia con la hora real del dispositivo, no con la fecha
   guardada de "hoy" (que solo se actualiza una vez al día) — así se siente
   vivo aunque la app lleve horas abierta en la tablet del mostrador. Toma
   solo el primer nombre, porque nadie se saluda con el apellido. */
function saludoDeHora(nombre) {
  const hora = new Date().getHours();
  const momento = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const primerNombre = (nombre || "").trim().split(" ")[0];
  return primerNombre ? `${momento}, ${primerNombre}` : momento;
}

/* Oscurece un color hex un porcentaje dado, para hacer degradados sutiles
   en los botones (ej. shadeColor("#0066FF", -18)) sin depender de una
   librería de color aparte. */
function shadeColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + Math.round((percent / 100) * 255);
  let g = ((num >> 8) & 0x00ff) + Math.round((percent / 100) * 255);
  let b = (num & 0x0000ff) + Math.round((percent / 100) * 255);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${(1 << 24 | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const SOMBRA_TARJETA = "0 10px 28px rgba(28,27,25,0.07), 0 2px 7px rgba(28,27,25,0.05)";

/* Decide si un texto encima de "color" debe ir en blanco o en tinta oscura,
   según la luminancia real de ese color — no un valor fijo por marca. Esto
   es lo que resuelve bien el problema del modo oscuro: sus acentos son más
   claros que los del modo claro (para que resalten sobre fondo oscuro), y
   eso mismo hace que el texto blanco encima pierda contraste. Con esto, el
   texto se ajusta solo sin tener que calibrar color por color a mano. */
function textoContraste(hexColor) {
  const hex = (hexColor || "").replace("#", "");
  if (hex.length < 6) return "#FFFFFF";
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.179 ? "#1C1B19" : "#FFFFFF";
}

const LOGO_PHOTOGRAF = "data:image/png;base64,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";

const NOMBRES_SUCURSAL = { queretaro: "Photograf Querétaro", salinas: "Photograf Salinas" };
const OTRA_SUCURSAL = { queretaro: "salinas", salinas: "queretaro" };
const EMPLEADOS_INICIALES = ["Carlos López", "Ana Torres", "Luis Fernández", "Sofía Ramírez"];
const SUCURSALES = ["queretaro", "salinas"];

/* Las contraseñas y el mínimo de stock ya no viven fijos en el código: son
   configuración que el administrador puede cambiar desde su panel, y se
   guardan junto con el resto de los datos. Esto es solo el punto de
   partida la primera vez que se abre la app. */
const CONFIG_INICIAL = {
  passwords: { queretaro: "qro2024", salinas: "sal2024", admin: "admin2024" },
  umbralStock: 3,
  accesos: [],
};

/* Mínimo de existencias de un material: si tiene su propio umbral usa ese,
   si no, el general que puso el administrador. */
function minimoDe(material, config) {
  const propio = material?.minimo;
  if (propio !== undefined && propio !== null && propio !== "") return Number(propio);
  return Number(config?.umbralStock ?? CONFIG_INICIAL.umbralStock);
}

/* ---------------------------------------------------------------------
   Normalización: los datos que llegan de Firestore pueden venir de una
   versión anterior de la app y no traer todas las llaves (por ejemplo, no
   existían "eventos" ni "fotos"). Antes eso tronaba la pantalla completa.
   Aquí se rellena lo que falte antes de usarlos.
   --------------------------------------------------------------------- */
function normalizarSucursal(d) {
  const base = d || {};
  return {
    ...base,
    equipo: (base.equipo || []).map((e) => ({
      foto: null,
      fotos: [],
      historial: [],
      notas: "",
      costo: 0,
      quienLoTiene: null,
      quienAutorizo: null,
      fechaPrestamo: null,
      fechaDevolucion: null,
      ...e,
    })),
    materiales: (base.materiales || []).map((m) => ({ notas: "", costo: 0, foto: null, ...m })),
    bases: (base.bases || []).map((b) => ({ catalogo: "General", linea: "", precio: 0, medidas: "", incluye: "", imagen: null, imagenDiploma: null, costo: 0, pedidoProveedor: 0, reservas: [], movimientos: [], variantes: [], ...b })),
    pedidos: (base.pedidos || []).map((p) => ({ urgencia: "Normal", estado: "Pendiente", ...p })),
    // Togas, birretes, estolas, capas, lámparas: se prestan por sesión a una
    // persona (alumno/cliente) y se esperan de vuelta el mismo día — por
    // eso llevan su propio ledger de existencias y su propia lista de
    // préstamos activos, distinta de "reservas" (que son paquetes ya
    // armados) y de "equipo" (que son piezas individuales serializadas).
    indumentaria: (base.indumentaria || []).map((i) => ({ costo: 0, movimientos: [], prestamos: [], ...i })),
    // Anillos, medallas y pines. Los anillos de oro necesitan quién los
    // resguarda y su responsiva de firma — el resto (plata, medallas,
    // pines) también puede pasar por resguardo pero sin exigir firma.
    emblematicos: (base.emblematicos || []).map((e) => ({ material: "", costo: 0, movimientos: [], custodios: [], ...e })),
    // Mobiliario y equipo de oficina/estudio: computadoras, discos duros,
    // escritorios, dispensadores — se registra por modelo con cantidad,
    // a diferencia del equipo fotográfico que es pieza por pieza.
    mobiliario: (base.mobiliario || []).map((m) => ({ modelo: "", ubicacion: "", notas: "", estado: "Disponible", costo: 0, movimientos: [], ...m })),
    // Reconocimientos, piezas sueltas de producción y gafetes: comparten la
    // misma estructura simple (existencia + costo, sin préstamo), así que
    // viven agrupados en un solo catálogo con "grupo" y "tipo".
    piezas: (base.piezas || []).map((p) => ({ detalle: "", notas: "", costo: 0, movimientos: [], ...p })),
    // Placas: se compran en hoja grande (30x60 / 60x120) y de ahí se
    // cortan las placas chicas de cada formato de paquete. "rendimientos"
    // guarda cuántas chicas de cada tipo salen de una hoja de cada
    // tamaño — lo captura el administrador, la app nunca lo inventa.
    hojasGrandes: (base.hojasGrandes || []).map((h) => ({ costo: 0, movimientos: [], ...h })),
    placasChicas: (base.placasChicas || []).map((p) => ({ costo: 0, movimientos: [], ...p })),
    rendimientos: base.rendimientos || {},
    produccionPlacas: base.produccionPlacas || [],
    eventos: base.eventos || [],
    transferencias: base.transferencias || [],
    bitacora: base.bitacora || [],
    // Pestañas que el propio usuario crea desde la app (botón "Nueva
    // pestaña" en Materiales), sin tener que pedir un cambio de código:
    // cada una es una lista simple de artículos con nombre/cantidad/costo.
    gruposPersonalizados: (base.gruposPersonalizados || []).map((g) => ({
      color: C.secondary,
      ...g,
      items: (g.items || []).map((it) => ({ costo: 0, notas: "", ...it })),
    })),
    // Mismo mecanismo, pero para pestañas propias dentro de Almacén (junto
    // a Bases/Panorámicas/Diplomas/Pedidos a proveedor) — separado de las
    // de Materiales porque son cosas distintas.
    gruposAlmacen: (base.gruposAlmacen || []).map((g) => ({
      color: C.secondary,
      ...g,
      items: (g.items || []).map((it) => ({ costo: 0, notas: "", ...it })),
    })),
    // Listas de "Tipo" de cada apartado (Indumentaria, Emblemáticos,
    // Mobiliario, Piezas, Placas chicas). Empiezan con lo que ya manejaba
    // el negocio, pero cada sucursal las puede editar desde la propia
    // pantalla (agregar o quitar tipos) sin pedir cambios de código —
    // por eso viven en la nube igual que cualquier otro dato, no como
    // constante fija.
    tiposIndumentaria: base.tiposIndumentaria && base.tiposIndumentaria.length > 0 ? base.tiposIndumentaria : TIPOS_INDUMENTARIA,
    tiposEmblematicos: base.tiposEmblematicos && base.tiposEmblematicos.length > 0 ? base.tiposEmblematicos : TIPOS_EMBLEMATICO,
    tiposMobiliario: base.tiposMobiliario && base.tiposMobiliario.length > 0 ? base.tiposMobiliario : TIPOS_MOBILIARIO,
    tiposPorGrupoPieza: {
      ...TIPOS_POR_GRUPO,
      ...Object.fromEntries(
        GRUPOS_PIEZA.map((g) => [
          g,
          base.tiposPorGrupoPieza && (base.tiposPorGrupoPieza[g] || []).length > 0 ? base.tiposPorGrupoPieza[g] : TIPOS_POR_GRUPO[g],
        ])
      ),
    },
    tiposPlacaChica: base.tiposPlacaChica && base.tiposPlacaChica.length > 0 ? base.tiposPlacaChica : TIPOS_PLACA_CHICA,
  };
}

function normalizarTodo(allData) {
  const salida = {};
  SUCURSALES.forEach((s) => {
    salida[s] = normalizarSucursal(allData?.[s]);
  });
  return salida;
}

/* ---------------------------------------------------------------------
   Fusión de 3 vías para guardar en Firestore sin que un celular le
   borre al otro lo que acaba de guardar. Antes cada guardado subía TODO
   el documento tal cual estaba en pantalla; si dos celulares guardaban
   casi al mismo tiempo, el segundo pisaba completo lo del primero (así
   se perdieron las fotos del catálogo la primera vez que se cargaron:
   alguien guardó un cambio de equipo desde antes de que le llegara la
   actualización de fotos, y su guardado borró las fotos sin que nadie
   lo notara).

   Ahora, justo antes de guardar, se compara cada sección (por sucursal
   y por tipo de artículo) contra la última versión que sabemos que
   estaba en el servidor: si nosotros la cambiamos, se sube la nuestra;
   si no la tocamos, se conserva lo que el servidor tenga en ese momento
   (que puede ser un cambio de otro celular que nunca vimos). Solo se
   pierde algo si dos celulares tocan la MISMA sección de la MISMA
   sucursal en la misma ventana de segundos — mucho más raro que antes,
   que bastaba con guardar cualquier cosa en cualquier momento. */
const LLAVES_SUCURSAL = [
  "equipo", "materiales", "bases", "pedidos", "indumentaria", "emblematicos",
  "mobiliario", "piezas", "hojasGrandes", "placasChicas", "rendimientos",
  "produccionPlacas", "eventos", "transferencias", "bitacora", "gruposPersonalizados", "gruposAlmacen",
  "tiposIndumentaria", "tiposEmblematicos", "tiposMobiliario", "tiposPorGrupoPieza", "tiposPlacaChica",
];

function fusionarPorLlave(base, propio, servidor, llaves) {
  const salida = { ...(servidor || {}) };
  llaves.forEach((k) => {
    const cambioLocal = JSON.stringify(base ? base[k] : undefined) !== JSON.stringify(propio ? propio[k] : undefined);
    salida[k] = cambioLocal ? propio?.[k] : (servidor && servidor[k] !== undefined ? servidor[k] : propio?.[k]);
  });
  return salida;
}

function fusionarAllData(base, propio, servidor) {
  const salida = {};
  SUCURSALES.forEach((s) => {
    salida[s] = fusionarPorLlave(base?.[s], propio?.[s], servidor?.[s], LLAVES_SUCURSAL);
  });
  return salida;
}

function fusionarDocumento(base, propio, servidor) {
  const planas = fusionarPorLlave(base, propio, servidor, ["empleados", "transferenciasPendientes", "transferenciasBasesPendientes", "config"]);
  return { ...planas, allData: fusionarAllData(base?.allData, propio?.allData, servidor?.allData) };
}

function normalizarConfig(config) {
  return {
    ...CONFIG_INICIAL,
    ...(config || {}),
    passwords: { ...CONFIG_INICIAL.passwords, ...(config?.passwords || {}) },
    accesos: config?.accesos || [],
  };
}

/* La "base" contra la que se compara antes de guardar (ver fusionarDocumento
   más abajo) tiene que estar normalizada exactamente igual que "propio" —
   si no, cualquier campo viejo al que le falte una llave por default
   (agregada después, ej. "variantes" o "pedidoProveedor") se ve como
   "cambiado" aunque nadie lo tocó, y esa sección completa se sobreescribe
   con lo que haya en memoria en ese momento. Así se perdieron equipo y
   materiales de Querétaro: la copia cruda de Firestore no traía todas las
   llaves que sí trae la copia normalizada, así que el comparador pensó que
   habíamos cambiado esas listas — y como en ese momento memoria traía las
   listas vacías, las subió vacías. */
function normalizarDocumento(d) {
  if (!d) return d;
  return { ...d, allData: normalizarTodo(d.allData), config: normalizarConfig(d.config) };
}

/* ---------------------------------------------------------------------
   Compresión de fotos. Una foto de cámara de celular pesa entre 2 y 5 MB;
   guardada tal cual en base64 rebasa ella sola el límite de 1 MB por
   documento de Firestore y la app deja de guardar TODO en silencio. Aquí
   se reescala a 1000px de lado máximo y se guarda como JPEG, lo que la
   deja normalmente en 100-200 KB sin que se note en pantalla.
   --------------------------------------------------------------------- */
function comprimirImagen(file, maxLado = 1000, calidad = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const img = new Image();
      // Si el navegador no puede procesar la imagen, se guarda tal cual
      // antes que perder la foto del usuario.
      img.onerror = () => resolve(reader.result);
      img.onload = () => {
        try {
          const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
          const ancho = Math.max(1, Math.round(img.width * escala));
          const alto = Math.max(1, Math.round(img.height * escala));
          const canvas = document.createElement("canvas");
          canvas.width = ancho;
          canvas.height = alto;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, ancho, alto);
          ctx.drawImage(img, 0, 0, ancho, alto);
          resolve(canvas.toDataURL("image/jpeg", calidad));
        } catch (e) {
          resolve(reader.result);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const fmtMoneda = (n) => (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/* Código corto por artículo — pedido explícito del negocio para poder
   identificar cualquier pieza sin ambigüedad (llenar reportes, hablar por
   teléfono con el proveedor, etc). El mismo formato ya se usaba solo para
   el Excel de equipo; aquí se centraliza y se hace visible en toda la app. */
const PREFIJO_SUC = { queretaro: "QRO", salinas: "SAL" };
function codigoArticulo(tipo, sucursal, id) {
  return `${tipo}-${PREFIJO_SUC[sucursal] || sucursal}-${id}`;
}

/* Un movimiento de ledger para una base: entrada normal, salida por
   entrega/uso, salida por préstamo a otra sucursal, o ajuste manual de
   conteo. Cantidad inicial + entradas − salidas = cantidad actual; cada
   función que toca "tenemos" agrega uno de estos para que el saldo quede
   siempre auditable. */
function movimientoBase(tipo, cantidad, quien, nota, extra) {
  return { id: Date.now() + Math.random(), tipo, cantidad, quien: quien || "", nota: nota || "", fecha: fmt(hoy), ...extra };
}

/* Los modelos de Universidad se piden con variantes de color. Cuando una
   base ya tiene variantes capturadas, "tenemos" deja de ser un número
   plano y pasa a ser la suma de cada color — así que todo lo que necesite
   la existencia real de una base debe pasar por aquí, nunca leer
   directamente base.tenemos si puede tener variantes. */
function tenemosBase(b) {
  if (b.variantes && b.variantes.length > 0) return b.variantes.reduce((a, v) => a + (Number(v.tenemos) || 0), 0);
  return Number(b.tenemos) || 0;
}

/* ---------------------------------------------------------------------
   CATÁLOGO 2026 — los paquetes reales que vende Photograf.
   El catálogo escolar ("General") se vende en las dos sucursales; el de
   UNICEQ es exclusivo de Querétaro, y la app nunca lo muestra en Salinas.
   "precio" es lo que paga el cliente; "costo" es aparte, lo captura cada
   sucursal, porque es lo que sirve para valuar el inventario.
   --------------------------------------------------------------------- */
/* Categorías sugeridas al dar de alta un material — la categoría sigue
   siendo texto libre, esto solo evita escribir de más. "Papelería" es la
   que pedía el negocio para grapadora, hojas, lapiceros, etc. */
const CATEGORIAS_SUGERIDAS_MATERIAL = ["Papelería", "Consumibles", "Props chicos", "Accesorios", "Indumentaria", "Sublimación"];

/* Los tipos de indumentaria que maneja el negocio — de aquí se arma el
   selector rápido al dar de alta una pieza. El "detalle" (talla, color,
   con/sin fleco) queda como texto libre porque varía mucho entre tipos. */
const TIPOS_INDUMENTARIA = [
  "Toga",
  "Birrete Licenciatura",
  "Birrete Niños",
  "Birrete Octagonal",
  "Birrete Hexagonal",
  "Estola con Fleco",
  "Estola sin Fleco (con pico)",
  "Capa",
  "Capa de Enfermería",
  "Lámpara",
];

/* Anillos, medallas y pines. Los anillos son el único tipo donde el
   material realmente importa para el negocio: si es de oro, la pieza
   necesita quedar resguardada con la firma de quien se hace responsable —
   así lo pide el documento de requerimientos explícitamente. */
const TIPOS_EMBLEMATICO = ["Anillo", "Medalla", "Pin"];
const MATERIALES_ANILLO = ["Oro", "Plata", "Acero", "Otro"];

/* Mobiliario y equipo de oficina — lista explícita del documento, con
   "Otro" como salida para lo que no encaje. */
const TIPOS_MOBILIARIO = ["Computadora", "Disco Duro", "Escritorio", "Dispensador de Agua", "Otro"];
const ESTADOS_MOBILIARIO = ["Disponible", "En reparación", "Baja"];

/* Reconocimientos, piezas sueltas de producción y gafetes — tres listas
   del documento de requerimientos que comparten la misma estructura
   (existencia + costo, sin préstamo ni custodia), así que se agrupan en
   un solo catálogo. "Piezas de producción" son las que arman los
   paquetes de fotos (Book, Overlay, Bases sueltas, etc.) */
const GRUPOS_PIEZA = ["Reconocimientos", "Piezas de producción", "Gafetes"];
const TIPOS_POR_GRUPO = {
  Reconocimientos: ["Reconocimiento / Diploma enmarcado", "Trofeo", "Personalizador", "Taza", "Carpeta y Diploma", "Otro"],
  "Piezas de producción": ["Book Vertical (pieza)", "Book Horizontal (pieza)", "Personalizador MDF-Vidrio", "Overlay", "Base 8x", "Base 6x", "Foto Birrete", "Porta Estola", "Otro"],
  Gafetes: ["Gafete"],
};

/* Placas: se compran en hoja grande y de ahí se cortan las placas chicas
   que arman cada paquete. Los tamaños de hoja y los formatos chicos son
   los que especifica el documento de requerimientos, palabra por palabra. */
const TAMANOS_HOJA = ["30x60", "60x120"];
const TIPOS_PLACA_CHICA = [
  "Panorámica",
  "Agradecimiento",
  "Diploma",
  "Individual",
  "Personalizador",
  "Fotoplaquita",
  "Jr",
  "Collage 3D",
  "Collage Master",
  "Triple",
  "Book Vertical",
  "Book Horizontal",
  "Silvatrín",
  "Testimonial",
];

/* Cuántas placas de "tipo" salen de una hoja de tamaño "tamaño". Vive en
   data.rendimientos = { "30x60": { "Individual": 8, ... }, "60x120": {...} }.
   Si no está capturado, es 0 — la app nunca inventa un rendimiento, lo
   tiene que dar quien conoce el corte real. */
function rendimientoDe(rendimientos, tamaño, tipo) {
  return Number(rendimientos?.[tamaño]?.[tipo]) || 0;
}

const CATALOGO_2026 = [
  // ---- Catálogo escolar (las dos sucursales) ----
  { nombre: "Fotográfico", catalogo: "General", precio: 500, medidas: "Fotos de 8x10 pulg", incluye: "1 foto grupal, 1 individual y 1 con maestra en papel profesional + 2 cortesías de 6x8. Carpeta tacto piel por $300 más (abierta 57x84 cm, cerrada 57x57 cm, con placa exterior)." , imagen: "/catalogo/escolar_fotografico.jpg" },
  { nombre: "Rectangular", catalogo: "General", precio: 530, medidas: "24x40 cm", incluye: "Base con foto grupal de 6x12 pulg + 2 cortesías de 6x8." , imagen: "/catalogo/escolar_rectangular.jpg" },
  { nombre: "Testimonial", catalogo: "General", precio: 550, medidas: "26x34 cm", incluye: "Base con foto grupal, foto individual y placa con datos generales + 2 cortesías de 6x8." , imagen: "/catalogo/escolar_testimonial.jpg" },
  { nombre: "Foto Plaquita", catalogo: "General", precio: 630, medidas: "28x44 cm", incluye: "Base con foto grupal, foto individual y placa + 2 cortesías de 6x8." , imagen: "/catalogo/escolar_foto-plaquita.jpg" },
  { nombre: "Book Vertical", catalogo: "General", precio: 650, medidas: "Abierto 20x31 cm · cerrado 20x15 cm", incluye: "Base con 2 fotos individuales y placa exterior con datos generales + 2 cortesías de 6x8." , imagen: "/catalogo/escolar_book-vertical.jpg" },
  { nombre: "Book Horizontal", catalogo: "General", precio: 650, medidas: "Abierto 15x40 cm · cerrado 15x20 cm", incluye: "Base con foto grupal, foto individual y placa interna con datos generales + 2 cortesías de 6x8." , imagen: "/catalogo/escolar_book-horizontal.jpg" },
  { nombre: "Triple", catalogo: "General", precio: 680, medidas: "61.5x21.5 cm", incluye: "Base con foto grupal, foto individual y placa con datos generales + 2 cortesías de 6x8." , imagen: "/catalogo/escolar_triple.jpg" },
  { nombre: "Silvatrin", catalogo: "General", precio: 730, medidas: "22x66 cm", incluye: "Base con foto grupal, foto individual y placa con datos generales + 2 cortesías de 6x8." , imagen: "/catalogo/escolar_silvatrin.jpg" },
  { nombre: "Collage JR", catalogo: "General", precio: 780, medidas: "37x43 cm", incluye: "Base con foto grupal, individual, foto con amigos o familia y placa + 2 cortesías de 6x8." , imagen: "/catalogo/escolar_collage-jr.jpg" },
  { nombre: "Collage Máster", catalogo: "General", precio: 880, medidas: "48x54 cm", incluye: "Base con foto grupal, individual, foto con amigos o familia y placa + 2 cortesías de 6x8." , imagen: "/catalogo/escolar_collage-master.jpg" },
  { nombre: "Collage 3D", catalogo: "General", precio: 1100, medidas: "42x61 cm", incluye: "Base con foto grupal, 2 individuales, foto con amigos o familia y placa + 2 cortesías de 6x8 y 1 taza." , imagen: "/catalogo/escolar_collage-3d.jpg" },

  // ---- Catálogo UNICEQ (solo Querétaro) ----
  { nombre: "Star Light", catalogo: "UNICEQ", linea: "Basic", precio: 2850, medidas: "Panorámica e individual", incluye: "Tono negro, sublimación, placa tono plata." , imagen: "/catalogo/uniceq_starlight_pano.jpg", imagenDiploma: "/catalogo/uniceq_starlight_dip.jpg" },
  { nombre: "Alcala", catalogo: "UNICEQ", linea: "Clásica", precio: 3400, medidas: "Panorámica, agradecimiento y diploma", incluye: "Tono vino, sublimación, placa tono plata." , imagen: "/catalogo/uniceq_alcala_pano.jpg", imagenDiploma: "/catalogo/uniceq_alcala_dip.jpg" },
  { nombre: "Flimsy", catalogo: "UNICEQ", linea: "Clásica", precio: 3400, medidas: "Panorámica, agradecimiento y diploma", incluye: "Tono negro, resalte en 3D, sublimación, placa tono plata." , imagen: "/catalogo/uniceq_flimsy_pano.jpg", imagenDiploma: "/catalogo/uniceq_flimsy_dip.jpg" },
  { nombre: "Paralelo", catalogo: "UNICEQ", linea: "Clásica", precio: 3400, medidas: "Panorámica, agradecimiento y diploma", incluye: "Tono negro, sublimación, placa tono plata." , imagen: "/catalogo/uniceq_paralelo_pano.jpg", imagenDiploma: "/catalogo/uniceq_paralelo_dip.jpg" },
  { nombre: "Petatillo Arena", catalogo: "UNICEQ", linea: "Ejecutiva", precio: 4950, medidas: "Panorámica, agradecimiento y diploma", incluye: "Nogal claro, arena tangible tono natural, resalte en 3D, placa tono plata. Suma pin y pluma." , imagen: "/catalogo/uniceq_petatillo-arena_pano.jpg", imagenDiploma: "/catalogo/uniceq_petatillo-arena_dip.jpg" },
  { nombre: "Mayab Arena", catalogo: "UNICEQ", linea: "Ejecutiva", precio: 4950, medidas: "Panorámica, agradecimiento y diploma", incluye: "Nogal oscuro, arena tangible tono chocolate, resalte en 3D, placa tono dorado. Suma pin y pluma." , imagen: "/catalogo/uniceq_mayab-arena_pano.jpg", imagenDiploma: "/catalogo/uniceq_mayab-arena_dip.jpg" },
  { nombre: "Polaris", catalogo: "UNICEQ", linea: "Ejecutiva", precio: 4950, medidas: "Panorámica, agradecimiento y diploma", incluye: "Tono negro con fondo blanco, resalte en 3D, placa tono plata. Suma pin y pluma." , imagen: "/catalogo/uniceq_polaris_pano.jpg", imagenDiploma: "/catalogo/uniceq_polaris_dip.jpg" },
  { nombre: "Elegance", catalogo: "UNICEQ", linea: "Platino", precio: 6020, medidas: "Panorámica, agradecimiento, diploma y overlay", incluye: "Tono negro, resalte en 3D, vidrio biselado negro, placa tono plata. Suma pluma." , imagen: "/catalogo/uniceq_elegance_pano.jpg", imagenDiploma: "/catalogo/uniceq_elegance_dip.jpg" },
  { nombre: "Colonial Cristal", catalogo: "UNICEQ", linea: "Platino", precio: 6020, medidas: "Panorámica, agradecimiento, diploma y overlay", incluye: "Nogal claro, escultura en pieza panorámica, resalte en 3D, vidrio bronce, placa tono dorado. Suma pin y pluma." , imagen: "/catalogo/uniceq_colonial-cristal_pano.jpg", imagenDiploma: "/catalogo/uniceq_colonial-cristal_dip.jpg" },
  { nombre: "Antares", catalogo: "UNICEQ", linea: "Platino", precio: 6020, medidas: "Panorámica, agradecimiento, diploma y overlay", incluye: "Tono negro, arena tangible tono negro, escultura en pieza panorámica con aditamentos móviles, placa tono plata. Suma pin y pluma." , imagen: "/catalogo/uniceq_antares_pano.jpg", imagenDiploma: "/catalogo/uniceq_antares_dip.jpg" },
  { nombre: "Petatillo Cristal", catalogo: "UNICEQ", linea: "Platino", precio: 6020, medidas: "Panorámica, agradecimiento, diploma y overlay", incluye: "Tono negro, escultura en pieza panorámica, resalte en 3D, vidrio negro, placa tono plata. Suma pin y pluma." , imagen: "/catalogo/uniceq_petatillo-cristal_pano.jpg", imagenDiploma: "/catalogo/uniceq_petatillo-cristal_dip.jpg" },

  /* ---- Catálogo Universidad 2026 (todas las sucursales) ----
     Es el catálogo general para cualquier institución (a diferencia de
     UNICEQ, que trae de fábrica los datos de esa universidad específica).
     Modelos por línea: Básico, Unitaria (una pieza), Clásica, Ejecutiva,
     Tradicional, Premier, Platino y Diamante (de 3, 4 o 5 piezas). Varios
     nombres se repiten entre líneas o coinciden con modelos de UNICEQ —
     llevan un sufijo entre paréntesis para no confundirse, aunque sea el
     mismo nombre de diseño, son productos y precios distintos. */
  { nombre: "Fotográfico Universidad", catalogo: "Universidad", linea: "Básico", precio: 500, medidas: "Panorámica grupal con individual integrada, 50x20 cm", incluye: "1 foto panorámica grupal con individual integrada, en papel fotográfico profesional + 2 cortesías de 6x8. Carpeta tacto piel por $300 más." },
  { nombre: "Collage 3D (Universidad)", catalogo: "Universidad", linea: "Unitaria", precio: 1200, medidas: "Una pieza", incluye: "Foto panorámica grupal + foto individual + placa con datos generales." },
  { nombre: "Slim (Unitaria)", catalogo: "Universidad", linea: "Unitaria", precio: 1300, medidas: "Una pieza · Tono Chocolate", incluye: "Foto panorámica grupal + foto individual + placa tono dorado. Existe también en versión de varias piezas (línea Clásica)." },
  { nombre: "Orca (Unitaria)", catalogo: "Universidad", linea: "Unitaria", precio: 1300, medidas: "Una pieza · Tono Negro", incluye: "Foto panorámica grupal + foto individual + placa tono plata. Existe también en versión de varias piezas (línea Clásica)." },
  { nombre: "Lego (Unitaria)", catalogo: "Universidad", linea: "Unitaria", precio: 1300, medidas: "Una pieza · Tono Negro", incluye: "Foto panorámica grupal + foto individual + placa tono plata. Existe también en versión de varias piezas (línea Clásica)." },
  { nombre: "Alfa (Unitaria)", catalogo: "Universidad", linea: "Unitaria", precio: 1300, medidas: "Una pieza · Tono Café", incluye: "Foto panorámica grupal + foto individual + placa tono dorado. Existe también en versión de varias piezas (línea Clásica)." },
  { nombre: "Elegance (Unitaria)", catalogo: "Universidad", linea: "Unitaria", precio: 1850, medidas: "Una pieza · Tono Negro", incluye: "Foto panorámica grupal + foto individual + placa tono plata. Existe también en versión de varias piezas (línea Platino)." },
  { nombre: "Azteca Cristal (Unitaria)", catalogo: "Universidad", linea: "Unitaria", precio: 1850, medidas: "Una pieza · Tono Negro", incluye: "Foto panorámica grupal + foto individual + placa tono plata. Existe también en versión de varias piezas (línea Platino)." },
  { nombre: "Slim (Clásica)", catalogo: "Universidad", linea: "Clásica", precio: 2200, medidas: "Tono Chocolate · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,200 · de 4 piezas $2,550 · de 5 piezas $2,900. Mejorar a panorámica con ampliación (3er espacio para foto individual): $250 más." },
  { nombre: "Orca (Clásica)", catalogo: "Universidad", linea: "Clásica", precio: 2200, medidas: "Tono Negro · sublimación · placa tono plata", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,200 · de 4 piezas $2,550 · de 5 piezas $2,900. Mejorar a panorámica con ampliación (3er espacio para foto individual): $250 más." },
  { nombre: "Lego (Clásica)", catalogo: "Universidad", linea: "Clásica", precio: 2200, medidas: "Tono Negro · sublimación · placa tono plata", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,200 · de 4 piezas $2,550 · de 5 piezas $2,900. Mejorar a panorámica con ampliación (3er espacio para foto individual): $250 más." },
  { nombre: "Alfa (Clásica)", catalogo: "Universidad", linea: "Clásica", precio: 2200, medidas: "Tono Café · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,200 · de 4 piezas $2,550 · de 5 piezas $2,900. Mejorar a panorámica con ampliación (3er espacio para foto individual): $250 más." },
  { nombre: "Paralelo (Ejecutiva)", catalogo: "Universidad", linea: "Ejecutiva", precio: 2550, medidas: "Tono Negro · sublimación · placa tono plata", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,550 · de 4 piezas $2,900 · de 5 piezas $3,250. Mejorar a panorámica con ampliación: $250 más." },
  { nombre: "Flimsy (Ejecutiva)", catalogo: "Universidad", linea: "Ejecutiva", precio: 2550, medidas: "Tono Negro, resalte en 3D · sublimación · placa tono plata", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,550 · de 4 piezas $2,900 · de 5 piezas $3,250. Mejorar a panorámica con ampliación: $250 más." },
  { nombre: "Alcala (Ejecutiva)", catalogo: "Universidad", linea: "Ejecutiva", precio: 2550, medidas: "Tono Vino · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,550 · de 4 piezas $2,900 · de 5 piezas $3,250. Mejorar a panorámica con ampliación: $250 más." },
  { nombre: "Corner's (Ejecutiva)", catalogo: "Universidad", linea: "Ejecutiva", precio: 2550, medidas: "Tono Café · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,550 · de 4 piezas $2,900 · de 5 piezas $3,250. Mejorar a panorámica con ampliación: $250 más." },
  { nombre: "Black (Tradicional)", catalogo: "Universidad", linea: "Tradicional", precio: 2900, medidas: "Tono Negro · sublimación · placa tono plata", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,900 · de 4 piezas $3,250 · de 5 piezas $3,600. Mejorar a panorámica con ampliación: $300 más." },
  { nombre: "Diagonal (Tradicional)", catalogo: "Universidad", linea: "Tradicional", precio: 2900, medidas: "Tono Vino · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,900 · de 4 piezas $3,250 · de 5 piezas $3,600. Mejorar a panorámica con ampliación: $300 más." },
  { nombre: "Amatista (Tradicional)", catalogo: "Universidad", linea: "Tradicional", precio: 2900, medidas: "Negro con detalles en cedro y piedras de colores · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,900 · de 4 piezas $3,250 · de 5 piezas $3,600. Mejorar a panorámica con ampliación: $300 más." },
  { nombre: "Amatista Beige (Tradicional)", catalogo: "Universidad", linea: "Tradicional", precio: 2900, medidas: "Beige con detalles en cedro y piedras de colores · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,900 · de 4 piezas $3,250 · de 5 piezas $3,600. Mejorar a panorámica con ampliación: $300 más." },
  { nombre: "Bicolor (Tradicional)", catalogo: "Universidad", linea: "Tradicional", precio: 2900, medidas: "Chocolate / fondo beige, resalte en 3D · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $2,900 · de 4 piezas $3,250 · de 5 piezas $3,600. Mejorar a panorámica con ampliación: $300 más." },
  { nombre: "Piramidal (Tradicional)", catalogo: "Universidad", linea: "Tradicional", precio: 3150, medidas: "Tono Nogal (variable) · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $3,150 · de 4 piezas $3,650 · de 5 piezas $4,150. Mejorar a panorámica con ampliación: $300 más." },
  { nombre: "Polaris (Tradicional)", catalogo: "Universidad", linea: "Tradicional", precio: 3150, medidas: "Negro / fondo blanco, resalte en 3D · sublimación · placa tono plata", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $3,150 · de 4 piezas $3,650 · de 5 piezas $4,150. Mejorar a panorámica con ampliación: $300 más." },
  { nombre: "Mayab Fondo Beige (Premier)", catalogo: "Universidad", linea: "Premier", precio: 3750, medidas: "Nogal oscuro / fondo beige, resalte en 3D · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $3,750 · de 4 piezas $4,350 · de 5 piezas $4,950. Mejorar a panorámica con ampliación: $300 más." },
  { nombre: "Azteca Fondo Plata (Premier)", catalogo: "Universidad", linea: "Premier", precio: 3750, medidas: "Negro / fondo plata, resalte en 3D · sublimación · placa tono plata", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $3,750 · de 4 piezas $4,350 · de 5 piezas $4,950. Mejorar a panorámica con ampliación: $300 más." },
  { nombre: "Mayab Arena (Premier)", catalogo: "Universidad", linea: "Premier", precio: 3900, medidas: "Nogal oscuro, arena tangible tono chocolate, resalte en 3D · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $3,900 · de 4 piezas $4,500 · de 5 piezas $5,100. Mejorar a panorámica con ampliación: $300 más." },
  { nombre: "Petatillo Arena (Premier)", catalogo: "Universidad", linea: "Premier", precio: 3900, medidas: "Nogal claro, arena tangible tono natural, resalte en 3D · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $3,900 · de 4 piezas $4,500 · de 5 piezas $5,100. Mejorar a panorámica con ampliación: $300 más." },
  { nombre: "Azteca Cristal (Platino)", catalogo: "Universidad", linea: "Platino", precio: 4100, medidas: "Negro, escultura en pieza panorámica, resalte en 3D, vidrio bronce · sublimación · placa tono plata", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $4,100 · de 4 piezas $4,800 · de 5 piezas $5,500. Mejorar a panorámica con ampliación: $400 más." },
  { nombre: "Elegance (Platino)", catalogo: "Universidad", linea: "Platino", precio: 4100, medidas: "Negro, resalte en 3D, vidrio biselado negro · sublimación · placa tono plata", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $4,100 · de 4 piezas $4,800 · de 5 piezas $5,500. Mejorar a panorámica con ampliación: $400 más." },
  { nombre: "Diamond (Platino)", catalogo: "Universidad", linea: "Platino", precio: 4500, medidas: "Chocolate, resalte en 3D, vidrio biselado bronce · sublimación · placa tono plata", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $4,500 · de 4 piezas $5,300 · de 5 piezas $6,100. Mejorar a panorámica con ampliación: $400 más." },
  { nombre: "Colonial Cristal (Platino)", catalogo: "Universidad", linea: "Platino", precio: 4700, medidas: "Nogal claro, escultura en pieza panorámica, resalte en 3D, vidrio bronce · sublimación · placa tono dorado", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $4,700 · de 4 piezas $5,550 · de 5 piezas $6,400. Mejorar a panorámica con ampliación: $400 más." },
  { nombre: "Antares (Diamante)", catalogo: "Universidad", linea: "Diamante", precio: 4800, medidas: "Negro, arena tangible tono negro, con aditamentos móviles (posición 1 o 2)", incluye: "Panorámica, individual, agradecimiento y diploma. De 3 piezas $4,800 · de 4 piezas $5,650 · de 5 piezas $6,500. No aplica la mejora de panorámica con ampliación." },
  { nombre: "Petatillo Cristal (Diamante)", catalogo: "Universidad", linea: "Diamante", precio: 4900, medidas: "Negro, escultura en pieza panorámica, resalte en 3D, vidrio negro · placa tono plata", incluye: "Panorámica, agradecimiento, diploma e individual/convencional. De 3 piezas $4,900 · de 4 piezas $5,750 · de 5 piezas $6,600. Mejorar a panorámica con ampliación: $400 más." },
];

/* Todos los paquetes escolares prestan la toga para la sesión. Los de
   UNICEQ incluyen además boleto para el alumno y un acompañante a la
   ceremonia, fotos de trámite (título y diploma), anillo de plata y el
   préstamo de toga, birrete, estola y borla — más capa y lámpara para
   Enfermería. Esto aplica parejo, por eso no se repite en cada paquete. */
const INCLUYE_SIEMPRE = {
  General: "Todos los paquetes escolares incluyen el préstamo de la toga para la sesión fotográfica.",
  UNICEQ: "Todos los paquetes UNICEQ incluyen boleto para el alumno y un acompañante a la ceremonia, fotos de trámite (título y diploma), anillo de plata y el préstamo de toga, birrete, estola y borla. Para Enfermería, también capa y lámpara.",
};

/* Varios paquetes de Universidad y UNICEQ son, en realidad, el mismo diseño
   físico de pano vendido con nombre y precio distintos (por eso el nombre de
   Universidad trae un sufijo entre paréntesis, ej. "Alcala (Ejecutiva)" es el
   mismo pano "Alcala" de UNICEQ). panoDe() quita ese sufijo para poder
   agrupar todos los panos que tenemos en Querétaro en un solo catálogo,
   aunque se vendan por separado en Universidad y en UNICEQ. */
function panoDe(nombre) {
  return (nombre || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/* Devuelve, dentro de una lista de bases, las que comparten el mismo diseño
   de pano con `base` (solo entre Universidad y UNICEQ) y que no llevan
   variantes de color — esas se excluyen porque su existencia se controla
   color por color y no se puede repartir como un número plano. */
function hermanasDePano(bases, base) {
  if (!base || !["Universidad", "UNICEQ"].includes(base.catalogo)) return [];
  if (base.variantes && base.variantes.length > 0) return [];
  const clave = panoDe(base.nombre);
  return bases.filter(
    (b) => b.id !== base.id && ["Universidad", "UNICEQ"].includes(b.catalogo) && panoDe(b.nombre) === clave && !(b.variantes && b.variantes.length > 0)
  );
}

/* El mismo pano se vende por separado en Universidad y en UNICEQ, pero es
   una sola existencia física: cada vez que se ajusta el "tenemos" de una de
   las dos, la(s) que comparte(n) diseño se actualizan al mismo número, para
   que nunca se dupliquen ni se pierdan panos entre catálogos. */
function conPanoSincronizado(bases, base, nuevoTenemos, quien, nota) {
  const hermanas = hermanasDePano(bases, base);
  if (hermanas.length === 0) return bases;
  const idsHermanas = new Set(hermanas.map((h) => h.id));
  return bases.map((b) => {
    if (!idsHermanas.has(b.id)) return b;
    const diferencia = nuevoTenemos - (Number(b.tenemos) || 0);
    if (diferencia === 0) return b;
    return {
      ...b,
      tenemos: nuevoTenemos,
      movimientos: [...(b.movimientos || []), movimientoBase("ajuste", diferencia, quien || "Sistema", nota || `Sincronizado automáticamente: mismo pano (${panoDe(base.nombre)})`)],
    };
  });
}

/* Arma las bases de una sucursal a partir del catálogo. UNICEQ nunca se
   incluye fuera de Querétaro. */
function basesDesdeCatalogo(sucursal) {
  const esQro = sucursal === "queretaro";
  return CATALOGO_2026.filter((p) => esQro || p.catalogo !== "UNICEQ").map((p, i) => ({
    id: i + 1,
    nombre: p.nombre,
    catalogo: p.catalogo,
    linea: p.linea || "",
    precio: p.precio,
    medidas: p.medidas || "",
    incluye: p.incluye || "",
    imagen: p.imagen || null,
    imagenDiploma: p.imagenDiploma || null,
    tenemos: 0,
    costo: 0,
    pedidoProveedor: 0,
    reservas: [],
    movimientos: [],
  }));
}

/* =========================================================================
   DATOS MOCK POR SUCURSAL
   ========================================================================= */
function generarDatosIniciales(sucursal) {
  const s = sucursal === "queretaro" ? "QRO" : "SAL";
  return {
    equipo: [
      { id: 1, nombre: `Cámara Canon 5D ${s}`, categoria: "Cámaras", estado: "Disponible", foto: null, fotos: [], costo: 28000, quienLoTiene: null, quienAutorizo: null, fechaPrestamo: null, fechaDevolucion: null, notas: "", historial: [{ texto: "Alta de equipo en sistema", fecha: fmt(hoy) }] },
      { id: 2, nombre: "Lente 50mm f/1.8", categoria: "Lentes", estado: "En uso", foto: null, fotos: [], costo: 3500, quienLoTiene: "Ana Torres", quienAutorizo: "Carlos López", fechaPrestamo: "2026-07-28", fechaDevolucion: "2026-08-02", notas: "", historial: [{ texto: "Alta de equipo en sistema", fecha: "2026-01-10" }, { texto: "Prestado a Ana Torres", fecha: "2026-07-28" }] },
      { id: 3, nombre: "Trípode Manfrotto", categoria: "Soportes", estado: "Disponible", foto: null, fotos: [], costo: 2200, quienLoTiene: null, quienAutorizo: null, fechaPrestamo: null, fechaDevolucion: null, notas: "", historial: [{ texto: "Alta de equipo en sistema", fecha: "2026-01-10" }] },
      { id: 4, nombre: "Flash Godox V1", categoria: "Iluminación", estado: "Dañado", foto: null, fotos: [], costo: 4800, quienLoTiene: null, quienAutorizo: null, fechaPrestamo: null, fechaDevolucion: null, notas: "El disparador falla intermitentemente, mandar a revisión.", historial: [{ texto: "Alta de equipo en sistema", fecha: "2026-01-10" }, { texto: "Marcado como dañado: falla el disparador", fecha: "2026-07-30" }] },
    ],
    materiales: [
      { id: 1, nombre: "Toga infantil azul", categoria: "Togas", cantidad: 12, costo: 180, notas: "", foto: null },
      { id: 2, nombre: "Batería LP-E6", categoria: "Accesorios", cantidad: 2, costo: 950, notas: "Pedir más pronto", foto: null },
      { id: 3, nombre: "Prop sombrero vaquero", categoria: "Props chicos", cantidad: 5, costo: 250, notas: "", foto: null },
    ],
    bases: basesDesdeCatalogo(sucursal),
    pedidos: [
      { id: 1, item: "Batería LP-E6", tipo: "material", cantidad: 6, urgencia: "Urgente", estado: "Pendiente" },
    ],
    indumentaria: [
      { id: 1, tipo: "Toga", detalle: "Adulto - Negro", cantidadTotal: 40, costo: 220, movimientos: [], prestamos: [] },
      { id: 2, tipo: "Birrete Licenciatura", detalle: "Adulto", cantidadTotal: 40, costo: 90, movimientos: [], prestamos: [] },
      { id: 3, tipo: "Estola sin Fleco (con pico)", detalle: "Azul rey", cantidadTotal: 25, costo: 60, movimientos: [], prestamos: [] },
    ],
    emblematicos: [
      { id: 1, tipo: "Anillo", material: "Oro", detalle: "10k, talla ajustable", cantidadTotal: 5, costo: 3200, movimientos: [], custodios: [] },
      { id: 2, tipo: "Anillo", material: "Plata", detalle: "Talla ajustable", cantidadTotal: 15, costo: 450, movimientos: [], custodios: [] },
      { id: 3, tipo: "Medalla", material: "Bronce", detalle: "Generación 2026", cantidadTotal: 30, costo: 85, movimientos: [], custodios: [] },
      { id: 4, tipo: "Pin", material: "", detalle: "UNICEQ", cantidadTotal: 40, costo: 35, movimientos: [], custodios: [] },
    ],
    mobiliario: [
      { id: 1, tipo: "Computadora", modelo: "HP EliteDesk 800", cantidad: 3, costo: 12500, ubicacion: "Recepción y edición", estado: "Disponible", notas: "", movimientos: [] },
      { id: 2, tipo: "Disco Duro", modelo: "Seagate 4TB", cantidad: 4, costo: 1800, ubicacion: "Edición", estado: "Disponible", notas: "Respaldo de fotos", movimientos: [] },
      { id: 3, tipo: "Escritorio", modelo: "Genérico melamina", cantidad: 5, costo: 2200, ubicacion: "Oficina", estado: "Disponible", notas: "", movimientos: [] },
      { id: 4, tipo: "Dispensador de Agua", modelo: "Rotoplas eléctrico", cantidad: 1, costo: 1600, ubicacion: "Recepción", estado: "Disponible", notas: "", movimientos: [] },
    ],
    piezas: [
      { id: 1, grupo: "Reconocimientos", tipo: "Trofeo", detalle: "Mediano, base de madera", cantidad: 12, costo: 180, notas: "", movimientos: [] },
      { id: 2, grupo: "Reconocimientos", tipo: "Taza", detalle: "Blanca sublimable", cantidad: 40, costo: 55, notas: "", movimientos: [] },
      { id: 3, grupo: "Piezas de producción", tipo: "Overlay", detalle: "Vidrio negro", cantidad: 20, costo: 120, notas: "", movimientos: [] },
      { id: 4, grupo: "Piezas de producción", tipo: "Base 8x", detalle: "", cantidad: 15, costo: 90, notas: "", movimientos: [] },
      { id: 5, grupo: "Gafetes", tipo: "Gafete", detalle: "Con cordón", cantidad: 60, costo: 25, notas: "", movimientos: [] },
    ],
    hojasGrandes: [
      { id: 1, tamaño: "30x60", cantidad: 25, costo: 85, movimientos: [] },
      { id: 2, tamaño: "60x120", cantidad: 10, costo: 160, movimientos: [] },
    ],
    placasChicas: [
      { id: 1, tipo: "Individual", cantidad: 30, costo: 0, movimientos: [] },
      { id: 2, tipo: "Panorámica", cantidad: 12, costo: 0, movimientos: [] },
    ],
    // Ejemplo de rendimiento ya configurado para que se entienda el patrón;
    // los demás quedan en 0 hasta que el administrador los capture reales.
    rendimientos: { "30x60": { Individual: 6, Panorámica: 2 }, "60x120": { Individual: 14, Panorámica: 5 } },
    produccionPlacas: [],
    eventos: [],
    transferencias: [],
    bitacora: [{ texto: "Sistema inicializado", quien: "Sistema", fecha: fmt(hoy) }],
    gruposPersonalizados: [],
    gruposAlmacen: [],
    tiposIndumentaria: [...TIPOS_INDUMENTARIA],
    tiposEmblematicos: [...TIPOS_EMBLEMATICO],
    tiposMobiliario: [...TIPOS_MOBILIARIO],
    tiposPorGrupoPieza: Object.fromEntries(GRUPOS_PIEZA.map((g) => [g, [...TIPOS_POR_GRUPO[g]]])),
    tiposPlacaChica: [...TIPOS_PLACA_CHICA],
  };
}

/* =========================================================================
   COMPONENTES BASE
   ========================================================================= */

function EmptyState({ icon: Icon = Package, text }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 20px", color: C.muted }}>
      <Icon size={32} color={C.border} style={{ marginBottom: 10 }} />
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}

function Toast({ text }) {
  if (!text) return null;
  return (
    <div
      className="pf-toast"
      style={{
        position: "fixed",
        bottom: 90,
        left: "50%",
        transform: "translateX(-50%)",
        background: C.foreground, color: textoContraste(C.foreground),
        fontSize: 13,
        fontWeight: 600,
        padding: "10px 18px",
        borderRadius: 30,
        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
        zIndex: 100,
        maxWidth: "88%",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
      .pf-heading { font-family: 'Fraunces', Georgia, serif; letter-spacing: -0.01em; }
      /* El listón dorado — el único adorno recurrente de la app. Aparece
         bajo el nombre "Photograf" y en los momentos de mayor peso (el
         resumen del administrador), nunca como decoración suelta. */
      .pf-ribbon { display: block; width: 40px; height: 3px; border-radius: 2px; margin-top: 6px; background: linear-gradient(90deg, ${LIGHT.secondary}, ${LIGHT.primary}); }
      .pf-press { transition: transform 120ms ease, opacity 120ms ease, box-shadow 120ms ease; }
      .pf-press:active { transform: scale(0.97); opacity: 0.9; }
      @media (hover:hover) { .pf-press:hover { opacity: 0.92; } }
      .pf-fab { transition: transform 160ms cubic-bezier(.34,1.56,.64,1), box-shadow 160ms ease; }
      .pf-fab:active { transform: scale(0.88); }
      @keyframes pf-modal-in { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .pf-modal-in { animation: pf-modal-in 220ms cubic-bezier(.16,1,.3,1); }
      @keyframes pf-toast-in { from { transform: translate(-50%, 12px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      .pf-toast { animation: pf-toast-in 200ms ease-out; }
      @keyframes pf-fade-in { from { opacity: 0; } to { opacity: 1; } }
      .pf-fade-in { animation: pf-fade-in 200ms ease-out; }
      @keyframes pf-pop-in { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .pf-pop { animation: pf-pop-in 260ms cubic-bezier(.34,1.56,.64,1); }

      /* Responsivo: en celular, .pf-shell se queda en 480px como siempre.
         En pantallas grandes (compu/laptop), se ensancha un poco y se le
         pone un fondo decorativo alrededor, en vez de quedar una columna
         angosta perdida en medio de la pantalla. */
      .pf-shell { max-width: 480px; margin: 0 auto; }
      @media (min-width: 860px) {
        html, body {
          background: linear-gradient(135deg, #EEF2FF 0%, #F5F0FF 50%, #FFF5F0 100%);
          background-attachment: fixed;
        }
        .pf-shell {
          max-width: 560px;
          box-shadow: 0 0 50px rgba(16,24,40,0.10);
        }
        .pf-list-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)) !important;
          gap: 10px !important;
        }
      }
      @media print {
        body * { visibility: hidden; }
        #pf-print-area, #pf-print-area * { visibility: visible; }
        #pf-print-area { position: absolute; left: 0; top: 0; width: 100%; padding-bottom: 0 !important; }
      }
    `}</style>
  );
}

function Modal({ title, onClose, children, danger }) {
  return (
    <div className="pf-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="pf-modal-in" style={{ background: C.background, width: "100%", maxWidth: 480, borderRadius: "16px 16px 0 0", padding: 20, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: danger ? C.error : C.foreground }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6, marginTop: 12 }}>{children}</div>;
}

const TextInput = forwardRef(function TextInput(props, ref) {
  return <input ref={ref} {...props} style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, color: C.foreground, background: C.background, boxSizing: "border-box" }} />;
});

function PrimaryButton({ children, onClick, color = C.primary, disabled }) {
  return (
    <button
      className="pf-press"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        background: disabled ? C.border : `linear-gradient(135deg, ${shadeColor(color, 8)}, ${shadeColor(color, -14)})`,
        color: disabled ? C.muted : textoContraste(color),
        border: "none",
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        marginTop: 16,
        boxShadow: disabled ? "none" : `0 4px 14px ${color}40`,
      }}
    >
      {children}
    </button>
  );
}

/* Captura de foto: abre cámara en celular (capture="environment") o galería.
   Nota: dentro de la vista previa del artifact, el sandbox del navegador
   puede bloquear el acceso a cámara/galería; en un despliegue real (web
   publicada o app vía Claude Code) funciona de forma nativa. */
function PhotoInput({ value, onChange, label = "Foto (opcional)" }) {
  const inputRef = useRef(null);
  const [procesando, setProcesando] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setProcesando(true);
    try {
      onChange(await comprimirImagen(file));
    } catch (err) {
      // La foto no se pudo procesar; el usuario puede intentar con otra.
    }
    setProcesando(false);
    e.target.value = "";
  };
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
      {value ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={value} alt="preview" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", border: `1px solid ${C.border}` }} />
          <button onClick={() => inputRef.current.click()} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: C.foreground, cursor: "pointer" }}>
            Cambiar foto
          </button>
          <button onClick={() => onChange(null)} style={{ background: "none", border: "none", color: C.error, fontSize: 12, cursor: "pointer" }}>
            Quitar
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current.click()} disabled={procesando} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 16, cursor: procesando ? "wait" : "pointer", color: C.muted, fontSize: 13, fontWeight: 600 }}>
          <CameraIcon size={18} /> {procesando ? "Preparando foto…" : "Tomar / elegir foto"}
        </button>
      )}
    </div>
  );
}

/* Galería de varias fotos por artículo (ej. frente, un detalle, un defecto
   conocido) — antes solo se podía guardar una sola foto de referencia. */
function MultiPhotoInput({ value = [], onChange }) {
  const inputRef = useRef(null);
  const [procesando, setProcesando] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setProcesando(true);
    try {
      onChange([...value, await comprimirImagen(file)]);
    } catch (err) {
      // Foto descartada: se puede volver a intentar con el botón +.
    }
    setProcesando(false);
    e.target.value = "";
  };
  const quitar = (idx) => onChange(value.filter((_, i) => i !== idx));
  return (
    <div>
      <FieldLabel>Fotos ({value.length})</FieldLabel>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {value.map((foto, idx) => (
          <div key={idx} style={{ position: "relative" }}>
            <img src={foto} alt={`Foto ${idx + 1}`} style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", border: `1px solid ${C.border}` }} />
            <button onClick={() => quitar(idx)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, background: C.error, color: textoContraste(C.error), border: "none", cursor: "pointer", fontSize: 11, lineHeight: "20px", padding: 0 }}>
              ×
            </button>
          </div>
        ))}
        <button onClick={() => inputRef.current.click()} disabled={procesando} style={{ width: 64, height: 64, borderRadius: 10, border: `1px dashed ${C.border}`, background: C.surface, color: C.muted, cursor: procesando ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600 }}>
          {procesando ? "…" : <Plus size={20} />}
        </button>
      </div>
    </div>
  );
}

/* Código QR de un artículo (usa un servicio público de generación de QR a
   partir del texto — no requiere ninguna librería instalada). Al escanearlo
   con la pantalla de "Escanear" de la app, se abre directo su ficha. */
function CodigoQR({ codigo, tamaño = 140 }) {
  const [fallo, setFallo] = useState(false);
  if (fallo) {
    return (
      <div style={{ width: tamaño, height: tamaño, borderRadius: 8, background: C.surface, border: `1px dashed ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 12, textAlign: "center" }}>
        <QrCodeIcon size={28} color={C.muted} style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 11, color: C.muted }}>No se pudo generar la imagen del QR ahorita — usa el código de texto de abajo.</div>
      </div>
    );
  }
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${tamaño}x${tamaño}&data=${encodeURIComponent(codigo)}`}
      alt={`Código QR ${codigo}`}
      width={tamaño}
      height={tamaño}
      onError={() => setFallo(true)}
      style={{ borderRadius: 8, background: "#fff", padding: 8 }}
    />
  );
}

function TopHeader({ sucursal, onLogout, onSearch, onScan }) {
  return (
    <div style={{ background: C.background, borderBottom: `1px solid ${C.border}`, padding: "12px 16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={LOGO_PHOTOGRAF} alt="Photograf" style={{ width: 24, height: 24 }} />
            <div className="pf-heading" style={{ fontSize: 24, fontWeight: 700, color: C.foreground }}>Photograf</div>
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{NOMBRES_SUCURSAL[sucursal]}</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onScan} style={{ background: "none", border: "none", padding: 8, color: C.primary, cursor: "pointer" }} aria-label="Escanear código">
            <ScanLine size={22} />
          </button>
          <button onClick={onSearch} style={{ background: "none", border: "none", padding: 8, color: C.primary, cursor: "pointer" }} aria-label="Buscar">
            <Search size={22} />
          </button>
          <button onClick={onLogout} style={{ background: "none", border: "none", padding: 8, color: C.primary, cursor: "pointer" }} aria-label="Cerrar sesión">
            <LogOut size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, onBack, right }) {
  return (
    <div style={{ background: C.background, borderBottom: `1px solid ${C.border}`, padding: "12px 16px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: C.foreground, padding: 0 }}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <div className="pf-heading" style={{ fontSize: 20, fontWeight: 700, color: C.foreground }}>{title}</div>
            {subtitle && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{subtitle}</div>}
          </div>
        </div>
        {right}
      </div>
    </div>
  );
}

function SearchBar({ placeholder, value, onChange, autoFocus }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 10px", margin: "16px 16px 0" }}>
      <Search size={20} color={C.muted} />
      <input autoFocus={autoFocus} value={value} onChange={onChange} placeholder={placeholder} style={{ border: "none", outline: "none", background: "transparent", fontSize: 16, color: C.foreground, width: "100%" }} />
    </div>
  );
}

function FilterPill({ label, active, onClick, color }) {
  const fondo = active ? color || C.primary : C.surface;
  return (
    <button className="pf-press" onClick={onClick} style={{ background: fondo, color: active ? textoContraste(fondo) : C.foreground, border: active ? "none" : `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", transition: "background 150ms ease, color 150ms ease" }}>
      {label}
    </button>
  );
}

/* Selector de "Tipo" (pills) que además deja agregar tipos nuevos y
   quitar los que ya no se usan, directamente desde la app — sin pedir un
   cambio de código. Se usa en Indumentaria, Emblemáticos, Mobiliario,
   Piezas y Placas chicas: cada uno guarda su propia lista de tipos en
   los datos de la sucursal (ver tiposIndumentaria, tiposEmblematicos,
   tiposMobiliario, tiposPorGrupoPieza, tiposPlacaChica). Quitar un tipo
   no borra los artículos que ya lo tienen capturado, solo deja de
   aparecer como opción para artículos nuevos. */
function SelectorTiposEditable({ tipos, valor, onSeleccionar, onAgregar, onQuitar, colorActivo, enUso }) {
  const [agregando, setAgregando] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState("");

  const confirmarAgregar = () => {
    const t = nuevoTipo.trim();
    if (!t) { setAgregando(false); return; }
    if (!tipos.includes(t)) onAgregar(t);
    onSeleccionar(t);
    setAgregando(false);
    setNuevoTipo("");
  };

  const quitar = (t) => {
    const usado = enUso ? enUso(t) : false;
    const seguro = usado
      ? window.confirm(`"${t}" ya se usa en artículos guardados. Si lo quitas de la lista, esos artículos se quedan igual, pero ya no vas a poder elegir "${t}" para uno nuevo. ¿Quitarlo de todos modos?`)
      : window.confirm(`¿Quitar "${t}" de la lista de tipos?`);
    if (seguro) onQuitar(t);
  };

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4, alignItems: "center" }}>
      {tipos.map((t) => (
        <div key={t} style={{ position: "relative", display: "inline-flex", paddingTop: 6, paddingRight: 6 }}>
          <FilterPill label={t} active={valor === t} onClick={() => onSeleccionar(t)} color={colorActivo} />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); quitar(t); }}
            title={`Quitar "${t}"`}
            style={{ position: "absolute", top: 0, right: 0, width: 16, height: 16, borderRadius: 8, background: C.error, color: "#fff", border: `1.5px solid ${C.background}`, fontSize: 10, lineHeight: "13px", fontWeight: 700, cursor: "pointer", padding: 0 }}
          >
            ×
          </button>
        </div>
      ))}
      {agregando ? (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            autoFocus
            value={nuevoTipo}
            onChange={(e) => setNuevoTipo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmarAgregar();
              if (e.key === "Escape") { setAgregando(false); setNuevoTipo(""); }
            }}
            placeholder="Nombre del tipo"
            style={{ border: `1px solid ${C.border}`, borderRadius: 20, padding: "7px 12px", fontSize: 12.5, width: 140, color: C.foreground, background: C.background }}
          />
          <button type="button" onClick={confirmarAgregar} style={{ background: C.primary, color: textoContraste(C.primary), border: "none", borderRadius: 20, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>OK</button>
          <button type="button" onClick={() => { setAgregando(false); setNuevoTipo(""); }} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: "7px 4px" }}>Cancelar</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAgregando(true)}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", borderRadius: 20, border: `1.5px dashed ${C.border}`, background: "none", color: C.muted, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
        >
          <Plus size={13} /> Nuevo tipo
        </button>
      )}
    </div>
  );
}

function estadoColorDe(estado) {
  const map = {
    Disponible: C.success,
    "En uso": C.primary,
    Dañado: C.error,
    "En reparación": C.warning,
    Baja: C.muted,
    Atrasado: C.error,
    Reservada: C.warning,
    Entregada: C.success,
    Pendiente: C.warning,
    "Por aprobar": C.warning,
    Aprobado: C.secondary,
    Rechazado: C.muted,
    Recibido: C.success,
    "En tránsito": C.secondary,
    Vencido: C.error,
    Desarmada: C.muted,
  };
  return map[estado] || C.muted;
}

function Badge({ estado }) {
  const fondo = estadoColorDe(estado);
  return <span style={{ display: "inline-block", background: fondo, color: textoContraste(fondo), fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8 }}>{estado}</span>;
}

function EstadoBadges({ estados }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {estados.map((e) => (
        <Badge key={e} estado={e} />
      ))}
    </div>
  );
}

function Thumb({ src, fallback: Icon = ImagePlus }) {
  return src ? (
    <img src={src} alt="" loading="lazy" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{ width: 44, height: 44, borderRadius: 10, background: C.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={18} color={C.muted} />
    </div>
  );
}

function InventoryCard({ nombre, categoria, estados = [], right, alertColor, onClick, onEdit, foto }) {
  return (
    <div onClick={onClick} className={onClick ? "pf-press" : ""} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 14px", boxShadow: SOMBRA_TARJETA, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderLeft: alertColor ? `4px solid ${alertColor}` : `1px solid ${C.border}`, cursor: onClick ? "pointer" : "default", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
        {foto !== undefined && <Thumb src={foto} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{nombre}</div>
          <div style={{ fontSize: 13, color: C.muted, margin: "2px 0 6px" }}>{categoria}</div>
          {estados.length > 0 && <EstadoBadges estados={estados} />}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {right}
        {onEdit && (
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 4 }} aria-label="Editar">
            <Pencil size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div style={{ width: "48%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: SOMBRA_TARJETA, textAlign: "center" }}>
      <Icon size={28} color={color} style={{ marginBottom: 6 }} />
      <div className="pf-pop" style={{ fontSize: 24, fontWeight: 700, color: C.primary }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function QuickActionCard({ icon: Icon, label, color, onClick }) {
  return (
    <button className="pf-press" onClick={onClick} style={{ width: "48%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: SOMBRA_TARJETA, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer" }}>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={28} color="#fff" />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.foreground }}>{label}</div>
    </button>
  );
}

function FAB({ color, onClick }) {
  return (
    <button
      className="pf-fab"
      onClick={onClick}
      style={{
        position: "fixed",
        bottom: 84,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        background: `linear-gradient(135deg, ${shadeColor(color, 10)}, ${shadeColor(color, -12)})`,
        border: "none",
        boxShadow: `0 8px 20px ${color}4D, 0 2px 6px rgba(0,0,0,0.15)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
      aria-label="Agregar"
    >
      <Plus size={28} color="#fff" />
    </button>
  );
}

function OverbookingAlert({ text }) {
  const tinta = textoContraste(C.error);
  return (
    <div style={{ background: C.error, borderRadius: 12, padding: 12, display: "flex", gap: 12, margin: "0 16px 16px" }}>
      <AlertTriangle size={24} color={tinta} style={{ flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: tinta }}>Sobre-reserva detectada</div>
        <div style={{ fontSize: 12, color: tinta, opacity: 0.85 }}>{text}</div>
      </div>
    </div>
  );
}

function LowStockBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.warning, color: textoContraste(C.warning), fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 4 }}>
      <AlertTriangle size={12} /> Bajo stock
    </span>
  );
}

/* =========================================================================
   GRÁFICAS — hechas con divs, sin librerías extra: se ven bien en celular,
   no pesan nada y respetan el modo oscuro como el resto de la app.
   ========================================================================= */

/* Barras horizontales: para rankings (quién pide más, qué se presta más). */
function GraficaBarras({ titulo, datos, color = C.primary, formato = (v) => v, vacio = "Todavía no hay datos suficientes." }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <div style={{ marginBottom: 24 }}>
      {titulo && <div style={{ fontSize: 15, fontWeight: 700, color: C.foreground, marginBottom: 10 }}>{titulo}</div>}
      {datos.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>{vacio}</div>}
      {datos.map((d, i) => (
        <div key={`${d.label}-${i}`} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12.5, color: C.foreground }}>{d.label}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: d.color || color }}>{formato(d.valor)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: C.border, overflow: "hidden" }}>
            <div style={{ width: `${(d.valor / max) * 100}%`, height: "100%", borderRadius: 4, background: d.color || color, transition: "width 400ms cubic-bezier(.16,1,.3,1)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Columnas verticales: para tendencias en el tiempo (movimientos por semana). */
function GraficaColumnas({ titulo, datos, color = C.primary }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <div style={{ marginBottom: 24 }}>
      {titulo && <div style={{ fontSize: 15, fontWeight: 700, color: C.foreground, marginBottom: 10 }}>{titulo}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 10px" }}>
        {datos.map((d) => (
          <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.foreground }}>{d.valor}</div>
            <div
              title={`${d.label}: ${d.valor}`}
              style={{ width: "100%", height: `${(d.valor / max) * 100}%`, minHeight: d.valor > 0 ? 4 : 2, borderRadius: "4px 4px 2px 2px", background: d.valor > 0 ? color : C.border, transition: "height 400ms cubic-bezier(.16,1,.3,1)" }}
            />
            <div style={{ fontSize: 9, color: C.muted, whiteSpace: "nowrap" }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Barra de una sola línea partida en tramos de colores: sirve para ver de
   un golpe cómo está repartido el equipo (disponible / en uso / dañado). */
function BarraApilada({ titulo, tramos }) {
  const total = tramos.reduce((a, t) => a + t.valor, 0);
  return (
    <div style={{ marginBottom: 24 }}>
      {titulo && <div style={{ fontSize: 15, fontWeight: 700, color: C.foreground, marginBottom: 10 }}>{titulo}</div>}
      {total === 0 ? (
        <div style={{ fontSize: 13, color: C.muted }}>Sin equipo registrado.</div>
      ) : (
        <>
          <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: C.border }}>
            {tramos.filter((t) => t.valor > 0).map((t) => (
              <div key={t.label} title={`${t.label}: ${t.valor}`} style={{ width: `${(t.valor / total) * 100}%`, background: t.color }} />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
            {tramos.map((t) => (
              <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: t.color, display: "inline-block" }} />
                <span style={{ fontSize: 11.5, color: C.muted }}>{t.label} · <strong style={{ color: C.foreground }}>{t.valor}</strong></span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* Detecta, para una base, si en alguna fecha se juntan más reservas activas
   de las que hay en existencia — a diferencia de solo sumar el total de
   reservas contra el stock, esto sí distingue fechas que no chocan entre sí. */
function choquesDeBase(base) {
  const porFecha = {};
  base.reservas.filter((r) => r.estado === "Reservada").forEach((r) => {
    porFecha[r.fecha] = (porFecha[r.fecha] || 0) + 1;
  });
  const total = tenemosBase(base);
  return Object.entries(porFecha)
    .filter(([, cant]) => cant > total)
    .map(([fecha, cant]) => ({ fecha, cant }));
}

/* Igual que choquesDeBase, pero para panos que comparten existencia entre
   Universidad y UNICEQ (ver conPanoSincronizado): junta las reservas de
   todas las que comparten diseño antes de compararlas contra la existencia
   compartida, porque una reserva hecha del lado de Universidad también
   ocupa el mismo pano que vendería UNICEQ. */
function choquesDePano(bases, base) {
  const hermanas = hermanasDePano(bases, base);
  if (hermanas.length === 0) return choquesDeBase(base);
  const grupo = [base, ...hermanas];
  const porFecha = {};
  grupo.forEach((b) => {
    b.reservas.filter((r) => r.estado === "Reservada").forEach((r) => {
      porFecha[r.fecha] = (porFecha[r.fecha] || 0) + 1;
    });
  });
  const total = tenemosBase(base);
  return Object.entries(porFecha)
    .filter(([, cant]) => cant > total)
    .map(([fecha, cant]) => ({ fecha, cant }));
}

function calcularAlertas(data, config) {
  const alertas = [];
  data.materiales.filter((m) => m.cantidad <= minimoDe(m, config)).forEach((m) => alertas.push({ tipo: "Stock bajo", texto: `${m.nombre}: quedan ${m.cantidad} (mínimo ${minimoDe(m, config)})`, color: C.warning }));
  (data.piezas || []).filter((p) => p.cantidad <= minimoDe(p, config)).forEach((p) => alertas.push({ tipo: "Stock bajo", texto: `${p.tipo}${p.detalle ? ` (${p.detalle})` : ""}: quedan ${p.cantidad} (mínimo ${minimoDe(p, config)})`, color: C.warning }));
  (data.hojasGrandes || []).filter((h) => h.cantidad <= minimoDe(h, config)).forEach((h) => alertas.push({ tipo: "Stock bajo", texto: `Hoja ${h.tamaño}: quedan ${h.cantidad} (mínimo ${minimoDe(h, config)})`, color: C.warning }));
  (data.placasChicas || []).filter((p) => p.cantidad <= minimoDe(p, config)).forEach((p) => alertas.push({ tipo: "Stock bajo", texto: `Placa ${p.tipo}: quedan ${p.cantidad} (mínimo ${minimoDe(p, config)})`, color: C.warning }));
  data.bases.forEach((b) => b.reservas.filter((r) => r.estado === "Reservada" && r.fecha <= enDias(3)).forEach((r) => alertas.push({ tipo: "Evento próximo", texto: `${b.nombre} — ${r.evento} (${r.fecha}) sigue como Reservada`, color: C.warning })));
  data.bases.forEach((b) => choquesDePano(data.bases, b).forEach((c) => alertas.push({ tipo: "Choque de reservas", texto: `${b.nombre}: el ${c.fecha} piden ${c.cant}, solo hay ${tenemosBase(b)}`, color: C.error })));
  data.bases.forEach((b) => b.reservas.forEach((r) => {
    const tol = estadoTolerancia(r);
    if (tol?.nivel === "vencido") alertas.push({ tipo: "Paquete vencido", texto: `${r.evento} (${b.nombre}) lleva ${tol.dias - TOLERANCIA_DIAS} día(s) sin recogerse — desármalo`, color: C.error });
  }));
  data.equipo.filter((e) => e.estado === "En uso" && e.fechaDevolucion && e.fechaDevolucion < fmt(hoy)).forEach((e) => alertas.push({ tipo: "Equipo atrasado", texto: `${e.nombre} debía devolverse el ${e.fechaDevolucion}`, color: C.error }));
  (data.indumentaria || []).forEach((i) =>
    (i.prestamos || [])
      .filter((p) => p.estado === "Prestado" && p.fechaEsperada && p.fechaEsperada < fmt(hoy))
      .forEach((p) => alertas.push({ tipo: "Indumentaria sin devolver", texto: `${i.tipo}${i.detalle ? ` (${i.detalle})` : ""} × ${p.cantidad} — ${p.persona} debía devolverla el ${p.fechaEsperada}`, color: C.error }))
  );
  (data.emblematicos || []).forEach((e) =>
    (e.custodios || [])
      .filter((c) => c.activo && e.material === "Oro" && !c.firmaResponsiva)
      .forEach((c) => alertas.push({ tipo: "Falta responsiva de firma", texto: `${e.tipo} de oro${e.detalle ? ` (${e.detalle})` : ""} × ${c.cantidad} con ${c.persona} sin firma de responsiva`, color: C.error }))
  );
  (data.eventos || []).forEach((ev) => {
    ev.equipoIds.forEach((id) => {
      const conflicto = conflictoDeEquipo(data, id, ev.fecha, ev.id);
      if (conflicto) {
        const item = data.equipo.find((e) => e.id === id);
        alertas.push({ tipo: "Equipo comprometido", texto: `${item ? item.nombre : "Equipo"} para "${ev.nombre}" (${ev.fecha}): ${conflicto}`, color: C.error });
      }
    });
  });
  return alertas;
}

/* =========================================================================
   PANTALLA: ¿Quién eres? — identificación ligera, sin contraseña individual.
   Sirve para autocompletar "quién autoriza/edita" y para filtrar Mi Inventario.
   ========================================================================= */
function UserPicker({ empleados, onSelect, onAdminMode }) {
  const [custom, setCustom] = useState("");
  return (
    <div style={{ padding: 20, minHeight: "100vh", background: C.background }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <img src={LOGO_PHOTOGRAF} alt="Photograf" style={{ width: 32, height: 32 }} />
        <div>
          <div className="pf-heading" style={{ fontSize: 24, fontWeight: 700, color: C.foreground }}>Photograf</div>
          <span className="pf-ribbon" />
        </div>
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, marginTop: 10 }}>¿Quién eres? Esto se usa para saber quién hace cada movimiento — no es una contraseña, es solo identificación.</div>
      {empleados.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Todavía no hay empleados registrados. Pide al administrador que agregue uno, o escribe tu nombre abajo.</div>}
      {empleados.map((u) => (
        <button key={u} onClick={() => onSelect(u)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 10, cursor: "pointer" }}>
          <UserCircle size={22} color={C.primary} />
          <span style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{u}</span>
        </button>
      ))}
      <FieldLabel>O escribe tu nombre</FieldLabel>
      <TextInput value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Tu nombre" />
      <PrimaryButton onClick={() => onSelect(custom)} disabled={!custom}>Continuar</PrimaryButton>

      <button onClick={onAdminMode} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", marginTop: 24 }}>
        <Shield size={14} /> Soy administrador
      </button>
    </div>
  );
}

/* =========================================================================
   PANTALLA: Panel de Administrador — agregar/quitar empleados y ver actividad
   ========================================================================= */
function AdminGate({ config, onSuccess, onCancel }) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // autoFocus a veces no basta en celular (el teclado no abre si el campo
  // no queda listo justo cuando se monta la pantalla) — se refuerza con un
  // enfoque manual apenas después del primer render.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const confirmar = () => {
    if (pass === (config?.passwords?.admin ?? CONFIG_INICIAL.passwords.admin)) onSuccess();
    else setError("Esa no es la contraseña de administrador. Vuelve a intentar.");
  };
  return (
    <div style={{ padding: 20, minHeight: "100vh", background: C.background }}>
      <SectionHeader title="Panel de Administrador" onBack={onCancel} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pass) confirmar();
        }}
        style={{ padding: "20px 0" }}
      >
        <FieldLabel>Contraseña de administrador</FieldLabel>
        <TextInput ref={inputRef} type="password" enterKeyHint="go" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" autoFocus />
        {error && <div style={{ color: C.error, fontSize: 12, marginTop: 8 }}>{error}</div>}
        <PrimaryButton disabled={!pass}>Entrar</PrimaryButton>
      </form>
    </div>
  );
}

/* Renglón de menú del panel: mismo patrón visual que la pantalla "Más". */
function AdminMenuItem({ icon: Icon, label, detalle, badge, color, onClick }) {
  return (
    <button className="pf-press" onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10, cursor: "pointer", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
        <Icon size={20} color={color || C.muted} style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.foreground }}>{label}</div>
          {detalle && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{detalle}</div>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!!badge && <span style={{ background: C.error, color: textoContraste(C.error), fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "2px 8px" }}>{badge}</span>}
        <ChevronRight size={18} color={C.muted} />
      </div>
    </button>
  );
}

/* Selector de sucursal que se repite en varias secciones del panel. */
function SelectorSucursal({ valor, onChange, incluirAmbas }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
      {incluirAmbas && <FilterPill label="Ambas" active={valor === "ambas"} onClick={() => onChange("ambas")} />}
      {SUCURSALES.map((s) => (
        <FilterPill key={s} label={NOMBRES_SUCURSAL[s].replace("Photograf ", "")} active={valor === s} onClick={() => onChange(s)} />
      ))}
    </div>
  );
}

/* Junta la bitácora de ambas sucursales con su etiqueta de origen. */
function bitacoraCombinada(allData) {
  return SUCURSALES.flatMap((s) => (allData[s]?.bitacora || []).map((b, i) => ({ ...b, sucursal: s, _key: `${s}-${i}` })));
}

/* Agrupa movimientos por semana para la gráfica de tendencia. */
function movimientosPorSemana(movs, n = 8) {
  const base = new Date(fmt(hoy));
  const inicioActual = new Date(base);
  inicioActual.setDate(base.getDate() - base.getDay());
  const cubos = [];
  for (let i = n - 1; i >= 0; i--) {
    const ini = new Date(inicioActual);
    ini.setDate(inicioActual.getDate() - i * 7);
    const fin = new Date(ini);
    fin.setDate(ini.getDate() + 7);
    cubos.push({ label: `${ini.getDate()}/${ini.getMonth() + 1}`, ini: fmt(ini), fin: fmt(fin), valor: 0 });
  }
  movs.forEach((m) => {
    const cubo = cubos.find((k) => m.fecha >= k.ini && m.fecha < k.fin);
    if (cubo) cubo.valor += 1;
  });
  return cubos;
}

function valorDeSucursal(d) {
  const equipo = d.equipo.filter((e) => e.estado !== "Baja").reduce((a, e) => a + (Number(e.costo) || 0), 0);
  const materiales = d.materiales.reduce((a, m) => a + (Number(m.costo) || 0) * (Number(m.cantidad) || 0), 0);
  const bases = d.bases.reduce((a, b) => a + (Number(b.costo) || 0) * tenemosBase(b), 0);
  const mobiliario = (d.mobiliario || []).filter((m) => m.estado !== "Baja").reduce((a, m) => a + (Number(m.costo) || 0) * (Number(m.cantidad) || 0), 0);
  const indumentaria = (d.indumentaria || []).reduce((a, i) => a + (Number(i.costo) || 0) * (Number(i.cantidadTotal) || 0), 0);
  const emblematicos = (d.emblematicos || []).reduce((a, e) => a + (Number(e.costo) || 0) * (Number(e.cantidadTotal) || 0), 0);
  const piezas = (d.piezas || []).reduce((a, p) => a + (Number(p.costo) || 0) * (Number(p.cantidad) || 0), 0);
  // Las placas chicas se cortan de la hoja grande, que ya se valuó arriba —
  // sumar también su costo sería contar el mismo material dos veces, así
  // que solo se cuenta la hoja grande como inversión de material.
  const hojasGrandes = (d.hojasGrandes || []).reduce((a, h) => a + (Number(h.costo) || 0) * (Number(h.cantidad) || 0), 0);
  return {
    equipo, materiales, bases, mobiliario, indumentaria, emblematicos, piezas, hojasGrandes,
    total: equipo + materiales + bases + mobiliario + indumentaria + emblematicos + piezas + hojasGrandes,
  };
}

/* Pedidos que el administrador todavía no autoriza. Los pedidos viejos
   (creados antes de que existiera la autorización) siguen como "Pendiente"
   y no se vuelven a pedir para no estorbar. */
function pedidosPorAprobar(allData) {
  return SUCURSALES.flatMap((s) => (allData[s]?.pedidos || []).filter((p) => p.estado === "Por aprobar").map((p) => ({ ...p, sucursal: s })));
}

function equipoFueraDeServicio(allData) {
  return SUCURSALES.flatMap((s) => allData[s].equipo.filter((e) => e.estado === "Dañado" || e.estado === "En reparación").map((e) => ({ ...e, sucursal: s })));
}

function paquetesSinRecoger(allData) {
  return SUCURSALES.flatMap((s) =>
    allData[s].bases.flatMap((b) =>
      b.reservas
        .filter((r) => r.estado === "Reservada")
        .map((r) => ({ ...r, base: b.nombre, baseId: b.id, precio: b.precio || 0, sucursal: s, dias: diasTranscurridos(r.fecha) }))
    )
  ).sort((a, b) => b.dias - a.dias);
}

/* =========================================================================
   ADMIN · Resumen con gráficas
   ========================================================================= */
function AdminResumen({ allData, config, transferenciasBases }) {
  const movs = bitacoraCombinada(allData);
  const porSemana = movimientosPorSemana(movs, 8);

  const equipoTodo = SUCURSALES.flatMap((s) => allData[s].equipo.map((e) => ({ ...e, sucursal: s })));
  const activos = equipoTodo.filter((e) => e.estado !== "Baja");

  const tramosEstado = [
    { label: "Disponible", valor: activos.filter((e) => e.estado === "Disponible").length, color: C.success },
    { label: "En uso", valor: activos.filter((e) => e.estado === "En uso").length, color: C.primary },
    { label: "Dañado", valor: activos.filter((e) => e.estado === "Dañado").length, color: C.error },
    { label: "En reparación", valor: activos.filter((e) => e.estado === "En reparación").length, color: C.warning },
  ];

  const valores = SUCURSALES.map((s) => ({ sucursal: s, ...valorDeSucursal(allData[s]) }));
  const valorTotal = valores.reduce((a, v) => a + v.total, 0);

  /* Ranking de quién pide más equipo: se lee de la bitácora de las dos
     sucursales, no de una sola como antes. */
  const solicitudes = {};
  movs.forEach((b) => {
    const m = b.texto.match(/prestado a (.+)$/);
    if (m) solicitudes[m[1]] = (solicitudes[m[1]] || 0) + 1;
  });
  const rankingPersonas = Object.entries(solicitudes)
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);

  const rankingEquipo = equipoTodo
    .map((e) => ({ label: e.nombre, valor: (e.historial || []).filter((h) => h.texto.startsWith("Prestado a")).length }))
    .filter((r) => r.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);

  const porCategoria = {};
  activos.forEach((e) => {
    porCategoria[e.categoria] = (porCategoria[e.categoria] || 0) + (Number(e.costo) || 0);
  });
  SUCURSALES.forEach((s) =>
    allData[s].materiales.forEach((m) => {
      porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + (Number(m.costo) || 0) * (Number(m.cantidad) || 0);
    })
  );
  const rankingValor = Object.entries(porCategoria)
    .map(([label, valor]) => ({ label, valor }))
    .filter((r) => r.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 7);

  const atrasados = equipoTodo.filter((e) => e.estado === "En uso" && e.fechaDevolucion && e.fechaDevolucion < fmt(hoy));

  return (
    <div>
      <div
        className="pf-pop"
        style={{
          background: `linear-gradient(135deg, ${shadeColor(C.primary, 6)}, ${shadeColor(C.primary, -22)})`,
          borderRadius: 16,
          padding: "20px 18px",
          marginBottom: 18,
          boxShadow: `0 12px 28px ${C.primary}35`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.secondary}, ${C.primary})` }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Valor del inventario · las dos sucursales</div>
        <div className="pf-heading" style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginTop: 5 }}>{fmtMoneda(valorTotal)}</div>
        <div style={{ display: "flex", gap: 18, marginTop: 12 }}>
          {valores.map((v) => (
            <div key={v.sucursal}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{NOMBRES_SUCURSAL[v.sucursal].replace("Photograf ", "")}</div>
              <div style={{ fontSize: 14, color: "#fff", fontWeight: 700 }}>{fmtMoneda(v.total)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
        {SUCURSALES.map((s) => {
          const d = allData[s];
          const al = calcularAlertas(d, config).length;
          return (
            <div key={s} style={{ flex: "1 1 44%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, boxShadow: SOMBRA_TARJETA }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.foreground, marginBottom: 6 }}>{NOMBRES_SUCURSAL[s].replace("Photograf ", "")}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{d.equipo.filter((e) => e.estado !== "Baja").length} equipos · {d.equipo.filter((e) => e.estado === "En uso").length} en uso</div>
              <div style={{ fontSize: 12, color: C.muted }}>{d.materiales.length} materiales · {d.bases.length} bases</div>
              <div style={{ fontSize: 12, color: al > 0 ? C.error : C.success, fontWeight: 600, marginTop: 4 }}>{al} alerta(s)</div>
            </div>
          );
        })}
      </div>

      <BarraApilada titulo="Cómo está repartido el equipo" tramos={tramosEstado} />

      <GraficaColumnas titulo="Movimientos por semana (últimas 8)" datos={porSemana} color={C.primary} />

      <GraficaBarras titulo="Valor por categoría" datos={rankingValor} color={C.secondary} formato={fmtMoneda} vacio="Captura el costo de tu equipo y materiales para ver esta gráfica." />

      <GraficaBarras titulo="Quién pide más equipo" datos={rankingPersonas} color={C.primary} formato={(v) => `${v} veces`} />

      <GraficaBarras titulo="Equipo más solicitado" datos={rankingEquipo} color={C.accent1} formato={(v) => `${v}×`} />

      {atrasados.length > 0 && (
        <div style={{ background: `${C.error}12`, border: `1px solid ${C.error}`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.error, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={15} /> {atrasados.length} equipo(s) sin devolver a tiempo
          </div>
          {atrasados.map((e) => (
            <div key={`${e.sucursal}-${e.id}`} style={{ fontSize: 12, color: C.foreground, marginTop: 3 }}>
              {e.nombre} — {e.quienLoTiene} · debía volver el {e.fechaDevolucion} ({NOMBRES_SUCURSAL[e.sucursal].replace("Photograf ", "")})
            </div>
          ))}
        </div>
      )}

      {/* Préstamo de bases entre sucursales que lleva 5+ días sin que el
          destino confirme recepción — el aviso de "no devuelto" que pide el
          negocio, aplicado a bases igual que ya existía para equipo. */}
      {(() => {
        const prestamosLentos = (transferenciasBases || []).filter((t) => t.estado === "En tránsito" && diasTranscurridos(t.fechaEnvio) >= 5);
        if (prestamosLentos.length === 0) return null;
        return (
          <div style={{ background: `${C.warning}12`, border: `1px solid ${C.warning}`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.warning, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={15} /> {prestamosLentos.length} préstamo(s) de bases sin confirmar recepción
            </div>
            {prestamosLentos.map((t) => (
              <div key={t.id} style={{ fontSize: 12, color: C.foreground, marginTop: 3 }}>
                {t.nombre} ×{t.cantidad} — {NOMBRES_SUCURSAL[t.origen].replace("Photograf ", "")} → {NOMBRES_SUCURSAL[t.destino].replace("Photograf ", "")} · enviado hace {diasTranscurridos(t.fechaEnvio)} días por {t.quienEnvio}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Indumentaria (togas, birretes, estolas...) prestada a una persona
          que ya pasó su fecha esperada de devolución — mismo espíritu que
          la de bases, pero por persona en vez de por sucursal. */}
      {(() => {
        const sinDevolver = SUCURSALES.flatMap((s) =>
          (allData[s].indumentaria || []).flatMap((i) =>
            (i.prestamos || [])
              .filter((p) => p.estado === "Prestado" && p.fechaEsperada && p.fechaEsperada < fmt(hoy))
              .map((p) => ({ ...p, sucursal: s, item: i }))
          )
        );
        if (sinDevolver.length === 0) return null;
        return (
          <div style={{ background: `${C.error}12`, border: `1px solid ${C.error}`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.error, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={15} /> {sinDevolver.length} préstamo(s) de indumentaria sin devolver
            </div>
            {sinDevolver.map((p) => (
              <div key={p.id} style={{ fontSize: 12, color: C.foreground, marginTop: 3 }}>
                {p.item.tipo}{p.item.detalle ? ` (${p.item.detalle})` : ""} ×{p.cantidad} — {p.persona} · debía volver el {p.fechaEsperada} ({NOMBRES_SUCURSAL[p.sucursal].replace("Photograf ", "")})
              </div>
            ))}
          </div>
        );
      })()}

      {/* Anillos de oro que están en resguardo sin la firma de responsiva —
          el requerimiento lo pide explícitamente para este caso. */}
      {(() => {
        const sinFirma = SUCURSALES.flatMap((s) =>
          (allData[s].emblematicos || []).flatMap((e) =>
            e.material === "Oro"
              ? (e.custodios || []).filter((c) => c.activo && !c.firmaResponsiva).map((c) => ({ ...c, sucursal: s, item: e }))
              : []
          )
        );
        if (sinFirma.length === 0) return null;
        return (
          <div style={{ background: `${C.error}12`, border: `1px solid ${C.error}`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.error, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <FileSignature size={15} /> {sinFirma.length} anillo(s) de oro en resguardo sin firma de responsiva
            </div>
            {sinFirma.map((c) => (
              <div key={c.id} style={{ fontSize: 12, color: C.foreground, marginTop: 3 }}>
                {c.item.detalle || "Anillo de oro"} ×{c.cantidad} — {c.persona} desde el {c.fecha} ({NOMBRES_SUCURSAL[c.sucursal].replace("Photograf ", "")})
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

/* =========================================================================
   ADMIN · Empleados
   ========================================================================= */
function AdminEmpleados({ empleados, setEmpleados, allData, onBack, mostrarToast }) {
  const [nuevo, setNuevo] = useState("");
  const [porBorrar, setPorBorrar] = useState(null);
  const [renombrando, setRenombrando] = useState(null);
  const [nombreNuevo, setNombreNuevo] = useState("");

  const movs = bitacoraCombinada(allData);

  const agregar = () => {
    const nombre = nuevo.trim();
    if (!nombre) return;
    if (empleados.some((e) => e.toLowerCase() === nombre.toLowerCase())) {
      mostrarToast("Ese nombre ya está en la lista");
      return;
    }
    setEmpleados((e) => [...e, nombre]);
    setNuevo("");
    mostrarToast("Empleado agregado ✓");
  };

  const actividadDe = (nombre) => {
    const prestado = SUCURSALES.flatMap((s) => allData[s].equipo).filter((e) => e.estado === "En uso" && e.quienLoTiene === nombre);
    const ultima = [...movs].reverse().find((b) => b.quien === nombre);
    return { prestado, ultima };
  };

  const confirmarRenombrar = () => {
    const limpio = nombreNuevo.trim();
    if (!limpio || limpio === renombrando) return setRenombrando(null);
    setEmpleados((lista) => lista.map((n) => (n === renombrando ? limpio : n)));
    mostrarToast("Nombre actualizado ✓");
    setRenombrando(null);
  };

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Empleados" subtitle={`${empleados.length} en la lista`} onBack={onBack} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <TextInput value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} placeholder="Nombre del nuevo empleado" />
          </div>
          <button onClick={agregar} disabled={!nuevo.trim()} style={{ background: C.primary, border: "none", borderRadius: 8, padding: "0 16px", color: textoContraste(C.primary), cursor: nuevo.trim() ? "pointer" : "not-allowed", opacity: nuevo.trim() ? 1 : 0.5, display: "flex", alignItems: "center" }} aria-label="Agregar empleado">
            <UserPlus size={18} />
          </button>
        </div>

        {empleados.length === 0 && <EmptyState icon={Users} text="Agrega a tu equipo para que puedan identificarse al entrar." />}
        {empleados.map((nombre) => {
          const { prestado, ultima } = actividadDe(nombre);
          return (
            <div key={nombre} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: SOMBRA_TARJETA }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <UserCircle size={20} color={C.primary} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{nombre}</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { setRenombrando(nombre); setNombreNuevo(nombre); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 4 }} aria-label="Cambiar nombre">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setPorBorrar(nombre)} style={{ background: "none", border: "none", color: C.error, cursor: "pointer", padding: 4 }} aria-label="Quitar">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <Activity size={13} color={C.muted} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.muted }}>
                  {prestado.length > 0 ? `Trae ${prestado.length} equipo(s): ${prestado.map((e) => e.nombre).join(", ")}` : "Sin equipo prestado"}
                  {ultima ? ` · Última actividad: ${ultima.texto} (${ultima.fecha})` : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {renombrando && (
        <Modal title="Cambiar nombre" onClose={() => setRenombrando(null)}>
          <div style={{ fontSize: 12.5, color: C.muted }}>Cambia cómo aparece en la lista de quién eres. Los movimientos ya registrados conservan el nombre anterior.</div>
          <FieldLabel>Nombre</FieldLabel>
          <TextInput value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} autoFocus />
          <PrimaryButton onClick={confirmarRenombrar} disabled={!nombreNuevo.trim()}>Guardar nombre</PrimaryButton>
        </Modal>
      )}

      {porBorrar && (
        <Modal title="Quitar empleado" onClose={() => setPorBorrar(null)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>
            ¿Quitar a {porBorrar} de la lista? Ya no podrá elegirse al entrar, pero su historial de movimientos se conserva.
          </div>
          <PrimaryButton onClick={() => { setEmpleados((e) => e.filter((x) => x !== porBorrar)); setPorBorrar(null); mostrarToast("Empleado quitado"); }} color={C.error}>
            Sí, quitar
          </PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   ADMIN · Editar y eliminar inventario (equipo, materiales, bases)
   ========================================================================= */
const ESTADOS_EQUIPO = ["Disponible", "En uso", "Dañado", "En reparación", "Baja"];

function AdminInventario({ allData, setAllData, registrar, config, onBack, mostrarToast }) {
  const [suc, setSuc] = useState(SUCURSALES[0]);
  const [tab, setTab] = useState("equipo");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null); // { tipo, item }
  const [form, setForm] = useState({});
  const [porEliminar, setPorEliminar] = useState(null);
  const [confirmandoCatalogo, setConfirmandoCatalogo] = useState(false);
  const [borrandoBases, setBorrandoBases] = useState(false);
  const [textoBorrarBases, setTextoBorrarBases] = useState("");

  const d = allData[suc];

  // Qué tipo de artículo (el mismo que usa "editando"/"guardar") corresponde
  // a cada pestaña, y cómo se llama el botón de alta en cada una.
  const TIPO_POR_TAB = { equipo: "equipo", materiales: "material", bases: "base", indumentaria: "indumentaria", emblematicos: "emblematico", mobiliario: "mobiliario", piezas: "pieza" };
  const TITULO_NUEVO = { equipo: "Nuevo equipo", material: "Nuevo material", base: "Nueva base", indumentaria: "Nueva indumentaria", emblematico: "Nuevo emblemático", mobiliario: "Nuevo mobiliario", pieza: "Nueva pieza" };
  const TITULO_EDITAR = { equipo: "Editar equipo", material: "Editar material", base: "Editar base", indumentaria: "Editar indumentaria", emblematico: "Editar emblemático", mobiliario: "Editar mobiliario", pieza: "Editar pieza" };
  const VALORES_NUEVO = {
    equipo: { nombre: "", categoria: "", costo: "", notas: "", estado: "Disponible" },
    material: { nombre: "", categoria: "", cantidad: "", costo: "", notas: "", minimo: "" },
    base: { nombre: "", catalogo: "General", tenemos: "", costo: "", pedidoProveedor: "", precio: "", medidas: "", incluye: "", imagen: null },
    indumentaria: { tipo: "", detalle: "", cantidadTotal: "", costo: "" },
    emblematico: { tipo: "", material: "", detalle: "", cantidadTotal: "", costo: "" },
    mobiliario: { tipo: "", modelo: "", cantidad: "", costo: "", ubicacion: "", notas: "", estado: "Disponible" },
    pieza: { grupo: GRUPOS_PIEZA[0], tipo: "", detalle: "", cantidad: "", costo: "", notas: "", minimo: "" },
  };

  const abrir = (tipo, item) => {
    setEditando({ tipo, item });
    setForm({ ...item });
  };

  /* Antes esta pantalla solo dejaba editar o borrar lo que ya existía —
     no había ninguna forma de dar de alta un artículo nuevo desde aquí, ni
     siquiera un material, desde que se quitó la pestaña de Materiales. */
  const abrirNuevo = (tipo) => {
    setEditando({ tipo, item: null });
    setForm(VALORES_NUEVO[tipo] || {});
  };

  const guardar = () => {
    const { tipo, item } = editando;
    const esNuevo = !item;
    const nombre = (form.nombre || "").trim();
    if (tipo !== "indumentaria" && tipo !== "emblematico" && tipo !== "mobiliario" && tipo !== "pieza" && !nombre) return;
    if (tipo === "indumentaria" && !(form.tipo || item?.tipo)) return;
    if (tipo === "emblematico" && !(form.tipo || item?.tipo)) return;
    if (tipo === "mobiliario" && !(form.modelo || "").trim()) return;
    if (tipo === "pieza" && !(form.tipo || item?.tipo)) return;

    if (tipo === "equipo") {
      if (esNuevo) {
        setAllData((prev) => {
          const arr = prev[suc].equipo;
          const nuevoItem = { id: Math.max(0, ...arr.map((e) => e.id)) + 1, nombre, categoria: (form.categoria || "").trim() || "General", estado: form.estado || "Disponible", foto: null, fotos: [], costo: parseFloat(form.costo) || 0, quienLoTiene: null, quienAutorizo: null, fechaPrestamo: null, fechaDevolucion: null, notas: form.notas || "", historial: [{ texto: "Alta de equipo desde el panel de administrador", fecha: fmt(hoy) }] };
          return { ...prev, [suc]: { ...prev[suc], equipo: [...arr, nuevoItem] } };
        });
        registrar(suc, `Equipo agregado por el administrador: ${nombre}`);
      } else {
        const cambios = {
          nombre,
          categoria: (form.categoria || "").trim() || item.categoria,
          costo: parseFloat(form.costo) || 0,
          notas: form.notas || "",
          estado: form.estado || item.estado,
        };
        setAllData((prev) => ({
          ...prev,
          [suc]: {
            ...prev[suc],
            equipo: prev[suc].equipo.map((e) =>
              e.id === item.id ? { ...e, ...cambios, historial: [...(e.historial || []), { texto: "Editado desde el panel de administrador", fecha: fmt(hoy) }] } : e
            ),
          },
        }));
        registrar(suc, `Equipo editado por el administrador: ${nombre}`);
      }
    } else if (tipo === "material") {
      const sinMinimo = form.minimo === "" || form.minimo === undefined || form.minimo === null;
      if (esNuevo) {
        setAllData((prev) => {
          const arr = prev[suc].materiales;
          const nuevoItem = { id: Math.max(0, ...arr.map((m) => m.id)) + 1, nombre, categoria: (form.categoria || "").trim() || "General", cantidad: parseInt(form.cantidad, 10) || 0, costo: parseFloat(form.costo) || 0, notas: form.notas || "", foto: null };
          if (!sinMinimo) nuevoItem.minimo = parseInt(form.minimo, 10) || 0;
          return { ...prev, [suc]: { ...prev[suc], materiales: [...arr, nuevoItem] } };
        });
        registrar(suc, `Material agregado por el administrador: ${nombre}`);
      } else {
        const cambios = {
          nombre,
          categoria: (form.categoria || "").trim() || item.categoria,
          cantidad: parseInt(form.cantidad, 10) || 0,
          costo: parseFloat(form.costo) || 0,
          notas: form.notas || "",
        };
        setAllData((prev) => ({
          ...prev,
          [suc]: {
            ...prev[suc],
            materiales: prev[suc].materiales.map((m) => {
              if (m.id !== item.id) return m;
              const actualizado = { ...m, ...cambios };
              // La nube no acepta valores indefinidos: si el material no tiene
              // mínimo propio se quita la llave en vez de dejarla vacía.
              if (sinMinimo) delete actualizado.minimo;
              else actualizado.minimo = parseInt(form.minimo, 10) || 0;
              return actualizado;
            }),
          },
        }));
        registrar(suc, `Material editado por el administrador: ${nombre}`);
      }
    } else if (tipo === "indumentaria") {
      if (esNuevo) {
        setAllData((prev) => {
          const arr = prev[suc].indumentaria;
          const nuevoItem = { id: Math.max(0, ...arr.map((i) => i.id)) + 1, tipo: form.tipo, detalle: (form.detalle || "").trim(), cantidadTotal: parseInt(form.cantidadTotal, 10) || 0, costo: parseFloat(form.costo) || 0, movimientos: [], prestamos: [] };
          return { ...prev, [suc]: { ...prev[suc], indumentaria: [...arr, nuevoItem] } };
        });
        registrar(suc, `Indumentaria agregada por el administrador: ${form.tipo}`);
      } else {
        const cambios = {
          tipo: form.tipo || item.tipo,
          detalle: (form.detalle || "").trim(),
          costo: parseFloat(form.costo) || 0,
        };
        const nuevoTotal = parseInt(form.cantidadTotal, 10);
        const diferencia = !isNaN(nuevoTotal) ? nuevoTotal - item.cantidadTotal : 0;
        setAllData((prev) => ({
          ...prev,
          [suc]: {
            ...prev[suc],
            indumentaria: prev[suc].indumentaria.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    ...cambios,
                    cantidadTotal: !isNaN(nuevoTotal) ? nuevoTotal : i.cantidadTotal,
                    movimientos: diferencia !== 0 ? [...(i.movimientos || []), movimientoBase("ajuste", diferencia, "Administrador", "Ajuste desde el panel de administrador")] : i.movimientos,
                  }
                : i
            ),
          },
        }));
        registrar(suc, `Indumentaria editada por el administrador: ${cambios.tipo}`);
      }
    } else if (tipo === "emblematico") {
      if (esNuevo) {
        setAllData((prev) => {
          const arr = prev[suc].emblematicos;
          const nuevoItem = { id: Math.max(0, ...arr.map((e) => e.id)) + 1, tipo: form.tipo, material: form.tipo === "Anillo" ? form.material || "" : "", detalle: (form.detalle || "").trim(), cantidadTotal: parseInt(form.cantidadTotal, 10) || 0, costo: parseFloat(form.costo) || 0, movimientos: [], custodios: [] };
          return { ...prev, [suc]: { ...prev[suc], emblematicos: [...arr, nuevoItem] } };
        });
        registrar(suc, `Emblemático agregado por el administrador: ${form.tipo}`);
      } else {
        const cambios = {
          tipo: form.tipo || item.tipo,
          material: (form.tipo || item.tipo) === "Anillo" ? form.material || "" : "",
          detalle: (form.detalle || "").trim(),
          costo: parseFloat(form.costo) || 0,
        };
        const nuevoTotal = parseInt(form.cantidadTotal, 10);
        const diferencia = !isNaN(nuevoTotal) ? nuevoTotal - item.cantidadTotal : 0;
        setAllData((prev) => ({
          ...prev,
          [suc]: {
            ...prev[suc],
            emblematicos: prev[suc].emblematicos.map((e) =>
              e.id === item.id
                ? {
                    ...e,
                    ...cambios,
                    cantidadTotal: !isNaN(nuevoTotal) ? nuevoTotal : e.cantidadTotal,
                    movimientos: diferencia !== 0 ? [...(e.movimientos || []), movimientoBase("ajuste", diferencia, "Administrador", "Ajuste desde el panel de administrador")] : e.movimientos,
                  }
                : e
            ),
          },
        }));
        registrar(suc, `Emblemático editado por el administrador: ${cambios.tipo}`);
      }
    } else if (tipo === "mobiliario") {
      if (esNuevo) {
        setAllData((prev) => {
          const arr = prev[suc].mobiliario;
          const nuevoItem = { id: Math.max(0, ...arr.map((m) => m.id)) + 1, tipo: form.tipo || "Otro", modelo: (form.modelo || "").trim(), cantidad: parseInt(form.cantidad, 10) || 0, costo: parseFloat(form.costo) || 0, ubicacion: (form.ubicacion || "").trim(), notas: form.notas || "", estado: form.estado || "Disponible", movimientos: [] };
          return { ...prev, [suc]: { ...prev[suc], mobiliario: [...arr, nuevoItem] } };
        });
        registrar(suc, `Mobiliario agregado por el administrador: ${form.tipo || "Otro"} — ${(form.modelo || "").trim()}`);
      } else {
        const cambios = {
          tipo: form.tipo || item.tipo,
          modelo: (form.modelo || "").trim(),
          costo: parseFloat(form.costo) || 0,
          ubicacion: (form.ubicacion || "").trim(),
          notas: form.notas || "",
          estado: form.estado || item.estado,
        };
        const nuevaCant = parseInt(form.cantidad, 10);
        const diferencia = !isNaN(nuevaCant) ? nuevaCant - item.cantidad : 0;
        setAllData((prev) => ({
          ...prev,
          [suc]: {
            ...prev[suc],
            mobiliario: prev[suc].mobiliario.map((m) =>
              m.id === item.id
                ? {
                    ...m,
                    ...cambios,
                    cantidad: !isNaN(nuevaCant) ? nuevaCant : m.cantidad,
                    movimientos: diferencia !== 0 ? [...(m.movimientos || []), movimientoBase("ajuste", diferencia, "Administrador", "Ajuste desde el panel de administrador")] : m.movimientos,
                  }
                : m
            ),
          },
        }));
        registrar(suc, `Mobiliario editado por el administrador: ${cambios.tipo} — ${cambios.modelo}`);
      }
    } else if (tipo === "pieza") {
      const sinMinimo = form.minimo === "" || form.minimo === undefined || form.minimo === null;
      if (esNuevo) {
        setAllData((prev) => {
          const arr = prev[suc].piezas;
          const nuevoItem = { id: Math.max(0, ...arr.map((p) => p.id)) + 1, grupo: form.grupo || GRUPOS_PIEZA[0], tipo: (form.tipo || "").trim(), detalle: (form.detalle || "").trim(), cantidad: parseInt(form.cantidad, 10) || 0, costo: parseFloat(form.costo) || 0, notas: form.notas || "", movimientos: [] };
          if (!sinMinimo) nuevoItem.minimo = parseInt(form.minimo, 10) || 0;
          return { ...prev, [suc]: { ...prev[suc], piezas: [...arr, nuevoItem] } };
        });
        registrar(suc, `Pieza agregada por el administrador: ${(form.tipo || "").trim()}`);
      } else {
        const cambios = {
          grupo: form.grupo || item.grupo,
          tipo: (form.tipo || item.tipo || "").trim(),
          detalle: (form.detalle || "").trim(),
          costo: parseFloat(form.costo) || 0,
          notas: form.notas || "",
        };
        const nuevaCant = parseInt(form.cantidad, 10);
        const diferencia = !isNaN(nuevaCant) ? nuevaCant - item.cantidad : 0;
        setAllData((prev) => ({
          ...prev,
          [suc]: {
            ...prev[suc],
            piezas: prev[suc].piezas.map((p) => {
              if (p.id !== item.id) return p;
              const actualizado = {
                ...p,
                ...cambios,
                cantidad: !isNaN(nuevaCant) ? nuevaCant : p.cantidad,
                movimientos: diferencia !== 0 ? [...(p.movimientos || []), movimientoBase("ajuste", diferencia, "Administrador", "Ajuste desde el panel de administrador")] : p.movimientos,
              };
              if (sinMinimo) delete actualizado.minimo;
              else actualizado.minimo = parseInt(form.minimo, 10) || 0;
              return actualizado;
            }),
          },
        }));
        registrar(suc, `Pieza editada por el administrador: ${cambios.tipo}`);
      }
    } else {
      // base
      if (esNuevo) {
        setAllData((prev) => {
          const arr = prev[suc].bases;
          const cant = parseInt(form.tenemos, 10) || 0;
          const nuevoItem = { id: Math.max(0, ...arr.map((b) => b.id)) + 1, nombre, catalogo: form.catalogo || "General", tenemos: cant, costo: parseFloat(form.costo) || 0, pedidoProveedor: parseInt(form.pedidoProveedor, 10) || 0, reservas: [], movimientos: cant > 0 ? [movimientoBase("entrada", cant, "Administrador", "Alta desde el panel de administrador")] : [], linea: "", precio: parseFloat(form.precio) || 0, medidas: form.medidas || "", incluye: form.incluye || "", imagen: form.imagen || null, variantes: [] };
          return { ...prev, [suc]: { ...prev[suc], bases: [...arr, nuevoItem] } };
        });
        registrar(suc, `Base agregada por el administrador: ${nombre}`);
      } else {
        const cambios = {
          nombre,
          catalogo: form.catalogo || item.catalogo,
          tenemos: parseInt(form.tenemos, 10) || 0,
          costo: parseFloat(form.costo) || 0,
          pedidoProveedor: parseInt(form.pedidoProveedor, 10) || 0,
          precio: parseFloat(form.precio) || 0,
          medidas: form.medidas || "",
          incluye: form.incluye || "",
          imagen: form.imagen ?? item.imagen ?? null,
        };
        setAllData((prev) => {
          const basesConEdicion = prev[suc].bases.map((b) => (b.id === item.id ? { ...b, ...cambios } : b));
          const bases = conPanoSincronizado(basesConEdicion, { ...item, ...cambios }, cambios.tenemos, "Administrador", `Sincronizado: se editó "${nombre}" en ${panoDe(nombre)} desde el panel de administrador`);
          return { ...prev, [suc]: { ...prev[suc], bases } };
        });
        registrar(suc, `Base editada por el administrador: ${nombre}`);
      }
    }
    mostrarToast(esNuevo ? "Artículo agregado ✓" : "Cambios guardados ✓");
    setEditando(null);
  };

  const eliminar = () => {
    const { tipo, item } = porEliminar;
    const llave =
      tipo === "equipo" ? "equipo" :
      tipo === "material" ? "materiales" :
      tipo === "indumentaria" ? "indumentaria" :
      tipo === "emblematico" ? "emblematicos" :
      tipo === "mobiliario" ? "mobiliario" :
      tipo === "pieza" ? "piezas" : "bases";
    setAllData((prev) => ({ ...prev, [suc]: { ...prev[suc], [llave]: prev[suc][llave].filter((x) => x.id !== item.id) } }));
    registrar(suc, `Eliminado por el administrador: ${item.nombre || item.modelo || item.tipo}`);
    mostrarToast("Eliminado");
    setPorEliminar(null);
    setEditando(null);
  };

  const filtra = (arr) => arr.filter((x) => (x.nombre || x.modelo || `${x.grupo || ""} ${x.tipo || ""} ${x.detalle || ""}`).toLowerCase().includes(busca.toLowerCase()));

  /* Carga los paquetes del catálogo 2026 en esta sucursal. Los que ya
     existen (por nombre) conservan sus existencias y sus paquetes de
     clientes: solo se les refresca precio, medidas y descripción. UNICEQ
     nunca se carga en Salinas. */
  const delCatalogo = CATALOGO_2026.filter((p) => suc === "queretaro" || p.catalogo !== "UNICEQ");
  const nombresActuales = d.bases.map((b) => b.nombre.trim().toLowerCase());
  const nuevas = delCatalogo.filter((p) => !nombresActuales.includes(p.nombre.toLowerCase()));

  const cargarCatalogo = () => {
    setAllData((prev) => {
      const bases = [...prev[suc].bases];
      let siguienteId = Math.max(0, ...bases.map((b) => b.id)) + 1;
      delCatalogo.forEach((p) => {
        const datos = { catalogo: p.catalogo, linea: p.linea || "", precio: p.precio, medidas: p.medidas || "", incluye: p.incluye || "", imagen: p.imagen || null, imagenDiploma: p.imagenDiploma || null };
        const i = bases.findIndex((b) => b.nombre.trim().toLowerCase() === p.nombre.toLowerCase());
        if (i >= 0) {
          bases[i] = { ...bases[i], ...datos };
        } else {
          // Si ya existe un pano hermano (mismo diseño en Universidad/UNICEQ)
          // con existencia cargada, el paquete nuevo se une a esa misma
          // existencia compartida en vez de empezar en 0.
          const hermana = ["Universidad", "UNICEQ"].includes(p.catalogo)
            ? bases.find((b) => ["Universidad", "UNICEQ"].includes(b.catalogo) && !(b.variantes && b.variantes.length > 0) && panoDe(b.nombre) === panoDe(p.nombre))
            : null;
          bases.push({ id: siguienteId++, nombre: p.nombre, ...datos, tenemos: hermana ? hermana.tenemos : 0, costo: 0, pedidoProveedor: 0, reservas: [], movimientos: [], variantes: [] });
        }
      });
      return { ...prev, [suc]: { ...prev[suc], bases } };
    });
    registrar(suc, `Catálogo 2026 cargado: ${nuevas.length} paquete(s) nuevo(s), ${delCatalogo.length - nuevas.length} actualizado(s)`);
    mostrarToast(nuevas.length ? `${nuevas.length} paquete(s) agregado(s) ✓` : "Catálogo actualizado ✓");
    setConfirmandoCatalogo(false);
  };

  /* Borra por completo las bases de la sucursal que se está viendo:
     existencias, variantes, reservas y movimientos. No toca la otra
     sucursal. Exige escribir "BORRAR" para evitar un toque accidental,
     porque no se puede deshacer. */
  const borrarTodasLasBases = () => {
    if (textoBorrarBases.trim().toUpperCase() !== "BORRAR") return;
    const cuantas = d.bases.length;
    setAllData((prev) => ({ ...prev, [suc]: { ...prev[suc], bases: [] } }));
    registrar(suc, `Se borraron todas las bases (${cuantas}) desde el panel de administrador`);
    mostrarToast("Todas las bases fueron borradas");
    setBorrandoBases(false);
    setTextoBorrarBases("");
  };

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Editar inventario" subtitle="Corrige o elimina cualquier artículo" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <SelectorSucursal valor={suc} onChange={setSuc} />
        {/* Antes esta fila se salía de la pantalla y había que arrastrarla
            para ver las últimas pestañas; con flexWrap se acomodan solas en
            dos líneas y se ven todas de un vistazo. */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <FilterPill label={`Equipo (${d.equipo.length})`} active={tab === "equipo"} onClick={() => setTab("equipo")} />
          <FilterPill label={`Materiales (${d.materiales.length})`} active={tab === "materiales"} onClick={() => setTab("materiales")} color={C.accent1} />
          <FilterPill label={`Bases (${d.bases.length})`} active={tab === "bases"} onClick={() => setTab("bases")} color={C.secondary} />
          <FilterPill label={`Indumentaria (${(d.indumentaria || []).length})`} active={tab === "indumentaria"} onClick={() => setTab("indumentaria")} color={C.primary} />
          <FilterPill label={`Emblemáticos (${(d.emblematicos || []).length})`} active={tab === "emblematicos"} onClick={() => setTab("emblematicos")} color={C.warning} />
          <FilterPill label={`Mobiliario (${(d.mobiliario || []).length})`} active={tab === "mobiliario"} onClick={() => setTab("mobiliario")} color={C.secondary} />
          <FilterPill label={`Piezas (${(d.piezas || []).length})`} active={tab === "piezas"} onClick={() => setTab("piezas")} color={C.accent1} />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <TextInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nombre..." />
          </div>
          <button
            onClick={() => abrirNuevo(TIPO_POR_TAB[tab])}
            style={{ display: "flex", alignItems: "center", gap: 6, background: C.primary, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>

        {tab === "equipo" && filtra(d.equipo).map((e) => (
          <InventoryCard
            key={e.id}
            nombre={e.nombre}
            categoria={`${e.categoria} · ${fmtMoneda(e.costo)}`}
            foto={e.foto}
            estados={[e.estado]}
            onEdit={() => abrir("equipo", e)}
          />
        ))}
        {tab === "materiales" && filtra(d.materiales).map((m) => (
          <InventoryCard
            key={m.id}
            nombre={m.nombre}
            categoria={`${m.categoria} · mínimo ${minimoDe(m, config)}`}
            foto={m.foto}
            right={<div style={{ fontSize: 20, fontWeight: 700, color: m.cantidad <= minimoDe(m, config) ? C.warning : C.primary }}>{m.cantidad}</div>}
            onEdit={() => abrir("material", m)}
          />
        ))}
        {tab === "bases" && (
          <button
            onClick={() => setConfirmandoCatalogo(true)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: nuevas.length ? C.primary : "none", color: nuevas.length ? "#fff" : C.foreground, border: nuevas.length ? "none" : `1.5px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginBottom: 14 }}
          >
            <Download size={16} /> {nuevas.length ? `Cargar catálogo 2026 (${nuevas.length} nuevos)` : "Actualizar precios del catálogo 2026"}
          </button>
        )}
        {tab === "bases" && d.bases.length > 0 && (
          <button
            onClick={() => setBorrandoBases(true)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", color: C.error, border: `1.5px solid ${C.error}`, borderRadius: 10, padding: "12px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginBottom: 14 }}
          >
            <Trash2 size={16} /> Borrar todas las bases de esta sucursal
          </button>
        )}
        {tab === "bases" && filtra(d.bases).map((b) => (
          <InventoryCard
            key={b.id}
            nombre={b.nombre}
            categoria={`${b.catalogo}${b.linea ? ` · ${b.linea}` : ""}${b.precio ? ` · ${fmtMoneda(b.precio)}` : ""} · ${b.reservas.filter((r) => r.estado === "Reservada").length} reservada(s)${(b.variantes || []).length > 0 ? ` · ${b.variantes.map((v) => `${v.color} (${v.tenemos})`).join(", ")}` : ""}`}
            foto={b.imagen}
            right={<div style={{ fontSize: 20, fontWeight: 700, color: C.primary }}>{tenemosBase(b)}</div>}
            onEdit={() => abrir("base", b)}
          />
        ))}
        {tab === "indumentaria" &&
          filtra(d.indumentaria || []).map((i) => {
            const prestadas = (i.prestamos || []).filter((p) => p.estado === "Prestado").reduce((a, p) => a + p.cantidad, 0);
            return (
              <InventoryCard
                key={i.id}
                nombre={i.tipo}
                categoria={`${i.detalle || "Sin detalle"}${i.costo ? ` · ${fmtMoneda(i.costo)}` : ""} · ${prestadas} prestada(s)`}
                right={<div style={{ fontSize: 20, fontWeight: 700, color: prestadas >= i.cantidadTotal ? C.error : C.primary }}>{i.cantidadTotal - prestadas}</div>}
                onEdit={() => abrir("indumentaria", i)}
              />
            );
          })}
        {tab === "emblematicos" &&
          filtra(d.emblematicos || []).map((e) => {
            const enCustodia = (e.custodios || []).filter((c) => c.activo).reduce((a, c) => a + c.cantidad, 0);
            const oro = e.tipo === "Anillo" && e.material === "Oro";
            return (
              <InventoryCard
                key={e.id}
                nombre={`${e.tipo}${oro ? " (Oro)" : e.material ? ` (${e.material})` : ""}`}
                categoria={`${e.detalle || "Sin detalle"}${e.costo ? ` · ${fmtMoneda(e.costo)}` : ""} · ${enCustodia} en resguardo`}
                right={<div style={{ fontSize: 20, fontWeight: 700, color: enCustodia >= e.cantidadTotal ? C.error : C.primary }}>{e.cantidadTotal - enCustodia}</div>}
                onEdit={() => abrir("emblematico", e)}
              />
            );
          })}
        {tab === "mobiliario" &&
          filtra(d.mobiliario || []).map((m) => (
            <InventoryCard
              key={m.id}
              nombre={`${m.tipo} — ${m.modelo}`}
              categoria={`${m.ubicacion || "Sin ubicación"}${m.costo ? ` · ${fmtMoneda(m.costo)} c/u` : ""}`}
              estados={[m.estado]}
              right={<div style={{ fontSize: 20, fontWeight: 700, color: C.primary }}>{m.cantidad}</div>}
              onEdit={() => abrir("mobiliario", m)}
            />
          ))}
        {tab === "piezas" &&
          filtra(d.piezas || []).map((p) => {
            const min = minimoDe(p, config);
            return (
              <InventoryCard
                key={p.id}
                nombre={`${p.tipo}`}
                categoria={`${p.grupo} · ${p.detalle || "Sin detalle"}${p.costo ? ` · ${fmtMoneda(p.costo)}` : ""}`}
                right={<div style={{ fontSize: 20, fontWeight: 700, color: p.cantidad <= min ? C.warning : C.primary }}>{p.cantidad}</div>}
                onEdit={() => abrir("pieza", p)}
              />
            );
          })}
        {((tab === "equipo" && filtra(d.equipo).length === 0) ||
          (tab === "materiales" && filtra(d.materiales).length === 0) ||
          (tab === "bases" && filtra(d.bases).length === 0) ||
          (tab === "indumentaria" && filtra(d.indumentaria || []).length === 0) ||
          (tab === "emblematicos" && filtra(d.emblematicos || []).length === 0) ||
          (tab === "mobiliario" && filtra(d.mobiliario || []).length === 0) ||
          (tab === "piezas" && filtra(d.piezas || []).length === 0)) && (
          <EmptyState text="No hay nada con ese nombre en esta sucursal." />
        )}
      </div>

      {editando && (
        <Modal title={editando.item ? TITULO_EDITAR[editando.tipo] : TITULO_NUEVO[editando.tipo]} onClose={() => setEditando(null)}>
          {editando.tipo === "indumentaria" ? (
            <>
              <FieldLabel>Tipo</FieldLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                {(d.tiposIndumentaria && d.tiposIndumentaria.length > 0 ? d.tiposIndumentaria : TIPOS_INDUMENTARIA).map((t) => (
                  <FilterPill key={t} label={t} active={form.tipo === t} onClick={() => setForm({ ...form, tipo: t })} />
                ))}
              </div>
              <FieldLabel>Detalle</FieldLabel>
              <TextInput value={form.detalle || ""} onChange={(e) => setForm({ ...form, detalle: e.target.value })} placeholder="Ej. Adulto - Negro" />
              <FieldLabel>Cantidad total</FieldLabel>
              <TextInput type="number" value={form.cantidadTotal ?? ""} onChange={(e) => setForm({ ...form, cantidadTotal: e.target.value })} />
              <FieldLabel>Costo unitario</FieldLabel>
              <TextInput type="number" value={form.costo ?? ""} onChange={(e) => setForm({ ...form, costo: e.target.value })} placeholder="$0" />
              <PrimaryButton onClick={guardar} disabled={!(form.tipo || editando.item?.tipo)}>{editando.item ? "Guardar cambios" : "Agregar"}</PrimaryButton>
              {editando.item && (
                <button
                  onClick={() => setPorEliminar(editando)}
                  style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Trash2 size={14} /> Eliminar del inventario
                </button>
              )}
            </>
          ) : editando.tipo === "emblematico" ? (
            <>
              <FieldLabel>Tipo</FieldLabel>
              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                {(d.tiposEmblematicos && d.tiposEmblematicos.length > 0 ? d.tiposEmblematicos : TIPOS_EMBLEMATICO).map((t) => (
                  <FilterPill key={t} label={t} active={form.tipo === t} onClick={() => setForm({ ...form, tipo: t })} />
                ))}
              </div>
              {form.tipo === "Anillo" && (
                <>
                  <FieldLabel>Material</FieldLabel>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                    {MATERIALES_ANILLO.map((m) => (
                      <FilterPill key={m} label={m} active={form.material === m} onClick={() => setForm({ ...form, material: m })} color={m === "Oro" ? C.warning : undefined} />
                    ))}
                  </div>
                </>
              )}
              <FieldLabel>Detalle</FieldLabel>
              <TextInput value={form.detalle || ""} onChange={(e) => setForm({ ...form, detalle: e.target.value })} placeholder="Ej. 10k, talla ajustable" />
              <FieldLabel>Cantidad total</FieldLabel>
              <TextInput type="number" value={form.cantidadTotal ?? ""} onChange={(e) => setForm({ ...form, cantidadTotal: e.target.value })} />
              <FieldLabel>Costo unitario</FieldLabel>
              <TextInput type="number" value={form.costo ?? ""} onChange={(e) => setForm({ ...form, costo: e.target.value })} placeholder="$0" />
              <PrimaryButton onClick={guardar} disabled={!(form.tipo || editando.item?.tipo)}>{editando.item ? "Guardar cambios" : "Agregar"}</PrimaryButton>
              {editando.item && (
                <button
                  onClick={() => setPorEliminar(editando)}
                  style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Trash2 size={14} /> Eliminar del inventario
                </button>
              )}
            </>
          ) : editando.tipo === "mobiliario" ? (
            <>
              <FieldLabel>Tipo</FieldLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                {(d.tiposMobiliario && d.tiposMobiliario.length > 0 ? d.tiposMobiliario : TIPOS_MOBILIARIO).map((t) => (
                  <FilterPill key={t} label={t} active={form.tipo === t} onClick={() => setForm({ ...form, tipo: t })} />
                ))}
              </div>
              <FieldLabel>Modelo</FieldLabel>
              <TextInput value={form.modelo || ""} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
              <FieldLabel>Cantidad</FieldLabel>
              <TextInput type="number" value={form.cantidad ?? ""} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
              <FieldLabel>Costo unitario</FieldLabel>
              <TextInput type="number" value={form.costo ?? ""} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
              <FieldLabel>Ubicación</FieldLabel>
              <TextInput value={form.ubicacion || ""} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
              <FieldLabel>Notas</FieldLabel>
              <TextInput value={form.notas || ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
              <FieldLabel>Estado</FieldLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ESTADOS_MOBILIARIO.map((es) => (
                  <FilterPill key={es} label={es} active={form.estado === es} onClick={() => setForm({ ...form, estado: es })} color={estadoColorDe(es)} />
                ))}
              </div>
              <PrimaryButton onClick={guardar} disabled={!(form.modelo || "").trim()}>{editando.item ? "Guardar cambios" : "Agregar"}</PrimaryButton>
              {editando.item && (
                <button
                  onClick={() => setPorEliminar(editando)}
                  style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Trash2 size={14} /> Eliminar del inventario
                </button>
              )}
            </>
          ) : editando.tipo === "pieza" ? (
            <>
              <FieldLabel>Grupo</FieldLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                {GRUPOS_PIEZA.map((g) => (
                  <FilterPill key={g} label={g} active={form.grupo === g} onClick={() => setForm({ ...form, grupo: g })} />
                ))}
              </div>
              <FieldLabel>Tipo</FieldLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                {((d.tiposPorGrupoPieza && d.tiposPorGrupoPieza[form.grupo]) || TIPOS_POR_GRUPO[form.grupo] || []).map((t) => (
                  <FilterPill key={t} label={t} active={form.tipo === t} onClick={() => setForm({ ...form, tipo: t })} />
                ))}
              </div>
              <FieldLabel>Detalle</FieldLabel>
              <TextInput value={form.detalle || ""} onChange={(e) => setForm({ ...form, detalle: e.target.value })} />
              <FieldLabel>Cantidad</FieldLabel>
              <TextInput type="number" value={form.cantidad ?? ""} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
              <FieldLabel>Avisar cuando queden menos de (deja vacío para usar el general: {config.umbralStock})</FieldLabel>
              <TextInput type="number" value={form.minimo ?? ""} onChange={(e) => setForm({ ...form, minimo: e.target.value })} placeholder={String(config.umbralStock)} />
              <FieldLabel>Costo unitario</FieldLabel>
              <TextInput type="number" value={form.costo ?? ""} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
              <FieldLabel>Notas</FieldLabel>
              <TextInput value={form.notas || ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
              <PrimaryButton onClick={guardar} disabled={!(form.tipo || editando.item?.tipo)}>{editando.item ? "Guardar cambios" : "Agregar"}</PrimaryButton>
              {editando.item && (
                <button
                  onClick={() => setPorEliminar(editando)}
                  style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Trash2 size={14} /> Eliminar del inventario
                </button>
              )}
            </>
          ) : (
            <>
          <FieldLabel>Nombre</FieldLabel>
          <TextInput value={form.nombre || ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />

          {editando.tipo !== "base" && (
            <>
              <FieldLabel>Categoría</FieldLabel>
              <TextInput value={form.categoria || ""} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            </>
          )}

          {editando.tipo === "equipo" && (
            <>
              <FieldLabel>Estado</FieldLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ESTADOS_EQUIPO.map((es) => (
                  <FilterPill key={es} label={es} active={form.estado === es} onClick={() => setForm({ ...form, estado: es })} color={estadoColorDe(es)} />
                ))}
              </div>
            </>
          )}

          {editando.tipo === "material" && (
            <>
              <FieldLabel>Cantidad</FieldLabel>
              <TextInput type="number" value={form.cantidad ?? ""} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
              <FieldLabel>Avisar cuando queden menos de (deja vacío para usar el general: {config.umbralStock})</FieldLabel>
              <TextInput type="number" value={form.minimo ?? ""} onChange={(e) => setForm({ ...form, minimo: e.target.value })} placeholder={String(config.umbralStock)} />
            </>
          )}

          {editando.tipo === "base" && (
            <>
              <FieldLabel>Catálogo</FieldLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FilterPill label="General" active={form.catalogo === "General"} onClick={() => setForm({ ...form, catalogo: "General" })} />
                <FilterPill label="Universidad" active={form.catalogo === "Universidad"} onClick={() => setForm({ ...form, catalogo: "Universidad" })} color={C.secondary} />
                <FilterPill label="UNICEQ" active={form.catalogo === "UNICEQ"} onClick={() => setForm({ ...form, catalogo: "UNICEQ" })} color={C.accent1} />
              </div>
              {(editando.item?.variantes || []).length > 0 ? (
                <>
                  <FieldLabel>Cuántas tenemos (se calcula solo, por color)</FieldLabel>
                  <div style={{ background: C.background, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 4 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.foreground, marginBottom: 6 }}>{tenemosBase(editando.item)}</div>
                    {editando.item.variantes.map((v) => (
                      <div key={v.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.muted, padding: "2px 0" }}>
                        <span>{v.color}</span>
                        <span style={{ fontWeight: 600 }}>{v.tenemos}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>
                      Se administra por color desde Almacén, no aquí.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <FieldLabel>Cuántas tenemos</FieldLabel>
                  <TextInput type="number" value={form.tenemos ?? ""} onChange={(e) => setForm({ ...form, tenemos: e.target.value })} />
                </>
              )}
              <FieldLabel>Pedidas al proveedor</FieldLabel>
              <TextInput type="number" value={form.pedidoProveedor ?? ""} onChange={(e) => setForm({ ...form, pedidoProveedor: e.target.value })} />
              <FieldLabel>Precio de venta al cliente</FieldLabel>
              <TextInput type="number" value={form.precio ?? ""} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="$0" />
              <FieldLabel>Medidas</FieldLabel>
              <TextInput value={form.medidas || ""} onChange={(e) => setForm({ ...form, medidas: e.target.value })} placeholder="Ej. 24x40 cm" />
              <FieldLabel>Qué incluye</FieldLabel>
              <TextInput value={form.incluye || ""} onChange={(e) => setForm({ ...form, incluye: e.target.value })} placeholder="Descripción del paquete" />
              <PhotoInput value={form.imagen} onChange={(v) => setForm({ ...form, imagen: v })} label="Foto real de este paquete (opcional)" />
            </>
          )}

          <FieldLabel>Costo unitario</FieldLabel>
          <TextInput type="number" value={form.costo ?? ""} onChange={(e) => setForm({ ...form, costo: e.target.value })} placeholder="$0" />

          {editando.tipo !== "base" && (
            <>
              <FieldLabel>Notas</FieldLabel>
              <TextInput value={form.notas || ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Opcional" />
            </>
          )}

          <PrimaryButton onClick={guardar} disabled={!(form.nombre || "").trim()}>{editando.item ? "Guardar cambios" : "Agregar"}</PrimaryButton>
          {editando.item && (
            <button
              onClick={() => setPorEliminar(editando)}
              style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Trash2 size={14} /> Eliminar del inventario
            </button>
          )}
            </>
          )}
        </Modal>
      )}

      {confirmandoCatalogo && (
        <Modal title="Cargar catálogo 2026" onClose={() => setConfirmandoCatalogo(false)}>
          <div style={{ fontSize: 14, color: C.foreground }}>
            Se van a agregar {nuevas.length} paquete(s) que faltan en {NOMBRES_SUCURSAL[suc].replace("Photograf ", "")}, y se refrescan precio y medidas de los {delCatalogo.length - nuevas.length} que ya existen.
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>
            Las existencias y los paquetes de clientes que ya tengas no se tocan. Los paquetes UNICEQ solo se cargan en Querétaro.
          </div>
          {nuevas.length > 0 && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, maxHeight: 140, overflowY: "auto" }}>
              {nuevas.map((p) => `${p.nombre} (${fmtMoneda(p.precio)})`).join(" · ")}
            </div>
          )}
          <PrimaryButton onClick={cargarCatalogo}>{nuevas.length ? "Cargar paquetes" : "Actualizar precios"}</PrimaryButton>
        </Modal>
      )}

      {borrandoBases && (
        <Modal title="Borrar todas las bases" onClose={() => { setBorrandoBases(false); setTextoBorrarBases(""); }} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>
            Se van a borrar las {d.bases.length} base(s) de {NOMBRES_SUCURSAL[suc].replace("Photograf ", "")}: precios, existencias, variantes de color, paquetes de clientes y movimientos. Esta acción no se puede deshacer. Solo afecta esta sucursal.
          </div>
          <FieldLabel>Escribe BORRAR para confirmar</FieldLabel>
          <TextInput value={textoBorrarBases} onChange={(e) => setTextoBorrarBases(e.target.value)} placeholder="BORRAR" />
          <PrimaryButton onClick={borrarTodasLasBases} color={C.error} disabled={textoBorrarBases.trim().toUpperCase() !== "BORRAR"}>
            Sí, borrar todas las bases
          </PrimaryButton>
        </Modal>
      )}

      {porEliminar && (
        <Modal title="Eliminar del inventario" onClose={() => setPorEliminar(null)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>
            "{porEliminar.item.nombre}" se borra por completo, junto con su historial. Si solo dejó de servir, es mejor marcarlo como Baja: así se conserva el registro.
          </div>
          <PrimaryButton onClick={eliminar} color={C.error}>Sí, eliminar</PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   ADMIN · Autorizar pedidos a proveedor
   ========================================================================= */
function AdminPedidos({ allData, setAllData, registrar, onBack, mostrarToast }) {
  const [verTodos, setVerTodos] = useState(false);

  const todos = SUCURSALES.flatMap((s) => (allData[s].pedidos || []).map((p) => ({ ...p, sucursal: s })));
  const porAprobar = todos.filter((p) => p.estado === "Por aprobar");
  const lista = verTodos ? todos : porAprobar;

  /* Costo estimado: se busca el artículo en el inventario de su sucursal
     para saber cuánto cuesta cada uno. Si no se encuentra, se muestra
     como desconocido en vez de inventar un número. */
  const costoDe = (p) => {
    const d = allData[p.sucursal];
    const mat = d.materiales.find((m) => m.nombre === p.item);
    if (mat) return (Number(mat.costo) || 0) * p.cantidad;
    const base = d.bases.find((b) => b.nombre === p.item);
    if (base) return (Number(base.costo) || 0) * p.cantidad;
    return null;
  };

  const totalPorAprobar = porAprobar.reduce((a, p) => a + (costoDe(p) || 0), 0);

  const resolver = (pedido, aprobado) => {
    setAllData((prev) => ({
      ...prev,
      [pedido.sucursal]: {
        ...prev[pedido.sucursal],
        pedidos: prev[pedido.sucursal].pedidos.map((p) => (p.id === pedido.id ? { ...p, estado: aprobado ? "Aprobado" : "Rechazado" } : p)),
      },
    }));
    registrar(pedido.sucursal, `Pedido ${aprobado ? "autorizado" : "rechazado"} por el administrador: ${pedido.item} (${pedido.cantidad})`);
    mostrarToast(aprobado ? "Pedido autorizado ✓" : "Pedido rechazado");
  };

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Pedidos a proveedor" subtitle={`${porAprobar.length} esperando tu autorización`} onBack={onBack} />
      <div style={{ padding: 16 }}>
        {porAprobar.length > 0 && (
          <div style={{ background: `${C.warning}15`, border: `1px solid ${C.warning}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.muted }}>Si autorizas todo lo pendiente</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.foreground }}>{fmtMoneda(totalPorAprobar)}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Calculado con el costo que tiene capturado cada artículo.</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <FilterPill label="Por autorizar" active={!verTodos} onClick={() => setVerTodos(false)} color={C.warning} />
          <FilterPill label="Todos" active={verTodos} onClick={() => setVerTodos(true)} />
        </div>

        {lista.length === 0 && <EmptyState icon={ShoppingCart} text={verTodos ? "Todavía no hay pedidos registrados." : "No hay pedidos esperando autorización."} />}

        {lista.map((p) => {
          const costo = costoDe(p);
          return (
            <div key={`${p.sucursal}-${p.id}`} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: SOMBRA_TARJETA }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{p.item}{p.color ? ` — ${p.color}` : ""}</div>
                  <div style={{ fontSize: 12, color: C.muted, margin: "2px 0 6px" }}>
                    {p.cantidad} pieza(s) · {NOMBRES_SUCURSAL[p.sucursal].replace("Photograf ", "")}
                    {costo !== null ? ` · ${fmtMoneda(costo)}` : " · costo sin capturar"}
                    {p.pedidoPor ? ` · lo pidió ${p.pedidoPor}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ background: p.urgencia === "Urgente" ? C.error : C.success, color: textoContraste(p.urgencia === "Urgente" ? C.error : C.success), fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8 }}>{p.urgencia}</span>
                    <Badge estado={p.estado} />
                  </div>
                </div>
              </div>
              {p.estado === "Por aprobar" && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => resolver(p, true)} style={{ flex: 1, background: C.success, color: textoContraste(C.success), border: "none", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Autorizar
                  </button>
                  <button onClick={() => resolver(p, false)} style={{ flex: 1, background: "none", color: C.error, border: `1px solid ${C.error}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   ADMIN · Clientes con paquete sin recoger
   ========================================================================= */
function AdminClientes({ allData, onBack }) {
  const paquetes = paquetesSinRecoger(allData);
  const vencidos = paquetes.filter((p) => p.dias >= TOLERANCIA_DIAS);
  const porVencer = paquetes.filter((p) => p.dias >= TOLERANCIA_DIAS - 15 && p.dias < TOLERANCIA_DIAS);
  // Cuánto dinero representan: son paquetes ya armados y pagados.
  const dineroEnJuego = paquetes.reduce((a, p) => a + (Number(p.precio) || 0), 0);

  const soloDigitos = (tel) => (tel || "").replace(/\D/g, "");
  const linkWhatsApp = (p) => {
    const num = soloDigitos(p.telefono);
    const conLada = num.length === 10 ? `52${num}` : num;
    const texto = `Hola ${p.evento}, le escribimos de Photograf. Su paquete fotográfico sigue disponible para recoger en ${NOMBRES_SUCURSAL[p.sucursal]}. ¿Qué día le queda bien pasar por él?`;
    return `https://wa.me/${conLada}?text=${encodeURIComponent(texto)}`;
  };

  const Tarjeta = ({ p }) => {
    const vencido = p.dias >= TOLERANCIA_DIAS;
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${vencido ? C.error : C.warning}`, borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: SOMBRA_TARJETA }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{p.evento}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
          {p.base}{p.precio ? ` (${fmtMoneda(p.precio)})` : ""} · {NOMBRES_SUCURSAL[p.sucursal].replace("Photograf ", "")} · entregado el {p.fecha}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: vencido ? C.error : C.warning, marginTop: 4 }}>
          {vencido ? `Lleva ${p.dias} días sin recogerse (${p.dias - TOLERANCIA_DIAS} pasado el plazo)` : `Le quedan ${TOLERANCIA_DIAS - p.dias} días antes de que se desarme`}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {p.telefono ? (
            <>
              <a href={linkWhatsApp(p)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flex: 1, minWidth: 130 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: C.success, color: textoContraste(C.success), borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>
                  <MessageCircle size={15} /> WhatsApp
                </div>
              </a>
              <a href={`tel:${soloDigitos(p.telefono)}`} style={{ textDecoration: "none", flex: 1, minWidth: 100 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", color: C.primary, border: `1px solid ${C.primary}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>
                  <Phone size={15} /> Llamar
                </div>
              </a>
            </>
          ) : (
            <div style={{ fontSize: 12, color: C.muted }}>Sin teléfono capturado — agrégalo al asignar el paquete para poder contactarlo desde aquí.</div>
          )}
          {p.correo && (
            <a href={`mailto:${p.correo}?subject=${encodeURIComponent("Su paquete fotográfico Photograf")}`} style={{ textDecoration: "none", flex: 1, minWidth: 100 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", color: C.secondary, border: `1px solid ${C.secondary}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>
                <Mail size={15} /> Correo
              </div>
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Paquetes sin recoger" subtitle={`${paquetes.length} pendientes en total`} onBack={onBack} />
      <div style={{ padding: 16 }}>
        {dineroEnJuego > 0 && (
          <div style={{ background: `${C.accent1}15`, border: `1px solid ${C.accent1}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.muted }}>Valor de los paquetes sin recoger</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.foreground }}>{fmtMoneda(dineroEnJuego)}</div>
          </div>
        )}
        <div style={{ fontSize: 12.5, color: C.muted, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 18 }}>
          Contacta al cliente antes de desarmar su paquete: el trabajo ya está hecho y pagado, y una llamada suele recuperarlo.
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, color: C.error, marginBottom: 10 }}>Ya pasaron el plazo ({vencidos.length})</div>
        {vencidos.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Ninguno rebasa los {TOLERANCIA_DIAS} días. ✓</div>}
        {vencidos.map((p) => <Tarjeta key={`${p.sucursal}-${p.baseId}-${p.id}`} p={p} />)}

        <div style={{ fontSize: 15, fontWeight: 700, color: C.warning, marginTop: 20, marginBottom: 10 }}>Están por vencerse ({porVencer.length})</div>
        {porVencer.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Ninguno está cerca del plazo. ✓</div>}
        {porVencer.map((p) => <Tarjeta key={`${p.sucursal}-${p.baseId}-${p.id}`} p={p} />)}
      </div>
    </div>
  );
}

/* =========================================================================
   ADMIN · Equipo fuera de servicio
   ========================================================================= */
function AdminMantenimiento({ allData, setAllData, registrar, onBack, mostrarToast }) {
  const fuera = equipoFueraDeServicio(allData);
  const valorParado = fuera.reduce((a, e) => a + (Number(e.costo) || 0), 0);

  const cambiarEstado = (item, nuevoEstado, textoHistorial) => {
    setAllData((prev) => ({
      ...prev,
      [item.sucursal]: {
        ...prev[item.sucursal],
        equipo: prev[item.sucursal].equipo.map((e) =>
          e.id === item.id
            ? {
                ...e,
                estado: nuevoEstado,
                notas: nuevoEstado === "Disponible" ? "" : e.notas,
                historial: [...(e.historial || []), { texto: textoHistorial, fecha: fmt(hoy) }],
              }
            : e
        ),
      },
    }));
    registrar(item.sucursal, `${item.nombre}: ${textoHistorial}`);
    mostrarToast("Estado actualizado ✓");
  };

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Equipo fuera de servicio" subtitle={`${fuera.length} artículo(s) parados`} onBack={onBack} />
      <div style={{ padding: 16 }}>
        {fuera.length > 0 && (
          <div style={{ background: `${C.error}12`, border: `1px solid ${C.error}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: C.muted }}>Valor del equipo que no se puede usar</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.foreground }}>{fmtMoneda(valorParado)}</div>
          </div>
        )}

        {fuera.length === 0 && <EmptyState icon={Wrench} text="Todo el equipo está en servicio. Nada que reparar." />}

        {fuera.map((e) => (
          <div key={`${e.sucursal}-${e.id}`} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: SOMBRA_TARJETA }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Thumb src={e.foto} fallback={Camera} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{e.nombre}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{e.categoria} · {NOMBRES_SUCURSAL[e.sucursal].replace("Photograf ", "")} · {fmtMoneda(e.costo)}</div>
              </div>
              <Badge estado={e.estado} />
            </div>
            {e.notas && <div style={{ fontSize: 12.5, color: C.foreground, marginTop: 10, background: C.background, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>{e.notas}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {e.estado === "Dañado" && (
                <button onClick={() => cambiarEstado(e, "En reparación", "Enviado a reparación")} style={{ flex: 1, minWidth: 130, background: C.warning, color: textoContraste(C.warning), border: "none", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Mandar a reparar
                </button>
              )}
              <button onClick={() => cambiarEstado(e, "Disponible", "Reparado y de vuelta en servicio")} style={{ flex: 1, minWidth: 130, background: C.success, color: textoContraste(C.success), border: "none", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Ya quedó reparado
              </button>
              <button onClick={() => cambiarEstado(e, "Baja", "Dado de baja: ya no tiene reparación")} style={{ flex: 1, minWidth: 130, background: "none", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Ya no sirve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   ADMIN · Bitácora completa
   ========================================================================= */
function AdminBitacora({ allData, onBack, mostrarToast }) {
  const [suc, setSuc] = useState("ambas");
  const [quien, setQuien] = useState("Todos");
  const [busca, setBusca] = useState("");

  const todos = bitacoraCombinada(allData);
  const personas = ["Todos", ...Array.from(new Set(todos.map((b) => b.quien).filter(Boolean)))];

  const filtrados = todos
    .filter((b) => suc === "ambas" || b.sucursal === suc)
    .filter((b) => quien === "Todos" || b.quien === quien)
    .filter((b) => b.texto.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const exportar = () => {
    const filas = filtrados.map((b) => ({ Fecha: b.fecha, Sucursal: NOMBRES_SUCURSAL[b.sucursal], Quién: b.quien || "—", Movimiento: b.texto }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 60 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Bitácora");
    XLSX.writeFile(libro, `Bitacora_Photograf_${fmt(hoy)}.xlsx`);
    mostrarToast("Excel descargado ✓");
  };

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Historial de movimientos" subtitle={`${filtrados.length} de ${todos.length} movimientos`} onBack={onBack} />
      <div style={{ padding: 16 }}>
        <SelectorSucursal valor={suc} onChange={setSuc} incluirAmbas />
        <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto" }}>
          {personas.map((p) => (
            <FilterPill key={p} label={p} active={quien === p} onClick={() => setQuien(p)} color={C.secondary} />
          ))}
        </div>
        <TextInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar en los movimientos..." />

        <button onClick={exportar} disabled={filtrados.length === 0} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: C.success, color: textoContraste(C.success), border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: filtrados.length ? "pointer" : "not-allowed", opacity: filtrados.length ? 1 : 0.5, margin: "14px 0 18px" }}>
          <Download size={16} /> Descargar lo que estoy viendo
        </button>

        {filtrados.length === 0 && <EmptyState icon={History} text="Ningún movimiento coincide con estos filtros." />}
        {filtrados.map((b) => (
          <div key={b._key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 13, color: C.foreground, flex: 1 }}>{b.texto}</span>
              <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>{b.fecha}</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
              {b.quien || "Sistema"} · {NOMBRES_SUCURSAL[b.sucursal].replace("Photograf ", "")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   ADMIN · Categorías
   ========================================================================= */
function AdminCategorias({ allData, setAllData, registrar, onBack, mostrarToast }) {
  const [tipo, setTipo] = useState("equipo");
  const [editando, setEditando] = useState(null);
  const [nombreNuevo, setNombreNuevo] = useState("");

  const llave = tipo === "equipo" ? "equipo" : "materiales";

  /* Cuenta en cuántos artículos se usa cada categoría, sumando las dos
     sucursales: renombrarla aquí las cambia en todos lados a la vez. */
  const conteo = {};
  SUCURSALES.forEach((s) => allData[s][llave].forEach((x) => { conteo[x.categoria] = (conteo[x.categoria] || 0) + 1; }));
  const categorias = Object.entries(conteo).sort((a, b) => b[1] - a[1]);

  const renombrar = () => {
    const limpio = nombreNuevo.trim();
    if (!limpio || limpio === editando) return setEditando(null);
    setAllData((prev) => {
      const siguiente = { ...prev };
      SUCURSALES.forEach((s) => {
        siguiente[s] = { ...siguiente[s], [llave]: siguiente[s][llave].map((x) => (x.categoria === editando ? { ...x, categoria: limpio } : x)) };
      });
      return siguiente;
    });
    SUCURSALES.forEach((s) => registrar(s, `Categoría renombrada: "${editando}" ahora es "${limpio}"`));
    mostrarToast("Categoría renombrada ✓");
    setEditando(null);
  };

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Categorías" subtitle="Se aplican a las dos sucursales" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <FilterPill label="De equipo" active={tipo === "equipo"} onClick={() => setTipo("equipo")} />
          <FilterPill label="De materiales" active={tipo === "materiales"} onClick={() => setTipo("materiales")} color={C.accent1} />
        </div>

        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 16 }}>
          Las categorías se crean solas al dar de alta un artículo. Aquí puedes corregir las que quedaron mal escritas o juntar dos que son la misma: si le pones a una el nombre exacto de otra, se unen.
        </div>

        {categorias.length === 0 && <EmptyState icon={Tag} text="Todavía no hay categorías: aparecen al registrar tu primer artículo." />}
        {categorias.map(([nombre, cantidad]) => (
          <div key={nombre} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.foreground }}>{nombre}</div>
              <div style={{ fontSize: 11.5, color: C.muted }}>{cantidad} artículo(s)</div>
            </div>
            <button onClick={() => { setEditando(nombre); setNombreNuevo(nombre); }} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.foreground, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Pencil size={13} /> Cambiar
            </button>
          </div>
        ))}
      </div>

      {editando && (
        <Modal title="Cambiar categoría" onClose={() => setEditando(null)}>
          <div style={{ fontSize: 12.5, color: C.muted }}>
            Se va a cambiar en los {conteo[editando]} artículos que la usan, en las dos sucursales.
          </div>
          <FieldLabel>Nombre de la categoría</FieldLabel>
          <TextInput value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} autoFocus />
          <PrimaryButton onClick={renombrar} disabled={!nombreNuevo.trim()}>Guardar</PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   ADMIN · Ajustes (contraseñas, mínimos, respaldo, accesos)
   ========================================================================= */
function AdminAjustes({ config, setConfig, allData, setAllData, empleados, setEmpleados, transferencias, setTransferencias, transferenciasBases, setTransferenciasBases, onBack, mostrarToast, permisoNotificaciones, onActivarNotificacionesAdmin }) {
  const [pw, setPw] = useState({ ...config.passwords });
  const [umbral, setUmbral] = useState(String(config.umbralStock));
  const [porRestaurar, setPorRestaurar] = useState(null);
  const [sucRendimiento, setSucRendimiento] = useState(SUCURSALES[0]);
  const archivoRef = useRef(null);

  /* No usamos permisoNotificaciones (el permiso del navegador) para decidir
     si ya quedó activado como admin: ese permiso es del dispositivo, no de
     "para qué sucursal se guardó el token" — un empleado pudo haberlo
     activado antes en este mismo celular. Por eso este toggle es aparte,
     guardado en este propio celular. */
  const [notifAdminOk, setNotifAdminOk] = useState(() => {
    try {
      return localStorage.getItem("pf_admin_notif") === "1";
    } catch {
      return false;
    }
  });
  const activarComoAdmin = async () => {
    const ok = await onActivarNotificacionesAdmin();
    if (ok) {
      try {
        localStorage.setItem("pf_admin_notif", "1");
      } catch {}
      setNotifAdminOk(true);
    }
  };

  const guardarRendimiento = (tamaño, tipo, valorStr) => {
    const valor = valorStr === "" ? 0 : Math.max(0, parseInt(valorStr, 10) || 0);
    setAllData((prev) => ({
      ...prev,
      [sucRendimiento]: {
        ...prev[sucRendimiento],
        rendimientos: { ...prev[sucRendimiento].rendimientos, [tamaño]: { ...(prev[sucRendimiento].rendimientos?.[tamaño] || {}), [tipo]: valor } },
      },
    }));
  };

  const guardarPasswords = () => {
    const limpio = {
      queretaro: (pw.queretaro || "").trim(),
      salinas: (pw.salinas || "").trim(),
      admin: (pw.admin || "").trim(),
    };
    if (!limpio.queretaro || !limpio.salinas || !limpio.admin) {
      mostrarToast("Ninguna contraseña puede quedar vacía");
      return;
    }
    setConfig((c) => ({ ...c, passwords: limpio }));
    mostrarToast("Contraseñas actualizadas ✓");
  };

  const guardarUmbral = () => {
    const n = parseInt(umbral, 10);
    if (isNaN(n) || n < 0) {
      mostrarToast("Escribe un número válido");
      return;
    }
    setConfig((c) => ({ ...c, umbralStock: n }));
    mostrarToast("Mínimo general actualizado ✓");
  };

  /* Respaldo: un archivo .json con todo lo que la app guarda. Sirve para
     recuperar si alguien borra algo por error, o para llevarse los datos. */
  const descargarRespaldo = () => {
    const contenido = {
      app: "photograf-inventario",
      version: 1,
      generado: new Date().toISOString(),
      allData,
      empleados,
      config,
      transferenciasPendientes: transferencias,
      transferenciasBasesPendientes: transferenciasBases,
    };
    const blob = new Blob([JSON.stringify(contenido, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Respaldo_Photograf_${fmt(hoy)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarToast("Respaldo descargado ✓");
  };

  const leerArchivo = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const datos = JSON.parse(reader.result);
        if (!datos || !datos.allData || !datos.allData.queretaro || !datos.allData.salinas) {
          mostrarToast("Ese archivo no es un respaldo de Photograf");
          return;
        }
        setPorRestaurar(datos);
      } catch (err) {
        mostrarToast("No se pudo leer el archivo");
      }
    };
    reader.onerror = () => mostrarToast("No se pudo leer el archivo");
    reader.readAsText(file);
  };

  const restaurar = () => {
    setAllData(normalizarTodo(porRestaurar.allData));
    if (porRestaurar.empleados) setEmpleados(porRestaurar.empleados);
    if (porRestaurar.config) setConfig(normalizarConfig(porRestaurar.config));
    if (porRestaurar.transferenciasPendientes) setTransferencias(porRestaurar.transferenciasPendientes);
    if (porRestaurar.transferenciasBasesPendientes) setTransferenciasBases(porRestaurar.transferenciasBasesPendientes);
    setPorRestaurar(null);
    mostrarToast("Respaldo restaurado ✓");
  };

  const accesos = [...(config.accesos || [])].reverse();

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Ajustes" onBack={onBack} />
      <div style={{ padding: 16 }}>
        {permisoNotificaciones !== "unsupported" && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.foreground, marginBottom: 4 }}>Notificaciones de administrador</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
              Actívalas en este celular para recibir el aviso, con la app cerrada, cuando se envíe o se confirme una transferencia entre Querétaro y Salinas — de las dos sucursales, a diferencia de un empleado que solo ve avisos de la suya.
            </div>
            <button
              onClick={notifAdminOk ? undefined : activarComoAdmin}
              disabled={notifAdminOk || permisoNotificaciones === "denied"}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 8, cursor: notifAdminOk || permisoNotificaciones === "denied" ? "default" : "pointer", opacity: permisoNotificaciones === "denied" && !notifAdminOk ? 0.6 : 1 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Bell size={20} color={notifAdminOk ? C.success : C.muted} />
                <span style={{ fontSize: 14, fontWeight: 600, color: C.foreground }}>
                  {notifAdminOk ? "Notificaciones de administrador activadas" : permisoNotificaciones === "denied" ? "Notificaciones bloqueadas en este navegador" : "Activar notificaciones de administrador"}
                </span>
              </div>
              {notifAdminOk && <Check size={18} color={C.success} />}
            </button>

            <div style={{ height: 32 }} />
          </>
        )}

        <div style={{ fontSize: 15, fontWeight: 700, color: C.foreground, marginBottom: 4 }}>Contraseñas</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
          Cámbialas cuando alguien deje de trabajar aquí. El cambio se aplica en todos los celulares al momento.
        </div>
        <FieldLabel>Querétaro</FieldLabel>
        <TextInput value={pw.queretaro} onChange={(e) => setPw({ ...pw, queretaro: e.target.value })} />
        <FieldLabel>Salinas</FieldLabel>
        <TextInput value={pw.salinas} onChange={(e) => setPw({ ...pw, salinas: e.target.value })} />
        <FieldLabel>Administrador</FieldLabel>
        <TextInput value={pw.admin} onChange={(e) => setPw({ ...pw, admin: e.target.value })} />
        <PrimaryButton onClick={guardarPasswords}>Guardar contraseñas</PrimaryButton>

        <div style={{ height: 32 }} />

        <div style={{ fontSize: 15, fontWeight: 700, color: C.foreground, marginBottom: 4 }}>Aviso de stock bajo</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
          Mínimo general para todos los materiales. Puedes ponerle uno distinto a un material específico desde Editar inventario.
        </div>
        <FieldLabel>Avisar cuando queden esta cantidad o menos</FieldLabel>
        <TextInput type="number" value={umbral} onChange={(e) => setUmbral(e.target.value)} />
        <PrimaryButton onClick={guardarUmbral} color={C.warning}>Guardar mínimo</PrimaryButton>

        <div style={{ height: 32 }} />

        <div style={{ fontSize: 15, fontWeight: 700, color: C.foreground, marginBottom: 4 }}>Rendimiento de placas</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
          Cuántas placas de cada formato salen de una hoja grande. Es por sucursal, y mientras un formato quede en 0, esa sucursal no podrá producir placas de ese tipo — es a propósito, para no calcular con un número que nadie confirmó.
        </div>
        <SelectorSucursal valor={sucRendimiento} onChange={setSucRendimiento} />
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", padding: "8px 12px", background: C.background, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>FORMATO</div>
            {TAMANOS_HOJA.map((t) => (
              <div key={t} style={{ fontSize: 11, fontWeight: 700, color: C.muted, textAlign: "center" }}>{t}</div>
            ))}
          </div>
          {(allData[sucRendimiento].tiposPlacaChica && allData[sucRendimiento].tiposPlacaChica.length > 0 ? allData[sucRendimiento].tiposPlacaChica : TIPOS_PLACA_CHICA).map((tipo) => (
            <div key={tipo} style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", alignItems: "center", padding: "6px 12px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, color: C.foreground }}>{tipo}</div>
              {TAMANOS_HOJA.map((tamaño) => (
                <input
                  key={tamaño}
                  type="number"
                  min="0"
                  value={allData[sucRendimiento].rendimientos?.[tamaño]?.[tipo] ?? ""}
                  onChange={(e) => guardarRendimiento(tamaño, tipo, e.target.value)}
                  placeholder="0"
                  style={{ width: 56, textAlign: "center", padding: "6px 4px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.background, color: C.foreground, fontSize: 13 }}
                />
              ))}
            </div>
          ))}
        </div>

        <div style={{ height: 8 }} />

        <div style={{ fontSize: 15, fontWeight: 700, color: C.foreground, marginBottom: 4 }}>Respaldo</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
          Descarga una copia de todo el inventario. Guárdala cada tanto: si alguien borra algo por error, con este archivo se recupera.
        </div>
        <button onClick={descargarRespaldo} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: C.primary, color: textoContraste(C.primary), border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}>
          <Download size={16} /> Descargar respaldo
        </button>
        <input ref={archivoRef} type="file" accept="application/json,.json" onChange={leerArchivo} style={{ display: "none" }} />
        <button onClick={() => archivoRef.current.click()} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", color: C.foreground, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Upload size={16} /> Restaurar desde un respaldo
        </button>

        <div style={{ height: 32 }} />

        <div style={{ fontSize: 15, fontWeight: 700, color: C.foreground, marginBottom: 4 }}>Entradas al panel</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
          Últimas veces que alguien entró con la contraseña de administrador.
        </div>
        {accesos.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>Esta es la primera entrada registrada.</div>}
        {accesos.slice(0, 20).map((a, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12.5, color: C.foreground }}>{a.usuario || "Sin identificar"}</span>
            <span style={{ fontSize: 11.5, color: C.muted }}>{a.fecha} {a.hora}</span>
          </div>
        ))}
      </div>

      {porRestaurar && (
        <Modal title="Restaurar respaldo" onClose={() => setPorRestaurar(null)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>
            Este respaldo se generó el {(porRestaurar.generado || "").slice(0, 10) || "—"}. Al restaurarlo, el inventario actual de las dos sucursales se reemplaza por el del archivo, en todos los celulares.
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>
            Contiene {(porRestaurar.allData.queretaro.equipo || []).length + (porRestaurar.allData.salinas.equipo || []).length} equipos y {(porRestaurar.empleados || []).length} empleados.
          </div>
          <PrimaryButton onClick={restaurar} color={C.error}>Sí, reemplazar todo</PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   ADMIN · Exportar todo el inventario a Excel
   ========================================================================= */
function exportarInventarioExcel(allData, config) {
  const libro = XLSX.utils.book_new();
  const agregar = (nombre, filas, anchos) => {
    const hoja = XLSX.utils.json_to_sheet(filas.length ? filas : [{ "Sin datos": "" }]);
    if (anchos) hoja["!cols"] = anchos.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(libro, hoja, nombre);
  };

  const resumen = SUCURSALES.map((s) => {
    const d = allData[s];
    const v = valorDeSucursal(d);
    return {
      Sucursal: NOMBRES_SUCURSAL[s],
      "Equipos activos": d.equipo.filter((e) => e.estado !== "Baja").length,
      "En uso": d.equipo.filter((e) => e.estado === "En uso").length,
      "Fuera de servicio": d.equipo.filter((e) => e.estado === "Dañado" || e.estado === "En reparación").length,
      Materiales: d.materiales.length,
      Bases: d.bases.length,
      "Valor equipo": v.equipo,
      "Valor materiales": v.materiales,
      "Valor bases": v.bases,
      "Valor mobiliario": v.mobiliario,
      "Valor indumentaria": v.indumentaria,
      "Valor emblemáticos": v.emblematicos,
      "Valor piezas": v.piezas,
      "Valor hojas grandes": v.hojasGrandes,
      "Valor total": v.total,
      Alertas: calcularAlertas(d, config).length,
    };
  });
  agregar("Resumen", resumen, [22, 14, 10, 16, 12, 10, 14, 16, 12, 14, 16, 16, 14, 16, 12, 10]);

  agregar(
    "Equipo",
    SUCURSALES.flatMap((s) =>
      allData[s].equipo.map((e) => ({
        Sucursal: NOMBRES_SUCURSAL[s],
        Folio: codigoArticulo("EQ", s, e.id),
        Nombre: e.nombre,
        Categoría: e.categoria,
        Estado: e.estado,
        Costo: Number(e.costo) || 0,
        "Quién lo tiene": e.quienLoTiene || "",
        "Prestado el": e.fechaPrestamo || "",
        "Se devuelve el": e.fechaDevolucion || "",
        Notas: e.notas || "",
      }))
    ),
    [22, 18, 30, 16, 14, 12, 18, 14, 14, 40]
  );

  agregar(
    "Materiales",
    SUCURSALES.flatMap((s) =>
      allData[s].materiales.map((m) => ({
        Sucursal: NOMBRES_SUCURSAL[s],
        Código: codigoArticulo("MAT", s, m.id),
        Nombre: m.nombre,
        Categoría: m.categoria,
        Cantidad: m.cantidad,
        Mínimo: minimoDe(m, config),
        "Costo unitario": Number(m.costo) || 0,
        "Valor total": (Number(m.costo) || 0) * (Number(m.cantidad) || 0),
        Notas: m.notas || "",
      }))
    ),
    [22, 14, 30, 16, 10, 10, 14, 12, 30]
  );

  agregar(
    "Bases",
    SUCURSALES.flatMap((s) =>
      allData[s].bases.map((b) => ({
        Sucursal: NOMBRES_SUCURSAL[s],
        Código: codigoArticulo("BASE", s, b.id),
        Nombre: b.nombre,
        Catálogo: b.catalogo,
        Línea: b.linea || "",
        "Precio de venta": Number(b.precio) || 0,
        Medidas: b.medidas || "",
        Tenemos: tenemosBase(b),
        "Variantes de color": (b.variantes || []).length > 0 ? b.variantes.map((v) => `${v.color}: ${v.tenemos}`).join(" · ") : "",
        Reservadas: b.reservas.filter((r) => r.estado === "Reservada").length,
        "Pedidas al proveedor": b.pedidoProveedor,
        "Costo unitario": Number(b.costo) || 0,
      }))
    ),
    [22, 15, 26, 12, 12, 14, 30, 10, 34, 12, 18, 14]
  );

  agregar(
    "Paquetes de clientes",
    SUCURSALES.flatMap((s) =>
      allData[s].bases.flatMap((b) =>
        b.reservas.map((r) => ({
          Sucursal: NOMBRES_SUCURSAL[s],
          Base: b.nombre,
          "Precio del paquete": Number(b.precio) || 0,
          Cliente: r.evento,
          Fecha: r.fecha,
          Estado: r.estado,
          "Días esperando": r.estado === "Reservada" ? diasTranscurridos(r.fecha) : "",
          Teléfono: r.telefono || "",
          Correo: r.correo || "",
        }))
      )
    ),
    [22, 22, 16, 26, 12, 12, 14, 16, 26]
  );

  agregar(
    "Indumentaria",
    SUCURSALES.flatMap((s) =>
      (allData[s].indumentaria || []).map((i) => {
        const prestadas = (i.prestamos || []).filter((p) => p.estado === "Prestado").reduce((a, p) => a + p.cantidad, 0);
        return {
          Sucursal: NOMBRES_SUCURSAL[s],
          Código: codigoArticulo("IND", s, i.id),
          Tipo: i.tipo,
          Detalle: i.detalle || "",
          "Cantidad total": i.cantidadTotal,
          Prestadas: prestadas,
          Disponibles: i.cantidadTotal - prestadas,
          "Costo unitario": Number(i.costo) || 0,
          "Valor total": (Number(i.costo) || 0) * i.cantidadTotal,
        };
      })
    ),
    [22, 15, 22, 20, 12, 10, 12, 14, 12]
  );

  agregar(
    "Préstamos de indumentaria",
    SUCURSALES.flatMap((s) =>
      (allData[s].indumentaria || []).flatMap((i) =>
        (i.prestamos || []).map((p) => ({
          Sucursal: NOMBRES_SUCURSAL[s],
          Código: codigoArticulo("IND", s, i.id),
          Tipo: i.tipo,
          Detalle: i.detalle || "",
          Persona: p.persona,
          Cantidad: p.cantidad,
          "Fecha préstamo": p.fechaPrestamo,
          "Fecha esperada": p.fechaEsperada,
          Estado: p.estado,
          "Fecha devolución": p.fechaDevolucion || "",
          "Cant. devuelta": p.cantidadDevuelta ?? "",
          Nota: p.nota || "",
        }))
      )
    ).sort((a, b) => (a["Fecha préstamo"] < b["Fecha préstamo"] ? 1 : -1)),
    [22, 15, 22, 20, 20, 10, 14, 14, 12, 16, 12, 30]
  );

  agregar(
    "Emblemáticos",
    SUCURSALES.flatMap((s) =>
      (allData[s].emblematicos || []).map((e) => {
        const enCustodia = (e.custodios || []).filter((c) => c.activo).reduce((a, c) => a + c.cantidad, 0);
        return {
          Sucursal: NOMBRES_SUCURSAL[s],
          Código: codigoArticulo("EMB", s, e.id),
          Tipo: e.tipo,
          Material: e.material || "",
          Detalle: e.detalle || "",
          "Cantidad total": e.cantidadTotal,
          "En resguardo": enCustodia,
          Disponibles: e.cantidadTotal - enCustodia,
          "Costo unitario": Number(e.costo) || 0,
          "Valor total": (Number(e.costo) || 0) * e.cantidadTotal,
        };
      })
    ),
    [22, 15, 12, 10, 22, 12, 12, 12, 14, 12]
  );

  agregar(
    "Custodia de emblemáticos",
    SUCURSALES.flatMap((s) =>
      (allData[s].emblematicos || []).flatMap((e) =>
        (e.custodios || []).map((c) => ({
          Sucursal: NOMBRES_SUCURSAL[s],
          Código: codigoArticulo("EMB", s, e.id),
          Tipo: e.tipo,
          Material: e.material || "",
          Detalle: e.detalle || "",
          Persona: c.persona,
          Cantidad: c.cantidad,
          Fecha: c.fecha,
          "Firma de responsiva": e.material === "Oro" ? (c.firmaResponsiva ? "Sí" : "NO — pendiente") : "N/A",
          Estado: c.activo ? "En resguardo" : "Liberado",
          "Fecha liberación": c.fechaLiberacion || "",
          "Cant. liberada": c.cantidadLiberada ?? "",
          Nota: c.nota || "",
        }))
      )
    ).sort((a, b) => (a.Fecha < b.Fecha ? 1 : -1)),
    [22, 15, 12, 10, 22, 20, 10, 12, 20, 14, 16, 14, 30]
  );

  agregar(
    "Mobiliario",
    SUCURSALES.flatMap((s) =>
      (allData[s].mobiliario || []).map((m) => ({
        Sucursal: NOMBRES_SUCURSAL[s],
        Código: codigoArticulo("MOB", s, m.id),
        Tipo: m.tipo,
        Modelo: m.modelo,
        Cantidad: m.cantidad,
        Estado: m.estado,
        Ubicación: m.ubicacion || "",
        "Costo unitario": Number(m.costo) || 0,
        "Valor total": (Number(m.costo) || 0) * m.cantidad,
        Notas: m.notas || "",
      }))
    ),
    [22, 15, 16, 24, 10, 14, 20, 14, 12, 30]
  );

  agregar(
    "Piezas y catálogos",
    SUCURSALES.flatMap((s) =>
      (allData[s].piezas || []).map((p) => ({
        Sucursal: NOMBRES_SUCURSAL[s],
        Código: codigoArticulo("PZA", s, p.id),
        Grupo: p.grupo,
        Tipo: p.tipo,
        Detalle: p.detalle || "",
        Cantidad: p.cantidad,
        Mínimo: minimoDe(p, config),
        "Costo unitario": Number(p.costo) || 0,
        "Valor total": (Number(p.costo) || 0) * p.cantidad,
        Notas: p.notas || "",
      }))
    ),
    [22, 15, 20, 26, 20, 10, 10, 14, 12, 30]
  );

  agregar(
    "Hojas grandes",
    SUCURSALES.flatMap((s) =>
      (allData[s].hojasGrandes || []).map((h) => ({
        Sucursal: NOMBRES_SUCURSAL[s],
        Código: codigoArticulo("HOJA", s, h.id),
        Tamaño: h.tamaño,
        Cantidad: h.cantidad,
        Mínimo: minimoDe(h, config),
        "Costo unitario": Number(h.costo) || 0,
        "Valor total": (Number(h.costo) || 0) * h.cantidad,
      }))
    ),
    [22, 16, 12, 10, 10, 14, 12]
  );

  agregar(
    "Placas chicas",
    SUCURSALES.flatMap((s) =>
      (allData[s].placasChicas || []).map((p) => ({
        Sucursal: NOMBRES_SUCURSAL[s],
        Código: codigoArticulo("PLACA", s, p.id),
        Tipo: p.tipo,
        Cantidad: p.cantidad,
        Mínimo: minimoDe(p, config),
        "Costo unitario": Number(p.costo) || 0,
      }))
    ),
    [22, 16, 20, 10, 10, 14]
  );

  agregar(
    "Rendimiento de placas",
    SUCURSALES.flatMap((s) =>
      (allData[s].tiposPlacaChica && allData[s].tiposPlacaChica.length > 0 ? allData[s].tiposPlacaChica : TIPOS_PLACA_CHICA).flatMap((tipo) =>
        TAMANOS_HOJA.map((tamaño) => ({
          Sucursal: NOMBRES_SUCURSAL[s],
          "Tipo de placa": tipo,
          "Tamaño de hoja": tamaño,
          "Placas por hoja": rendimientoDe(allData[s].rendimientos, tamaño, tipo),
        }))
      )
    ),
    [22, 20, 16, 16]
  );

  agregar(
    "Producción de placas",
    SUCURSALES.flatMap((s) =>
      (allData[s].produccionPlacas || []).map((r) => ({
        Sucursal: NOMBRES_SUCURSAL[s],
        Fecha: r.fecha,
        "Tamaño de hoja": r.tamaño,
        "Hojas usadas": r.hojasUsadas,
        "Tipo producido": r.tipo,
        "Placas resultantes": r.resultante,
        Quién: r.quien || "",
      }))
    ).sort((a, b) => (a.Fecha < b.Fecha ? 1 : -1)),
    [22, 12, 16, 12, 20, 16, 18]
  );

  agregar(
    "Movimientos de bases",
    SUCURSALES.flatMap((s) =>
      allData[s].bases.flatMap((b) =>
        (b.movimientos || []).map((m) => ({
          Sucursal: NOMBRES_SUCURSAL[s],
          Código: codigoArticulo("BASE", s, b.id),
          Base: b.nombre,
          Color: m.color || "",
          Fecha: m.fecha,
          Tipo: { entrada: "Entrada", "salida-entrega": "Salida (entrega)", "salida-prestamo": "Salida (préstamo)", ajuste: "Ajuste" }[m.tipo] || m.tipo,
          Cantidad: m.cantidad,
          Quién: m.quien || "",
          Nota: m.nota || "",
        }))
      )
    ).sort((a, b) => (a.Fecha < b.Fecha ? 1 : -1)),
    [22, 15, 26, 14, 12, 20, 10, 18, 34]
  );

  agregar(
    "Pedidos",
    SUCURSALES.flatMap((s) =>
      (allData[s].pedidos || []).map((p) => ({
        Sucursal: NOMBRES_SUCURSAL[s],
        Artículo: p.item,
        Cantidad: p.cantidad,
        Urgencia: p.urgencia,
        Estado: p.estado,
        "Lo pidió": p.pedidoPor || "",
      }))
    ),
    [22, 28, 10, 12, 14, 18]
  );

  agregar(
    "Bitácora",
    bitacoraCombinada(allData)
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .map((b) => ({ Fecha: b.fecha, Sucursal: NOMBRES_SUCURSAL[b.sucursal], Quién: b.quien || "", Movimiento: b.texto })),
    [12, 22, 18, 60]
  );

  XLSX.writeFile(libro, `Inventario_Photograf_${fmt(hoy)}.xlsx`);
}

/* =========================================================================
   ADMIN · Pantalla principal del panel
   ========================================================================= */
function AdminScreen({ empleados, setEmpleados, allData, setAllData, config, setConfig, transferencias, setTransferencias, transferenciasBases, setTransferenciasBases, onBack, mostrarToast, permisoNotificaciones, onActivarNotificacionesAdmin }) {
  const [seccion, setSeccion] = useState(null);

  /* Todo lo que hace el administrador queda anotado en la bitácora de la
     sucursal afectada, para que después se pueda rastrear quién movió qué. */
  const registrar = (suc, texto) => {
    setAllData((prev) => ({
      ...prev,
      [suc]: { ...prev[suc], bitacora: [...(prev[suc].bitacora || []), { texto, quien: "Administrador", fecha: fmt(hoy) }].slice(-400) },
    }));
  };

  const volver = () => setSeccion(null);
  const comun = { allData, setAllData, registrar, config, mostrarToast, onBack: volver };

  if (seccion === "empleados") return <AdminEmpleados empleados={empleados} setEmpleados={setEmpleados} allData={allData} onBack={volver} mostrarToast={mostrarToast} />;
  if (seccion === "inventario") return <AdminInventario {...comun} />;
  if (seccion === "pedidos") return <AdminPedidos {...comun} />;
  if (seccion === "clientes") return <AdminClientes allData={allData} onBack={volver} />;
  if (seccion === "mantenimiento") return <AdminMantenimiento {...comun} />;
  if (seccion === "bitacora") return <AdminBitacora allData={allData} onBack={volver} mostrarToast={mostrarToast} />;
  if (seccion === "categorias") return <AdminCategorias {...comun} />;
  if (seccion === "ajustes")
    return (
      <AdminAjustes
        config={config}
        setConfig={setConfig}
        allData={allData}
        setAllData={setAllData}
        empleados={empleados}
        setEmpleados={setEmpleados}
        transferencias={transferencias}
        setTransferencias={setTransferencias}
        transferenciasBases={transferenciasBases}
        setTransferenciasBases={setTransferenciasBases}
        onBack={volver}
        mostrarToast={mostrarToast}
        permisoNotificaciones={permisoNotificaciones}
        onActivarNotificacionesAdmin={onActivarNotificacionesAdmin}
      />
    );

  const nPedidos = pedidosPorAprobar(allData).length;
  const nFuera = equipoFueraDeServicio(allData).length;
  const paquetes = paquetesSinRecoger(allData);
  const nVencidos = paquetes.filter((p) => p.dias >= TOLERANCIA_DIAS).length;
  const nMovs = bitacoraCombinada(allData).length;

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Panel de Administrador" subtitle="Las dos sucursales" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <AdminResumen allData={allData} config={config} transferenciasBases={transferenciasBases} />

        <div style={{ fontSize: 15, fontWeight: 700, color: C.foreground, marginBottom: 12, marginTop: 8 }}>Administrar</div>

        <AdminMenuItem icon={Users} label="Empleados" detalle={`${empleados.length} en la lista`} color={C.primary} onClick={() => setSeccion("empleados")} />
        <AdminMenuItem icon={ShoppingCart} label="Pedidos a proveedor" detalle="Autoriza o rechaza lo que pide el equipo" badge={nPedidos} color={C.warning} onClick={() => setSeccion("pedidos")} />
        <AdminMenuItem icon={Phone} label="Paquetes sin recoger" detalle="Contacta a los clientes antes de desarmarlos" badge={nVencidos} color={C.accent1} onClick={() => setSeccion("clientes")} />
        <AdminMenuItem icon={Wrench} label="Equipo fuera de servicio" detalle="Dañado o en reparación" badge={nFuera} color={C.error} onClick={() => setSeccion("mantenimiento")} />
        <AdminMenuItem icon={Pencil} label="Editar inventario" detalle="Corrige o elimina equipo, materiales y bases" color={C.secondary} onClick={() => setSeccion("inventario")} />
        <AdminMenuItem icon={Tag} label="Categorías" detalle="Renombra o junta categorías repetidas" color={C.secondary} onClick={() => setSeccion("categorias")} />
        <AdminMenuItem icon={History} label="Historial de movimientos" detalle={`${nMovs} movimientos registrados`} color={C.muted} onClick={() => setSeccion("bitacora")} />
        <AdminMenuItem icon={Sliders} label="Ajustes" detalle="Contraseñas, mínimos de stock y respaldos" color={C.muted} onClick={() => setSeccion("ajustes")} />

        <button
          onClick={() => { exportarInventarioExcel(allData, config); mostrarToast("Excel descargado ✓"); }}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: C.success, color: textoContraste(C.success), border: "none", borderRadius: 10, padding: "13px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 14 }}
        >
          <FileSpreadsheet size={17} /> Descargar todo en Excel
        </button>
        <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 6 }}>
          Un archivo con hojas de equipo, materiales, bases, paquetes, pedidos y bitácora.
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   PANTALLA: Selector de sucursal + contraseña
   ========================================================================= */

const URL_ASISTENCIA = "https://asistencia-front-ee3eg87bc.vercel.app/";

/* =========================================================================
   PANTALLA: Hub — elige entre las apps de Photograf (Inventario, Asistencia,
   y lo que se agregue después). Vive entre "elige tu nombre" y entrar a
   cualquiera de las apps, para que se sienta como una sola carpeta.
   ========================================================================= */
function HubScreen({ usuario, onAbrirInventario, onAbrirAsistencia, onCambiarUsuario }) {
  return (
    <div style={{ padding: 20, minHeight: "100vh", background: C.background }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={LOGO_PHOTOGRAF} alt="Photograf" style={{ width: 30, height: 30 }} />
          <div>
            <div className="pf-heading" style={{ fontSize: 22, fontWeight: 700, color: C.foreground }}>Photograf</div>
            <span className="pf-ribbon" />
          </div>
        </div>
        {usuario && (
          <button onClick={onCambiarUsuario} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer" }}>
            <UserCircle size={16} /> {usuario}
          </button>
        )}
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>¿Qué necesitas hoy?</div>

      <button
        onClick={onAbrirInventario}
        className="pf-press"
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 16, background: `linear-gradient(135deg, ${shadeColor(C.primary, 8)}, ${shadeColor(C.primary, -16)})`, border: "none", borderRadius: 16, padding: 20, marginBottom: 14, cursor: "pointer", boxShadow: `0 6px 16px ${C.primary}40` }}
      >
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Warehouse size={26} color={textoContraste(shadeColor(C.primary, 8))} />
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: textoContraste(shadeColor(C.primary, 8)) }}>Inventario</div>
          <div style={{ fontSize: 12, color: textoContraste(shadeColor(C.primary, 8)), opacity: 0.8 }}>Equipo, almacén, pedidos y más</div>
        </div>
      </button>

      <button
        onClick={onAbrirAsistencia}
        className="pf-press"
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 16, background: `linear-gradient(135deg, ${shadeColor(C.secondary, 8)}, ${shadeColor(C.secondary, -16)})`, border: "none", borderRadius: 16, padding: 20, cursor: "pointer", boxShadow: `0 6px 16px ${C.secondary}40` }}
      >
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Clock size={26} color={textoContraste(shadeColor(C.secondary, 8))} />
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: textoContraste(shadeColor(C.secondary, 8)) }}>Asistencia</div>
          <div style={{ fontSize: 12, color: textoContraste(shadeColor(C.secondary, 8)), opacity: 0.8 }}>Registro de entradas y salidas</div>
        </div>
      </button>
    </div>
  );
}

/* Muestra Asistencia integrada dentro de la app (iframe). Algunos entornos
   (incluida la vista previa de Claude) bloquean cargar contenido externo
   por seguridad — en vez de intentar "adivinar" si cargó bien (poco
   confiable: el evento onLoad a veces dispara igual aunque el contenido
   esté bloqueado), siempre se deja visible el botón de abrir aparte. */
function AsistenciaScreen({ onBack }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <SectionHeader title="Asistencia" onBack={onBack} />
      <div style={{ padding: "10px 16px", background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 11.5, color: C.muted }}>¿No carga aquí abajo? Ábrela directo:</div>
        <a href={URL_ASISTENCIA} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.secondary, color: textoContraste(C.secondary), borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600 }}>
            <Share2 size={13} /> Abrir aparte
          </div>
        </a>
      </div>
      <div style={{ flex: 1, position: "relative", background: "#fff" }}>
        <iframe
          src={URL_ASISTENCIA}
          title="Asistencia"
          style={{ width: "100%", height: "100%", minHeight: "calc(100vh - 120px)", border: "none", display: "block" }}
        />
      </div>
    </div>
  );
}

function SucursalSelector({ usuario, onCambiarUsuario, onUnlock, onOpenMiInventario, onOpenBuscar, config }) {
  const [intento, setIntento] = useState(null);
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!intento) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [intento]);

  const confirmar = () => {
    if (pass === (config?.passwords?.[intento] ?? CONFIG_INICIAL.passwords[intento])) {
      onUnlock(intento);
      setIntento(null);
      setPass("");
      setError("");
    } else {
      setError("Contraseña incorrecta, intenta de nuevo.");
    }
  };

  return (
    <div style={{ padding: 20, minHeight: "100vh", background: C.background }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src={LOGO_PHOTOGRAF} alt="Photograf" style={{ width: 28, height: 28 }} />
          <div>
            <div className="pf-heading" style={{ fontSize: 24, fontWeight: 700, color: C.foreground }}>Photograf</div>
            <span className="pf-ribbon" />
          </div>
        </div>
        <button onClick={onCambiarUsuario} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer" }}>
          <UserCircle size={16} /> {usuario}
        </button>
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, marginTop: 10 }}>Elige una sucursal para entrar</div>

      {["queretaro", "salinas"].map((s) => (
        <button key={s} onClick={() => setIntento(s)} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", boxShadow: SOMBRA_TARJETA }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground }}>{NOMBRES_SUCURSAL[s]}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Requiere contraseña</div>
          </div>
          <Lock size={22} color={C.primary} />
        </button>
      ))}

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button onClick={onOpenMiInventario} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 13, fontWeight: 600, color: C.foreground, cursor: "pointer" }}>
          Mi Inventario
        </button>
        <button onClick={onOpenBuscar} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 13, fontWeight: 600, color: C.foreground, cursor: "pointer" }}>
          Buscar artículo
        </button>
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 12, textAlign: "center" }}>Todos pueden ver info general; entrar a trabajar en una sucursal requiere su contraseña.</div>

      {intento && (
        <Modal title={NOMBRES_SUCURSAL[intento]} onClose={() => { setIntento(null); setPass(""); setError(""); }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pass) confirmar();
            }}
          >
            <FieldLabel>Contraseña de la sucursal</FieldLabel>
            <TextInput ref={inputRef} type="password" enterKeyHint="go" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" autoFocus />
            {error && <div style={{ color: C.error, fontSize: 12, marginTop: 8 }}>{error}</div>}
            <PrimaryButton disabled={!pass}>Entrar</PrimaryButton>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   PANTALLA: Home
   ========================================================================= */

function HomeScreen({ data, goTo, alertas, sucursalNombre, mostrarToast, usuarioActual }) {
  const disponible = data.equipo.filter((e) => e.estado === "Disponible").length;
  const enUso = data.equipo.filter((e) => e.estado === "En uso").length;
  const danado = data.equipo.filter((e) => e.estado === "Dañado").length;
  const reparacion = data.equipo.filter((e) => e.estado === "En reparación").length;
  const stats = [
    { key: "disponible", label: "Disponible", value: disponible, icon: Check, color: C.success },
    { key: "enUso", label: "En uso", value: enUso, icon: Clock, color: C.primary },
    { key: "danado", label: "Dañado", value: danado, icon: AlertTriangle, color: C.error },
    { key: "reparacion", label: "En reparación", value: reparacion, icon: RotateCcw, color: C.warning },
  ];
  const seDevuelveHoy = data.equipo.filter((e) => e.estado === "En uso" && e.fechaDevolucion === fmt(hoy)).length;
  const atrasados = data.equipo.filter((e) => e.estado === "En uso" && e.fechaDevolucion && e.fechaDevolucion < fmt(hoy)).length;
  const movimientos = [...data.bitacora].reverse().slice(0, 5);

  const proximoEvento = data.bases
    .flatMap((b) => b.reservas.filter((r) => r.estado === "Reservada" && r.fecha >= fmt(hoy)).map((r) => ({ ...r, base: b.nombre })))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0];
  const diasParaEvento = proximoEvento
    ? Math.round((new Date(proximoEvento.fecha) - new Date(fmt(hoy))) / 86400000)
    : null;

  const compartirResumen = async () => {
    const texto = `Photograf ${sucursalNombre} — Resumen del ${fmt(hoy)}\nDisponible: ${disponible} · En uso: ${enUso} · Dañado: ${danado} · En reparación: ${reparacion}\nPor devolver hoy: ${seDevuelveHoy} · Atrasados: ${atrasados} · Alertas activas: ${alertas.length}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Resumen del día — Photograf", text: texto });
      } catch (e) {
        // El usuario canceló el diálogo de compartir; no es un error real.
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(texto);
      mostrarToast("Resumen copiado al portapapeles ✓");
    } else {
      mostrarToast("Este navegador no permite compartir directo");
    }
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: "20px 16px 0" }}>
        <div className="pf-heading" style={{ fontSize: 21, fontWeight: 600, color: C.foreground, marginBottom: 2 }}>
          {saludoDeHora(usuarioActual)}
        </div>
        {(seDevuelveHoy > 0 || atrasados > 0 || alertas.length > 0) && (
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
            Hoy: {seDevuelveHoy} equipo(s) por devolver, {atrasados} atrasado(s), {alertas.length} alerta(s) activa(s).
          </div>
        )}
        {!(seDevuelveHoy > 0 || atrasados > 0 || alertas.length > 0) && (
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, marginTop: 4 }}>
            Todo en orden — sin pendientes ni alertas por ahora.
          </div>
        )}
        {proximoEvento && (
          <div
            className="pf-pop"
            style={{
              background: `linear-gradient(135deg, ${shadeColor(C.primary, 6)}, ${shadeColor(C.primary, -22)})`,
              borderRadius: 16,
              padding: "17px 18px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: `0 12px 28px ${C.primary}35`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.secondary}, ${C.primary})` }} />
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Próximo evento</div>
              <div className="pf-heading" style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginTop: 3 }}>{proximoEvento.evento}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{proximoEvento.base} · {proximoEvento.fecha}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="pf-heading" style={{ fontSize: 27, fontWeight: 700, color: "#fff" }}>{diasParaEvento === 0 ? "Hoy" : diasParaEvento}</div>
              {diasParaEvento !== 0 && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>{diasParaEvento === 1 ? "día" : "días"}</div>}
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.foreground }}>Resumen del Día</div>
          <button onClick={compartirResumen} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", color: C.primary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Share2 size={14} /> Compartir
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          {stats.map((s) => (
            <StatCard key={s.key} icon={s.icon} value={s.value} label={s.label} color={s.color} />
          ))}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.foreground, marginBottom: 12 }}>Acceso Rápido</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <QuickActionCard icon={Camera} label="Equipo" color={C.primary} onClick={() => goTo("equipo")} />
          <QuickActionCard icon={Warehouse} label="Almacén" color={C.secondary} onClick={() => goTo("almacen")} />
          <QuickActionCard icon={Package} label="Materiales" color={C.accent1} onClick={() => goTo("materiales")} />
          <QuickActionCard icon={User} label="Mi Inventario" color={C.muted} onClick={() => goTo("miInventario")} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.foreground, marginBottom: 12 }}>Movimientos Recientes</div>
        {movimientos.length === 0 && <EmptyState icon={Activity} text="Sin movimientos todavía. Aquí verás la actividad reciente." />}
        {movimientos.map((m, idx) => (
          <div key={idx} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", boxShadow: SOMBRA_TARJETA }}>
            <span style={{ fontSize: 13, color: C.foreground }}>{m.texto}{m.quien ? ` · ${m.quien}` : ""}</span>
            <span style={{ fontSize: 12, color: C.muted }}>{m.fecha}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   PANTALLA: Equipo (lista + ficha detalle + alta de nuevo equipo)
   ========================================================================= */

function EquipoScreen({ data, setData, bitacora, usuarioActual, onIniciarTransferencia, sucursalActiva, mostrarToast, abrirEquipoId, onAbrirConsumido }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todas");
  const [selectedId, setSelectedId] = useState(abrirEquipoId || null);

  /* Si el escáner o el buscador piden abrir una ficha mientras ya estamos
     en esta pantalla, el componente no se vuelve a montar — antes eso hacía
     que no pasara nada. Se avisa que ya se atendió, para que después no se
     vuelva a abrir sola la ficha vieja. */
  useEffect(() => {
    if (!abrirEquipoId) return;
    setSelectedId(abrirEquipoId);
    if (onAbrirConsumido) onAbrirConsumido();
  }, [abrirEquipoId]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [warning, setWarning] = useState("");
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  const [porEliminarEquipo, setPorEliminarEquipo] = useState(false);

  const filters = ["Todas", "Disponible", "En uso", "Dañado", "En reparación", "Baja"];
  // Categorías: no es una lista aparte como las pestañas de Materiales o
  // Almacén — aquí cada pieza de equipo ya se registra una por una (con su
  // propia foto, estado y préstamo), así que la "pestaña" es simplemente
  // agrupar por lo que se haya escrito en Categoría. Aparece sola en
  // cuanto das de alta la primera pieza con ese nombre.
  const categoriasEquipo = [...new Set(data.equipo.map((e) => e.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [agregandoCategoria, setAgregandoCategoria] = useState(false);
  const [categoriaNueva, setCategoriaNueva] = useState("");
  const items = data.equipo.filter(
    (i) => (filter === "Todas" || i.estado === filter) && (categoriaFiltro === "Todas" || i.categoria === categoriaFiltro) && i.nombre.toLowerCase().includes(search.toLowerCase())
  );
  const selected = data.equipo.find((e) => e.id === selectedId);
  const atrasado = selected && selected.estado === "En uso" && selected.fechaDevolucion && selected.fechaDevolucion < fmt(hoy);

  const actualizarEquipo = (id, cambios, historialTexto) => {
    setData((d) => ({ ...d, equipo: d.equipo.map((e) => (e.id === id ? { ...e, ...cambios, historial: [...e.historial, { texto: historialTexto, fecha: fmt(hoy) }] } : e)) }));
  };

  const intentarPrestar = (item) => {
    if (item.estado === "En uso") {
      setWarning(`Ya está prestado a ${item.quienLoTiene} desde el ${item.fechaPrestamo}.`);
      return;
    }
    setForm({ quienLoTiene: usuarioActual, quienAutorizo: "", fechaDevolucion: "" });
    setModal("prestar");
  };

  const confirmarPrestamo = () => {
    actualizarEquipo(selected.id, { estado: "En uso", quienLoTiene: form.quienLoTiene, quienAutorizo: form.quienAutorizo, fechaPrestamo: fmt(hoy), fechaDevolucion: form.fechaDevolucion }, `Prestado a ${form.quienLoTiene}`);
    bitacora(`${selected.nombre} prestado a ${form.quienLoTiene}`, form.quienAutorizo);
    mostrarToast("Préstamo registrado ✓");
    setModal(null);
  };

  const confirmarDevolucion = () => {
    bitacora(`${selected.nombre} devuelto por ${selected.quienLoTiene}`, usuarioActual);
    actualizarEquipo(selected.id, { estado: "Disponible", quienLoTiene: null, quienAutorizo: null, fechaPrestamo: null, fechaDevolucion: null }, `Devuelto por ${selected.quienLoTiene}`);
    mostrarToast("Devolución registrada ✓");
  };

  const mandarAReparacion = () => {
    actualizarEquipo(selected.id, { estado: "En reparación" }, "Enviado a reparación");
    bitacora(`${selected.nombre} enviado a reparación`, usuarioActual);
    mostrarToast("Marcado como en reparación ✓");
  };

  const marcarReparado = () => {
    actualizarEquipo(selected.id, { estado: "Disponible", notas: "" }, "Reparado y de vuelta en servicio");
    bitacora(`${selected.nombre} reparado y de vuelta en servicio`, usuarioActual);
    mostrarToast("Equipo de vuelta en servicio ✓");
  };

  const confirmarDanado = () => {
    if (!form.motivo) return;
    actualizarEquipo(selected.id, { estado: "Dañado", notas: form.motivo, foto: form.foto || selected.foto }, `Marcado como dañado: ${form.motivo}`);
    bitacora(`${selected.nombre} marcado como dañado: ${form.motivo}`, form.quien);
    setModal(null);
  };

  const ESTADOS_RAPIDOS = ["Disponible", "En uso", "Dañado", "En reparación"];

  /* Antes, para cambiar el estado había que buscar el botón correcto entre
     varios que aparecían y desaparecían según el estado actual ("Prestar",
     "Mandar a reparación", "Ya quedó reparado"...). Ahora hay una fila de
     pestañas de estado arriba, junto al nombre: tocas la que quieres y se
     mueve directo ahí. Solo pide datos cuando de verdad hacen falta (a quién
     se presta, o el motivo si se daña); los demás cambios son instantáneos. */
  const cambiarEstadoRapido = (nuevoEstado) => {
    if (nuevoEstado === selected.estado) return;
    if (nuevoEstado === "En uso") {
      intentarPrestar(selected);
    } else if (nuevoEstado === "Dañado") {
      setForm({ motivo: "", quien: usuarioActual, foto: null });
      setModal("danado");
    } else if (nuevoEstado === "En reparación") {
      mandarAReparacion();
    } else if (nuevoEstado === "Disponible") {
      if (selected.estado === "En uso") confirmarDevolucion();
      else marcarReparado();
    }
  };

  const confirmarBaja = () => {
    if (!form.motivo || !form.quien) return;
    if (!confirmandoBaja) {
      setConfirmandoBaja(true);
      return;
    }
    actualizarEquipo(selected.id, { estado: "Baja", notas: form.motivo }, `Dado de baja: ${form.motivo}`);
    bitacora(`${selected.nombre} dado de baja: ${form.motivo}`, form.quien);
    mostrarToast("Equipo dado de baja");
    setModal(null);
    setConfirmandoBaja(false);
  };

  /* Dar de baja solo marca el estado (queda su historial y su lugar en
     "Todas"/"Baja"), pero no lo borraba nunca del inventario — no había
     forma de quitarlo de encima. Esto sí lo elimina por completo, y solo
     está disponible para equipo ya dado de baja (no para uno en uso). */
  const eliminarEquipo = () => {
    setData((d) => ({ ...d, equipo: d.equipo.filter((e) => e.id !== selected.id) }));
    bitacora(`Equipo eliminado del inventario: ${selected.nombre}`, usuarioActual);
    mostrarToast("Equipo eliminado del inventario");
    setPorEliminarEquipo(false);
    setSelectedId(null);
  };

  const confirmarAlta = () => {
    if (!form.nombre || !form.categoria) return;
    const nuevoId = Math.max(0, ...data.equipo.map((e) => e.id)) + 1;
    setData((d) => ({ ...d, equipo: [...d.equipo, { id: nuevoId, nombre: form.nombre, categoria: form.categoria, estado: "Disponible", foto: form.foto || null, fotos: [], costo: parseFloat(form.costo) || 0, quienLoTiene: null, quienAutorizo: null, fechaPrestamo: null, fechaDevolucion: null, notas: "", historial: [{ texto: `Alta de equipo por ${usuarioActual}`, fecha: fmt(hoy) }] }] }));
    bitacora(`Nuevo equipo agregado: ${form.nombre}`, usuarioActual);
    mostrarToast("Equipo agregado ✓");
    setModal(null);
    setForm({});
  };

  if (selected) {
    const folio = codigoArticulo("EQ", sucursalActiva, selected.id);
    return (
      <div style={{ paddingBottom: 40 }}>
        <SectionHeader title={selected.nombre} subtitle={`${selected.categoria} · ${folio}`} onBack={() => setSelectedId(null)} right={
          <button onClick={() => setModal("qr")} style={{ background: "none", border: "none", color: C.primary, cursor: "pointer" }} aria-label="Ver código QR">
            <QrCodeIcon size={22} />
          </button>
        } />
        <div style={{ padding: 16 }}>
          {selected.foto && <img src={selected.foto} alt={selected.nombre} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12, marginBottom: 16 }} />}
          <div style={{ marginBottom: 16 }}>
            {selected.estado === "Baja" ? (
              <EstadoBadges estados={["Baja"]} />
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ESTADOS_RAPIDOS.map((es) => {
                    const activo = selected.estado === es;
                    const color = estadoColorDe(es);
                    return (
                      <button
                        key={es}
                        onClick={() => cambiarEstadoRapido(es)}
                        disabled={activo}
                        style={{ background: activo ? color : "none", color: activo ? textoContraste(color) : color, border: `1.5px solid ${color}`, borderRadius: 20, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: activo ? "default" : "pointer" }}
                      >
                        {es}
                      </button>
                    );
                  })}
                </div>
                {atrasado && <div style={{ marginTop: 8 }}><Badge estado="Atrasado" /></div>}
              </>
            )}
          </div>
          {selected.estado === "En uso" && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: C.foreground }}><strong>Quién lo tiene:</strong> {selected.quienLoTiene}</div>
              <div style={{ fontSize: 13, color: C.foreground, marginTop: 4 }}><strong>Autorizó:</strong> {selected.quienAutorizo}</div>
              <div style={{ fontSize: 13, color: C.foreground, marginTop: 4 }}><strong>Préstamo:</strong> {selected.fechaPrestamo} &nbsp; <strong>Devolución:</strong> {selected.fechaDevolucion}</div>
            </div>
          )}
          {selected.notas && (
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              <strong style={{ color: C.foreground }}>Notas:</strong> {selected.notas}
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <MultiPhotoInput
              value={selected.fotos || []}
              onChange={(nuevas) => setData((d) => ({ ...d, equipo: d.equipo.map((e) => (e.id === selected.id ? { ...e, fotos: nuevas } : e)) }))}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {selected.estado !== "Baja" && (
              <>
                {/* Antes se podía mandar a la otra sucursal un equipo que
                    alguien traía prestado, y desaparecía de las dos listas. */}
                {selected.estado === "En uso" ? (
                  <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "6px 0" }}>
                    Para enviarlo a {NOMBRES_SUCURSAL[OTRA_SUCURSAL[sucursalActiva]].replace("Photograf ", "")}, primero regístralo como devuelto.
                  </div>
                ) : (
                  <PrimaryButton onClick={() => { setForm({ quien: usuarioActual }); setModal("transferir"); }} color={C.secondary}>Enviar a {NOMBRES_SUCURSAL[OTRA_SUCURSAL[sucursalActiva]]}</PrimaryButton>
                )}
                <PrimaryButton onClick={() => { setForm({ motivo: "", quien: usuarioActual }); setConfirmandoBaja(false); setModal("baja"); }} color={C.muted}>Dar de baja definitiva</PrimaryButton>
              </>
            )}
            {selected.estado === "Baja" && (
              <button
                onClick={() => setPorEliminarEquipo(true)}
                style={{ width: "100%", background: "none", border: `1px solid ${C.error}`, color: C.error, borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Trash2 size={16} /> Eliminar del inventario
              </button>
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginBottom: 10 }}>Historial</div>
          {[...selected.historial].reverse().map((h, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.foreground }}>{h.texto}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{h.fecha}</span>
            </div>
          ))}
        </div>

        {warning && (
          <Modal title="Equipo ya prestado" onClose={() => setWarning("")} danger>
            <div style={{ fontSize: 14, color: C.foreground }}>{warning}</div>
            <PrimaryButton onClick={() => setWarning("")} color={C.error}>Entendido</PrimaryButton>
          </Modal>
        )}

        {modal === "prestar" && (
          <Modal title="Prestar equipo" onClose={() => setModal(null)}>
            <FieldLabel>Quién lo va a usar</FieldLabel>
            <TextInput value={form.quienLoTiene} onChange={(e) => setForm({ ...form, quienLoTiene: e.target.value })} placeholder="Nombre" />
            <FieldLabel>Quién autoriza</FieldLabel>
            <TextInput value={form.quienAutorizo} onChange={(e) => setForm({ ...form, quienAutorizo: e.target.value })} placeholder="Nombre" />
            <FieldLabel>Fecha de devolución</FieldLabel>
            <TextInput type="date" value={form.fechaDevolucion} onChange={(e) => setForm({ ...form, fechaDevolucion: e.target.value })} />
            <PrimaryButton onClick={confirmarPrestamo} disabled={!form.quienLoTiene || !form.quienAutorizo || !form.fechaDevolucion}>Confirmar préstamo</PrimaryButton>
          </Modal>
        )}

        {modal === "danado" && (
          <Modal title="Marcar como dañado" onClose={() => setModal(null)} danger>
            <FieldLabel>¿Qué pasó? (obligatorio)</FieldLabel>
            <TextInput value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Describe el daño..." />
            <PhotoInput value={form.foto} onChange={(v) => setForm({ ...form, foto: v })} label="Foto del daño (opcional)" />
            <FieldLabel>Tu nombre</FieldLabel>
            <TextInput value={form.quien} onChange={(e) => setForm({ ...form, quien: e.target.value })} placeholder="Quién reporta" />
            <PrimaryButton onClick={confirmarDanado} color={C.error} disabled={!form.motivo || !form.quien}>Guardar</PrimaryButton>
          </Modal>
        )}

        {modal === "baja" && (
          <Modal title="Dar de baja definitiva" onClose={() => { setModal(null); setConfirmandoBaja(false); }} danger>
            <FieldLabel>Motivo (obligatorio, queda en el historial)</FieldLabel>
            <TextInput value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Motivo de la baja..." disabled={confirmandoBaja} />
            <FieldLabel>Tu nombre</FieldLabel>
            <TextInput value={form.quien} onChange={(e) => setForm({ ...form, quien: e.target.value })} placeholder="Quién da de baja" disabled={confirmandoBaja} />
            {confirmandoBaja && (
              <div style={{ background: C.error, borderRadius: 10, padding: 12, marginTop: 12, display: "flex", gap: 10 }}>
                <AlertTriangle size={20} color={textoContraste(C.error)} style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: textoContraste(C.error) }}>
                  Esto es definitivo: {selected.nombre} dejará de aparecer como equipo utilizable. ¿Seguro?
                </div>
              </div>
            )}
            <PrimaryButton onClick={confirmarBaja} color={C.error} disabled={!form.motivo || !form.quien}>
              {confirmandoBaja ? "Sí, dar de baja definitivamente" : "Confirmar baja"}
            </PrimaryButton>
          </Modal>
        )}

        {porEliminarEquipo && (
          <Modal title="Eliminar del inventario" onClose={() => setPorEliminarEquipo(false)} danger>
            <div style={{ background: C.error, borderRadius: 10, padding: 12, display: "flex", gap: 10 }}>
              <AlertTriangle size={20} color={textoContraste(C.error)} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: textoContraste(C.error) }}>
                "{selected.nombre}" se borra por completo del inventario, junto con su historial. Esto no se puede deshacer. ¿Seguro?
              </div>
            </div>
            <PrimaryButton onClick={eliminarEquipo} color={C.error}>
              Sí, eliminar definitivamente
            </PrimaryButton>
          </Modal>
        )}

        {modal === "transferir" && (
          <Modal title={`Enviar a ${NOMBRES_SUCURSAL[OTRA_SUCURSAL[sucursalActiva]]}`} onClose={() => setModal(null)}>
            <div style={{ fontSize: 13, color: C.muted }}>
              El equipo queda "En tránsito" hasta que {NOMBRES_SUCURSAL[OTRA_SUCURSAL[sucursalActiva]]} confirme que lo recibió — así nunca desaparece del sistema mientras viaja. Puedes ver el estado en Más → Transferencias.
            </div>
            <FieldLabel>¿Quién lo mueve?</FieldLabel>
            <TextInput value={form.quien} onChange={(e) => setForm({ ...form, quien: e.target.value })} placeholder="Nombre de quién transfiere" />
            <PrimaryButton
              onClick={() => {
                onIniciarTransferencia(selected, form.quien);
                setSelectedId(null);
                setModal(null);
              }}
              color={C.secondary}
              disabled={!form.quien}
            >
              Confirmar envío
            </PrimaryButton>
          </Modal>
        )}

        {modal === "qr" && (
          <Modal title="Código QR" onClose={() => setModal(null)}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <CodigoQR codigo={folio} tamaño={200} />
              <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: C.foreground }}>{folio}</div>
              <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>
                Imprímelo y pégalo en el equipo. Escanéalo desde "Escanear" en Inicio para llegar directo a esta ficha.
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 90 }}>
      <SectionHeader title="Equipo Fotográfico" subtitle={`${data.equipo.length} artículos`} />
      <SearchBar placeholder="Buscar equipo..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 16px 0" }}>
        {filters.map((f) => (
          <FilterPill key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 16px 0" }}>
        <FilterPill label="Todas las categorías" active={categoriaFiltro === "Todas"} onClick={() => setCategoriaFiltro("Todas")} color={C.secondary} />
        {categoriasEquipo.map((c) => (
          <FilterPill key={c} label={c} active={categoriaFiltro === c} onClick={() => setCategoriaFiltro(c)} color={C.secondary} />
        ))}
        <button
          onClick={() => { setCategoriaNueva(""); setAgregandoCategoria(true); }}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, border: `1.5px dashed ${C.border}`, borderRadius: 20, padding: "8px 14px", background: "none", color: C.muted, fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          <Plus size={14} /> Nueva categoría
        </button>
      </div>
      <div className="pf-list-grid" style={{ padding: 16 }}>
        {items.map((i) => {
          const itemAtrasado = i.estado === "En uso" && i.fechaDevolucion && i.fechaDevolucion < fmt(hoy);
          return <InventoryCard key={i.id} nombre={i.nombre} categoria={i.categoria} foto={i.foto} estados={itemAtrasado ? [i.estado, "Atrasado"] : [i.estado]} alertColor={itemAtrasado ? C.error : undefined} onClick={() => setSelectedId(i.id)} />;
        })}
        {items.length === 0 && <EmptyState icon={Camera} text="No se encontró equipo con ese filtro." />}
      </div>
      <FAB color={C.primary} onClick={() => { setForm({ nombre: "", categoria: categoriaFiltro === "Todas" ? "" : categoriaFiltro, foto: null }); setModal("alta"); }} />

      {modal === "alta" && (
        <Modal title="Nuevo equipo" onClose={() => setModal(null)}>
          <FieldLabel>Nombre</FieldLabel>
          <TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Cámara Sony A7III" />
          <FieldLabel>Categoría</FieldLabel>
          {categoriasEquipo.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {categoriasEquipo.map((c) => (
                <FilterPill key={c} label={c} active={form.categoria === c} onClick={() => setForm({ ...form, categoria: c })} color={C.secondary} />
              ))}
            </div>
          )}
          <TextInput value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ej. Cámaras, Lentes, Soportes..." />
          <FieldLabel>Costo aproximado (opcional)</FieldLabel>
          <TextInput type="number" value={form.costo || ""} onChange={(e) => setForm({ ...form, costo: e.target.value })} placeholder="$0" />
          <PhotoInput value={form.foto} onChange={(v) => setForm({ ...form, foto: v })} />
          <PrimaryButton onClick={confirmarAlta} disabled={!form.nombre || !form.categoria}>Agregar equipo</PrimaryButton>
        </Modal>
      )}

      {agregandoCategoria && (
        <Modal title="Nueva categoría" onClose={() => setAgregandoCategoria(false)}>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 4 }}>
            Cada pieza de equipo se sigue dando de alta una por una, con su propia foto, estado y préstamo — esto solo arranca una categoría nueva para agruparlas. En cuanto agregues la primera pieza, la categoría queda creada.
          </div>
          <FieldLabel>Nombre de la categoría</FieldLabel>
          <TextInput value={categoriaNueva} onChange={(e) => setCategoriaNueva(e.target.value)} placeholder="Ej. Herramientas" />
          <PrimaryButton
            onClick={() => {
              const nombre = categoriaNueva.trim();
              if (!nombre) return;
              setCategoriaFiltro(nombre);
              setAgregandoCategoria(false);
              setForm({ nombre: "", categoria: nombre, foto: null });
              setModal("alta");
            }}
            disabled={!categoriaNueva.trim()}
          >
            Crear y agregar la primera pieza
          </PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   PANTALLA: Almacén
   ========================================================================= */

function AlmacenScreen({ data, setData, bitacora, usuarioActual, sucursal, mostrarToast, onPedir, onIniciarTransferenciaBase }) {
  const [tab, setTab] = useState("bases");
  const [modalPedido, setModalPedido] = useState(false);
  const [pedidoForm, setPedidoForm] = useState({ item: "", cantidad: "1", urgencia: "Normal", tipo: "material", color: "" });
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const [registrandoSalida, setRegistrandoSalida] = useState(null); // base
  const [salidaForm, setSalidaForm] = useState({ tipo: "entrega", cantidad: "1", nota: "", color: "" });
  const [verMovimientosDe, setVerMovimientosDe] = useState(null); // base
  const [gestionandoVariantesDe, setGestionandoVariantesDe] = useState(null); // base
  const [nuevaVariante, setNuevaVariante] = useState({ color: "", cantidad: "" });
  const [editandoVariante, setEditandoVariante] = useState(null); // { base, variante }
  const [varianteCantEdit, setVarianteCantEdit] = useState("");
  const [editBase, setEditBase] = useState(null);
  const [nuevoValor, setNuevoValor] = useState("");
  const [quien, setQuien] = useState("");
  const [confirmGrande, setConfirmGrande] = useState(null);
  const [modalAlta, setModalAlta] = useState(false);
  const [nuevaBase, setNuevaBase] = useState({ nombre: "", tenemos: "", catalogo: "General" });
  const [origenNombreBase, setOrigenNombreBase] = useState("catalogo"); // "catalogo" | "manual"
  const [buscaCatalogoBase, setBuscaCatalogoBase] = useState("");
  const [catalogoTabAlta, setCatalogoTabAlta] = useState("General");
  const [editandoFotoDe, setEditandoFotoDe] = useState(null); // base
  const [recibiendo, setRecibiendo] = useState(null);
  const [fotoRecibo, setFotoRecibo] = useState(null);
  const [porEliminarBase, setPorEliminarBase] = useState(null);
  const [agregandoPaqueteA, setAgregandoPaqueteA] = useState(null);
  const [nuevoPaquete, setNuevoPaquete] = useState({ cliente: "", correo: "", telefono: "", fecha: fmt(hoy) });
  const [porDesarmar, setPorDesarmar] = useState(null);
  const [panoAmpliado, setPanoAmpliado] = useState(null); // { pano, entradas }
  const [agregandoGrupoAlmacen, setAgregandoGrupoAlmacen] = useState(false);
  const [nombreGrupoAlmacenNuevo, setNombreGrupoAlmacenNuevo] = useState("");
  const [colorGrupoAlmacenNuevo, setColorGrupoAlmacenNuevo] = useState(C.secondary);

  const gruposAlmacen = data.gruposAlmacen || [];
  const COLORES_GRUPO_ALMACEN = [C.primary, C.secondary, C.accent1, C.warning, C.success];

  const crearGrupoAlmacen = () => {
    if (!nombreGrupoAlmacenNuevo.trim()) return;
    const nuevoId = Date.now();
    setData((d) => ({
      ...d,
      gruposAlmacen: [...(d.gruposAlmacen || []), { id: nuevoId, nombre: nombreGrupoAlmacenNuevo.trim(), color: colorGrupoAlmacenNuevo, items: [] }],
    }));
    bitacora(`Nueva pestaña creada en Almacén: ${nombreGrupoAlmacenNuevo.trim()}`, usuarioActual);
    mostrarToast("Pestaña creada ✓");
    setAgregandoGrupoAlmacen(false);
    setNombreGrupoAlmacenNuevo("");
    setColorGrupoAlmacenNuevo(C.secondary);
    setTab(`custom:${nuevoId}`);
  };

  const esQueretaro = sucursal === "queretaro";
  // Salvaguarda: aunque los datos ya separan por sucursal, nunca se muestra
  // UNICEQ fuera de Querétaro, ni siquiera si llegara a existir en los datos.
  const basesVisibles = data.bases.filter((b) => esQueretaro || b.catalogo !== "UNICEQ");
  // Ya no se filtra por catálogo aquí — se quitó la fila de filtros
  // General/Universidad/UNICEQ a petición del negocio, la lista de Bases
  // muestra todo junto.
  const basesFiltradas = basesVisibles;

  /* Catálogo unificado de panos: Universidad y UNICEQ venden por separado
     (con nombre y precio distintos) lo que muchas veces es el mismo diseño
     físico de pano. Aquí se agrupan por diseño (ver panoDe) para ver de un
     vistazo todos los panos que se tienen en Querétaro, sumando lo que hay
     entre ambos catálogos. */
  const gruposPanos = useMemo(() => {
    const relevantes = basesVisibles.filter((b) => b.catalogo === "Universidad" || b.catalogo === "UNICEQ");
    const mapa = new Map();
    relevantes.forEach((b) => {
      const clave = panoDe(b.nombre);
      if (!mapa.has(clave)) mapa.set(clave, { pano: clave, imagen: null, imagenDiploma: null, catalogos: new Set(), entradas: [] });
      const g = mapa.get(clave);
      g.catalogos.add(b.catalogo);
      g.entradas.push(b);
      if (!g.imagen && b.imagen) g.imagen = b.imagen;
      if (!g.imagenDiploma && b.imagenDiploma) g.imagenDiploma = b.imagenDiploma;
    });
    // "tenemos" ya no se suma entrada por entrada: las que no llevan
    // variantes comparten una sola existencia sincronizada (ver
    // conPanoSincronizado), así que solo cuenta una vez; solo se suma aparte
    // lo que sigue llevando su propio conteo por color (variantes).
    return Array.from(mapa.values())
      .map((g) => {
        const sinVariantes = g.entradas.filter((b) => !(b.variantes && b.variantes.length > 0));
        const conVariantes = g.entradas.filter((b) => b.variantes && b.variantes.length > 0);
        const tenemos = (sinVariantes.length > 0 ? tenemosBase(sinVariantes[0]) : 0) + conVariantes.reduce((a, b) => a + tenemosBase(b), 0);
        return { ...g, tenemos };
      })
      .sort((a, b) => a.pano.localeCompare(b.pano, "es"));
  }, [basesVisibles]);

  const sobreReservado = basesFiltradas.filter((b) => choquesDePano(data.bases, b).length > 0);

  const marcarEntregada = (baseId, reservaId, evento) => {
    setData((d) => ({ ...d, bases: d.bases.map((b) => (b.id === baseId ? { ...b, reservas: b.reservas.map((r) => (r.id === reservaId ? { ...r, estado: "Entregada" } : r)) } : b)) }));
    bitacora(`Reserva entregada: ${evento}`, usuarioActual);
    mostrarToast("Marcado como entregado ✓");
  };

  const agregarPaquete = () => {
    if (!nuevoPaquete.cliente || !nuevoPaquete.fecha) return;
    const base = data.bases.find((b) => b.id === agregandoPaqueteA);
    const nuevoId = Math.max(0, ...base.reservas.map((r) => r.id), ...data.bases.flatMap((b) => b.reservas.map((r) => r.id))) + 1;
    setData((d) => ({
      ...d,
      bases: d.bases.map((b) =>
        b.id === agregandoPaqueteA
          ? { ...b, reservas: [...b.reservas, { id: nuevoId, evento: nuevoPaquete.cliente, correo: nuevoPaquete.correo, telefono: nuevoPaquete.telefono, fecha: nuevoPaquete.fecha, estado: "Reservada" }] }
          : b
      ),
    }));
    bitacora(`Paquete asignado: ${nuevoPaquete.cliente} (${base.nombre})`, usuarioActual);
    mostrarToast("Paquete asignado ✓");
    setAgregandoPaqueteA(null);
    setNuevoPaquete({ cliente: "", correo: "", telefono: "", fecha: fmt(hoy) });
  };

  const desarmarPaquete = () => {
    const { baseId, reservaId, evento } = porDesarmar;
    setData((d) => ({ ...d, bases: d.bases.map((b) => (b.id === baseId ? { ...b, reservas: b.reservas.map((r) => (r.id === reservaId ? { ...r, estado: "Desarmada" } : r)) } : b)) }));
    bitacora(`Paquete desarmado por no recogerse a tiempo: ${evento}`, usuarioActual);
    mostrarToast("Paquete desarmado");
    setPorDesarmar(null);
  };

  const guardarTenemos = (base) => {
    const nuevo = parseInt(nuevoValor, 10);
    if (isNaN(nuevo) || !quien) return;
    const cambioGrande = base.tenemos > 0 && Math.abs(nuevo - base.tenemos) / base.tenemos > 0.5;
    if (cambioGrande && !confirmGrande) {
      setConfirmGrande({ base, nuevo });
      return;
    }
    const diferencia = nuevo - base.tenemos;
    setData((d) => {
      const basesConEdicion = d.bases.map((b) =>
        b.id === base.id
          ? { ...b, tenemos: nuevo, movimientos: [...(b.movimientos || []), movimientoBase("ajuste", diferencia, quien, "Ajuste manual de conteo")] }
          : b
      );
      const bases = conPanoSincronizado(basesConEdicion, base, nuevo, quien, `Sincronizado: se ajustó "${base.nombre}" en ${panoDe(base.nombre)}`);
      return { ...d, bases };
    });
    bitacora(`${base.nombre} (Tenemos) editado de ${base.tenemos} a ${nuevo}`, quien);
    mostrarToast("Cantidad actualizada ✓");
    setEditBase(null);
    setConfirmGrande(null);
    setNuevoValor("");
    setQuien("");
  };

  const confirmarRecibirPedido = () => {
    const pedido = recibiendo;
    setData((d) => {
      let bases = d.bases;
      let materiales = d.materiales;
      if (pedido.tipo === "base") {
        const baseOriginal = bases.find((b) => b.nombre === pedido.item);
        const usaVariantes = !!(pedido.color && baseOriginal && baseOriginal.variantes && baseOriginal.variantes.length > 0);
        bases = bases.map((b) => {
          if (b.nombre !== pedido.item) return b;
          const pedidoProveedor = Math.max(0, b.pedidoProveedor - pedido.cantidad);
          if (usaVariantes) {
            const existe = b.variantes.some((v) => v.color.toLowerCase() === pedido.color.toLowerCase());
            const variantes = existe
              ? b.variantes.map((v) => (v.color.toLowerCase() === pedido.color.toLowerCase() ? { ...v, tenemos: v.tenemos + pedido.cantidad } : v))
              : [...b.variantes, { id: Date.now(), color: pedido.color, tenemos: pedido.cantidad }];
            return {
              ...b,
              variantes,
              pedidoProveedor,
              movimientos: [...(b.movimientos || []), movimientoBase("entrada", pedido.cantidad, usuarioActual, `Pedido recibido de proveedor — color ${pedido.color}`, { color: pedido.color })],
            };
          }
          return {
            ...b,
            tenemos: b.tenemos + pedido.cantidad,
            pedidoProveedor,
            movimientos: [...(b.movimientos || []), movimientoBase("entrada", pedido.cantidad, usuarioActual, "Pedido recibido de proveedor")],
          };
        });
        if (!usaVariantes && baseOriginal) {
          bases = conPanoSincronizado(bases, baseOriginal, baseOriginal.tenemos + pedido.cantidad, usuarioActual, `Sincronizado: pedido recibido de "${baseOriginal.nombre}" en ${panoDe(baseOriginal.nombre)}`);
        }
      } else {
        materiales = materiales.map((m) => (m.nombre === pedido.item ? { ...m, cantidad: m.cantidad + pedido.cantidad } : m));
      }
      return { ...d, bases, materiales, pedidos: d.pedidos.map((p) => (p.id === pedido.id ? { ...p, estado: "Recibido" } : p)) };
    });
    bitacora(`Pedido recibido: ${pedido.item}${pedido.color ? ` (${pedido.color})` : ""} (+${pedido.cantidad})${fotoRecibo ? " · con foto de confirmación" : ""}`, usuarioActual);
    mostrarToast("Pedido recibido ✓");
    setRecibiendo(null);
    setFotoRecibo(null);
  };

  /* Variantes de color — solo aplica a modelos de Universidad. En cuanto
     una base tiene su primera variante, "tenemos" pasa a calcularse solo
     a partir de las variantes (ver tenemosBase); el número plano de abajo
     ya no se toca directo. */
  const confirmarNuevaVariante = () => {
    const base = gestionandoVariantesDe;
    const color = nuevaVariante.color.trim();
    const cant = parseInt(nuevaVariante.cantidad, 10) || 0;
    if (!base || !color) return;
    if ((base.variantes || []).some((v) => v.color.toLowerCase() === color.toLowerCase())) {
      mostrarToast("Ese color ya existe para este modelo");
      return;
    }
    const nuevaV = { id: Date.now(), color, tenemos: cant };
    setData((d) => ({
      ...d,
      bases: d.bases.map((b) =>
        b.id === base.id
          ? { ...b, variantes: [...(b.variantes || []), nuevaV], movimientos: [...(b.movimientos || []), movimientoBase("entrada", cant, usuarioActual, `Color agregado: ${color}`, { color })] }
          : b
      ),
    }));
    bitacora(`${base.nombre}: nuevo color "${color}" con ${cant} en existencia`, usuarioActual);
    mostrarToast("Color agregado ✓");
    setNuevaVariante({ color: "", cantidad: "" });
    // Refresca la referencia local para que la lista se vea actualizada sin cerrar el modal.
    setGestionandoVariantesDe((g) => (g ? { ...g, variantes: [...(g.variantes || []), nuevaV] } : g));
  };

  const confirmarAjusteVariante = () => {
    const { base, variante } = editandoVariante;
    const nuevo = parseInt(varianteCantEdit, 10);
    if (isNaN(nuevo) || nuevo < 0) return;
    const diferencia = nuevo - variante.tenemos;
    setData((d) => ({
      ...d,
      bases: d.bases.map((b) =>
        b.id === base.id
          ? {
              ...b,
              variantes: b.variantes.map((v) => (v.id === variante.id ? { ...v, tenemos: nuevo } : v)),
              movimientos: diferencia !== 0 ? [...(b.movimientos || []), movimientoBase("ajuste", diferencia, usuarioActual, `Ajuste de color ${variante.color}`, { color: variante.color })] : b.movimientos,
            }
          : b
      ),
    }));
    bitacora(`${base.nombre} (${variante.color}) ajustado de ${variante.tenemos} a ${nuevo}`, usuarioActual);
    mostrarToast("Cantidad actualizada ✓");
    setEditandoVariante(null);
    setVarianteCantEdit("");
  };

  const eliminarVariante = (base, variante) => {
    setData((d) => ({ ...d, bases: d.bases.map((b) => (b.id === base.id ? { ...b, variantes: b.variantes.filter((v) => v.id !== variante.id) } : b)) }));
    bitacora(`${base.nombre}: color "${variante.color}" eliminado (tenía ${variante.tenemos})`, usuarioActual);
    mostrarToast("Color eliminado");
    setGestionandoVariantesDe((g) => (g ? { ...g, variantes: g.variantes.filter((v) => v.id !== variante.id) } : g));
  };


  const confirmarSalidaBase = () => {
    const base = registrandoSalida;
    const cant = parseInt(salidaForm.cantidad, 10) || 0;
    const tieneVariantes = base && base.variantes && base.variantes.length > 0;
    const varianteElegida = tieneVariantes ? base.variantes.find((v) => v.color === salidaForm.color) : null;
    if (!base || cant < 1) return;
    if (tieneVariantes) {
      if (!varianteElegida || cant > varianteElegida.tenemos) return;
    } else if (cant > base.tenemos) {
      return;
    }

    const actualizarBase = (b) => {
      if (b.id !== base.id) return b;
      if (tieneVariantes) {
        return {
          ...b,
          variantes: b.variantes.map((v) => (v.id === varianteElegida.id ? { ...v, tenemos: v.tenemos - cant } : v)),
          movimientos: [
            ...(b.movimientos || []),
            movimientoBase(
              salidaForm.tipo === "prestamo" ? "salida-prestamo" : "salida-entrega",
              -cant,
              usuarioActual,
              `${salidaForm.nota || (salidaForm.tipo === "prestamo" ? "Préstamo a otra sucursal" : "Entrega / uso")} — color ${varianteElegida.color}`,
              { color: varianteElegida.color, ...(salidaForm.tipo === "prestamo" ? { destino: OTRA_SUCURSAL[sucursal] } : {}) }
            ),
          ],
        };
      }
      return {
        ...b,
        tenemos: b.tenemos - cant,
        movimientos: [
          ...(b.movimientos || []),
          movimientoBase(
            salidaForm.tipo === "prestamo" ? "salida-prestamo" : "salida-entrega",
            -cant,
            usuarioActual,
            salidaForm.nota || (salidaForm.tipo === "prestamo" ? "Préstamo a otra sucursal" : "Entrega / uso"),
            salidaForm.tipo === "prestamo" ? { destino: OTRA_SUCURSAL[sucursal] } : {}
          ),
        ],
      };
    };

    setData((d) => {
      const basesConSalida = d.bases.map(actualizarBase);
      if (tieneVariantes) return { ...d, bases: basesConSalida };
      const nuevoTenemos = base.tenemos - cant;
      const bases = conPanoSincronizado(basesConSalida, base, nuevoTenemos, usuarioActual, `Sincronizado: salida de "${base.nombre}" en ${panoDe(base.nombre)}`);
      return { ...d, bases };
    });

    if (salidaForm.tipo === "prestamo") {
      onIniciarTransferenciaBase(base, cant, usuarioActual, salidaForm.nota + (tieneVariantes ? ` (color ${varianteElegida.color})` : ""));
    } else {
      bitacora(`Salida de ${base.nombre}${tieneVariantes ? ` (${varianteElegida.color})` : ""}: -${cant} (entrega)${salidaForm.nota ? ` — ${salidaForm.nota}` : ""}`, usuarioActual);
      mostrarToast("Salida registrada ✓");
    }
    setRegistrandoSalida(null);
    setSalidaForm({ tipo: "entrega", cantidad: "1", nota: "", color: "" });
  };

  const confirmarAltaBase = () => {
    if (!nuevaBase.nombre || nuevaBase.tenemos === "") return;
    const nuevoId = Math.max(0, ...data.bases.map((b) => b.id)) + 1;
    const catalogoFinal = esQueretaro ? nuevaBase.catalogo : nuevaBase.catalogo === "UNICEQ" ? "General" : nuevaBase.catalogo;
    const cant = parseInt(nuevaBase.tenemos, 10) || 0;
    setData((d) => ({
      ...d,
      bases: [
        ...d.bases,
        {
          id: nuevoId,
          nombre: nuevaBase.nombre,
          catalogo: catalogoFinal,
          tenemos: cant,
          costo: parseFloat(nuevaBase.costo) || 0,
          pedidoProveedor: 0,
          reservas: [],
          movimientos: cant > 0 ? [movimientoBase("entrada", cant, usuarioActual, "Alta inicial")] : [],
          linea: nuevaBase.linea || "",
          precio: parseFloat(nuevaBase.precio) || 0,
          medidas: nuevaBase.medidas || "",
          incluye: nuevaBase.incluye || "",
        },
      ],
    }));
    bitacora(`Nueva base agregada: ${nuevaBase.nombre} (${catalogoFinal})`, usuarioActual);
    mostrarToast("Base agregada ✓");
    setModalAlta(false);
    setNuevaBase({ nombre: "", tenemos: "", catalogo: "General" });
    setOrigenNombreBase("catalogo");
    setBuscaCatalogoBase("");
    // "Panorámicas" y "Diplomas" solo muestran panos que YA tienen foto
    // cargada — una base nueva de tipo panorámica/diploma no aparecería ahí
    // hasta tener esa foto, sin importar desde qué pestaña se haya creado.
    // En vez de dejarla perdida de vista, se abre aquí mismo el editor de
    // foto de la base nueva: en cuanto se le pone la foto, aparece sola.
    if (["Universidad", "UNICEQ"].includes(catalogoFinal)) {
      setEditandoFotoDe({ id: nuevoId, nombre: nuevaBase.nombre, catalogo: catalogoFinal, imagen: null, imagenDiploma: null });
    }
  };

  const eliminarBase = () => {
    setData((d) => ({ ...d, bases: d.bases.filter((b) => b.id !== porEliminarBase.id) }));
    bitacora(`Base eliminada: ${porEliminarBase.nombre}`, usuarioActual);
    mostrarToast("Base eliminada");
    setPorEliminarBase(null);
    setEditBase(null);
  };

  /* Exporta la lista de pedidos a un archivo .xlsx real (no un csv
     disfrazado) — se puede abrir directo en Excel, Google Sheets o Numbers. */
  const exportarPedidosExcel = () => {
    const filas = data.pedidos.map((p) => ({
      Artículo: p.item,
      Cantidad: p.cantidad,
      Urgencia: p.urgencia,
      Estado: p.estado,
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja["!cols"] = [{ wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Pedidos");
    XLSX.writeFile(libro, `Pedidos_Photograf_${fmt(hoy)}.xlsx`);
    mostrarToast("Excel descargado ✓");
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <SectionHeader title="Almacén" />
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 16px 0" }}>
        <FilterPill label="Bases" active={tab === "bases"} onClick={() => setTab("bases")} color={C.secondary} />
        <FilterPill label="Panorámicas" active={tab === "panoramicas"} onClick={() => setTab("panoramicas")} color={C.primary} />
        <FilterPill label="Diplomas" active={tab === "diplomas"} onClick={() => setTab("diplomas")} color={C.accent1} />
        <FilterPill label="Pedidos a proveedor" active={tab === "pedidos"} onClick={() => setTab("pedidos")} color={C.secondary} />
        {gruposAlmacen.map((g) => (
          <FilterPill key={g.id} label={g.nombre} active={tab === `custom:${g.id}`} onClick={() => setTab(`custom:${g.id}`)} color={g.color || C.secondary} />
        ))}
        <button
          onClick={() => { setNombreGrupoAlmacenNuevo(""); setColorGrupoAlmacenNuevo(C.secondary); setAgregandoGrupoAlmacen(true); }}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, border: `1.5px dashed ${C.border}`, borderRadius: 20, padding: "8px 14px", background: "none", color: C.muted, fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          <Plus size={14} /> Nueva pestaña
        </button>
      </div>

      {tab.startsWith("custom:") && (
        <GrupoPersonalizadoScreen
          grupo={gruposAlmacen.find((g) => `custom:${g.id}` === tab)}
          setData={setData}
          bitacora={bitacora}
          usuarioActual={usuarioActual}
          mostrarToast={mostrarToast}
          campo="gruposAlmacen"
          onEliminarGrupo={() => {
            const grupo = gruposAlmacen.find((g) => `custom:${g.id}` === tab);
            setData((d) => ({ ...d, gruposAlmacen: (d.gruposAlmacen || []).filter((g) => `custom:${g.id}` !== tab) }));
            if (grupo) bitacora(`Pestaña personalizada de Almacén borrada: ${grupo.nombre}`, usuarioActual);
            mostrarToast("Pestaña borrada");
            setTab("bases");
          }}
        />
      )}

      {agregandoGrupoAlmacen && (
        <Modal title="Nueva pestaña" onClose={() => setAgregandoGrupoAlmacen(false)}>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 4 }}>
            Crea tu propia pestaña de Almacén para lo que no encaje en Bases, Panorámicas, Diplomas o Pedidos a proveedor — se guarda como una lista simple de artículo, cantidad y costo.
          </div>
          <FieldLabel>Nombre de la pestaña</FieldLabel>
          <TextInput value={nombreGrupoAlmacenNuevo} onChange={(e) => setNombreGrupoAlmacenNuevo(e.target.value)} placeholder="Ej. Accesorios" />
          <FieldLabel>Color</FieldLabel>
          <div style={{ display: "flex", gap: 8 }}>
            {COLORES_GRUPO_ALMACEN.map((col) => (
              <button
                key={col}
                onClick={() => setColorGrupoAlmacenNuevo(col)}
                style={{ width: 30, height: 30, borderRadius: 15, background: col, border: colorGrupoAlmacenNuevo === col ? `3px solid ${C.foreground}` : `1px solid ${C.border}`, cursor: "pointer" }}
              />
            ))}
          </div>
          <PrimaryButton onClick={crearGrupoAlmacen} disabled={!nombreGrupoAlmacenNuevo.trim()}>Crear pestaña</PrimaryButton>
        </Modal>
      )}

      {(tab === "panoramicas" || tab === "diplomas") && (
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
            {tab === "panoramicas"
              ? "Todas las bases (panos) que tenemos en esta sucursal — no es por catálogo, es la existencia real, sumando Universidad y UNICEQ del mismo diseño. Toca una para ver el desglose."
              : "Todos los diplomas que tenemos en esta sucursal (convencional, individual y agradecimiento son la misma pieza) — la existencia real, sumando Universidad y UNICEQ del mismo diseño. Toca uno para ver el desglose."}
          </div>
          {(tab === "panoramicas" ? gruposPanos : gruposPanos.filter((g) => g.imagenDiploma)).map((g) => (
            <div
              key={g.pano}
              onClick={() => setPanoAmpliado(g)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: SOMBRA_TARJETA, display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}
            >
              {(tab === "panoramicas" ? g.imagen : g.imagenDiploma) && (
                <img src={tab === "panoramicas" ? g.imagen : g.imagenDiploma} alt={g.pano} loading="lazy" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{g.pano}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  {[...g.catalogos].map((c) => (
                    <span key={c} style={{ fontSize: 10, fontWeight: 700, color: textoContraste(c === "UNICEQ" ? C.accent1 : C.secondary), background: c === "UNICEQ" ? C.accent1 : C.secondary, borderRadius: 6, padding: "2px 6px" }}>{c}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{g.tenemos}</div>
                <div style={{ fontSize: 11, color: C.muted }}>Tenemos</div>
              </div>
            </div>
          ))}
          {tab === "panoramicas" && gruposPanos.length === 0 && <EmptyState text="Todavía no hay panos de Universidad o UNICEQ cargados en esta sucursal." />}
          {tab === "diplomas" && gruposPanos.filter((g) => g.imagenDiploma).length === 0 && <EmptyState text="Todavía no hay diplomas con foto cargada en esta sucursal." />}
          {tab === "diplomas" && gruposPanos.some((g) => !g.imagenDiploma) && (
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>
              Un pano solo aparece aquí cuando ya tiene foto de diploma. Para agregársela: en Bases, abre ese pano y toca "Cambiar foto".
            </div>
          )}
        </div>
      )}
      {(tab === "panoramicas" || tab === "diplomas") && (
        <FAB
          color={C.secondary}
          onClick={() => {
            setNuevaBase({ nombre: "", tenemos: "", catalogo: "Universidad" });
            setOrigenNombreBase("catalogo");
            setBuscaCatalogoBase("");
            setCatalogoTabAlta("Universidad");
            setModalAlta(true);
          }}
        />
      )}

      {tab === "bases" && (
        <>
          {sobreReservado.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {sobreReservado.map((b) => (
                <OverbookingAlert
                  key={b.id}
                  text={`${b.nombre}: ${choquesDePano(data.bases, b).map((c) => `el ${c.fecha} piden ${c.cant}, solo hay ${tenemosBase(b)}`).join(" · ")}`}
                />
              ))}
            </div>
          )}
          <div style={{ padding: "8px 16px 0" }}>
            {basesFiltradas.map((b) => {
              const reservadas = b.reservas.filter((r) => r.estado === "Reservada").length;
              const sobre = reservadas > b.tenemos;
              return (
                <div key={b.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14, boxShadow: SOMBRA_TARJETA }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    {b.imagen && (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <img
                          src={b.imagen}
                          alt={b.nombre}
                          loading="lazy"
                          onClick={() => setImagenAmpliada(b.imagen)}
                          style={{ width: b.imagenDiploma ? 54 : 64, height: 64, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, cursor: "pointer" }}
                        />
                        {b.imagenDiploma && (
                          <img
                            src={b.imagenDiploma}
                            alt={`${b.nombre} diploma`}
                            loading="lazy"
                            onClick={() => setImagenAmpliada(b.imagenDiploma)}
                            style={{ width: 54, height: 64, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, cursor: "pointer" }}
                          />
                        )}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{b.nombre}</div>
                      {esQueretaro && b.catalogo === "UNICEQ" && <span style={{ fontSize: 10, fontWeight: 700, color: textoContraste(C.accent1), background: C.accent1, borderRadius: 6, padding: "2px 6px" }}>{b.linea || "UNICEQ"}</span>}
                      {b.catalogo === "Universidad" && <span style={{ fontSize: 10, fontWeight: 700, color: textoContraste(C.secondary), background: C.secondary, borderRadius: 6, padding: "2px 6px" }}>{b.linea || "Universidad"}</span>}
                      {!!b.precio && <span style={{ fontSize: 13, fontWeight: 700, color: C.success }}>{fmtMoneda(b.precio)}</span>}
                    </div>
                    {(!b.variantes || b.variantes.length === 0) && (
                      <button onClick={() => { setEditBase(b.id); setNuevoValor(String(b.tenemos)); setQuien(usuarioActual); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
                        <Pencil size={16} />
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.muted, fontFamily: "monospace", marginBottom: 8 }}>{codigoArticulo("BASE", sucursal, b.id)}</div>
                  {(b.medidas || b.incluye) && (
                    <details style={{ marginBottom: 10 }}>
                      <summary style={{ fontSize: 11.5, color: C.primary, cursor: "pointer", fontWeight: 600 }}>
                        {b.medidas || "Ver qué incluye"}
                      </summary>
                      {b.incluye && <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>{b.incluye}</div>}
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>{INCLUYE_SIEMPRE[b.catalogo] || ""}</div>
                    </details>
                  )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{tenemosBase(b)}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Tenemos</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: sobre ? C.error : C.primary }}>{reservadas}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Se van a ocupar</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{b.pedidoProveedor}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Pedido</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => { setRegistrandoSalida(b); setSalidaForm({ tipo: "entrega", cantidad: "1", nota: "", color: b.variantes?.[0]?.color || "" }); }}
                      disabled={tenemosBase(b) < 1}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, color: tenemosBase(b) < 1 ? C.muted : C.foreground, cursor: tenemosBase(b) < 1 ? "not-allowed" : "pointer", opacity: tenemosBase(b) < 1 ? 0.5 : 1 }}
                    >
                      <ArrowUpRight size={13} /> Salida
                    </button>
                    <button
                      onClick={() => setVerMovimientosDe(b)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, color: C.foreground, cursor: "pointer" }}
                    >
                      <History size={13} /> Movimientos
                    </button>
                    <button
                      onClick={() => setEditandoFotoDe(b)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, color: C.foreground, cursor: "pointer" }}
                    >
                      <CameraIcon size={13} /> {b.imagen ? "Cambiar foto" : "Foto"}
                    </button>
                  </div>
                  {b.catalogo === "UNICEQ" && (
                    <button
                      onClick={() => setGestionandoVariantesDe(b)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px dashed ${C.accent1}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, color: C.accent1, cursor: "pointer", marginTop: 8 }}
                    >
                      <Palette size={13} />
                      {(b.variantes || []).length > 0 ? `Variantes de color (${b.variantes.length})` : "Agregar variantes de color"}
                    </button>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>Paquetes de clientes</div>
                      <button
                        onClick={() => { setAgregandoPaqueteA(b.id); setNuevoPaquete({ cliente: "", correo: "", telefono: "", fecha: fmt(hoy) }); }}
                        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.primary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Plus size={14} /> Asignar paquete
                      </button>
                    </div>
                    {b.reservas.filter((r) => r.estado !== "Desarmada").map((r) => {
                      const tol = estadoTolerancia(r);
                      return (
                        <div key={r.id} style={{ padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontSize: 13, color: C.foreground, fontWeight: 600 }}>{r.evento}</div>
                              <div style={{ fontSize: 11, color: C.muted }}>{r.fecha}{r.correo ? ` · ${r.correo}` : ""}{r.telefono ? ` · ${r.telefono}` : ""}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Badge estado={tol?.nivel === "vencido" ? "Vencido" : r.estado} />
                              {r.estado === "Reservada" && (
                                <button onClick={() => marcarEntregada(b.id, r.id, r.evento)} style={{ fontSize: 11, background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: C.foreground }}>
                                  Marcar entregada
                                </button>
                              )}
                            </div>
                          </div>
                          {tol && tol.nivel !== "normal" && (
                            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center", background: tol.nivel === "vencido" ? `${C.error}18` : `${C.warning}18`, borderRadius: 8, padding: "6px 10px" }}>
                              <div style={{ fontSize: 11, color: tol.nivel === "vencido" ? C.error : C.warning, display: "flex", alignItems: "center", gap: 6 }}>
                                <AlertTriangle size={12} />
                                {tol.nivel === "vencido"
                                  ? `Vencido hace ${tol.dias - TOLERANCIA_DIAS} día(s) — pasó la tolerancia de 3 meses`
                                  : `Quedan ${TOLERANCIA_DIAS - tol.dias} día(s) antes de que se desarme`}
                              </div>
                              {tol.nivel === "vencido" && (
                                <button onClick={() => setPorDesarmar({ baseId: b.id, reservaId: r.id, evento: r.evento })} style={{ fontSize: 11, background: C.error, color: textoContraste(C.error), border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                                  Desarmar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {b.reservas.filter((r) => r.estado !== "Desarmada").length === 0 && (
                      <div style={{ fontSize: 12, color: C.muted, padding: "8px 0" }}>Sin paquetes asignados todavía.</div>
                    )}
                  </div>
                </div>
              );
            })}
            {basesFiltradas.length === 0 && (
              <EmptyState text={"Todavía no hay bases registradas en esta sucursal. Agrega una con el botón + de aquí abajo, o pídele al administrador que use \"Cargar catálogo 2026\" en Editar inventario → Bases."} />
            )}
          </div>
          <FAB
            color={C.secondary}
            onClick={() => {
              setNuevaBase({ nombre: "", tenemos: "", catalogo: "General" });
              setOrigenNombreBase("catalogo");
              setBuscaCatalogoBase("");
              setCatalogoTabAlta("General");
              setModalAlta(true);
            }}
          />
        </>
      )}

      {editandoFotoDe && (
        <Modal title={`Foto: ${editandoFotoDe.nombre}`} onClose={() => setEditandoFotoDe(null)}>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 4 }}>
            Toma la foto real de este paquete tal como lo tienen en la sucursal — sirve para reconocerlo rápido en la lista.
          </div>
          <PhotoInput
            value={editandoFotoDe.imagen}
            onChange={(v) => {
              setData((d) => ({ ...d, bases: d.bases.map((b) => (b.id === editandoFotoDe.id ? { ...b, imagen: v } : b)) }));
              setEditandoFotoDe((prev) => (prev ? { ...prev, imagen: v } : prev));
            }}
            label="Foto Panorámica"
          />
          {editandoFotoDe.imagen && (
            <button
              onClick={() => {
                setData((d) => ({ ...d, bases: d.bases.map((b) => (b.id === editandoFotoDe.id ? { ...b, imagen: null } : b)) }));
                setEditandoFotoDe((prev) => (prev ? { ...prev, imagen: null } : prev));
                mostrarToast("Foto quitada");
              }}
              style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 10, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Trash2 size={14} /> Quitar foto panorámica
            </button>
          )}

          {["Universidad", "UNICEQ"].includes(editandoFotoDe.catalogo) && (
            <>
              <div style={{ height: 14, borderTop: `1px solid ${C.border}`, marginTop: 6 }} />
              <div style={{ fontSize: 11.5, color: C.muted, margin: "6px 0" }}>
                Con esta foto, este pano también aparece en el apartado "Diplomas" de Almacén.
              </div>
              <PhotoInput
                value={editandoFotoDe.imagenDiploma}
                onChange={(v) => {
                  setData((d) => ({ ...d, bases: d.bases.map((b) => (b.id === editandoFotoDe.id ? { ...b, imagenDiploma: v } : b)) }));
                  setEditandoFotoDe((prev) => (prev ? { ...prev, imagenDiploma: v } : prev));
                }}
                label="Foto Diploma (convencional / individual / agradecimiento)"
              />
              {editandoFotoDe.imagenDiploma && (
                <button
                  onClick={() => {
                    setData((d) => ({ ...d, bases: d.bases.map((b) => (b.id === editandoFotoDe.id ? { ...b, imagenDiploma: null } : b)) }));
                    setEditandoFotoDe((prev) => (prev ? { ...prev, imagenDiploma: null } : prev));
                    mostrarToast("Foto quitada");
                  }}
                  style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Trash2 size={14} /> Quitar foto de diploma
                </button>
              )}
            </>
          )}
          <PrimaryButton onClick={() => setEditandoFotoDe(null)}>Listo</PrimaryButton>
        </Modal>
      )}

      {tab === "pedidos" && (
        <div style={{ padding: "16px 16px 90px" }}>
          <button
            onClick={() => { setPedidoForm({ item: "", cantidad: "1", urgencia: "Normal", tipo: "material", color: "" }); setModalPedido(true); }}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: C.secondary, color: textoContraste(C.secondary), border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}
          >
            <Plus size={16} /> Pedir algo al proveedor
          </button>
          {data.pedidos.length > 0 && (
            <button
              onClick={exportarPedidosExcel}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: C.success, color: textoContraste(C.success), border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}
            >
              <Share2 size={16} /> Exportar a Excel
            </button>
          )}
          {data.pedidos.length === 0 && <EmptyState icon={Truck} text="No hay pedidos. Cuando algo se esté acabando, pídelo desde aquí." />}
          {data.pedidos.map((p) => (
            <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: SOMBRA_TARJETA }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{p.item}</div>
                  <div style={{ fontSize: 13, color: C.muted, margin: "2px 0 6px" }}>Cantidad: {p.cantidad}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ display: "inline-block", background: p.urgencia === "Urgente" ? C.error : C.success, color: textoContraste(p.urgencia === "Urgente" ? C.error : C.success), fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8 }}>{p.urgencia}</span>
                    <Badge estado={p.estado} />
                  </div>
                </div>
                {/* Solo se puede marcar como recibido lo que el
                    administrador ya autorizó (o los pedidos viejos, que
                    quedaron como "Pendiente" antes de que existiera este
                    paso). Lo rechazado ya no se puede recibir. */}
                {(p.estado === "Pendiente" || p.estado === "Aprobado") && (
                  <button onClick={() => setRecibiendo(p)} style={{ display: "flex", alignItems: "center", gap: 4, background: C.success, color: textoContraste(C.success), border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <Truck size={14} /> Recibido
                  </button>
                )}
                {p.estado === "Por aprobar" && (
                  <div style={{ fontSize: 11, color: C.warning, fontWeight: 600, maxWidth: 110, textAlign: "right" }}>Esperando autorización</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {imagenAmpliada && (
        <div onClick={() => setImagenAmpliada(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={imagenAmpliada} alt="Paquete" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 10 }} />
        </div>
      )}

      {panoAmpliado && (
        <Modal title={panoAmpliado.pano} onClose={() => setPanoAmpliado(null)}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>
            Es el mismo diseño de pano, vendido por separado en cada catálogo con su propio nombre y precio. La existencia es una sola: se descuenta igual sin importar en cuál registres la salida (a menos que alguna se maneje por variantes de color, esa se cuenta aparte).
          </div>
          {panoAmpliado.entradas.map((b) => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.foreground }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: textoContraste(b.catalogo === "UNICEQ" ? C.accent1 : C.secondary), background: b.catalogo === "UNICEQ" ? C.accent1 : C.secondary, borderRadius: 6, padding: "2px 6px", marginRight: 6 }}>
                    {b.catalogo}{b.linea ? ` · ${b.linea}` : ""}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{b.nombre}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>{tenemosBase(b)}</div>
                {!!b.precio && <div style={{ fontSize: 12, color: C.success }}>{fmtMoneda(b.precio)}</div>}
              </div>
            </div>
          ))}
        </Modal>
      )}

      {registrandoSalida && (
        <Modal title={`Salida: ${registrandoSalida.nombre}`} onClose={() => setRegistrandoSalida(null)}>
          {registrandoSalida.variantes && registrandoSalida.variantes.length > 0 ? (
            <>
              <div style={{ fontSize: 12.5, color: C.muted }}>Este modelo se maneja por color. Elige de cuál color sale.</div>
              <FieldLabel>Color</FieldLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {registrandoSalida.variantes.map((v) => (
                  <FilterPill key={v.id} label={`${v.color} (${v.tenemos})`} active={salidaForm.color === v.color} onClick={() => setSalidaForm({ ...salidaForm, color: v.color })} />
                ))}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: C.muted }}>Hay {registrandoSalida.tenemos} en existencia. Una entrega resta y ya; un préstamo resta aquí y crea una transferencia pendiente hasta que {NOMBRES_SUCURSAL[OTRA_SUCURSAL[sucursal]]} confirme que la recibió.</div>
          )}
          <FieldLabel>Tipo de salida</FieldLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <FilterPill label="Entrega / uso" active={salidaForm.tipo === "entrega"} onClick={() => setSalidaForm({ ...salidaForm, tipo: "entrega" })} />
            <FilterPill label={`Préstamo a ${NOMBRES_SUCURSAL[OTRA_SUCURSAL[sucursal]].replace("Photograf ", "")}`} active={salidaForm.tipo === "prestamo"} onClick={() => setSalidaForm({ ...salidaForm, tipo: "prestamo" })} color={C.secondary} />
          </div>
          <FieldLabel>Cantidad</FieldLabel>
          <TextInput type="number" value={salidaForm.cantidad} onChange={(e) => setSalidaForm({ ...salidaForm, cantidad: e.target.value })} />
          <FieldLabel>Nota (opcional)</FieldLabel>
          <TextInput value={salidaForm.nota} onChange={(e) => setSalidaForm({ ...salidaForm, nota: e.target.value })} placeholder={salidaForm.tipo === "prestamo" ? "Ej. para cubrir generación de..." : "Ej. entregado a cliente X"} />
          <PrimaryButton
            onClick={confirmarSalidaBase}
            disabled={
              !salidaForm.cantidad ||
              parseInt(salidaForm.cantidad, 10) < 1 ||
              (registrandoSalida.variantes && registrandoSalida.variantes.length > 0
                ? !salidaForm.color || parseInt(salidaForm.cantidad, 10) > (registrandoSalida.variantes.find((v) => v.color === salidaForm.color)?.tenemos || 0)
                : parseInt(salidaForm.cantidad, 10) > registrandoSalida.tenemos)
            }
            color={salidaForm.tipo === "prestamo" ? C.secondary : C.primary}
          >
            {salidaForm.tipo === "prestamo" ? "Enviar como préstamo" : "Registrar salida"}
          </PrimaryButton>
        </Modal>
      )}

      {gestionandoVariantesDe && (
        <Modal title={`Colores: ${gestionandoVariantesDe.nombre}`} onClose={() => setGestionandoVariantesDe(null)}>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>
            En cuanto agregas el primer color, la existencia de este modelo se lleva por color — el número general deja de editarse directo.
          </div>
          {(gestionandoVariantesDe.variantes || []).length === 0 && (
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Todavía no tiene colores capturados.</div>
          )}
          {(gestionandoVariantesDe.variantes || []).map((v) => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, color: C.foreground, fontWeight: 600 }}>{v.color}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>{v.tenemos}</span>
                <button
                  onClick={() => { setEditandoVariante({ base: gestionandoVariantesDe, variante: v }); setVarianteCantEdit(String(v.tenemos)); }}
                  style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}
                >
                  <Pencil size={15} />
                </button>
                <button onClick={() => eliminarVariante(gestionandoVariantesDe, v)} style={{ background: "none", border: "none", color: C.error, cursor: "pointer" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px dashed ${C.border}` }}>
            <FieldLabel>Agregar color</FieldLabel>
            <TextInput value={nuevaVariante.color} onChange={(e) => setNuevaVariante({ ...nuevaVariante, color: e.target.value })} placeholder="Ej. Vino, Negro, Nogal Claro..." />
            <FieldLabel>Cantidad inicial</FieldLabel>
            <TextInput type="number" value={nuevaVariante.cantidad} onChange={(e) => setNuevaVariante({ ...nuevaVariante, cantidad: e.target.value })} placeholder="0" />
            <PrimaryButton onClick={confirmarNuevaVariante} color={C.accent1} disabled={!nuevaVariante.color.trim()}>Agregar color</PrimaryButton>
          </div>
        </Modal>
      )}

      {editandoVariante && (
        <Modal title={`Ajustar: ${editandoVariante.variante.color}`} onClose={() => setEditandoVariante(null)}>
          <div style={{ fontSize: 12.5, color: C.muted }}>{editandoVariante.base.nombre} — actualmente hay {editandoVariante.variante.tenemos}.</div>
          <FieldLabel>Nueva cantidad</FieldLabel>
          <TextInput type="number" value={varianteCantEdit} onChange={(e) => setVarianteCantEdit(e.target.value)} />
          <PrimaryButton onClick={confirmarAjusteVariante} disabled={varianteCantEdit === "" || parseInt(varianteCantEdit, 10) < 0}>Guardar</PrimaryButton>
        </Modal>
      )}

      {verMovimientosDe && (
        <Modal title={`Movimientos: ${verMovimientosDe.nombre}`} onClose={() => setVerMovimientosDe(null)}>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>
            Cantidad actual: <strong style={{ color: C.foreground }}>{verMovimientosDe.tenemos}</strong> — código {codigoArticulo("BASE", sucursal, verMovimientosDe.id)}
          </div>
          {(!verMovimientosDe.movimientos || verMovimientosDe.movimientos.length === 0) && (
            <div style={{ fontSize: 13, color: C.muted }}>Todavía no hay movimientos registrados para esta base.</div>
          )}
          {[...(verMovimientosDe.movimientos || [])].reverse().map((m) => {
            const info = {
              entrada: { label: "Entrada", color: C.success },
              "salida-entrega": { label: "Salida (entrega)", color: C.warning },
              "salida-prestamo": { label: "Salida (préstamo)", color: C.secondary },
              ajuste: { label: "Ajuste", color: C.muted },
            }[m.tipo] || { label: m.tipo, color: C.muted };
            return (
              <div key={m.id} style={{ padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: info.color }}>{info.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: m.cantidad >= 0 ? C.success : C.error }}>{m.cantidad >= 0 ? `+${m.cantidad}` : m.cantidad}</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                  {m.fecha}{m.quien ? ` · ${m.quien}` : ""}{m.destino ? ` · a ${NOMBRES_SUCURSAL[m.destino].replace("Photograf ", "")}` : ""}
                </div>
                {m.nota && <div style={{ fontSize: 12, color: C.foreground, marginTop: 2 }}>{m.nota}</div>}
              </div>
            );
          })}
        </Modal>
      )}

      {editBase !== null && !confirmGrande && (
        <Modal title="Editar Tenemos" onClose={() => setEditBase(null)}>
          <FieldLabel>Nueva cantidad</FieldLabel>
          <TextInput type="number" value={nuevoValor} onChange={(e) => setNuevoValor(e.target.value)} />
          <FieldLabel>Tu nombre</FieldLabel>
          <TextInput value={quien} onChange={(e) => setQuien(e.target.value)} placeholder="Quién edita" />
          <PrimaryButton onClick={() => guardarTenemos(data.bases.find((b) => b.id === editBase))} disabled={!quien}>Guardar</PrimaryButton>
          <button
            onClick={() => setPorEliminarBase(data.bases.find((b) => b.id === editBase))}
            style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Trash2 size={14} /> Eliminar esta base
          </button>
        </Modal>
      )}

      {porEliminarBase && (
        <Modal title="Eliminar base" onClose={() => setPorEliminarBase(null)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>
            ¿Eliminar "{porEliminarBase.nombre}" del catálogo? {porEliminarBase.reservas.filter((r) => r.estado === "Reservada").length > 0 ? "Tiene reservas activas — revísalas antes de eliminarla." : "Esto no se puede deshacer."}
          </div>
          <PrimaryButton onClick={eliminarBase} color={C.error}>Sí, eliminar</PrimaryButton>
        </Modal>
      )}

      {agregandoPaqueteA !== null && (
        <Modal title="Asignar paquete a cliente" onClose={() => setAgregandoPaqueteA(null)}>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 8 }}>
            Tiene {TOLERANCIA_DIAS} días (3 meses) desde la fecha de entrega para recogerlo antes de que se desarme.
          </div>
          <FieldLabel>Nombre del cliente</FieldLabel>
          <TextInput value={nuevoPaquete.cliente} onChange={(e) => setNuevoPaquete({ ...nuevoPaquete, cliente: e.target.value })} placeholder="Ej. Andrea Martínez" />
          <FieldLabel>Correo (opcional)</FieldLabel>
          <TextInput value={nuevoPaquete.correo} onChange={(e) => setNuevoPaquete({ ...nuevoPaquete, correo: e.target.value })} placeholder="correo@ejemplo.com" />
          <FieldLabel>Teléfono (opcional)</FieldLabel>
          <TextInput value={nuevoPaquete.telefono} onChange={(e) => setNuevoPaquete({ ...nuevoPaquete, telefono: e.target.value })} placeholder="442 123 4567" />
          <FieldLabel>Fecha de entrega del paquete escolar</FieldLabel>
          <TextInput type="date" value={nuevoPaquete.fecha} onChange={(e) => setNuevoPaquete({ ...nuevoPaquete, fecha: e.target.value })} />
          <PrimaryButton onClick={agregarPaquete} color={C.secondary} disabled={!nuevoPaquete.cliente || !nuevoPaquete.fecha}>Asignar paquete</PrimaryButton>
        </Modal>
      )}

      {porDesarmar && (
        <Modal title="Desarmar paquete" onClose={() => setPorDesarmar(null)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>
            El paquete de "{porDesarmar.evento}" pasó los {TOLERANCIA_DIAS} días de tolerancia sin que lo recogieran. ¿Desarmarlo? Esto no se puede deshacer.
          </div>
          <PrimaryButton onClick={desarmarPaquete} color={C.error}>Sí, desarmar</PrimaryButton>
        </Modal>
      )}

      {confirmGrande && (
        <Modal title="Confirmar cambio grande" onClose={() => setConfirmGrande(null)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>Vas a cambiar {confirmGrande.base.nombre} de {confirmGrande.base.tenemos} a {confirmGrande.nuevo}. ¿Confirmas?</div>
          <PrimaryButton
            onClick={() => {
              const diferencia = confirmGrande.nuevo - confirmGrande.base.tenemos;
              setData((d) => ({
                ...d,
                bases: d.bases.map((b) =>
                  b.id === confirmGrande.base.id
                    ? { ...b, tenemos: confirmGrande.nuevo, movimientos: [...(b.movimientos || []), movimientoBase("ajuste", diferencia, quien, "Ajuste manual de conteo (cambio grande)")] }
                    : b
                ),
              }));
              bitacora(`${confirmGrande.base.nombre} (Tenemos) editado de ${confirmGrande.base.tenemos} a ${confirmGrande.nuevo}`, quien);
              setEditBase(null);
              setConfirmGrande(null);
              setNuevoValor("");
              setQuien("");
            }}
            color={C.error}
          >
            Sí, confirmar
          </PrimaryButton>
        </Modal>
      )}

      {modalAlta && (
        <Modal title="Nueva base" onClose={() => setModalAlta(false)}>
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <FilterPill label="Elegir del catálogo" active={origenNombreBase === "catalogo"} onClick={() => setOrigenNombreBase("catalogo")} />
            <FilterPill label="Escribir a mano" active={origenNombreBase === "manual"} onClick={() => { setOrigenNombreBase("manual"); setNuevaBase({ nombre: "", tenemos: nuevaBase.tenemos, costo: nuevaBase.costo, catalogo: "General" }); }} />
          </div>

          {origenNombreBase === "catalogo" ? (
            <>
              <div style={{ fontSize: 12.5, color: C.muted, margin: "6px 0 10px" }}>
                Elige el paquete exacto: se llenan solos el precio, las medidas y qué incluye. Tú solo capturas cuántos tienes.
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, overflowX: "auto" }}>
                <FilterPill label="General" active={catalogoTabAlta === "General"} onClick={() => setCatalogoTabAlta("General")} />
                <FilterPill label="Universidad" active={catalogoTabAlta === "Universidad"} onClick={() => setCatalogoTabAlta("Universidad")} color={C.secondary} />
                {esQueretaro && <FilterPill label="UNICEQ" active={catalogoTabAlta === "UNICEQ"} onClick={() => setCatalogoTabAlta("UNICEQ")} color={C.accent1} />}
              </div>
              <TextInput value={buscaCatalogoBase} onChange={(e) => setBuscaCatalogoBase(e.target.value)} placeholder="Buscar paquete por nombre..." />
              <div style={{ maxHeight: 320, overflowY: "auto", marginTop: 10, marginBottom: 4, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                {CATALOGO_2026.filter((p) => p.catalogo === catalogoTabAlta)
                  .filter((p) => p.nombre.toLowerCase().includes(buscaCatalogoBase.toLowerCase()))
                  .map((p) => (
                    <button
                      key={p.nombre}
                      onClick={() =>
                        setNuevaBase({
                          nombre: p.nombre,
                          tenemos: nuevaBase.tenemos,
                          costo: nuevaBase.costo,
                          catalogo: p.catalogo,
                          linea: p.linea || "",
                          precio: p.precio,
                          medidas: p.medidas || "",
                          incluye: p.incluye || "",
                        })
                      }
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        background: nuevaBase.nombre === p.nombre ? `${C.secondary}18` : "none",
                        border: "none",
                        borderBottom: `1px solid ${C.border}`,
                        padding: "10px 12px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.foreground }}>{p.nombre}</div>
                      <div style={{ fontSize: 11.5, color: C.muted }}>{p.linea ? `${p.linea} · ` : ""}{fmtMoneda(p.precio)}{p.medidas ? ` · ${p.medidas}` : ""}</div>
                    </button>
                  ))}
                {CATALOGO_2026.filter((p) => p.catalogo === catalogoTabAlta).filter((p) => p.nombre.toLowerCase().includes(buscaCatalogoBase.toLowerCase())).length === 0 && (
                  <div style={{ padding: 14, fontSize: 13, color: C.muted, textAlign: "center" }}>Nada coincide con esa búsqueda.</div>
                )}
              </div>
              {nuevaBase.nombre && origenNombreBase === "catalogo" && (
                <div style={{ fontSize: 12.5, color: C.secondary, fontWeight: 600, marginBottom: 6 }}>Elegiste: {nuevaBase.nombre}</div>
              )}
            </>
          ) : (
            <>
              <FieldLabel>Nombre del paquete</FieldLabel>
              <TextInput value={nuevaBase.nombre} onChange={(e) => setNuevaBase({ ...nuevaBase, nombre: e.target.value })} placeholder="Ej. Base Sur" />
              <FieldLabel>Tipo</FieldLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FilterPill label="General" active={nuevaBase.catalogo === "General"} onClick={() => setNuevaBase({ ...nuevaBase, catalogo: "General" })} />
                <FilterPill
                  label="Panorámica y diploma"
                  active={["Universidad", "UNICEQ"].includes(nuevaBase.catalogo)}
                  onClick={() => setNuevaBase({ ...nuevaBase, catalogo: "Universidad" })}
                  color={C.secondary}
                />
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                {["Universidad", "UNICEQ"].includes(nuevaBase.catalogo)
                  ? "Al guardar se abre para ponerle la foto de la panorámica y/o el diploma — así aparece en esas pestañas."
                  : "Para lo que no lleva panorámica ni diploma (por ejemplo, paquetes escolares)."}
              </div>
              {esQueretaro && ["Universidad", "UNICEQ"].includes(nuevaBase.catalogo) && (
                <>
                  <FieldLabel>Proveedor</FieldLabel>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <FilterPill label="Universidad" active={nuevaBase.catalogo === "Universidad"} onClick={() => setNuevaBase({ ...nuevaBase, catalogo: "Universidad" })} color={C.secondary} />
                    <FilterPill label="UNICEQ" active={nuevaBase.catalogo === "UNICEQ"} onClick={() => setNuevaBase({ ...nuevaBase, catalogo: "UNICEQ" })} color={C.accent1} />
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Solo para saber de qué proveedor viene — no afecta el conteo. UNICEQ solo aplica en Querétaro.</div>
                </>
              )}
            </>
          )}

          <FieldLabel>Cuántas tenemos</FieldLabel>
          <TextInput type="number" value={nuevaBase.tenemos} onChange={(e) => setNuevaBase({ ...nuevaBase, tenemos: e.target.value })} placeholder="0" />
          <FieldLabel>Costo unitario (opcional)</FieldLabel>
          <TextInput type="number" value={nuevaBase.costo || ""} onChange={(e) => setNuevaBase({ ...nuevaBase, costo: e.target.value })} placeholder="$0" />
          <PrimaryButton onClick={confirmarAltaBase} color={C.secondary} disabled={!nuevaBase.nombre || nuevaBase.tenemos === ""}>Agregar base</PrimaryButton>
        </Modal>
      )}

      {modalPedido && (
        <Modal title="Pedir al proveedor" onClose={() => setModalPedido(false)}>
          <div style={{ fontSize: 12.5, color: C.muted }}>
            El pedido pasa primero con el administrador. En cuanto lo autorice, podrás marcarlo como recibido aquí mismo.
          </div>
          <FieldLabel>¿Qué se pide?</FieldLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <FilterPill label="Material" active={pedidoForm.tipo === "material"} onClick={() => setPedidoForm({ ...pedidoForm, tipo: "material", item: "" })} color={C.accent1} />
            <FilterPill label="Base" active={pedidoForm.tipo === "base"} onClick={() => setPedidoForm({ ...pedidoForm, tipo: "base", item: "" })} color={C.secondary} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 150, overflowY: "auto", marginBottom: 8 }}>
            {(pedidoForm.tipo === "material" ? data.materiales : basesVisibles).map((x) => (
              <FilterPill key={x.id} label={x.nombre} active={pedidoForm.item === x.nombre} onClick={() => setPedidoForm({ ...pedidoForm, item: x.nombre })} />
            ))}
          </div>
          <TextInput value={pedidoForm.item} onChange={(e) => setPedidoForm({ ...pedidoForm, item: e.target.value })} placeholder="O escribe otra cosa que haga falta" />
          {(() => {
            const baseElegida = pedidoForm.tipo === "base" ? basesVisibles.find((x) => x.nombre === pedidoForm.item) : null;
            if (!baseElegida || !baseElegida.variantes || baseElegida.variantes.length === 0) return null;
            return (
              <>
                <FieldLabel>¿De qué color?</FieldLabel>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                  {baseElegida.variantes.map((v) => (
                    <FilterPill key={v.id} label={v.color} active={pedidoForm.color === v.color} onClick={() => setPedidoForm({ ...pedidoForm, color: v.color })} />
                  ))}
                </div>
                <TextInput value={pedidoForm.color} onChange={(e) => setPedidoForm({ ...pedidoForm, color: e.target.value })} placeholder="O un color nuevo" />
              </>
            );
          })()}
          <FieldLabel>¿Cuántas piezas?</FieldLabel>
          <TextInput type="number" value={pedidoForm.cantidad} onChange={(e) => setPedidoForm({ ...pedidoForm, cantidad: e.target.value })} />
          <FieldLabel>¿Qué tan urgente?</FieldLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <FilterPill label="Normal" active={pedidoForm.urgencia === "Normal"} onClick={() => setPedidoForm({ ...pedidoForm, urgencia: "Normal" })} color={C.success} />
            <FilterPill label="Urgente" active={pedidoForm.urgencia === "Urgente"} onClick={() => setPedidoForm({ ...pedidoForm, urgencia: "Urgente" })} color={C.error} />
          </div>
          <PrimaryButton
            onClick={() => {
              onPedir(pedidoForm.item.trim(), pedidoForm.tipo, parseInt(pedidoForm.cantidad, 10) || 1, pedidoForm.urgencia, pedidoForm.color);
              setModalPedido(false);
            }}
            color={C.secondary}
            disabled={!pedidoForm.item.trim() || parseInt(pedidoForm.cantidad, 10) < 1}
          >
            Mandar a autorizar
          </PrimaryButton>
        </Modal>
      )}

      {recibiendo && (
        <Modal title={`Recibir: ${recibiendo.item}`} onClose={() => { setRecibiendo(null); setFotoRecibo(null); }}>
          <div style={{ fontSize: 13, color: C.muted }}>Confirma la recepción para sumar {recibiendo.cantidad} al inventario.</div>
          <PhotoInput value={fotoRecibo} onChange={setFotoRecibo} label="Foto de confirmación (opcional)" />
          <PrimaryButton onClick={confirmarRecibirPedido} color={C.success}>Confirmar recepción</PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   PANTALLA: Pestaña personalizada — el usuario la crea desde Materiales sin
   pedir código; es una lista simple (nombre, cantidad, costo) para lo que
   no encaje en ninguna de las categorías fijas. Se puede renombrar o
   borrar en cualquier momento desde el lápiz del encabezado.
   ========================================================================= */
function GrupoPersonalizadoScreen({ grupo, setData, bitacora, usuarioActual, mostrarToast, onEliminarGrupo, campo = "gruposPersonalizados" }) {
  const [busca, setBusca] = useState("");
  const [editId, setEditId] = useState(null);
  const [nuevoValor, setNuevoValor] = useState("");
  const [modalAlta, setModalAlta] = useState(false);
  const [nuevoItem, setNuevoItem] = useState({ nombre: "", cantidad: "", costo: "" });
  const [porEliminar, setPorEliminar] = useState(null);
  const [renombrando, setRenombrando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState(grupo?.nombre || "");
  const [confirmandoBorrarGrupo, setConfirmandoBorrarGrupo] = useState(false);

  if (!grupo) return null;

  const items = (grupo.items || []).filter((it) => it.nombre.toLowerCase().includes(busca.toLowerCase()));

  const actualizarGrupo = (fn) => {
    setData((d) => ({
      ...d,
      [campo]: (d[campo] || []).map((g) => (g.id === grupo.id ? fn(g) : g)),
    }));
  };

  const confirmarAlta = () => {
    if (!nuevoItem.nombre.trim() || nuevoItem.cantidad === "") return;
    const nuevoId = Math.max(0, ...(grupo.items || []).map((it) => it.id)) + 1;
    actualizarGrupo((g) => ({ ...g, items: [...(g.items || []), { id: nuevoId, nombre: nuevoItem.nombre.trim(), cantidad: parseInt(nuevoItem.cantidad, 10) || 0, costo: parseFloat(nuevoItem.costo) || 0, notas: "" }] }));
    bitacora(`${grupo.nombre}: nuevo artículo agregado — ${nuevoItem.nombre}`, usuarioActual);
    mostrarToast("Agregado ✓");
    setModalAlta(false);
    setNuevoItem({ nombre: "", cantidad: "", costo: "" });
  };

  const guardarCantidad = (item) => {
    const nuevo = parseInt(nuevoValor, 10);
    if (isNaN(nuevo)) return;
    actualizarGrupo((g) => ({ ...g, items: g.items.map((it) => (it.id === item.id ? { ...it, cantidad: nuevo } : it)) }));
    bitacora(`${grupo.nombre}: ${item.nombre} editado de ${item.cantidad} a ${nuevo}`, usuarioActual);
    mostrarToast("Cantidad actualizada ✓");
    setEditId(null);
    setNuevoValor("");
  };

  const eliminarItem = () => {
    actualizarGrupo((g) => ({ ...g, items: g.items.filter((it) => it.id !== porEliminar.id) }));
    bitacora(`${grupo.nombre}: artículo eliminado — ${porEliminar.nombre}`, usuarioActual);
    mostrarToast("Eliminado");
    setPorEliminar(null);
    setEditId(null);
  };

  const guardarNombre = () => {
    if (!nuevoNombre.trim()) return;
    actualizarGrupo((g) => ({ ...g, nombre: nuevoNombre.trim() }));
    mostrarToast("Pestaña renombrada ✓");
    setRenombrando(false);
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <SectionHeader
        title={grupo.nombre}
        subtitle="Pestaña personalizada"
        right={
          <button onClick={() => { setNuevoNombre(grupo.nombre); setRenombrando(true); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
            <Pencil size={18} />
          </button>
        }
      />
      <SearchBar placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="pf-list-grid" style={{ padding: 16 }}>
        {items.map((it) => (
          <InventoryCard
            key={it.id}
            nombre={it.nombre}
            categoria={it.costo ? fmtMoneda(it.costo) : ""}
            right={<div style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{it.cantidad}</div>}
            onEdit={() => { setEditId(it.id); setNuevoValor(String(it.cantidad)); }}
          />
        ))}
        {items.length === 0 && <EmptyState text="Todavía no hay nada en esta pestaña." />}
      </div>
      <FAB color={grupo.color || C.secondary} onClick={() => setModalAlta(true)} />

      {modalAlta && (
        <Modal title={`Nuevo en ${grupo.nombre}`} onClose={() => setModalAlta(false)}>
          <FieldLabel>Nombre</FieldLabel>
          <TextInput value={nuevoItem.nombre} onChange={(e) => setNuevoItem({ ...nuevoItem, nombre: e.target.value })} placeholder="Nombre del artículo" />
          <FieldLabel>Cantidad</FieldLabel>
          <TextInput type="number" value={nuevoItem.cantidad} onChange={(e) => setNuevoItem({ ...nuevoItem, cantidad: e.target.value })} placeholder="0" />
          <FieldLabel>Costo unitario (opcional)</FieldLabel>
          <TextInput type="number" value={nuevoItem.costo} onChange={(e) => setNuevoItem({ ...nuevoItem, costo: e.target.value })} placeholder="$0" />
          <PrimaryButton onClick={confirmarAlta} disabled={!nuevoItem.nombre.trim() || nuevoItem.cantidad === ""}>Agregar</PrimaryButton>
        </Modal>
      )}

      {editId != null && (() => {
        const item = (grupo.items || []).find((it) => it.id === editId);
        if (!item) return null;
        return (
          <Modal title={item.nombre} onClose={() => setEditId(null)}>
            <FieldLabel>Cantidad</FieldLabel>
            <TextInput type="number" value={nuevoValor} onChange={(e) => setNuevoValor(e.target.value)} />
            <PrimaryButton onClick={() => guardarCantidad(item)}>Guardar</PrimaryButton>
            <button onClick={() => setPorEliminar(item)} style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Trash2 size={14} /> Eliminar artículo
            </button>
          </Modal>
        );
      })()}

      {porEliminar && (
        <Modal title="Eliminar artículo" onClose={() => setPorEliminar(null)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>"{porEliminar.nombre}" se borra por completo.</div>
          <PrimaryButton onClick={eliminarItem} color={C.error}>Sí, eliminar</PrimaryButton>
        </Modal>
      )}

      {renombrando && (
        <Modal title="Renombrar pestaña" onClose={() => setRenombrando(false)}>
          <FieldLabel>Nombre de la pestaña</FieldLabel>
          <TextInput value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
          <PrimaryButton onClick={guardarNombre} disabled={!nuevoNombre.trim()}>Guardar</PrimaryButton>
          <button onClick={() => { setRenombrando(false); setConfirmandoBorrarGrupo(true); }} style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Trash2 size={14} /> Borrar esta pestaña
          </button>
        </Modal>
      )}

      {confirmandoBorrarGrupo && (
        <Modal title="Borrar pestaña" onClose={() => setConfirmandoBorrarGrupo(false)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>
            Se borra "{grupo.nombre}" y los {(grupo.items || []).length} artículo(s) que tiene adentro. No se puede deshacer.
          </div>
          <PrimaryButton onClick={onEliminarGrupo} color={C.error}>Sí, borrar pestaña</PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   PANTALLA: Materiales
   ========================================================================= */

function MaterialesScreen({ data, setData, bitacora, usuarioActual, mostrarToast, config, onPedir, sucursal }) {
  // La pestaña "Materiales" (lista genérica por cantidad) se quitó a
  // petición del negocio: lo que traía se organiza mejor en pestañas
  // propias (como "Papelería"), creadas con el botón "+ Nueva pestaña" de
  // aquí abajo. Catálogos queda como pestaña de arranque.
  const [tab, setTab] = useState("catalogos");
  const [agregandoGrupo, setAgregandoGrupo] = useState(false);
  const [nombreGrupoNuevo, setNombreGrupoNuevo] = useState("");
  const [colorGrupoNuevo, setColorGrupoNuevo] = useState(C.secondary);

  const gruposPersonalizados = data.gruposPersonalizados || [];
  const COLORES_GRUPO = [C.primary, C.secondary, C.accent1, C.warning, C.success];

  const crearGrupo = () => {
    if (!nombreGrupoNuevo.trim()) return;
    const nuevoId = Date.now();
    setData((d) => ({
      ...d,
      gruposPersonalizados: [...(d.gruposPersonalizados || []), { id: nuevoId, nombre: nombreGrupoNuevo.trim(), color: colorGrupoNuevo, items: [] }],
    }));
    bitacora(`Nueva pestaña creada: ${nombreGrupoNuevo.trim()}`, usuarioActual);
    mostrarToast("Pestaña creada ✓");
    setAgregandoGrupo(false);
    setNombreGrupoNuevo("");
    setColorGrupoNuevo(C.secondary);
    setTab(`custom:${nuevoId}`);
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: "16px 16px 0" }}>
        <div className="pf-heading" style={{ fontSize: 20, fontWeight: 700, color: C.foreground, marginBottom: 12 }}>Materiales y producción</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          <FilterPill label="Catálogos" active={tab === "catalogos"} onClick={() => setTab("catalogos")} color={C.primary} />
          <FilterPill label="Indumentaria" active={tab === "indumentaria"} onClick={() => setTab("indumentaria")} color={C.accent1} />
          <FilterPill label="Emblemáticos" active={tab === "emblematicos"} onClick={() => setTab("emblematicos")} color={C.warning} />
          <FilterPill label="Placas por hoja" active={tab === "placas"} onClick={() => setTab("placas")} color={C.primary} />
          <FilterPill label="Piezas" active={tab === "piezas"} onClick={() => setTab("piezas")} color={C.accent1} />
          <FilterPill label="Mobiliario" active={tab === "mobiliario"} onClick={() => setTab("mobiliario")} color={C.secondary} />
          {gruposPersonalizados.map((g) => (
            <FilterPill key={g.id} label={g.nombre} active={tab === `custom:${g.id}`} onClick={() => setTab(`custom:${g.id}`)} color={g.color || C.secondary} />
          ))}
          <button
            onClick={() => { setNombreGrupoNuevo(""); setColorGrupoNuevo(C.secondary); setAgregandoGrupo(true); }}
            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, border: `1.5px dashed ${C.border}`, borderRadius: 20, padding: "8px 14px", background: "none", color: C.muted, fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            <Plus size={14} /> Nueva pestaña
          </button>
        </div>
      </div>

      {tab === "catalogos" && <CatalogosScreen sucursal={sucursal} />}
      {tab === "indumentaria" && <IndumentariaScreen data={data} setData={setData} bitacora={bitacora} usuarioActual={usuarioActual} mostrarToast={mostrarToast} sucursal={sucursal} />}
      {tab === "emblematicos" && <EmblematicosScreen data={data} setData={setData} bitacora={bitacora} usuarioActual={usuarioActual} mostrarToast={mostrarToast} sucursal={sucursal} />}
      {tab === "placas" && <PlacasScreen data={data} setData={setData} bitacora={bitacora} usuarioActual={usuarioActual} mostrarToast={mostrarToast} config={config} sucursal={sucursal} />}
      {tab === "piezas" && <PiezasScreen data={data} setData={setData} bitacora={bitacora} usuarioActual={usuarioActual} mostrarToast={mostrarToast} config={config} sucursal={sucursal} />}
      {tab === "mobiliario" && <MobiliarioScreen data={data} setData={setData} bitacora={bitacora} usuarioActual={usuarioActual} mostrarToast={mostrarToast} sucursal={sucursal} />}
      {tab.startsWith("custom:") && (
        <GrupoPersonalizadoScreen
          grupo={gruposPersonalizados.find((g) => `custom:${g.id}` === tab)}
          setData={setData}
          bitacora={bitacora}
          usuarioActual={usuarioActual}
          mostrarToast={mostrarToast}
          onEliminarGrupo={() => {
            const grupo = gruposPersonalizados.find((g) => `custom:${g.id}` === tab);
            setData((d) => ({ ...d, gruposPersonalizados: (d.gruposPersonalizados || []).filter((g) => `custom:${g.id}` !== tab) }));
            if (grupo) bitacora(`Pestaña personalizada borrada: ${grupo.nombre}`, usuarioActual);
            mostrarToast("Pestaña borrada");
            setTab("catalogos");
          }}
        />
      )}

      {agregandoGrupo && (
        <Modal title="Nueva pestaña" onClose={() => setAgregandoGrupo(false)}>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 4 }}>
            Crea tu propia pestaña para lo que no encaje en las demás — se guarda como una lista simple de artículo, cantidad y costo.
          </div>
          <FieldLabel>Nombre de la pestaña</FieldLabel>
          <TextInput value={nombreGrupoNuevo} onChange={(e) => setNombreGrupoNuevo(e.target.value)} placeholder="Ej. Decoración de eventos" />
          <FieldLabel>Color</FieldLabel>
          <div style={{ display: "flex", gap: 8 }}>
            {COLORES_GRUPO.map((col) => (
              <button
                key={col}
                onClick={() => setColorGrupoNuevo(col)}
                style={{ width: 30, height: 30, borderRadius: 15, background: col, border: colorGrupoNuevo === col ? `3px solid ${C.foreground}` : `1px solid ${C.border}`, cursor: "pointer" }}
              />
            ))}
          </div>
          <PrimaryButton onClick={crearGrupo} disabled={!nombreGrupoNuevo.trim()}>Crear pestaña</PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   PANTALLA: Indumentaria — togas, birretes, estolas, capas, lámparas.
   Se presta por sesión a una persona (no necesariamente empleado) y se
   espera de vuelta el mismo día; por eso lleva su propio ledger de
   existencias más una lista de préstamos activos con fecha esperada.
   ========================================================================= */
function IndumentariaScreen({ data, setData, bitacora, usuarioActual, mostrarToast, sucursal, onBack }) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [modalAlta, setModalAlta] = useState(false);
  const [nuevo, setNuevo] = useState({ tipo: "Toga", detalle: "", cantidadTotal: "", costo: "" });
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [porEliminar, setPorEliminar] = useState(null);
  const [prestando, setPrestando] = useState(null);
  const [prestamoForm, setPrestamoForm] = useState({ cantidad: "1", persona: "", nota: "", fechaEsperada: fmt(hoy) });
  const [verPrestamosDe, setVerPrestamosDe] = useState(null);
  const [devolviendo, setDevolviendo] = useState(null); // { item, prestamo }
  const [cantDevuelta, setCantDevuelta] = useState("");

  const tiposIndumentaria = data.tiposIndumentaria && data.tiposIndumentaria.length > 0 ? data.tiposIndumentaria : TIPOS_INDUMENTARIA;
  const agregarTipoIndumentaria = (t) => setData((d) => ({ ...d, tiposIndumentaria: [...(d.tiposIndumentaria && d.tiposIndumentaria.length > 0 ? d.tiposIndumentaria : TIPOS_INDUMENTARIA), t] }));
  const quitarTipoIndumentaria = (t) => setData((d) => ({ ...d, tiposIndumentaria: (d.tiposIndumentaria && d.tiposIndumentaria.length > 0 ? d.tiposIndumentaria : TIPOS_INDUMENTARIA).filter((x) => x !== t) }));
  const tipoIndumentariaEnUso = (t) => (data.indumentaria || []).some((i) => i.tipo === t);

  const items = (data.indumentaria || [])
    .filter((i) => filtro === "Todas" || i.tipo === filtro)
    .filter((i) => `${i.tipo} ${i.detalle}`.toLowerCase().includes(search.toLowerCase()));

  const prestadas = (i) => (i.prestamos || []).filter((p) => p.estado === "Prestado").reduce((a, p) => a + p.cantidad, 0);
  const disponibles = (i) => i.cantidadTotal - prestadas(i);

  const confirmarAlta = () => {
    if (!nuevo.tipo || nuevo.cantidadTotal === "") return;
    const nuevoId = Math.max(0, ...(data.indumentaria || []).map((i) => i.id)) + 1;
    const cant = parseInt(nuevo.cantidadTotal, 10) || 0;
    setData((d) => ({
      ...d,
      indumentaria: [
        ...(d.indumentaria || []),
        {
          id: nuevoId,
          tipo: nuevo.tipo,
          detalle: nuevo.detalle.trim(),
          cantidadTotal: cant,
          costo: parseFloat(nuevo.costo) || 0,
          movimientos: cant > 0 ? [movimientoBase("entrada", cant, usuarioActual, "Alta inicial")] : [],
          prestamos: [],
        },
      ],
    }));
    bitacora(`Nueva indumentaria agregada: ${nuevo.tipo}${nuevo.detalle ? ` (${nuevo.detalle})` : ""} ×${cant}`, usuarioActual);
    mostrarToast("Agregado ✓");
    setModalAlta(false);
    setNuevo({ tipo: "Toga", detalle: "", cantidadTotal: "", costo: "" });
  };

  const guardarEdicion = () => {
    const item = editando;
    const cambios = {
      tipo: form.tipo || item.tipo,
      detalle: (form.detalle || "").trim(),
      costo: parseFloat(form.costo) || 0,
    };
    const nuevoTotal = parseInt(form.cantidadTotal, 10);
    const diferencia = !isNaN(nuevoTotal) ? nuevoTotal - item.cantidadTotal : 0;
    setData((d) => ({
      ...d,
      indumentaria: d.indumentaria.map((i) =>
        i.id === item.id
          ? {
              ...i,
              ...cambios,
              cantidadTotal: !isNaN(nuevoTotal) ? nuevoTotal : i.cantidadTotal,
              movimientos: diferencia !== 0 ? [...(i.movimientos || []), movimientoBase("ajuste", diferencia, usuarioActual, "Ajuste manual de existencias")] : i.movimientos,
            }
          : i
      ),
    }));
    bitacora(`Indumentaria editada: ${cambios.tipo}${cambios.detalle ? ` (${cambios.detalle})` : ""}`, usuarioActual);
    mostrarToast("Cambios guardados ✓");
    setEditando(null);
  };

  const eliminar = () => {
    setData((d) => ({ ...d, indumentaria: d.indumentaria.filter((i) => i.id !== porEliminar.id) }));
    bitacora(`Indumentaria eliminada: ${porEliminar.tipo}${porEliminar.detalle ? ` (${porEliminar.detalle})` : ""}`, usuarioActual);
    mostrarToast("Eliminado");
    setPorEliminar(null);
    setEditando(null);
  };

  const confirmarPrestamo = () => {
    const item = prestando;
    const cant = parseInt(prestamoForm.cantidad, 10) || 0;
    if (!item || cant < 1 || cant > disponibles(item) || !prestamoForm.persona.trim()) return;
    const nuevoPrestamo = {
      id: Date.now(),
      cantidad: cant,
      persona: prestamoForm.persona.trim(),
      nota: prestamoForm.nota || "",
      fechaPrestamo: fmt(hoy),
      fechaEsperada: prestamoForm.fechaEsperada || fmt(hoy),
      estado: "Prestado",
      quienPresto: usuarioActual,
      fechaDevolucion: null,
    };
    setData((d) => ({
      ...d,
      indumentaria: d.indumentaria.map((i) => (i.id === item.id ? { ...i, prestamos: [...(i.prestamos || []), nuevoPrestamo] } : i)),
    }));
    bitacora(`${item.tipo}${item.detalle ? ` (${item.detalle})` : ""} ×${cant} prestado a ${prestamoForm.persona}`, usuarioActual);
    mostrarToast("Préstamo registrado ✓");
    setPrestando(null);
    setPrestamoForm({ cantidad: "1", persona: "", nota: "", fechaEsperada: fmt(hoy) });
  };

  const confirmarDevolucion = () => {
    const { item, prestamo } = devolviendo;
    const cant = parseInt(cantDevuelta, 10);
    if (isNaN(cant) || cant < 0) return;
    setData((d) => ({
      ...d,
      indumentaria: d.indumentaria.map((i) =>
        i.id === item.id
          ? {
              ...i,
              prestamos: i.prestamos.map((p) => (p.id === prestamo.id ? { ...p, estado: "Devuelto", fechaDevolucion: fmt(hoy), cantidadDevuelta: cant } : p)),
            }
          : i
      ),
    }));
    const faltante = prestamo.cantidad - cant;
    bitacora(
      `${item.tipo}${item.detalle ? ` (${item.detalle})` : ""} devuelto por ${prestamo.persona}${faltante > 0 ? ` — faltaron ${faltante}` : ""}`,
      usuarioActual
    );
    mostrarToast(faltante > 0 ? `Devuelto (faltaron ${faltante}) ✓` : "Devuelto ✓");
    setDevolviendo(null);
    setCantDevuelta("");
  };

  return (
    <div style={{ paddingBottom: 90, minHeight: "100vh" }}>
      <SectionHeader title="Indumentaria" subtitle="Togas, birretes, estolas, capas y lámparas" onBack={onBack} />
      <SearchBar placeholder="Buscar indumentaria..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 16px 0" }}>
        <FilterPill label="Todas" active={filtro === "Todas"} onClick={() => setFiltro("Todas")} />
        {tiposIndumentaria.map((t) => (
          <FilterPill key={t} label={t} active={filtro === t} onClick={() => setFiltro(t)} />
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {items.length === 0 && <EmptyState icon={Shirt} text="No hay indumentaria capturada todavía con estos filtros." />}
        {items.map((i) => {
          const disp = disponibles(i);
          const prestamosActivos = (i.prestamos || []).filter((p) => p.estado === "Prestado");
          return (
            <div key={i.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14, boxShadow: SOMBRA_TARJETA }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{i.tipo}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{i.detalle || "Sin detalle"}{i.costo ? ` · ${fmtMoneda(i.costo)}` : ""}</div>
                  <div style={{ fontSize: 10.5, color: C.muted, fontFamily: "monospace", marginTop: 2 }}>{codigoArticulo("IND", sucursal, i.id)}</div>
                </div>
                <button onClick={() => { setEditando(i); setForm({ tipo: i.tipo, detalle: i.detalle, cantidadTotal: String(i.cantidadTotal), costo: String(i.costo || "") }); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
                  <Pencil size={16} />
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{i.cantidadTotal}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Total</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: disp === 0 ? C.error : C.success }}>{disp}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Disponibles</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.warning }}>{prestamosActivos.length}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Préstamos</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => { setPrestando(i); setPrestamoForm({ cantidad: "1", persona: "", nota: "", fechaEsperada: fmt(hoy) }); }}
                  disabled={disp < 1}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: disp < 1 ? "none" : C.primary, color: disp < 1 ? C.muted : "#fff", border: disp < 1 ? `1px solid ${C.border}` : "none", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, cursor: disp < 1 ? "not-allowed" : "pointer", opacity: disp < 1 ? 0.6 : 1 }}
                >
                  <ArrowUpRight size={13} /> Prestar
                </button>
                <button
                  onClick={() => setVerPrestamosDe(i)}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, color: C.foreground, cursor: "pointer" }}
                >
                  <History size={13} /> Préstamos y movimientos
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <FAB color={C.primary} onClick={() => setModalAlta(true)} />

      {modalAlta && (
        <Modal title="Nueva indumentaria" onClose={() => setModalAlta(false)}>
          <FieldLabel>Tipo</FieldLabel>
          <SelectorTiposEditable
            tipos={tiposIndumentaria}
            valor={nuevo.tipo}
            onSeleccionar={(t) => setNuevo({ ...nuevo, tipo: t })}
            onAgregar={agregarTipoIndumentaria}
            onQuitar={quitarTipoIndumentaria}
            enUso={tipoIndumentariaEnUso}
          />
          <FieldLabel>Detalle (talla, color...)</FieldLabel>
          <TextInput value={nuevo.detalle} onChange={(e) => setNuevo({ ...nuevo, detalle: e.target.value })} placeholder="Ej. Adulto - Negro" />
          <FieldLabel>Cantidad inicial</FieldLabel>
          <TextInput type="number" value={nuevo.cantidadTotal} onChange={(e) => setNuevo({ ...nuevo, cantidadTotal: e.target.value })} placeholder="0" />
          <FieldLabel>Costo unitario (opcional)</FieldLabel>
          <TextInput type="number" value={nuevo.costo} onChange={(e) => setNuevo({ ...nuevo, costo: e.target.value })} placeholder="$0" />
          <PrimaryButton onClick={confirmarAlta} disabled={nuevo.cantidadTotal === ""}>Agregar</PrimaryButton>
        </Modal>
      )}

      {editando && (
        <Modal title="Editar indumentaria" onClose={() => setEditando(null)}>
          <FieldLabel>Tipo</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            {tiposIndumentaria.map((t) => (
              <FilterPill key={t} label={t} active={form.tipo === t} onClick={() => setForm({ ...form, tipo: t })} />
            ))}
          </div>
          <FieldLabel>Detalle</FieldLabel>
          <TextInput value={form.detalle || ""} onChange={(e) => setForm({ ...form, detalle: e.target.value })} />
          <FieldLabel>Cantidad total</FieldLabel>
          <TextInput type="number" value={form.cantidadTotal ?? ""} onChange={(e) => setForm({ ...form, cantidadTotal: e.target.value })} />
          <FieldLabel>Costo unitario</FieldLabel>
          <TextInput type="number" value={form.costo ?? ""} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
          <PrimaryButton onClick={guardarEdicion}>Guardar cambios</PrimaryButton>
          <button
            onClick={() => setPorEliminar(editando)}
            style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Trash2 size={14} /> Eliminar
          </button>
        </Modal>
      )}

      {porEliminar && (
        <Modal title="Eliminar indumentaria" onClose={() => setPorEliminar(null)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>
            ¿Eliminar "{porEliminar.tipo}{porEliminar.detalle ? ` (${porEliminar.detalle})` : ""}"? {(porEliminar.prestamos || []).some((p) => p.estado === "Prestado") ? "Tiene préstamos activos — revísalos antes de eliminarla." : "Esto no se puede deshacer."}
          </div>
          <PrimaryButton onClick={eliminar} color={C.error}>Sí, eliminar</PrimaryButton>
        </Modal>
      )}

      {prestando && (
        <Modal title={`Prestar: ${prestando.tipo}`} onClose={() => setPrestando(null)}>
          <div style={{ fontSize: 12.5, color: C.muted }}>Hay {disponibles(prestando)} disponibles de {prestando.cantidadTotal}.</div>
          <FieldLabel>¿A quién se presta?</FieldLabel>
          <TextInput value={prestamoForm.persona} onChange={(e) => setPrestamoForm({ ...prestamoForm, persona: e.target.value })} placeholder="Nombre del alumno o cliente" />
          <FieldLabel>Cantidad</FieldLabel>
          <TextInput type="number" value={prestamoForm.cantidad} onChange={(e) => setPrestamoForm({ ...prestamoForm, cantidad: e.target.value })} />
          <FieldLabel>¿Cuándo se espera de vuelta?</FieldLabel>
          <TextInput type="date" value={prestamoForm.fechaEsperada} onChange={(e) => setPrestamoForm({ ...prestamoForm, fechaEsperada: e.target.value })} />
          <FieldLabel>Nota (opcional)</FieldLabel>
          <TextInput value={prestamoForm.nota} onChange={(e) => setPrestamoForm({ ...prestamoForm, nota: e.target.value })} placeholder="Ej. sesión de graduación XV" />
          <PrimaryButton
            onClick={confirmarPrestamo}
            disabled={!prestamoForm.persona.trim() || !prestamoForm.cantidad || parseInt(prestamoForm.cantidad, 10) < 1 || parseInt(prestamoForm.cantidad, 10) > disponibles(prestando)}
          >
            Registrar préstamo
          </PrimaryButton>
        </Modal>
      )}

      {verPrestamosDe && (
        <Modal title={`${verPrestamosDe.tipo}${verPrestamosDe.detalle ? ` — ${verPrestamosDe.detalle}` : ""}`} onClose={() => setVerPrestamosDe(null)}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.foreground, marginBottom: 8 }}>Préstamos activos</div>
          {(verPrestamosDe.prestamos || []).filter((p) => p.estado === "Prestado").length === 0 && (
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Nada prestado ahora mismo.</div>
          )}
          {(verPrestamosDe.prestamos || []).filter((p) => p.estado === "Prestado").map((p) => {
            const atrasado = p.fechaEsperada && p.fechaEsperada < fmt(hoy);
            return (
              <div key={p.id} style={{ padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.foreground }}>{p.persona} × {p.cantidad}</div>
                    <div style={{ fontSize: 11.5, color: atrasado ? C.error : C.muted }}>
                      Prestado {p.fechaPrestamo} · esperado {p.fechaEsperada}{atrasado ? " (atrasado)" : ""}
                    </div>
                    {p.nota && <div style={{ fontSize: 11.5, color: C.muted }}>{p.nota}</div>}
                  </div>
                  <button
                    onClick={() => { setDevolviendo({ item: verPrestamosDe, prestamo: p }); setCantDevuelta(String(p.cantidad)); }}
                    style={{ background: C.success, color: textoContraste(C.success), border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Devolver
                  </button>
                </div>
              </div>
            );
          })}

          <div style={{ fontSize: 13, fontWeight: 700, color: C.foreground, margin: "16px 0 8px" }}>Movimientos de existencias</div>
          {(verPrestamosDe.movimientos || []).length === 0 && <div style={{ fontSize: 13, color: C.muted }}>Sin movimientos registrados.</div>}
          {[...(verPrestamosDe.movimientos || [])].reverse().map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 12, color: C.foreground }}>{m.nota}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{m.fecha}{m.quien ? ` · ${m.quien}` : ""}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: m.cantidad >= 0 ? C.success : C.error }}>{m.cantidad >= 0 ? `+${m.cantidad}` : m.cantidad}</span>
            </div>
          ))}
        </Modal>
      )}

      {devolviendo && (
        <Modal title="Confirmar devolución" onClose={() => setDevolviendo(null)}>
          <div style={{ fontSize: 12.5, color: C.muted }}>Se prestaron {devolviendo.prestamo.cantidad} a {devolviendo.prestamo.persona}. Si no regresan todas, ajusta la cantidad — la diferencia queda anotada en la bitácora.</div>
          <FieldLabel>¿Cuántas regresaron?</FieldLabel>
          <TextInput type="number" value={cantDevuelta} onChange={(e) => setCantDevuelta(e.target.value)} />
          <PrimaryButton onClick={confirmarDevolucion} color={C.success} disabled={cantDevuelta === "" || parseInt(cantDevuelta, 10) < 0}>
            Confirmar devolución
          </PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   PANTALLA: Emblemáticos — anillos, medallas y pines. Los anillos de oro
   necesitan quedar en resguardo con la firma de quien se hace responsable;
   el resto puede pasar por resguardo también, pero sin exigir la firma.
   ========================================================================= */
function EmblematicosScreen({ data, setData, bitacora, usuarioActual, mostrarToast, sucursal, onBack }) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [modalAlta, setModalAlta] = useState(false);
  const [nuevo, setNuevo] = useState({ tipo: "Anillo", material: "", detalle: "", cantidadTotal: "", costo: "" });
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [porEliminar, setPorEliminar] = useState(null);
  const [asignando, setAsignando] = useState(null);
  const [custodioForm, setCustodioForm] = useState({ cantidad: "1", persona: "", nota: "", firmaResponsiva: false });
  const [verCustodiaDe, setVerCustodiaDe] = useState(null);
  const [liberando, setLiberando] = useState(null); // { item, custodio }
  const [cantLiberada, setCantLiberada] = useState("");

  const tiposEmblematicos = data.tiposEmblematicos && data.tiposEmblematicos.length > 0 ? data.tiposEmblematicos : TIPOS_EMBLEMATICO;
  const agregarTipoEmblematico = (t) => setData((d) => ({ ...d, tiposEmblematicos: [...(d.tiposEmblematicos && d.tiposEmblematicos.length > 0 ? d.tiposEmblematicos : TIPOS_EMBLEMATICO), t] }));
  const quitarTipoEmblematico = (t) => setData((d) => ({ ...d, tiposEmblematicos: (d.tiposEmblematicos && d.tiposEmblematicos.length > 0 ? d.tiposEmblematicos : TIPOS_EMBLEMATICO).filter((x) => x !== t) }));
  const tipoEmblematicoEnUso = (t) => (data.emblematicos || []).some((e) => e.tipo === t);

  const items = (data.emblematicos || [])
    .filter((e) => filtro === "Todas" || e.tipo === filtro)
    .filter((e) => `${e.tipo} ${e.material} ${e.detalle}`.toLowerCase().includes(search.toLowerCase()));

  const enCustodia = (e) => (e.custodios || []).filter((c) => c.activo).reduce((a, c) => a + c.cantidad, 0);
  const disponibles = (e) => e.cantidadTotal - enCustodia(e);

  const confirmarAlta = () => {
    if (!nuevo.tipo || nuevo.cantidadTotal === "") return;
    const nuevoId = Math.max(0, ...(data.emblematicos || []).map((e) => e.id)) + 1;
    const cant = parseInt(nuevo.cantidadTotal, 10) || 0;
    setData((d) => ({
      ...d,
      emblematicos: [
        ...(d.emblematicos || []),
        {
          id: nuevoId,
          tipo: nuevo.tipo,
          material: nuevo.tipo === "Anillo" ? nuevo.material : "",
          detalle: nuevo.detalle.trim(),
          cantidadTotal: cant,
          costo: parseFloat(nuevo.costo) || 0,
          movimientos: cant > 0 ? [movimientoBase("entrada", cant, usuarioActual, "Alta inicial")] : [],
          custodios: [],
        },
      ],
    }));
    bitacora(`Nuevo emblemático agregado: ${nuevo.tipo}${nuevo.material ? ` (${nuevo.material})` : ""} ×${cant}`, usuarioActual);
    mostrarToast("Agregado ✓");
    setModalAlta(false);
    setNuevo({ tipo: "Anillo", material: "", detalle: "", cantidadTotal: "", costo: "" });
  };

  const guardarEdicion = () => {
    const item = editando;
    const cambios = {
      tipo: form.tipo || item.tipo,
      material: (form.tipo || item.tipo) === "Anillo" ? form.material || "" : "",
      detalle: (form.detalle || "").trim(),
      costo: parseFloat(form.costo) || 0,
    };
    const nuevoTotal = parseInt(form.cantidadTotal, 10);
    const diferencia = !isNaN(nuevoTotal) ? nuevoTotal - item.cantidadTotal : 0;
    setData((d) => ({
      ...d,
      emblematicos: d.emblematicos.map((e) =>
        e.id === item.id
          ? {
              ...e,
              ...cambios,
              cantidadTotal: !isNaN(nuevoTotal) ? nuevoTotal : e.cantidadTotal,
              movimientos: diferencia !== 0 ? [...(e.movimientos || []), movimientoBase("ajuste", diferencia, usuarioActual, "Ajuste manual de existencias")] : e.movimientos,
            }
          : e
      ),
    }));
    bitacora(`Emblemático editado: ${cambios.tipo}${cambios.detalle ? ` (${cambios.detalle})` : ""}`, usuarioActual);
    mostrarToast("Cambios guardados ✓");
    setEditando(null);
  };

  const eliminar = () => {
    setData((d) => ({ ...d, emblematicos: d.emblematicos.filter((e) => e.id !== porEliminar.id) }));
    bitacora(`Emblemático eliminado: ${porEliminar.tipo}${porEliminar.detalle ? ` (${porEliminar.detalle})` : ""}`, usuarioActual);
    mostrarToast("Eliminado");
    setPorEliminar(null);
    setEditando(null);
  };

  const esOro = (item) => item.tipo === "Anillo" && item.material === "Oro";

  const confirmarAsignacion = () => {
    const item = asignando;
    const cant = parseInt(custodioForm.cantidad, 10) || 0;
    if (!item || cant < 1 || cant > disponibles(item) || !custodioForm.persona.trim()) return;
    if (esOro(item) && !custodioForm.firmaResponsiva) return; // obligatorio para oro
    const nuevoCustodio = {
      id: Date.now(),
      cantidad: cant,
      persona: custodioForm.persona.trim(),
      nota: custodioForm.nota || "",
      fecha: fmt(hoy),
      firmaResponsiva: custodioForm.firmaResponsiva,
      activo: true,
      quienAsigno: usuarioActual,
      fechaLiberacion: null,
    };
    setData((d) => ({
      ...d,
      emblematicos: d.emblematicos.map((e) => (e.id === item.id ? { ...e, custodios: [...(e.custodios || []), nuevoCustodio] } : e)),
    }));
    bitacora(
      `${item.tipo}${item.material ? ` de ${item.material}` : ""}${item.detalle ? ` (${item.detalle})` : ""} ×${cant} en resguardo de ${custodioForm.persona}${esOro(item) ? " — con responsiva firmada" : ""}`,
      usuarioActual
    );
    mostrarToast("Resguardo registrado ✓");
    setAsignando(null);
    setCustodioForm({ cantidad: "1", persona: "", nota: "", firmaResponsiva: false });
  };

  const confirmarLiberacion = () => {
    const { item, custodio } = liberando;
    const cant = parseInt(cantLiberada, 10);
    if (isNaN(cant) || cant < 0) return;
    setData((d) => ({
      ...d,
      emblematicos: d.emblematicos.map((e) =>
        e.id === item.id
          ? { ...e, custodios: e.custodios.map((c) => (c.id === custodio.id ? { ...c, activo: false, fechaLiberacion: fmt(hoy), cantidadLiberada: cant } : c)) }
          : e
      ),
    }));
    const faltante = custodio.cantidad - cant;
    bitacora(
      `${item.tipo}${item.detalle ? ` (${item.detalle})` : ""} liberado de la custodia de ${custodio.persona}${faltante > 0 ? ` — faltaron ${faltante}` : ""}`,
      usuarioActual
    );
    mostrarToast(faltante > 0 ? `Liberado (faltaron ${faltante}) ✓` : "Liberado ✓");
    setLiberando(null);
    setCantLiberada("");
  };

  return (
    <div style={{ paddingBottom: 90, minHeight: "100vh" }}>
      <SectionHeader title="Emblemáticos" subtitle="Anillos, medallas y pines" onBack={onBack} />
      <SearchBar placeholder="Buscar emblemáticos..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 16px 0" }}>
        <FilterPill label="Todas" active={filtro === "Todas"} onClick={() => setFiltro("Todas")} />
        {tiposEmblematicos.map((t) => (
          <FilterPill key={t} label={t} active={filtro === t} onClick={() => setFiltro(t)} />
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {items.length === 0 && <EmptyState icon={Award} text="No hay emblemáticos capturados todavía con estos filtros." />}
        {items.map((e) => {
          const disp = disponibles(e);
          const custodiosActivos = (e.custodios || []).filter((c) => c.activo);
          const oro = esOro(e);
          return (
            <div key={e.id} style={{ background: C.surface, border: `1px solid ${oro ? C.warning : C.border}`, borderRadius: 12, padding: 14, marginBottom: 14, boxShadow: SOMBRA_TARJETA }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{e.tipo}</div>
                    {oro && <span style={{ fontSize: 10, fontWeight: 700, color: textoContraste(C.warning), background: C.warning, borderRadius: 6, padding: "2px 8px" }}>ORO — requiere firma</span>}
                    {!oro && e.material && <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, background: C.background, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 8px" }}>{e.material}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{e.detalle || "Sin detalle"}{e.costo ? ` · ${fmtMoneda(e.costo)}` : ""}</div>
                  <div style={{ fontSize: 10.5, color: C.muted, fontFamily: "monospace", marginTop: 2 }}>{codigoArticulo("EMB", sucursal, e.id)}</div>
                </div>
                <button onClick={() => { setEditando(e); setForm({ tipo: e.tipo, material: e.material, detalle: e.detalle, cantidadTotal: String(e.cantidadTotal), costo: String(e.costo || "") }); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
                  <Pencil size={16} />
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{e.cantidadTotal}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Total</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: disp === 0 ? C.error : C.success }}>{disp}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Disponibles</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.warning }}>{custodiosActivos.length}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>En resguardo</div>
                </div>
              </div>
              {oro && custodiosActivos.some((c) => !c.firmaResponsiva) && (
                <div style={{ marginTop: 8, fontSize: 11.5, color: C.error, display: "flex", alignItems: "center", gap: 5 }}>
                  <AlertTriangle size={13} /> Hay resguardo sin firma de responsiva
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => { setAsignando(e); setCustodioForm({ cantidad: "1", persona: "", nota: "", firmaResponsiva: false }); }}
                  disabled={disp < 1}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: disp < 1 ? "none" : C.primary, color: disp < 1 ? C.muted : "#fff", border: disp < 1 ? `1px solid ${C.border}` : "none", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, cursor: disp < 1 ? "not-allowed" : "pointer", opacity: disp < 1 ? 0.6 : 1 }}
                >
                  <ArrowUpRight size={13} /> Asignar resguardo
                </button>
                <button
                  onClick={() => setVerCustodiaDe(e)}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, color: C.foreground, cursor: "pointer" }}
                >
                  <History size={13} /> Custodia y movimientos
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <FAB color={C.primary} onClick={() => setModalAlta(true)} />

      {modalAlta && (
        <Modal title="Nuevo emblemático" onClose={() => setModalAlta(false)}>
          <FieldLabel>Tipo</FieldLabel>
          <SelectorTiposEditable
            tipos={tiposEmblematicos}
            valor={nuevo.tipo}
            onSeleccionar={(t) => setNuevo({ ...nuevo, tipo: t, material: t === "Anillo" ? nuevo.material : "" })}
            onAgregar={agregarTipoEmblematico}
            onQuitar={quitarTipoEmblematico}
            enUso={tipoEmblematicoEnUso}
          />
          {nuevo.tipo === "Anillo" && (
            <>
              <FieldLabel>Material</FieldLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                {MATERIALES_ANILLO.map((m) => (
                  <FilterPill key={m} label={m} active={nuevo.material === m} onClick={() => setNuevo({ ...nuevo, material: m })} color={m === "Oro" ? C.warning : undefined} />
                ))}
              </div>
              {nuevo.material === "Oro" && (
                <div style={{ fontSize: 11.5, color: C.warning, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                  <FileSignature size={13} /> Los anillos de oro exigen firma de responsiva al asignarse a resguardo.
                </div>
              )}
            </>
          )}
          <FieldLabel>Detalle (talla, grabado...)</FieldLabel>
          <TextInput value={nuevo.detalle} onChange={(e) => setNuevo({ ...nuevo, detalle: e.target.value })} placeholder="Ej. 10k, talla ajustable" />
          <FieldLabel>Cantidad inicial</FieldLabel>
          <TextInput type="number" value={nuevo.cantidadTotal} onChange={(e) => setNuevo({ ...nuevo, cantidadTotal: e.target.value })} placeholder="0" />
          <FieldLabel>Costo unitario (opcional)</FieldLabel>
          <TextInput type="number" value={nuevo.costo} onChange={(e) => setNuevo({ ...nuevo, costo: e.target.value })} placeholder="$0" />
          <PrimaryButton onClick={confirmarAlta} disabled={nuevo.cantidadTotal === "" || (nuevo.tipo === "Anillo" && !nuevo.material)}>Agregar</PrimaryButton>
        </Modal>
      )}

      {editando && (
        <Modal title="Editar emblemático" onClose={() => setEditando(null)}>
          <FieldLabel>Tipo</FieldLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            {tiposEmblematicos.map((t) => (
              <FilterPill key={t} label={t} active={form.tipo === t} onClick={() => setForm({ ...form, tipo: t })} />
            ))}
          </div>
          {form.tipo === "Anillo" && (
            <>
              <FieldLabel>Material</FieldLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                {MATERIALES_ANILLO.map((m) => (
                  <FilterPill key={m} label={m} active={form.material === m} onClick={() => setForm({ ...form, material: m })} color={m === "Oro" ? C.warning : undefined} />
                ))}
              </div>
            </>
          )}
          <FieldLabel>Detalle</FieldLabel>
          <TextInput value={form.detalle || ""} onChange={(e) => setForm({ ...form, detalle: e.target.value })} />
          <FieldLabel>Cantidad total</FieldLabel>
          <TextInput type="number" value={form.cantidadTotal ?? ""} onChange={(e) => setForm({ ...form, cantidadTotal: e.target.value })} />
          <FieldLabel>Costo unitario</FieldLabel>
          <TextInput type="number" value={form.costo ?? ""} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
          <PrimaryButton onClick={guardarEdicion}>Guardar cambios</PrimaryButton>
          <button
            onClick={() => setPorEliminar(editando)}
            style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Trash2 size={14} /> Eliminar
          </button>
        </Modal>
      )}

      {porEliminar && (
        <Modal title="Eliminar emblemático" onClose={() => setPorEliminar(null)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>
            ¿Eliminar "{porEliminar.tipo}{porEliminar.detalle ? ` (${porEliminar.detalle})` : ""}"? {(porEliminar.custodios || []).some((c) => c.activo) ? "Tiene resguardos activos — revísalos antes de eliminarlo." : "Esto no se puede deshacer."}
          </div>
          <PrimaryButton onClick={eliminar} color={C.error}>Sí, eliminar</PrimaryButton>
        </Modal>
      )}

      {asignando && (
        <Modal title={`Asignar resguardo: ${asignando.tipo}`} onClose={() => setAsignando(null)}>
          <div style={{ fontSize: 12.5, color: C.muted }}>Hay {disponibles(asignando)} disponibles de {asignando.cantidadTotal}.</div>
          <FieldLabel>¿A quién se asigna?</FieldLabel>
          <TextInput value={custodioForm.persona} onChange={(e) => setCustodioForm({ ...custodioForm, persona: e.target.value })} placeholder="Nombre de quien resguarda" />
          <FieldLabel>Cantidad</FieldLabel>
          <TextInput type="number" value={custodioForm.cantidad} onChange={(e) => setCustodioForm({ ...custodioForm, cantidad: e.target.value })} />
          <FieldLabel>Nota (opcional)</FieldLabel>
          <TextInput value={custodioForm.nota} onChange={(e) => setCustodioForm({ ...custodioForm, nota: e.target.value })} placeholder="Ej. para entrega en ceremonia" />
          {esOro(asignando) && (
            <button
              onClick={() => setCustodioForm({ ...custodioForm, firmaResponsiva: !custodioForm.firmaResponsiva })}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: custodioForm.firmaResponsiva ? `${C.success}15` : `${C.warning}15`, border: `1px solid ${custodioForm.firmaResponsiva ? C.success : C.warning}`, borderRadius: 10, padding: 12, marginTop: 4, cursor: "pointer", textAlign: "left" }}
            >
              <FileSignature size={18} color={custodioForm.firmaResponsiva ? C.success : C.warning} />
              <div style={{ fontSize: 12.5, color: C.foreground, fontWeight: 600 }}>
                {custodioForm.firmaResponsiva ? "Firma de responsiva capturada ✓" : "Confirmar que se capturó la firma de responsiva"}
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 400, marginTop: 2 }}>Obligatorio para anillos de oro antes de entregarlo a resguardo.</div>
              </div>
            </button>
          )}
          <PrimaryButton
            onClick={confirmarAsignacion}
            disabled={!custodioForm.persona.trim() || !custodioForm.cantidad || parseInt(custodioForm.cantidad, 10) < 1 || parseInt(custodioForm.cantidad, 10) > disponibles(asignando) || (esOro(asignando) && !custodioForm.firmaResponsiva)}
            color={esOro(asignando) ? C.warning : C.primary}
          >
            Registrar resguardo
          </PrimaryButton>
        </Modal>
      )}

      {verCustodiaDe && (
        <Modal title={`${verCustodiaDe.tipo}${verCustodiaDe.detalle ? ` — ${verCustodiaDe.detalle}` : ""}`} onClose={() => setVerCustodiaDe(null)}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.foreground, marginBottom: 8 }}>Resguardos activos</div>
          {(verCustodiaDe.custodios || []).filter((c) => c.activo).length === 0 && (
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Nada en resguardo ahora mismo.</div>
          )}
          {(verCustodiaDe.custodios || []).filter((c) => c.activo).map((c) => (
            <div key={c.id} style={{ padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.foreground }}>{c.persona} × {c.cantidad}</div>
                  <div style={{ fontSize: 11.5, color: C.muted }}>Desde {c.fecha} · asignó {c.quienAsigno}</div>
                  {verCustodiaDe.material === "Oro" && (
                    <div style={{ fontSize: 11.5, color: c.firmaResponsiva ? C.success : C.error, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <FileSignature size={12} /> {c.firmaResponsiva ? "Con responsiva firmada" : "Sin responsiva firmada"}
                    </div>
                  )}
                  {c.nota && <div style={{ fontSize: 11.5, color: C.muted }}>{c.nota}</div>}
                </div>
                <button
                  onClick={() => { setLiberando({ item: verCustodiaDe, custodio: c }); setCantLiberada(String(c.cantidad)); }}
                  style={{ background: C.success, color: textoContraste(C.success), border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  Liberar
                </button>
              </div>
            </div>
          ))}

          <div style={{ fontSize: 13, fontWeight: 700, color: C.foreground, margin: "16px 0 8px" }}>Movimientos de existencias</div>
          {(verCustodiaDe.movimientos || []).length === 0 && <div style={{ fontSize: 13, color: C.muted }}>Sin movimientos registrados.</div>}
          {[...(verCustodiaDe.movimientos || [])].reverse().map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 12, color: C.foreground }}>{m.nota}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{m.fecha}{m.quien ? ` · ${m.quien}` : ""}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: m.cantidad >= 0 ? C.success : C.error }}>{m.cantidad >= 0 ? `+${m.cantidad}` : m.cantidad}</span>
            </div>
          ))}
        </Modal>
      )}

      {liberando && (
        <Modal title="Confirmar liberación" onClose={() => setLiberando(null)}>
          <div style={{ fontSize: 12.5, color: C.muted }}>Se asignaron {liberando.custodio.cantidad} a {liberando.custodio.persona}. Si no regresan todas (se entregaron al cliente, por ejemplo), ajusta la cantidad — la diferencia queda anotada en la bitácora.</div>
          <FieldLabel>¿Cuántas regresan a existencia?</FieldLabel>
          <TextInput type="number" value={cantLiberada} onChange={(e) => setCantLiberada(e.target.value)} />
          <PrimaryButton onClick={confirmarLiberacion} color={C.success} disabled={cantLiberada === "" || parseInt(cantLiberada, 10) < 0}>
            Confirmar liberación
          </PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   PANTALLA: Mobiliario — computadoras, disco duro, escritorios,
   dispensadores. Más simple que indumentaria/emblemáticos: aquí no hay
   préstamo ni custodia, es control de existencias con costo por modelo,
   igual que se pidió: "registrado por modelo".
   ========================================================================= */
function MobiliarioScreen({ data, setData, bitacora, usuarioActual, mostrarToast, sucursal, onBack }) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [modalAlta, setModalAlta] = useState(false);
  const [nuevo, setNuevo] = useState({ tipo: "Computadora", modelo: "", cantidad: "", costo: "", ubicacion: "", notas: "" });
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [porEliminar, setPorEliminar] = useState(null);
  const [verMovimientosDe, setVerMovimientosDe] = useState(null);

  const tiposMobiliario = data.tiposMobiliario && data.tiposMobiliario.length > 0 ? data.tiposMobiliario : TIPOS_MOBILIARIO;
  const agregarTipoMobiliario = (t) => setData((d) => ({ ...d, tiposMobiliario: [...(d.tiposMobiliario && d.tiposMobiliario.length > 0 ? d.tiposMobiliario : TIPOS_MOBILIARIO), t] }));
  const quitarTipoMobiliario = (t) => setData((d) => ({ ...d, tiposMobiliario: (d.tiposMobiliario && d.tiposMobiliario.length > 0 ? d.tiposMobiliario : TIPOS_MOBILIARIO).filter((x) => x !== t) }));
  const tipoMobiliarioEnUso = (t) => (data.mobiliario || []).some((m) => m.tipo === t);

  const items = (data.mobiliario || [])
    .filter((m) => filtro === "Todas" || m.tipo === filtro)
    .filter((m) => `${m.tipo} ${m.modelo} ${m.ubicacion}`.toLowerCase().includes(search.toLowerCase()));

  const valorTotal = (data.mobiliario || []).filter((m) => m.estado !== "Baja").reduce((a, m) => a + (Number(m.costo) || 0) * (Number(m.cantidad) || 0), 0);

  const confirmarAlta = () => {
    if (!nuevo.tipo || !nuevo.modelo.trim() || nuevo.cantidad === "") return;
    const nuevoId = Math.max(0, ...(data.mobiliario || []).map((m) => m.id)) + 1;
    const cant = parseInt(nuevo.cantidad, 10) || 0;
    setData((d) => ({
      ...d,
      mobiliario: [
        ...(d.mobiliario || []),
        {
          id: nuevoId,
          tipo: nuevo.tipo,
          modelo: nuevo.modelo.trim(),
          cantidad: cant,
          costo: parseFloat(nuevo.costo) || 0,
          ubicacion: nuevo.ubicacion.trim(),
          notas: nuevo.notas.trim(),
          estado: "Disponible",
          movimientos: cant > 0 ? [movimientoBase("entrada", cant, usuarioActual, "Alta inicial")] : [],
        },
      ],
    }));
    bitacora(`Nuevo mobiliario agregado: ${nuevo.tipo} — ${nuevo.modelo} ×${cant}`, usuarioActual);
    mostrarToast("Agregado ✓");
    setModalAlta(false);
    setNuevo({ tipo: "Computadora", modelo: "", cantidad: "", costo: "", ubicacion: "", notas: "" });
  };

  const guardarEdicion = () => {
    const item = editando;
    const cambios = {
      tipo: form.tipo || item.tipo,
      modelo: (form.modelo || "").trim(),
      costo: parseFloat(form.costo) || 0,
      ubicacion: (form.ubicacion || "").trim(),
      notas: form.notas || "",
      estado: form.estado || item.estado,
    };
    const nuevaCant = parseInt(form.cantidad, 10);
    const diferencia = !isNaN(nuevaCant) ? nuevaCant - item.cantidad : 0;
    setData((d) => ({
      ...d,
      mobiliario: d.mobiliario.map((m) =>
        m.id === item.id
          ? {
              ...m,
              ...cambios,
              cantidad: !isNaN(nuevaCant) ? nuevaCant : m.cantidad,
              movimientos: diferencia !== 0 ? [...(m.movimientos || []), movimientoBase("ajuste", diferencia, usuarioActual, "Ajuste manual de existencias")] : m.movimientos,
            }
          : m
      ),
    }));
    bitacora(`Mobiliario editado: ${cambios.tipo} — ${cambios.modelo}`, usuarioActual);
    mostrarToast("Cambios guardados ✓");
    setEditando(null);
  };

  const eliminar = () => {
    setData((d) => ({ ...d, mobiliario: d.mobiliario.filter((m) => m.id !== porEliminar.id) }));
    bitacora(`Mobiliario eliminado: ${porEliminar.tipo} — ${porEliminar.modelo}`, usuarioActual);
    mostrarToast("Eliminado");
    setPorEliminar(null);
    setEditando(null);
  };

  return (
    <div style={{ paddingBottom: 90, minHeight: "100vh" }}>
      <SectionHeader title="Mobiliario" subtitle="Computadoras, escritorios y más" onBack={onBack} />
      {valorTotal > 0 && (
        <div style={{ margin: "0 16px 4px", background: `${C.primary}12`, border: `1px solid ${C.primary}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: C.muted }}>Inversión total en mobiliario</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.foreground }}>{fmtMoneda(valorTotal)}</div>
        </div>
      )}
      <SearchBar placeholder="Buscar mobiliario..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 16px 0" }}>
        <FilterPill label="Todas" active={filtro === "Todas"} onClick={() => setFiltro("Todas")} />
        {tiposMobiliario.map((t) => (
          <FilterPill key={t} label={t} active={filtro === t} onClick={() => setFiltro(t)} />
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {items.length === 0 && <EmptyState icon={Monitor} text="No hay mobiliario capturado todavía con estos filtros." />}
        {items.map((m) => (
          <div key={m.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14, boxShadow: SOMBRA_TARJETA }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{m.tipo}</div>
                  <Badge estado={m.estado} />
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>{m.modelo}{m.costo ? ` · ${fmtMoneda(m.costo)} c/u` : ""}</div>
                {m.ubicacion && <div style={{ fontSize: 11.5, color: C.muted }}>📍 {m.ubicacion}</div>}
                {m.notas && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{m.notas}</div>}
                <div style={{ fontSize: 10.5, color: C.muted, fontFamily: "monospace", marginTop: 2 }}>{codigoArticulo("MOB", sucursal, m.id)}</div>
              </div>
              <button
                onClick={() => { setEditando(m); setForm({ tipo: m.tipo, modelo: m.modelo, cantidad: String(m.cantidad), costo: String(m.costo || ""), ubicacion: m.ubicacion, notas: m.notas, estado: m.estado }); }}
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}
              >
                <Pencil size={16} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.primary }}>{m.cantidad}</div>
              <div style={{ fontSize: 11, color: C.muted }}>en existencia</div>
              <div style={{ flex: 1 }} />
              <button onClick={() => setVerMovimientosDe(m)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, color: C.foreground, cursor: "pointer" }}>
                <History size={12} /> Movimientos
              </button>
            </div>
          </div>
        ))}
      </div>

      <FAB color={C.primary} onClick={() => setModalAlta(true)} />

      {modalAlta && (
        <Modal title="Nuevo mobiliario" onClose={() => setModalAlta(false)}>
          <FieldLabel>Tipo</FieldLabel>
          <SelectorTiposEditable
            tipos={tiposMobiliario}
            valor={nuevo.tipo}
            onSeleccionar={(t) => setNuevo({ ...nuevo, tipo: t })}
            onAgregar={agregarTipoMobiliario}
            onQuitar={quitarTipoMobiliario}
            enUso={tipoMobiliarioEnUso}
          />
          <FieldLabel>Modelo</FieldLabel>
          <TextInput value={nuevo.modelo} onChange={(e) => setNuevo({ ...nuevo, modelo: e.target.value })} placeholder="Ej. HP EliteDesk 800" />
          <FieldLabel>Cantidad</FieldLabel>
          <TextInput type="number" value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} placeholder="0" />
          <FieldLabel>Costo unitario (opcional)</FieldLabel>
          <TextInput type="number" value={nuevo.costo} onChange={(e) => setNuevo({ ...nuevo, costo: e.target.value })} placeholder="$0" />
          <FieldLabel>Ubicación (opcional)</FieldLabel>
          <TextInput value={nuevo.ubicacion} onChange={(e) => setNuevo({ ...nuevo, ubicacion: e.target.value })} placeholder="Ej. Recepción" />
          <FieldLabel>Notas (opcional)</FieldLabel>
          <TextInput value={nuevo.notas} onChange={(e) => setNuevo({ ...nuevo, notas: e.target.value })} placeholder="Ej. número de serie" />
          <PrimaryButton onClick={confirmarAlta} disabled={!nuevo.modelo.trim() || nuevo.cantidad === ""}>Agregar</PrimaryButton>
        </Modal>
      )}

      {editando && (
        <Modal title="Editar mobiliario" onClose={() => setEditando(null)}>
          <FieldLabel>Tipo</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            {tiposMobiliario.map((t) => (
              <FilterPill key={t} label={t} active={form.tipo === t} onClick={() => setForm({ ...form, tipo: t })} />
            ))}
          </div>
          <FieldLabel>Modelo</FieldLabel>
          <TextInput value={form.modelo || ""} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
          <FieldLabel>Cantidad</FieldLabel>
          <TextInput type="number" value={form.cantidad ?? ""} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
          <FieldLabel>Costo unitario</FieldLabel>
          <TextInput type="number" value={form.costo ?? ""} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
          <FieldLabel>Ubicación</FieldLabel>
          <TextInput value={form.ubicacion || ""} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
          <FieldLabel>Notas</FieldLabel>
          <TextInput value={form.notas || ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          <FieldLabel>Estado</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ESTADOS_MOBILIARIO.map((es) => (
              <FilterPill key={es} label={es} active={form.estado === es} onClick={() => setForm({ ...form, estado: es })} color={estadoColorDe(es)} />
            ))}
          </div>
          <PrimaryButton onClick={guardarEdicion} disabled={!(form.modelo || "").trim()}>Guardar cambios</PrimaryButton>
          <button
            onClick={() => setPorEliminar(editando)}
            style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Trash2 size={14} /> Eliminar
          </button>
        </Modal>
      )}

      {porEliminar && (
        <Modal title="Eliminar mobiliario" onClose={() => setPorEliminar(null)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>¿Eliminar "{porEliminar.tipo} — {porEliminar.modelo}"? Esto no se puede deshacer.</div>
          <PrimaryButton onClick={eliminar} color={C.error}>Sí, eliminar</PrimaryButton>
        </Modal>
      )}

      {verMovimientosDe && (
        <Modal title={`Movimientos: ${verMovimientosDe.modelo}`} onClose={() => setVerMovimientosDe(null)}>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>
            Existencia actual: <strong style={{ color: C.foreground }}>{verMovimientosDe.cantidad}</strong> — código {codigoArticulo("MOB", sucursal, verMovimientosDe.id)}
          </div>
          {(!verMovimientosDe.movimientos || verMovimientosDe.movimientos.length === 0) && (
            <div style={{ fontSize: 13, color: C.muted }}>Todavía no hay movimientos registrados.</div>
          )}
          {[...(verMovimientosDe.movimientos || [])].reverse().map((mv) => (
            <div key={mv.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 12, color: C.foreground }}>{mv.nota}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{mv.fecha}{mv.quien ? ` · ${mv.quien}` : ""}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: mv.cantidad >= 0 ? C.success : C.error }}>{mv.cantidad >= 0 ? `+${mv.cantidad}` : mv.cantidad}</span>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   PANTALLA: Piezas y Catálogos — Reconocimientos, piezas sueltas de
   producción y gafetes. Tres listas del documento con la misma estructura
   simple: existencia + costo, sin préstamo. Se agrupan en una pantalla.
   ========================================================================= */
function PiezasScreen({ data, setData, bitacora, usuarioActual, mostrarToast, config, sucursal, onBack }) {
  const [search, setSearch] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState("Todas");
  const [modalAlta, setModalAlta] = useState(false);
  const [nuevo, setNuevo] = useState({ grupo: "Reconocimientos", tipo: "Trofeo", detalle: "", cantidad: "", costo: "", notas: "" });
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [porEliminar, setPorEliminar] = useState(null);
  const [verMovimientosDe, setVerMovimientosDe] = useState(null);

  const tiposPorGrupoPieza = data.tiposPorGrupoPieza || TIPOS_POR_GRUPO;
  const tiposDeGrupo = (g) => (tiposPorGrupoPieza[g] && tiposPorGrupoPieza[g].length > 0 ? tiposPorGrupoPieza[g] : TIPOS_POR_GRUPO[g] || []);
  const agregarTipoPieza = (g, t) =>
    setData((d) => {
      const actual = d.tiposPorGrupoPieza || TIPOS_POR_GRUPO;
      const listaGrupo = actual[g] && actual[g].length > 0 ? actual[g] : TIPOS_POR_GRUPO[g] || [];
      return { ...d, tiposPorGrupoPieza: { ...actual, [g]: [...listaGrupo, t] } };
    });
  const quitarTipoPieza = (g, t) =>
    setData((d) => {
      const actual = d.tiposPorGrupoPieza || TIPOS_POR_GRUPO;
      const listaGrupo = actual[g] && actual[g].length > 0 ? actual[g] : TIPOS_POR_GRUPO[g] || [];
      return { ...d, tiposPorGrupoPieza: { ...actual, [g]: listaGrupo.filter((x) => x !== t) } };
    });
  const tipoPiezaEnUso = (g, t) => (data.piezas || []).some((p) => p.grupo === g && p.tipo === t);

  const items = (data.piezas || [])
    .filter((p) => grupoFiltro === "Todas" || p.grupo === grupoFiltro)
    .filter((p) => `${p.grupo} ${p.tipo} ${p.detalle}`.toLowerCase().includes(search.toLowerCase()));

  const confirmarAlta = () => {
    if (!nuevo.grupo || !nuevo.tipo || nuevo.cantidad === "") return;
    const nuevoId = Math.max(0, ...(data.piezas || []).map((p) => p.id)) + 1;
    const cant = parseInt(nuevo.cantidad, 10) || 0;
    setData((d) => ({
      ...d,
      piezas: [
        ...(d.piezas || []),
        {
          id: nuevoId,
          grupo: nuevo.grupo,
          tipo: nuevo.tipo,
          detalle: nuevo.detalle.trim(),
          cantidad: cant,
          costo: parseFloat(nuevo.costo) || 0,
          notas: nuevo.notas.trim(),
          movimientos: cant > 0 ? [movimientoBase("entrada", cant, usuarioActual, "Alta inicial")] : [],
        },
      ],
    }));
    bitacora(`Nueva pieza agregada: ${nuevo.tipo}${nuevo.detalle ? ` (${nuevo.detalle})` : ""} ×${cant}`, usuarioActual);
    mostrarToast("Agregado ✓");
    setModalAlta(false);
    setNuevo({ grupo: "Reconocimientos", tipo: "Trofeo", detalle: "", cantidad: "", costo: "", notas: "" });
  };

  const guardarEdicion = () => {
    const item = editando;
    const sinMinimo = form.minimo === "" || form.minimo === undefined || form.minimo === null;
    const cambios = {
      grupo: form.grupo || item.grupo,
      tipo: (form.tipo || item.tipo || "").trim(),
      detalle: (form.detalle || "").trim(),
      costo: parseFloat(form.costo) || 0,
      notas: form.notas || "",
    };
    const nuevaCant = parseInt(form.cantidad, 10);
    const diferencia = !isNaN(nuevaCant) ? nuevaCant - item.cantidad : 0;
    setData((d) => ({
      ...d,
      piezas: d.piezas.map((p) => {
        if (p.id !== item.id) return p;
        const actualizado = {
          ...p,
          ...cambios,
          cantidad: !isNaN(nuevaCant) ? nuevaCant : p.cantidad,
          movimientos: diferencia !== 0 ? [...(p.movimientos || []), movimientoBase("ajuste", diferencia, usuarioActual, "Ajuste manual de existencias")] : p.movimientos,
        };
        // La nube no acepta valores indefinidos: si la pieza no tiene
        // mínimo propio se quita la llave en vez de dejarla vacía.
        if (sinMinimo) delete actualizado.minimo;
        else actualizado.minimo = parseInt(form.minimo, 10) || 0;
        return actualizado;
      }),
    }));
    bitacora(`Pieza editada: ${cambios.tipo}${cambios.detalle ? ` (${cambios.detalle})` : ""}`, usuarioActual);
    mostrarToast("Cambios guardados ✓");
    setEditando(null);
  };

  const eliminar = () => {
    setData((d) => ({ ...d, piezas: d.piezas.filter((p) => p.id !== porEliminar.id) }));
    bitacora(`Pieza eliminada: ${porEliminar.tipo}${porEliminar.detalle ? ` (${porEliminar.detalle})` : ""}`, usuarioActual);
    mostrarToast("Eliminado");
    setPorEliminar(null);
    setEditando(null);
  };

  return (
    <div style={{ paddingBottom: 90, minHeight: "100vh" }}>
      <SectionHeader title="Piezas y Catálogos" subtitle="Reconocimientos, piezas de producción y gafetes" onBack={onBack} />
      <SearchBar placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 16px 0" }}>
        <FilterPill label="Todas" active={grupoFiltro === "Todas"} onClick={() => setGrupoFiltro("Todas")} />
        {GRUPOS_PIEZA.map((g) => (
          <FilterPill key={g} label={g} active={grupoFiltro === g} onClick={() => setGrupoFiltro(g)} />
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {items.length === 0 && <EmptyState icon={Layers} text="No hay piezas capturadas todavía con estos filtros." />}
        {items.map((p) => {
          const min = minimoDe(p, config);
          const bajo = p.cantidad <= min;
          return (
            <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14, boxShadow: SOMBRA_TARJETA }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{p.tipo}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, background: C.background, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 8px" }}>{p.grupo}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{p.detalle || "Sin detalle"}{p.costo ? ` · ${fmtMoneda(p.costo)}` : ""}</div>
                  {p.notas && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{p.notas}</div>}
                  <div style={{ fontSize: 10.5, color: C.muted, fontFamily: "monospace", marginTop: 2 }}>{codigoArticulo("PZA", sucursal, p.id)}</div>
                </div>
                <button
                  onClick={() => { setEditando(p); setForm({ grupo: p.grupo, tipo: p.tipo, detalle: p.detalle, cantidad: String(p.cantidad), costo: String(p.costo || ""), notas: p.notas, minimo: p.minimo ?? "" }); }}
                  style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}
                >
                  <Pencil size={16} />
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: bajo ? C.warning : C.primary }}>{p.cantidad}</div>
                <div style={{ fontSize: 11, color: C.muted }}>en existencia {bajo && <LowStockBadge />}</div>
                <div style={{ flex: 1 }} />
                <button onClick={() => setVerMovimientosDe(p)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, color: C.foreground, cursor: "pointer" }}>
                  <History size={12} /> Movimientos
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <FAB color={C.primary} onClick={() => setModalAlta(true)} />

      {modalAlta && (
        <Modal title="Nueva pieza" onClose={() => setModalAlta(false)}>
          <FieldLabel>Grupo</FieldLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {GRUPOS_PIEZA.map((g) => (
              <FilterPill key={g} label={g} active={nuevo.grupo === g} onClick={() => setNuevo({ ...nuevo, grupo: g, tipo: tiposDeGrupo(g)[0] || "" })} />
            ))}
          </div>
          <FieldLabel>Tipo</FieldLabel>
          <SelectorTiposEditable
            tipos={tiposDeGrupo(nuevo.grupo)}
            valor={nuevo.tipo}
            onSeleccionar={(t) => setNuevo({ ...nuevo, tipo: t })}
            onAgregar={(t) => agregarTipoPieza(nuevo.grupo, t)}
            onQuitar={(t) => quitarTipoPieza(nuevo.grupo, t)}
            enUso={(t) => tipoPiezaEnUso(nuevo.grupo, t)}
          />
          <FieldLabel>Detalle (opcional)</FieldLabel>
          <TextInput value={nuevo.detalle} onChange={(e) => setNuevo({ ...nuevo, detalle: e.target.value })} placeholder="Ej. color, tamaño..." />
          <FieldLabel>Cantidad inicial</FieldLabel>
          <TextInput type="number" value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} placeholder="0" />
          <FieldLabel>Costo unitario (opcional)</FieldLabel>
          <TextInput type="number" value={nuevo.costo} onChange={(e) => setNuevo({ ...nuevo, costo: e.target.value })} placeholder="$0" />
          <FieldLabel>Notas (opcional)</FieldLabel>
          <TextInput value={nuevo.notas} onChange={(e) => setNuevo({ ...nuevo, notas: e.target.value })} />
          <PrimaryButton onClick={confirmarAlta} disabled={nuevo.cantidad === ""}>Agregar</PrimaryButton>
        </Modal>
      )}

      {editando && (
        <Modal title="Editar pieza" onClose={() => setEditando(null)}>
          <FieldLabel>Grupo</FieldLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {GRUPOS_PIEZA.map((g) => (
              <FilterPill key={g} label={g} active={form.grupo === g} onClick={() => setForm({ ...form, grupo: g })} />
            ))}
          </div>
          <FieldLabel>Tipo</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            {tiposDeGrupo(form.grupo).map((t) => (
              <FilterPill key={t} label={t} active={form.tipo === t} onClick={() => setForm({ ...form, tipo: t })} />
            ))}
          </div>
          <FieldLabel>Detalle</FieldLabel>
          <TextInput value={form.detalle || ""} onChange={(e) => setForm({ ...form, detalle: e.target.value })} />
          <FieldLabel>Cantidad</FieldLabel>
          <TextInput type="number" value={form.cantidad ?? ""} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
          <FieldLabel>Avisar cuando queden menos de (deja vacío para usar el general: {config.umbralStock})</FieldLabel>
          <TextInput type="number" value={form.minimo ?? ""} onChange={(e) => setForm({ ...form, minimo: e.target.value })} placeholder={String(config.umbralStock)} />
          <FieldLabel>Costo unitario</FieldLabel>
          <TextInput type="number" value={form.costo ?? ""} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
          <FieldLabel>Notas</FieldLabel>
          <TextInput value={form.notas || ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          <PrimaryButton onClick={guardarEdicion}>Guardar cambios</PrimaryButton>
          <button
            onClick={() => setPorEliminar(editando)}
            style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Trash2 size={14} /> Eliminar
          </button>
        </Modal>
      )}

      {porEliminar && (
        <Modal title="Eliminar pieza" onClose={() => setPorEliminar(null)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>¿Eliminar "{porEliminar.tipo}{porEliminar.detalle ? ` (${porEliminar.detalle})` : ""}"? Esto no se puede deshacer.</div>
          <PrimaryButton onClick={eliminar} color={C.error}>Sí, eliminar</PrimaryButton>
        </Modal>
      )}

      {verMovimientosDe && (
        <Modal title={`Movimientos: ${verMovimientosDe.tipo}`} onClose={() => setVerMovimientosDe(null)}>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>
            Existencia actual: <strong style={{ color: C.foreground }}>{verMovimientosDe.cantidad}</strong> — código {codigoArticulo("PZA", sucursal, verMovimientosDe.id)}
          </div>
          {(!verMovimientosDe.movimientos || verMovimientosDe.movimientos.length === 0) && (
            <div style={{ fontSize: 13, color: C.muted }}>Todavía no hay movimientos registrados.</div>
          )}
          {[...(verMovimientosDe.movimientos || [])].reverse().map((mv) => (
            <div key={mv.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 12, color: C.foreground }}>{mv.nota}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{mv.fecha}{mv.quien ? ` · ${mv.quien}` : ""}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: mv.cantidad >= 0 ? C.success : C.error }}>{mv.cantidad >= 0 ? `+${mv.cantidad}` : mv.cantidad}</span>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   PANTALLA: Placas por hoja — hoja grande (30x60 / 60x120) que se corta en
   placas chicas de cada formato de paquete. El rendimiento (cuántas chicas
   salen de una hoja) lo configura el administrador; sin eso capturado, la
   producción no se puede registrar — mejor bloquear que inventar un número.
   ========================================================================= */
function PlacasScreen({ data, setData, bitacora, usuarioActual, mostrarToast, config, sucursal, onBack }) {
  const [tab, setTab] = useState("grandes");
  const [modalAlta, setModalAlta] = useState(false);
  const [nuevaHoja, setNuevaHoja] = useState({ tamaño: "30x60", cantidad: "", costo: "" });
  const [nuevaChica, setNuevaChica] = useState({ tipo: "Individual", cantidad: "", costo: "" });
  const [editandoHoja, setEditandoHoja] = useState(null);
  const [editandoChica, setEditandoChica] = useState(null);
  const [form, setForm] = useState({});
  const [porEliminar, setPorEliminar] = useState(null); // { tipo: 'hoja'|'chica', item }
  const [verMovimientosDe, setVerMovimientosDe] = useState(null); // { tipo, item }
  const [produciendo, setProduciendo] = useState(false);
  const [prodForm, setProdForm] = useState({ tamaño: "30x60", tipo: "Individual", hojasUsadas: "1" });

  const tiposPlacaChica = data.tiposPlacaChica && data.tiposPlacaChica.length > 0 ? data.tiposPlacaChica : TIPOS_PLACA_CHICA;
  const agregarTipoPlacaChica = (t) => setData((d) => ({ ...d, tiposPlacaChica: [...(d.tiposPlacaChica && d.tiposPlacaChica.length > 0 ? d.tiposPlacaChica : TIPOS_PLACA_CHICA), t] }));
  const quitarTipoPlacaChica = (t) => setData((d) => ({ ...d, tiposPlacaChica: (d.tiposPlacaChica && d.tiposPlacaChica.length > 0 ? d.tiposPlacaChica : TIPOS_PLACA_CHICA).filter((x) => x !== t) }));
  const tipoPlacaChicaEnUso = (t) => (data.placasChicas || []).some((p) => p.tipo === t);

  const hojas = data.hojasGrandes || [];
  const chicas = data.placasChicas || [];
  const rendimientos = data.rendimientos || {};

  const guardarRendimiento = (tamaño, tipo, valor) => {
    setData((d) => ({ ...d, rendimientos: { ...d.rendimientos, [tamaño]: { ...(d.rendimientos?.[tamaño] || {}), [tipo]: valor } } }));
  };

  const confirmarAltaHoja = () => {
    if (nuevaHoja.cantidad === "") return;
    const nuevoId = Math.max(0, ...hojas.map((h) => h.id)) + 1;
    const cant = parseInt(nuevaHoja.cantidad, 10) || 0;
    setData((d) => ({
      ...d,
      hojasGrandes: [...(d.hojasGrandes || []), { id: nuevoId, tamaño: nuevaHoja.tamaño, cantidad: cant, costo: parseFloat(nuevaHoja.costo) || 0, movimientos: cant > 0 ? [movimientoBase("entrada", cant, usuarioActual, "Alta inicial")] : [] }],
    }));
    bitacora(`Hoja grande agregada: ${nuevaHoja.tamaño} ×${cant}`, usuarioActual);
    mostrarToast("Agregado ✓");
    setModalAlta(false);
    setNuevaHoja({ tamaño: "30x60", cantidad: "", costo: "" });
  };

  const confirmarAltaChica = () => {
    if (nuevaChica.cantidad === "") return;
    const nuevoId = Math.max(0, ...chicas.map((p) => p.id)) + 1;
    const cant = parseInt(nuevaChica.cantidad, 10) || 0;
    setData((d) => ({
      ...d,
      placasChicas: [...(d.placasChicas || []), { id: nuevoId, tipo: nuevaChica.tipo, cantidad: cant, costo: parseFloat(nuevaChica.costo) || 0, movimientos: cant > 0 ? [movimientoBase("entrada", cant, usuarioActual, "Alta inicial")] : [] }],
    }));
    bitacora(`Placa chica agregada: ${nuevaChica.tipo} ×${cant}`, usuarioActual);
    mostrarToast("Agregado ✓");
    setModalAlta(false);
    setNuevaChica({ tipo: "Individual", cantidad: "", costo: "" });
  };

  const guardarEdicionHoja = () => {
    const item = editandoHoja;
    const nuevaCant = parseInt(form.cantidad, 10);
    const diferencia = !isNaN(nuevaCant) ? nuevaCant - item.cantidad : 0;
    setData((d) => ({
      ...d,
      hojasGrandes: d.hojasGrandes.map((h) =>
        h.id === item.id
          ? { ...h, tamaño: form.tamaño || h.tamaño, costo: parseFloat(form.costo) || 0, cantidad: !isNaN(nuevaCant) ? nuevaCant : h.cantidad, movimientos: diferencia !== 0 ? [...(h.movimientos || []), movimientoBase("ajuste", diferencia, usuarioActual, "Ajuste manual")] : h.movimientos }
          : h
      ),
    }));
    bitacora(`Hoja grande editada: ${form.tamaño}`, usuarioActual);
    mostrarToast("Cambios guardados ✓");
    setEditandoHoja(null);
  };

  const guardarEdicionChica = () => {
    const item = editandoChica;
    const nuevaCant = parseInt(form.cantidad, 10);
    const diferencia = !isNaN(nuevaCant) ? nuevaCant - item.cantidad : 0;
    setData((d) => ({
      ...d,
      placasChicas: d.placasChicas.map((p) =>
        p.id === item.id
          ? { ...p, tipo: form.tipo || p.tipo, costo: parseFloat(form.costo) || 0, cantidad: !isNaN(nuevaCant) ? nuevaCant : p.cantidad, movimientos: diferencia !== 0 ? [...(p.movimientos || []), movimientoBase("ajuste", diferencia, usuarioActual, "Ajuste manual")] : p.movimientos }
          : p
      ),
    }));
    bitacora(`Placa chica editada: ${form.tipo}`, usuarioActual);
    mostrarToast("Cambios guardados ✓");
    setEditandoChica(null);
  };

  const eliminar = () => {
    const { tipo, item } = porEliminar;
    if (tipo === "hoja") setData((d) => ({ ...d, hojasGrandes: d.hojasGrandes.filter((h) => h.id !== item.id) }));
    else setData((d) => ({ ...d, placasChicas: d.placasChicas.filter((p) => p.id !== item.id) }));
    bitacora(`${tipo === "hoja" ? "Hoja grande" : "Placa chica"} eliminada: ${item.tamaño || item.tipo}`, usuarioActual);
    mostrarToast("Eliminado");
    setPorEliminar(null);
    setEditandoHoja(null);
    setEditandoChica(null);
  };

  /* Producir: consume N hojas del tamaño elegido y suma al tipo de placa
     chica lo que dé el rendimiento configurado. Si el rendimiento no está
     capturado (0), no se deja producir — evita que la app calcule con un
     número que nadie confirmó. */
  const hojaDisponible = hojas.find((h) => h.tamaño === prodForm.tamaño);
  const rendimiento = rendimientoDe(rendimientos, prodForm.tamaño, prodForm.tipo);
  const hojasUsadas = parseInt(prodForm.hojasUsadas, 10) || 0;
  const resultante = hojasUsadas * rendimiento;

  const confirmarProduccion = () => {
    if (!hojaDisponible || hojasUsadas < 1 || hojasUsadas > hojaDisponible.cantidad || rendimiento < 1) return;
    setData((d) => {
      const hojasGrandes = d.hojasGrandes.map((h) =>
        h.id === hojaDisponible.id
          ? { ...h, cantidad: h.cantidad - hojasUsadas, movimientos: [...(h.movimientos || []), movimientoBase("salida-entrega", -hojasUsadas, usuarioActual, `Cortada en placas ${prodForm.tipo}`)] }
          : h
      );
      const yaExiste = (d.placasChicas || []).some((p) => p.tipo === prodForm.tipo);
      const placasChicas = yaExiste
        ? d.placasChicas.map((p) => (p.tipo === prodForm.tipo ? { ...p, cantidad: p.cantidad + resultante, movimientos: [...(p.movimientos || []), movimientoBase("entrada", resultante, usuarioActual, `Producidas de ${hojasUsadas} hoja(s) ${prodForm.tamaño}`)] } : p))
        : [
            ...(d.placasChicas || []),
            { id: Math.max(0, ...(d.placasChicas || []).map((p) => p.id)) + 1, tipo: prodForm.tipo, cantidad: resultante, costo: 0, movimientos: [movimientoBase("entrada", resultante, usuarioActual, `Producidas de ${hojasUsadas} hoja(s) ${prodForm.tamaño}`)] },
          ];
      const produccionPlacas = [
        ...(d.produccionPlacas || []),
        { id: Date.now(), fecha: fmt(hoy), tamaño: prodForm.tamaño, tipo: prodForm.tipo, hojasUsadas, resultante, quien: usuarioActual },
      ];
      return { ...d, hojasGrandes, placasChicas, produccionPlacas };
    });
    bitacora(`Producción de placas: ${hojasUsadas} hoja(s) ${prodForm.tamaño} → ${resultante} placa(s) ${prodForm.tipo}`, usuarioActual);
    mostrarToast(`${resultante} placa(s) producida(s) ✓`);
    setProduciendo(false);
    setProdForm({ tamaño: "30x60", tipo: "Individual", hojasUsadas: "1" });
  };

  return (
    <div style={{ paddingBottom: 90, minHeight: "100vh" }}>
      <SectionHeader title="Placas por hoja" subtitle="Hoja grande y placas chicas" onBack={onBack} />

      <div style={{ margin: "0 16px 4px" }}>
        <button
          onClick={() => setProduciendo(true)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: C.primary, color: textoContraste(C.primary), border: "none", borderRadius: 10, padding: "13px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          <Scissors size={16} /> Producir placas desde una hoja
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "16px 16px 0" }}>
        <FilterPill label={`Hojas grandes (${hojas.length})`} active={tab === "grandes"} onClick={() => setTab("grandes")} />
        <FilterPill label={`Placas chicas (${chicas.length})`} active={tab === "chicas"} onClick={() => setTab("chicas")} color={C.secondary} />
      </div>

      <div style={{ padding: 16 }}>
        {tab === "grandes" && (
          <>
            {hojas.length === 0 && <EmptyState icon={Grid2x2} text="No hay hojas grandes capturadas." />}
            {hojas.map((h) => {
              const min = minimoDe(h, config);
              const bajo = h.cantidad <= min;
              return (
                <div key={h.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14, boxShadow: SOMBRA_TARJETA }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>Hoja {h.tamaño}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{h.costo ? `${fmtMoneda(h.costo)} c/u` : "Sin costo capturado"}</div>
                      <div style={{ fontSize: 10.5, color: C.muted, fontFamily: "monospace", marginTop: 2 }}>{codigoArticulo("HOJA", sucursal, h.id)}</div>
                    </div>
                    <button onClick={() => { setEditandoHoja(h); setForm({ tamaño: h.tamaño, cantidad: String(h.cantidad), costo: String(h.costo || "") }); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
                      <Pencil size={16} />
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: bajo ? C.warning : C.primary }}>{h.cantidad}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>en existencia {bajo && <LowStockBadge />}</div>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setVerMovimientosDe({ tipo: "hoja", item: h })} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, color: C.foreground, cursor: "pointer" }}>
                      <History size={12} /> Movimientos
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => { setModalAlta(true); setNuevaHoja({ tamaño: "30x60", cantidad: "", costo: "" }); }}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", border: `1.5px dashed ${C.border}`, borderRadius: 10, padding: "12px 16px", fontSize: 13.5, fontWeight: 600, color: C.foreground, cursor: "pointer" }}
            >
              <Plus size={16} /> Agregar hoja grande
            </button>
          </>
        )}

        {tab === "chicas" && (
          <>
            {chicas.length === 0 && <EmptyState icon={Layers} text="No hay placas chicas capturadas." />}
            {chicas.map((p) => {
              const min = minimoDe(p, config);
              const bajo = p.cantidad <= min;
              return (
                <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14, boxShadow: SOMBRA_TARJETA }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{p.tipo}</div>
                      {!!p.costo && <div style={{ fontSize: 12, color: C.muted }}>{fmtMoneda(p.costo)} c/u</div>}
                      <div style={{ fontSize: 10.5, color: C.muted, fontFamily: "monospace", marginTop: 2 }}>{codigoArticulo("PLACA", sucursal, p.id)}</div>
                    </div>
                    <button onClick={() => { setEditandoChica(p); setForm({ tipo: p.tipo, cantidad: String(p.cantidad), costo: String(p.costo || "") }); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
                      <Pencil size={16} />
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: bajo ? C.warning : C.primary }}>{p.cantidad}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>en existencia {bajo && <LowStockBadge />}</div>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setVerMovimientosDe({ tipo: "chica", item: p })} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, color: C.foreground, cursor: "pointer" }}>
                      <History size={12} /> Movimientos
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => { setModalAlta(true); setNuevaChica({ tipo: "Individual", cantidad: "", costo: "" }); }}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", border: `1.5px dashed ${C.border}`, borderRadius: 10, padding: "12px 16px", fontSize: 13.5, fontWeight: 600, color: C.foreground, cursor: "pointer" }}
            >
              <Plus size={16} /> Agregar placa chica
            </button>
          </>
        )}
      </div>

      {produciendo && (
        <Modal title="Producir placas" onClose={() => setProduciendo(false)}>
          <FieldLabel>¿De qué tamaño de hoja?</FieldLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            {TAMANOS_HOJA.map((t) => (
              <FilterPill key={t} label={t} active={prodForm.tamaño === t} onClick={() => setProdForm({ ...prodForm, tamaño: t })} />
            ))}
          </div>
          <FieldLabel>¿Qué placa chica se va a cortar?</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 130, overflowY: "auto", marginBottom: 4 }}>
            {tiposPlacaChica.map((t) => (
              <FilterPill key={t} label={t} active={prodForm.tipo === t} onClick={() => setProdForm({ ...prodForm, tipo: t })} color={C.secondary} />
            ))}
          </div>
          <FieldLabel>¿Cuántas hojas se van a usar?</FieldLabel>
          <TextInput type="number" value={prodForm.hojasUsadas} onChange={(e) => setProdForm({ ...prodForm, hojasUsadas: e.target.value })} />

          <div style={{ background: rendimiento > 0 ? `${C.success}12` : `${C.error}12`, border: `1px solid ${rendimiento > 0 ? C.success : C.error}`, borderRadius: 10, padding: 12, marginTop: 10 }}>
            {rendimiento > 0 ? (
              <>
                <div style={{ fontSize: 12.5, color: C.muted }}>De {hojasUsadas || 0} hoja(s) {prodForm.tamaño} salen:</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.foreground }}>{resultante} placa(s) de {prodForm.tipo}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>({rendimiento} por hoja, configurado en Ajustes)</div>
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: C.error }}>
                Todavía no está configurado cuántas placas de "{prodForm.tipo}" salen de una hoja {prodForm.tamaño}. Pídele al administrador que lo capture en Ajustes → Rendimiento de placas antes de producir.
              </div>
            )}
            {hojaDisponible && hojasUsadas > hojaDisponible.cantidad && (
              <div style={{ fontSize: 12, color: C.error, marginTop: 6 }}>Solo hay {hojaDisponible.cantidad} hoja(s) {prodForm.tamaño} en existencia.</div>
            )}
            {!hojaDisponible && <div style={{ fontSize: 12, color: C.error, marginTop: 6 }}>No hay hojas {prodForm.tamaño} capturadas todavía.</div>}
          </div>

          <PrimaryButton
            onClick={confirmarProduccion}
            disabled={!hojaDisponible || hojasUsadas < 1 || hojasUsadas > (hojaDisponible?.cantidad || 0) || rendimiento < 1}
          >
            Confirmar producción
          </PrimaryButton>
        </Modal>
      )}

      {modalAlta && tab === "grandes" && (
        <Modal title="Nueva hoja grande" onClose={() => setModalAlta(false)}>
          <FieldLabel>Tamaño</FieldLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            {TAMANOS_HOJA.map((t) => (
              <FilterPill key={t} label={t} active={nuevaHoja.tamaño === t} onClick={() => setNuevaHoja({ ...nuevaHoja, tamaño: t })} />
            ))}
          </div>
          <FieldLabel>Cantidad inicial</FieldLabel>
          <TextInput type="number" value={nuevaHoja.cantidad} onChange={(e) => setNuevaHoja({ ...nuevaHoja, cantidad: e.target.value })} placeholder="0" />
          <FieldLabel>Costo unitario (opcional)</FieldLabel>
          <TextInput type="number" value={nuevaHoja.costo} onChange={(e) => setNuevaHoja({ ...nuevaHoja, costo: e.target.value })} placeholder="$0" />
          <PrimaryButton onClick={confirmarAltaHoja} disabled={nuevaHoja.cantidad === ""}>Agregar</PrimaryButton>
        </Modal>
      )}

      {modalAlta && tab === "chicas" && (
        <Modal title="Nueva placa chica" onClose={() => setModalAlta(false)}>
          <FieldLabel>Tipo</FieldLabel>
          <SelectorTiposEditable
            tipos={tiposPlacaChica}
            valor={nuevaChica.tipo}
            onSeleccionar={(t) => setNuevaChica({ ...nuevaChica, tipo: t })}
            onAgregar={agregarTipoPlacaChica}
            onQuitar={quitarTipoPlacaChica}
            enUso={tipoPlacaChicaEnUso}
          />
          <FieldLabel>Cantidad inicial</FieldLabel>
          <TextInput type="number" value={nuevaChica.cantidad} onChange={(e) => setNuevaChica({ ...nuevaChica, cantidad: e.target.value })} placeholder="0" />
          <FieldLabel>Costo unitario (opcional)</FieldLabel>
          <TextInput type="number" value={nuevaChica.costo} onChange={(e) => setNuevaChica({ ...nuevaChica, costo: e.target.value })} placeholder="$0" />
          <PrimaryButton onClick={confirmarAltaChica} disabled={nuevaChica.cantidad === ""}>Agregar</PrimaryButton>
        </Modal>
      )}

      {editandoHoja && (
        <Modal title="Editar hoja grande" onClose={() => setEditandoHoja(null)}>
          <FieldLabel>Tamaño</FieldLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            {TAMANOS_HOJA.map((t) => (
              <FilterPill key={t} label={t} active={form.tamaño === t} onClick={() => setForm({ ...form, tamaño: t })} />
            ))}
          </div>
          <FieldLabel>Cantidad</FieldLabel>
          <TextInput type="number" value={form.cantidad ?? ""} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
          <FieldLabel>Costo unitario</FieldLabel>
          <TextInput type="number" value={form.costo ?? ""} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
          <PrimaryButton onClick={guardarEdicionHoja}>Guardar cambios</PrimaryButton>
          <button onClick={() => setPorEliminar({ tipo: "hoja", item: editandoHoja })} style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Trash2 size={14} /> Eliminar
          </button>
        </Modal>
      )}

      {editandoChica && (
        <Modal title="Editar placa chica" onClose={() => setEditandoChica(null)}>
          <FieldLabel>Tipo</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 130, overflowY: "auto", marginBottom: 4 }}>
            {tiposPlacaChica.map((t) => (
              <FilterPill key={t} label={t} active={form.tipo === t} onClick={() => setForm({ ...form, tipo: t })} />
            ))}
          </div>
          <FieldLabel>Cantidad</FieldLabel>
          <TextInput type="number" value={form.cantidad ?? ""} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
          <FieldLabel>Costo unitario</FieldLabel>
          <TextInput type="number" value={form.costo ?? ""} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
          <PrimaryButton onClick={guardarEdicionChica}>Guardar cambios</PrimaryButton>
          <button onClick={() => setPorEliminar({ tipo: "chica", item: editandoChica })} style={{ width: "100%", background: "none", border: "none", color: C.error, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Trash2 size={14} /> Eliminar
          </button>
        </Modal>
      )}

      {porEliminar && (
        <Modal title="Eliminar" onClose={() => setPorEliminar(null)} danger>
          <div style={{ fontSize: 14, color: C.foreground }}>¿Eliminar "{porEliminar.item.tamaño || porEliminar.item.tipo}"? Esto no se puede deshacer.</div>
          <PrimaryButton onClick={eliminar} color={C.error}>Sí, eliminar</PrimaryButton>
        </Modal>
      )}

      {verMovimientosDe && (
        <Modal title={`Movimientos: ${verMovimientosDe.item.tamaño || verMovimientosDe.item.tipo}`} onClose={() => setVerMovimientosDe(null)}>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>
            Existencia actual: <strong style={{ color: C.foreground }}>{verMovimientosDe.item.cantidad}</strong>
          </div>
          {(!verMovimientosDe.item.movimientos || verMovimientosDe.item.movimientos.length === 0) && (
            <div style={{ fontSize: 13, color: C.muted }}>Todavía no hay movimientos registrados.</div>
          )}
          {[...(verMovimientosDe.item.movimientos || [])].reverse().map((mv) => (
            <div key={mv.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 12, color: C.foreground }}>{mv.nota}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{mv.fecha}{mv.quien ? ` · ${mv.quien}` : ""}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: mv.cantidad >= 0 ? C.success : C.error }}>{mv.cantidad >= 0 ? `+${mv.cantidad}` : mv.cantidad}</span>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   PANTALLA: Mi Inventario — filtra por el usuario actual, no por todos
   ========================================================================= */

function MiInventarioScreen({ allData, usuarioActual }) {
  const mio = Object.entries(allData).flatMap(([s, d]) => d.equipo.filter((e) => e.estado === "En uso" && e.quienLoTiene === usuarioActual).map((e) => ({ ...e, sucursal: NOMBRES_SUCURSAL[s] })));

  return (
    <div style={{ paddingBottom: 90 }}>
      <SectionHeader title="Mi Inventario" subtitle={`Lo que tiene ${usuarioActual}, de ambas sucursales`} />
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginBottom: 12 }}>Equipo en Uso</div>
        {mio.length === 0 && <EmptyState icon={User} text="No tienes equipo prestado en ninguna sucursal." />}
        {mio.map((e) => (
          <InventoryCard key={`${e.sucursal}-${e.id}`} nombre={e.nombre} categoria={`${e.categoria} · ${e.sucursal}`} foto={e.foto} estados={[e.estado]} />
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   PANTALLA: Buscador general
   ========================================================================= */

/* =========================================================================
   PANTALLA: Escanear — usa la cámara real (BarcodeDetector nativo del
   navegador) para leer el QR de un equipo y llevarte directo a su ficha.
   Si el navegador no lo soporta (ej. Safari viejo), cae en captura manual
   del código en vez de dejar la pantalla inútil.
   ========================================================================= */
function EscanearScreen({ sucursalActiva, onClose, onEncontrado }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const ultimosRef = useRef({}); // codigo -> timestamp del último detectado, para no repetir de inmediato
  const [soportado, setSoportado] = useState(true);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [continuo, setContinuo] = useState(false);
  const [historial, setHistorial] = useState([]); // { codigo, resultado, hora } de esta sesión de escaneo

  const procesarDeteccion = (codigo) => {
    const ahora = Date.now();
    const ultimo = ultimosRef.current[codigo] || 0;
    if (ahora - ultimo < 2500) return; // evita registrar el mismo código varias veces mientras sigue en cuadro
    ultimosRef.current[codigo] = ahora;

    if (continuo) {
      const resultado = onEncontrado(codigo, { navegar: false });
      setHistorial((h) => [{ codigo, resultado, hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }, ...h]);
    } else {
      onEncontrado(codigo, { navegar: true });
    }
  };

  useEffect(() => {
    if (!("BarcodeDetector" in window)) {
      setSoportado(false);
      return;
    }
    let activo = true;
    let intervalo;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (!activo) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        intervalo = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codigos = await detector.detect(videoRef.current);
            if (codigos.length > 0) {
              procesarDeteccion(codigos[0].rawValue);
            }
          } catch (e) {
            // Un frame fallido no es grave, se intenta de nuevo en el siguiente.
          }
        }, 400);
      })
      .catch(() => setError("No se pudo acceder a la cámara. Puedes escribir el código a mano."));

    return () => {
      activo = false;
      if (intervalo) clearInterval(intervalo);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [continuo]);

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Escanear" subtitle={continuo ? "Modo continuo — escanea varios seguidos" : "Apunta al código QR de un equipo"} onBack={onClose} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <FilterPill label="Uno a uno" active={!continuo} onClick={() => setContinuo(false)} />
          <FilterPill label="Continuo (varios seguidos)" active={continuo} onClick={() => setContinuo(true)} color={C.secondary} />
        </div>
        {soportado && !error && (
          <div style={{ borderRadius: 16, overflow: "hidden", background: "#000", marginBottom: 16, position: "relative" }}>
            <video ref={videoRef} muted playsInline style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, border: `3px solid ${C.primary}80`, borderRadius: 16, pointerEvents: "none" }} />
          </div>
        )}
        {(!soportado || error) && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", gap: 10 }}>
            <AlertTriangle size={18} color={C.warning} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: C.foreground }}>
              {error || "Tu navegador no soporta escaneo automático de QR. Escribe el código que aparece debajo del QR (ej. EQ-queretaro-2)."}
            </div>
          </div>
        )}
        <FieldLabel>O escribe el código a mano</FieldLabel>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <TextInput value={manual} onChange={(e) => setManual(e.target.value)} placeholder="EQ-queretaro-2" />
          </div>
          <button
            onClick={() => { if (manual) { procesarDeteccion(manual); setManual(""); } }}
            style={{ background: C.primary, color: textoContraste(C.primary), border: "none", borderRadius: 10, padding: "0 18px", fontWeight: 600, cursor: "pointer" }}
          >
            Buscar
          </button>
        </div>

        {continuo && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.foreground, marginBottom: 8 }}>Escaneados en esta sesión ({historial.length})</div>
            {historial.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>Todavía no escaneas nada — sigue apuntando la cámara a cada código.</div>}
            {historial.map((h, i) => (
              <div key={i} className="pf-pop" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: C.foreground, fontWeight: 600 }}>{h.resultado ? h.resultado.nombre : h.codigo}</span>
                <span style={{ fontSize: 11, color: h.resultado ? C.success : C.error }}>{h.resultado ? h.hora : "no encontrado"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BuscadorGeneral({ data, onClose, onSelect }) {
  const [q, setQ] = useState("");
  const resultados = useMemo(() => {
    if (!q) return [];
    const eq = data.equipo.filter((e) => e.nombre.toLowerCase().includes(q.toLowerCase())).map((e) => ({ tipo: "Equipo", id: e.id, sucursal: e._sucursal, nombre: e.nombre, extra: e.estado }));
    const mat = data.materiales.filter((m) => m.nombre.toLowerCase().includes(q.toLowerCase())).map((m) => ({ tipo: "Material", id: m.id, sucursal: m._sucursal, nombre: m.nombre, extra: `${m.cantidad} en stock` }));
    const bas = data.bases.filter((b) => b.nombre.toLowerCase().includes(q.toLowerCase())).map((b) => ({ tipo: "Base", id: b.id, sucursal: b._sucursal, nombre: b.nombre, extra: `${b.tenemos} disponibles` }));
    return [...eq, ...mat, ...bas];
  }, [q, data]);

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Buscar" onBack={onClose} />
      <SearchBar placeholder="Buscar en equipo, materiales o bases..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div style={{ padding: 16 }}>
        {q && resultados.length === 0 && <div style={{ fontSize: 13, color: C.muted, textAlign: "center", marginTop: 20 }}>Sin resultados.</div>}
        {resultados.map((r, i) => (
          <div
            key={i}
            className={onSelect ? "pf-press" : ""}
            onClick={onSelect ? () => onSelect(r.tipo, r.id, r.sucursal) : undefined}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 10, cursor: onSelect ? "pointer" : "default" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>{r.tipo}</div>
              {r.sucursal && <div style={{ fontSize: 10.5, color: C.primary, fontWeight: 600 }}>{NOMBRES_SUCURSAL[r.sucursal]}</div>}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground, margin: "2px 0" }}>{r.nombre}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{r.extra}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificacionesScreen({ alertas, onBack }) {
  return (
    <div style={{ paddingBottom: 40 }}>
      <SectionHeader title="Notificaciones" subtitle={`${alertas.length} alertas activas`} onBack={onBack} />
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
          Nota: aquí se muestran dentro de la app. Para que lleguen como notificación push al celular con la app cerrada se necesita conectar un servicio como Firebase Cloud Messaging en el backend real.
        </div>
        {alertas.length === 0 && <div style={{ fontSize: 13, color: C.muted, textAlign: "center", marginTop: 24 }}>No hay alertas activas. 🎉</div>}
        {alertas.map((a, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10, borderLeft: `4px solid ${a.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: a.color, textTransform: "uppercase" }}>{a.tipo}</div>
            <div style={{ fontSize: 14, color: C.foreground, marginTop: 4 }}>{a.texto}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportesScreen({ data, config, onBack }) {
  const solicitudes = {};
  data.bitacora.forEach((b) => {
    const match = b.texto.match(/prestado a (.+)$/);
    if (match) solicitudes[match[1]] = (solicitudes[match[1]] || 0) + 1;
  });
  const ranking = Object.entries(solicitudes).sort((a, b) => b[1] - a[1]);
  const equipoRanking = data.equipo
    .map((e) => ({ nombre: e.nombre, veces: e.historial.filter((h) => h.texto.startsWith("Prestado a")).length }))
    .filter((r) => r.veces > 0)
    .sort((a, b) => b.veces - a.veces)
    .slice(0, 5);
  const basesRanking = data.bases
    .map((b) => ({ nombre: b.nombre, veces: b.reservas.filter((r) => r.estado === "Entregada").length }))
    .filter((r) => r.veces > 0)
    .sort((a, b) => b.veces - a.veces)
    .slice(0, 5);
  const usoBases = data.bases.reduce((acc, b) => acc + b.reservas.filter((r) => r.estado === "Entregada").length, 0);
  const stockBajo = data.materiales.filter((m) => m.cantidad <= minimoDe(m, config)).length;

  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  const haceUnaSemana = new Date(inicioSemana);
  haceUnaSemana.setDate(inicioSemana.getDate() - 7);
  const semanaActual = data.bitacora.filter((b) => new Date(b.fecha) >= inicioSemana).length;
  const semanaPasada = data.bitacora.filter((b) => new Date(b.fecha) >= haceUnaSemana && new Date(b.fecha) < inicioSemana).length;

  const compartirWhatsApp = () => {
    const texto = `Resumen Photograf:\n- Equipo en uso: ${data.equipo.filter((e) => e.estado === "En uso").length}\n- Bases entregadas: ${usoBases}\n- Materiales con bajo stock: ${stockBajo}\n- Movimientos esta semana: ${semanaActual}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const valorEquipo = data.equipo.filter((e) => e.estado !== "Baja").reduce((acc, e) => acc + (e.costo || 0), 0);
  const valorMateriales = data.materiales.reduce((acc, m) => acc + (m.costo || 0) * m.cantidad, 0);
  const valorBases = data.bases.reduce((acc, b) => acc + (b.costo || 0) * b.tenemos, 0);
  const valorTotal = valorEquipo + valorMateriales + valorBases;

  return (
    <div id="pf-print-area" style={{ paddingBottom: 40 }}>
      <SectionHeader title="Reportes" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <div
          className="pf-pop"
          style={{
            background: `linear-gradient(135deg, ${shadeColor(C.primary, 6)}, ${shadeColor(C.primary, -22)})`,
            borderRadius: 16,
            padding: "20px 18px",
            marginBottom: 20,
            boxShadow: `0 12px 28px ${C.primary}35`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.secondary}, ${C.primary})` }} />
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Valor total del inventario</div>
          <div className="pf-heading" style={{ fontSize: 30, fontWeight: 700, color: "#fff", marginTop: 5 }}>{fmtMoneda(valorTotal)}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>Equipo</div><div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{fmtMoneda(valorEquipo)}</div></div>
            <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>Materiales</div><div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{fmtMoneda(valorMateriales)}</div></div>
            <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>Bases</div><div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{fmtMoneda(valorBases)}</div></div>
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginBottom: 12 }}>Resumen mensual</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <StatCard icon={Warehouse} value={usoBases} label="Bases entregadas" color={C.secondary} />
          <StatCard icon={AlertTriangle} value={stockBajo} label="Materiales bajos" color={C.warning} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginBottom: 12 }}>Semana actual vs. pasada</div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: C.foreground }}>Esta semana</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.primary }}>{semanaActual} movimientos</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: C.foreground }}>Semana pasada</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.muted }}>{semanaPasada} movimientos</span>
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginBottom: 12 }}>Quién más solicita equipo</div>
        {ranking.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Todavía no hay suficientes préstamos registrados.</div>}
        {ranking.map(([nombre, count]) => (
          <div key={nombre} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.foreground }}>{nombre}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{count}</span>
          </div>
        ))}

        <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginBottom: 12, marginTop: 24 }}>Equipo más solicitado</div>
        {equipoRanking.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Todavía no hay suficientes préstamos registrados.</div>}
        {equipoRanking.map((r) => (
          <div key={r.nombre} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.foreground }}>{r.nombre}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.secondary }}>{r.veces}×</span>
          </div>
        ))}

        <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginBottom: 12, marginTop: 24 }}>Bases más solicitadas</div>
        {basesRanking.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Todavía no hay suficientes entregas registradas.</div>}
        {basesRanking.map((r) => (
          <div key={r.nombre} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.foreground }}>{r.nombre}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.accent1 }}>{r.veces}×</span>
          </div>
        ))}
        <button onClick={compartirWhatsApp} style={{ width: "100%", background: C.success, color: textoContraste(C.success), border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Share2 size={16} /> Compartir resumen por WhatsApp
        </button>
        <button onClick={() => window.print()} style={{ width: "100%", background: "none", border: `1.5px solid ${C.border}`, color: C.foreground, borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          Descargar como PDF
        </button>
        <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 6 }}>Se abre el diálogo de impresión — elige "Guardar como PDF" como destino.</div>
      </div>
    </div>
  );
}

const TOLERANCIA_DIAS = 90; // 3 meses desde la fecha de entrega antes de desarmar un paquete no recogido

function diasTranscurridos(fechaStr) {
  return Math.floor((new Date(fmt(hoy)) - new Date(fechaStr)) / 86400000);
}

function estadoTolerancia(reserva) {
  if (reserva.estado !== "Reservada") return null;
  const dias = diasTranscurridos(reserva.fecha);
  if (dias >= TOLERANCIA_DIAS) return { nivel: "vencido", dias };
  if (dias >= TOLERANCIA_DIAS - 15) return { nivel: "por_vencer", dias };
  return { nivel: "normal", dias };
}

/* Revisa si un equipo ya está comprometido para una fecha: o sigue prestado
   hasta después de esa fecha, o ya está asignado a otro evento ese mismo
   día. Se usa al armar un evento nuevo, para avisar antes de que choque. */
function conflictoDeEquipo(data, equipoId, fecha, excluirEventoId) {
  const item = data.equipo.find((e) => e.id === equipoId);
  if (item && item.estado === "En uso" && item.fechaDevolucion && item.fechaDevolucion >= fecha) {
    return `Sigue prestado hasta el ${item.fechaDevolucion}`;
  }
  const otroEvento = (data.eventos || []).find((ev) => ev.id !== excluirEventoId && ev.fecha === fecha && ev.equipoIds.includes(equipoId));
  if (otroEvento) return `Ya asignado a "${otroEvento.nombre}" ese mismo día`;
  return null;
}

function CalendarioScreen({ data, setData, bitacora, usuarioActual, mostrarToast, onBack }) {
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [equipoIds, setEquipoIds] = useState([]);

  const reservasBases = data.bases.flatMap((b) => b.reservas.map((r) => ({ fecha: r.fecha, texto: `${r.evento} (${b.nombre})`, tipo: r.estado })));
  const devoluciones = data.equipo.filter((e) => e.estado === "En uso" && e.fechaDevolucion).map((e) => ({ fecha: e.fechaDevolucion, texto: `Devolución: ${e.nombre}`, tipo: e.fechaDevolucion < fmt(hoy) ? "Atrasado" : "En uso" }));
  const eventosPropios = (data.eventos || []).map((ev) => {
    const conflictos = ev.equipoIds.map((id) => conflictoDeEquipo(data, id, ev.fecha, ev.id)).filter(Boolean);
    const nombresEquipo = ev.equipoIds.map((id) => data.equipo.find((e) => e.id === id)?.nombre).filter(Boolean);
    return {
      fecha: ev.fecha,
      texto: `${ev.nombre}${nombresEquipo.length ? " — " + nombresEquipo.join(", ") : ""}`,
      tipo: conflictos.length > 0 ? "Atrasado" : "Reservada",
      conflictos,
    };
  });
  const todos = [...reservasBases, ...devoluciones, ...eventosPropios].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  const equipoDisponiblePara = (id) => conflictoDeEquipo(data, id, fecha, null);

  const toggleEquipo = (id) => {
    setEquipoIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const guardarEvento = () => {
    if (!nombre || !fecha) return;
    const nuevoId = Math.max(0, ...(data.eventos || []).map((e) => e.id)) + 1;
    setData((d) => ({ ...d, eventos: [...(d.eventos || []), { id: nuevoId, nombre, fecha, equipoIds, notas: "" }] }));
    bitacora(`Evento creado: ${nombre} (${fecha})`, usuarioActual);
    mostrarToast("Evento agregado ✓");
    setModalNuevo(false);
    setNombre("");
    setFecha("");
    setEquipoIds([]);
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <SectionHeader title="Calendario" subtitle="Eventos, devoluciones y equipo necesario" onBack={onBack} />
      <div style={{ padding: 16 }}>
        {todos.length === 0 && <div style={{ fontSize: 13, color: C.muted, textAlign: "center", marginTop: 24 }}>No hay eventos ni devoluciones próximas.</div>}
        {todos.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 64, flexShrink: 0, fontSize: 12, color: C.muted, paddingTop: 12 }}>{e.fecha}</div>
            <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: C.foreground }}>{e.texto}</span>
                <Badge estado={e.tipo} />
              </div>
              {e.conflictos && e.conflictos.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  {e.conflictos.map((c, ci) => (
                    <div key={ci} style={{ fontSize: 11, color: C.error, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={12} /> {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <FAB color={C.secondary} onClick={() => setModalNuevo(true)} />

      {modalNuevo && (
        <Modal title="Nuevo evento" onClose={() => setModalNuevo(false)}>
          <FieldLabel>Nombre del evento</FieldLabel>
          <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Sesión XV Fernández" />
          <FieldLabel>Fecha</FieldLabel>
          <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <FieldLabel>¿Qué equipo se necesita? (opcional)</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", marginBottom: 4 }}>
            {data.equipo.filter((e) => e.estado !== "Baja").map((e) => {
              const conflicto = fecha ? equipoDisponiblePara(e.id) : null;
              return (
                <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: conflicto ? `${C.error}15` : C.surface, border: `1px solid ${conflicto ? C.error : C.border}`, cursor: "pointer" }}>
                  <input type="checkbox" checked={equipoIds.includes(e.id)} onChange={() => toggleEquipo(e.id)} style={{ width: 16, height: 16 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: C.foreground }}>{e.nombre}</div>
                    {conflicto && <div style={{ fontSize: 10.5, color: C.error }}>{conflicto}</div>}
                  </div>
                </label>
              );
            })}
          </div>
          <PrimaryButton onClick={guardarEvento} color={C.secondary} disabled={!nombre || !fecha}>Guardar evento</PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

function CierreScreen({ data, onBack }) {
  const [checked, setChecked] = useState({});
  const atrasados = data.equipo.filter((e) => e.estado === "En uso" && e.fechaDevolucion && e.fechaDevolucion < fmt(hoy));
  const danadosHoy = data.equipo.filter((e) => e.estado === "Dañado" && e.historial.some((h) => h.fecha === fmt(hoy) && h.texto.toLowerCase().includes("dañado")));
  // Cuenta lo que sigue sin llegar: autorizado, o pendiente de los pedidos
  // viejos. Lo que espera autorización todavía no está por llegar.
  const pedidosPendientes = data.pedidos.filter((p) => p.estado === "Pendiente" || p.estado === "Aprobado");
  const eventosProximos = data.bases.flatMap((b) => b.reservas.filter((r) => r.estado === "Reservada" && r.fecha <= enDias(3)).map((r) => `${r.evento} (${b.nombre}) — ${r.fecha}`));
  const grupos = [
    { titulo: "Sigue prestado y no debería", items: atrasados.map((e) => `${e.nombre} — ${e.quienLoTiene}`) },
    { titulo: "Quedó dañado hoy", items: danadosHoy.map((e) => e.nombre) },
    { titulo: "Pedidos pendientes de llegar", items: pedidosPendientes.map((p) => `${p.item} (${p.cantidad})`) },
    { titulo: "Eventos próximos (3 días)", items: eventosProximos },
  ];
  const toggle = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div style={{ paddingBottom: 40 }}>
      <SectionHeader title="Cierre de Bodega" subtitle={fmt(hoy)} onBack={onBack} />
      <div style={{ padding: 16 }}>
        {grupos.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginBottom: 10 }}>{g.titulo}</div>
            {g.items.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>Nada que revisar aquí. ✓</div>}
            {g.items.map((item, i) => {
              const key = `${gi}-${i}`;
              return (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
                  <input type="checkbox" checked={!!checked[key]} onChange={() => toggle(key)} style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: 13, color: checked[key] ? C.muted : C.foreground, textDecoration: checked[key] ? "line-through" : "none" }}>{item}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   PANTALLA: Transferencias — lo que está en tránsito y su historial.
   Antes esto no existía como pantalla: el envío borraba el equipo sin
   dejar ningún lugar donde confirmarlo del otro lado.
   ========================================================================= */
function TransferenciasScreen({ transferencias, transferenciasBases, sucursalActiva, onConfirmar, onConfirmarBase, onBack }) {
  const [tab, setTab] = useState("equipo");
  const [recibiendo, setRecibiendo] = useState(null);
  const [quienRecibe, setQuienRecibe] = useState("");
  const [llegoBien, setLlegoBien] = useState(true);
  const [motivoProblema, setMotivoProblema] = useState("");

  const [recibiendoBase, setRecibiendoBase] = useState(null);
  const [quienRecibeBase, setQuienRecibeBase] = useState("");
  const [cantRecibida, setCantRecibida] = useState("");
  const [notaBase, setNotaBase] = useState("");

  const porRecibir = transferencias.filter((t) => t.destino === sucursalActiva && t.estado === "En tránsito");
  const historial = [...transferencias]
    .filter((t) => (t.origen === sucursalActiva || t.destino === sucursalActiva) && !porRecibir.includes(t))
    .sort((a, b) => (a.fechaRecepcion || a.fechaEnvio < (b.fechaRecepcion || b.fechaEnvio) ? 1 : -1));

  const porRecibirBases = (transferenciasBases || []).filter((t) => t.destino === sucursalActiva && t.estado === "En tránsito");
  const historialBases = [...(transferenciasBases || [])]
    .filter((t) => (t.origen === sucursalActiva || t.destino === sucursalActiva) && !porRecibirBases.includes(t))
    .sort((a, b) => (a.fechaRecepcion || a.fechaEnvio < (b.fechaRecepcion || b.fechaEnvio) ? 1 : -1));

  const abrirConfirmacion = (t) => {
    setRecibiendo(t);
    setQuienRecibe("");
    setLlegoBien(true);
    setMotivoProblema("");
  };

  const confirmar = () => {
    if (!quienRecibe || (!llegoBien && !motivoProblema)) return;
    onConfirmar(recibiendo.id, quienRecibe, llegoBien, motivoProblema);
    setRecibiendo(null);
  };

  const abrirConfirmacionBase = (t) => {
    setRecibiendoBase(t);
    setQuienRecibeBase("");
    setCantRecibida(String(t.cantidad));
    setNotaBase("");
  };

  const confirmarBase = () => {
    if (!quienRecibeBase || cantRecibida === "") return;
    onConfirmarBase(recibiendoBase.id, quienRecibeBase, parseInt(cantRecibida, 10) || 0, notaBase);
    setRecibiendoBase(null);
  };

  // Días de atraso de un préstamo de base que sigue "en tránsito" —
  // pedido explícito del negocio: avisar cuando algo prestado no vuelve.
  const diasEnTransito = (t) => diasTranscurridos(t.fechaEnvio);

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Transferencias" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <FilterPill label={`Equipo${porRecibir.length ? ` (${porRecibir.length})` : ""}`} active={tab === "equipo"} onClick={() => setTab("equipo")} />
          <FilterPill label={`Bases${porRecibirBases.length ? ` (${porRecibirBases.length})` : ""}`} active={tab === "bases"} onClick={() => setTab("bases")} color={C.secondary} />
        </div>

        {tab === "equipo" && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginBottom: 12 }}>Por recibir aquí</div>
            {porRecibir.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Nada esperando confirmación. ✓</div>}
            {porRecibir.map((t) => (
              <div key={t.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: SOMBRA_TARJETA }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{t.nombre}</div>
                    <div style={{ fontSize: 12, color: C.muted, margin: "2px 0 6px" }}>Desde {NOMBRES_SUCURSAL[t.origen]} · enviado por {t.quienEnvio} el {t.fechaEnvio}</div>
                    <Badge estado={t.estado} />
                  </div>
                  <button onClick={() => abrirConfirmacion(t)} style={{ display: "flex", alignItems: "center", gap: 4, background: C.success, color: textoContraste(C.success), border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <Truck size={14} /> Recibir
                  </button>
                </div>
              </div>
            ))}

            <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginTop: 16, marginBottom: 12 }}>Historial</div>
            {historial.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>Sin transferencias anteriores.</div>}
            {historial.map((t) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 13, color: C.foreground }}>{t.nombre}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {NOMBRES_SUCURSAL[t.origen]} → {NOMBRES_SUCURSAL[t.destino]}
                    {t.estado === "Recibido" ? ` · recibido por ${t.quienRecibio} el ${t.fechaRecepcion}` : ` · enviado el ${t.fechaEnvio}`}
                  </div>
                </div>
                <Badge estado={t.estado} />
              </div>
            ))}
          </>
        )}

        {tab === "bases" && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginBottom: 12 }}>Por recibir aquí</div>
            {porRecibirBases.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Nada esperando confirmación. ✓</div>}
            {porRecibirBases.map((t) => (
              <div key={t.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: SOMBRA_TARJETA }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.foreground }}>{t.nombre} × {t.cantidad}</div>
                    <div style={{ fontSize: 12, color: C.muted, margin: "2px 0 6px" }}>Préstamo desde {NOMBRES_SUCURSAL[t.origen]} · enviado por {t.quienEnvio} el {t.fechaEnvio}</div>
                    <Badge estado={t.estado} />
                  </div>
                  <button onClick={() => abrirConfirmacionBase(t)} style={{ display: "flex", alignItems: "center", gap: 4, background: C.success, color: textoContraste(C.success), border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <Truck size={14} /> Recibir
                  </button>
                </div>
                {diasEnTransito(t) >= 5 && (
                  <div style={{ marginTop: 8, fontSize: 11.5, color: C.warning, display: "flex", alignItems: "center", gap: 5 }}>
                    <AlertTriangle size={13} /> Lleva {diasEnTransito(t)} días en tránsito sin confirmarse
                  </div>
                )}
              </div>
            ))}

            <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginTop: 16, marginBottom: 12 }}>Historial</div>
            {historialBases.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>Sin préstamos de bases anteriores.</div>}
            {historialBases.map((t) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 13, color: C.foreground }}>{t.nombre} × {t.cantidad}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {NOMBRES_SUCURSAL[t.origen]} → {NOMBRES_SUCURSAL[t.destino]}
                    {t.estado === "Recibido" ? ` · recibido por ${t.quienRecibio} el ${t.fechaRecepcion}${t.cantidadRecibida !== t.cantidad ? ` (llegaron ${t.cantidadRecibida})` : ""}` : ` · enviado el ${t.fechaEnvio}`}
                  </div>
                </div>
                <Badge estado={t.estado} />
              </div>
            ))}
          </>
        )}
      </div>

      {recibiendo && (
        <Modal title={`Recibir: ${recibiendo.nombre}`} onClose={() => setRecibiendo(null)}>
          <FieldLabel>¿Quién recibe?</FieldLabel>
          <TextInput value={quienRecibe} onChange={(e) => setQuienRecibe(e.target.value)} placeholder="Tu nombre" />
          <FieldLabel>¿Llegó en buenas condiciones?</FieldLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <FilterPill label="Sí, todo bien" active={llegoBien} onClick={() => setLlegoBien(true)} color={C.success} />
            <FilterPill label="Llegó con un problema" active={!llegoBien} onClick={() => setLlegoBien(false)} color={C.error} />
          </div>
          {!llegoBien && (
            <>
              <FieldLabel>¿Qué pasó? (obligatorio)</FieldLabel>
              <TextInput value={motivoProblema} onChange={(e) => setMotivoProblema(e.target.value)} placeholder="Describe el problema..." />
            </>
          )}
          <PrimaryButton onClick={confirmar} color={C.success} disabled={!quienRecibe || (!llegoBien && !motivoProblema)}>
            Confirmar recepción
          </PrimaryButton>
        </Modal>
      )}

      {recibiendoBase && (
        <Modal title={`Recibir: ${recibiendoBase.nombre}`} onClose={() => setRecibiendoBase(null)}>
          <div style={{ fontSize: 12.5, color: C.muted }}>Se enviaron {recibiendoBase.cantidad}. Si llegaron menos (alguna se rompió en el camino, etc.), ajusta la cantidad aquí.</div>
          <FieldLabel>¿Quién recibe?</FieldLabel>
          <TextInput value={quienRecibeBase} onChange={(e) => setQuienRecibeBase(e.target.value)} placeholder="Tu nombre" />
          <FieldLabel>¿Cuántas llegaron?</FieldLabel>
          <TextInput type="number" value={cantRecibida} onChange={(e) => setCantRecibida(e.target.value)} />
          {parseInt(cantRecibida, 10) !== recibiendoBase.cantidad && (
            <>
              <FieldLabel>¿Qué pasó con la diferencia? (opcional)</FieldLabel>
              <TextInput value={notaBase} onChange={(e) => setNotaBase(e.target.value)} placeholder="Ej. una llegó rota" />
            </>
          )}
          <PrimaryButton onClick={confirmarBase} color={C.success} disabled={!quienRecibeBase || cantRecibida === "" || parseInt(cantRecibida, 10) < 0}>
            Confirmar recepción
          </PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   PANTALLA: Catálogos — solo para ver nombres y precios de lo que se vende
   (General, Universidad y UNICEQ), sin tener que escribírselos ni
   buscarlos: ya vienen cargados del catálogo 2026. No es inventario ni
   existencia — eso es Panorámicas y Diplomas, dentro de Almacén. Cada
   catálogo se despliega aparte. */
function CatalogosScreen({ sucursal, onBack }) {
  const [abierto, setAbierto] = useState("General");
  const [busca, setBusca] = useState("");

  const esQueretaro = sucursal === "queretaro";
  const catalogos = [
    { key: "General", label: "General (Escolar)", color: C.primary },
    { key: "Universidad", label: "Universidad", color: C.secondary },
    ...(esQueretaro ? [{ key: "UNICEQ", label: "UNICEQ", color: C.accent1 }] : []),
  ];

  const filtro = busca.trim().toLowerCase();

  return (
    <div style={{ paddingBottom: 40, minHeight: "100vh" }}>
      <SectionHeader title="Catálogos" subtitle="Nombres y precios, para cotizar" onBack={onBack} />
      <div style={{ padding: 16 }}>
        <TextInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nombre..." />
        <div style={{ height: 14 }} />
        {catalogos.map((cat) => {
          const productos = CATALOGO_2026.filter((p) => p.catalogo === cat.key && (!filtro || p.nombre.toLowerCase().includes(filtro)));
          const estaAbierto = abierto === cat.key;
          if (filtro && productos.length === 0) return null;
          return (
            <div key={cat.key} style={{ marginBottom: 14, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <button
                onClick={() => setAbierto(estaAbierto ? null : cat.key)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: "none", padding: 14, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: cat.color, display: "inline-block" }} />
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: C.foreground }}>{cat.label}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>({productos.length})</span>
                </div>
                <ChevronRight size={18} color={C.muted} style={{ transform: estaAbierto ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
              </button>
              {estaAbierto && (
                <div style={{ padding: 12, background: C.background }}>
                  {productos.map((p, i) => (
                    <div key={`${p.nombre}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px", borderTop: i > 0 ? `1px solid ${C.border}` : "none" }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.foreground }}>{p.nombre}</div>
                        {(p.linea || p.medidas) && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{[p.linea, p.medidas].filter(Boolean).join(" · ")}</div>}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.success, flexShrink: 0, marginLeft: 10 }}>{fmtMoneda(p.precio)}</div>
                    </div>
                  ))}
                  {productos.length === 0 && <EmptyState text="No hay paquetes con ese nombre en este catálogo." />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MasScreen({ data, setData, bitacora, mostrarToast, alertas, config, isDark, onToggleDark, onDeshacer, puedeDeshacer, usuarioActual, onCambiarUsuario, onAdminMode, transferenciasPendientes, transferenciasBasesPendientes, sucursalActiva, onConfirmarTransferencia, onConfirmarTransferenciaBase, permisoNotificaciones, onActivarNotificaciones, onVolverHub }) {
  const [sub, setSub] = useState(null);

  if (sub === "notificaciones") return <NotificacionesScreen alertas={alertas} onBack={() => setSub(null)} />;
  if (sub === "catalogos") return <CatalogosScreen sucursal={sucursalActiva} onBack={() => setSub(null)} />;
  if (sub === "reportes") return <ReportesScreen data={data} config={config} onBack={() => setSub(null)} />;
  if (sub === "calendario") return <CalendarioScreen data={data} setData={setData} bitacora={bitacora} usuarioActual={usuarioActual} mostrarToast={mostrarToast} onBack={() => setSub(null)} />;
  if (sub === "cierre") return <CierreScreen data={data} onBack={() => setSub(null)} />;
  if (sub === "indumentaria") return <IndumentariaScreen data={data} setData={setData} bitacora={bitacora} usuarioActual={usuarioActual} mostrarToast={mostrarToast} sucursal={sucursalActiva} onBack={() => setSub(null)} />;
  if (sub === "emblematicos") return <EmblematicosScreen data={data} setData={setData} bitacora={bitacora} usuarioActual={usuarioActual} mostrarToast={mostrarToast} sucursal={sucursalActiva} onBack={() => setSub(null)} />;
  if (sub === "mobiliario") return <MobiliarioScreen data={data} setData={setData} bitacora={bitacora} usuarioActual={usuarioActual} mostrarToast={mostrarToast} sucursal={sucursalActiva} onBack={() => setSub(null)} />;
  if (sub === "piezas") return <PiezasScreen data={data} setData={setData} bitacora={bitacora} usuarioActual={usuarioActual} mostrarToast={mostrarToast} config={config} sucursal={sucursalActiva} onBack={() => setSub(null)} />;
  if (sub === "placas") return <PlacasScreen data={data} setData={setData} bitacora={bitacora} usuarioActual={usuarioActual} mostrarToast={mostrarToast} config={config} sucursal={sucursalActiva} onBack={() => setSub(null)} />;
  if (sub === "transferencias")
    return (
      <TransferenciasScreen
        transferencias={transferenciasPendientes}
        transferenciasBases={transferenciasBasesPendientes}
        sucursalActiva={sucursalActiva}
        onConfirmar={onConfirmarTransferencia}
        onConfirmarBase={onConfirmarTransferenciaBase}
        onBack={() => setSub(null)}
      />
    );

  const porRecibir = transferenciasPendientes.filter((t) => t.destino === sucursalActiva && t.estado === "En tránsito").length;
  const porRecibirBases = (transferenciasBasesPendientes || []).filter((t) => t.destino === sucursalActiva && t.estado === "En tránsito").length;
  const indumentariaAtrasada = (data.indumentaria || []).reduce(
    (a, i) => a + (i.prestamos || []).filter((p) => p.estado === "Prestado" && p.fechaEsperada && p.fechaEsperada < fmt(hoy)).length,
    0
  );
  const firmasFaltantes = (data.emblematicos || []).reduce(
    (a, e) => a + (e.material === "Oro" ? (e.custodios || []).filter((c) => c.activo && !c.firmaResponsiva).length : 0),
    0
  );

  const gruposMenu = [
    {
      titulo: "Para hoy",
      opciones: [
        { key: "notificaciones", label: "Notificaciones", icon: Bell, badge: alertas.length, color: C.warning },
        { key: "transferencias", label: "Transferencias", icon: Truck, badge: porRecibir + porRecibirBases, color: C.secondary },
        { key: "calendario", label: "Calendario", icon: CalendarIcon, color: C.secondary },
      ],
    },
    {
      titulo: "Producción y catálogos",
      opciones: [
        { key: "catalogos", label: "Catálogos", icon: ImagePlus, color: C.primary },
        { key: "indumentaria", label: "Indumentaria", icon: Shirt, badge: indumentariaAtrasada, color: C.accent1 },
        { key: "emblematicos", label: "Emblemáticos", icon: Award, badge: firmasFaltantes, color: C.warning },
        { key: "placas", label: "Placas por hoja", icon: Scissors, color: C.primary },
        { key: "piezas", label: "Piezas y Catálogos", icon: Layers, color: C.accent1 },
        { key: "mobiliario", label: "Mobiliario", icon: Monitor, color: C.secondary },
      ],
    },
    {
      titulo: "Cierre y reportes",
      opciones: [
        { key: "reportes", label: "Reportes", icon: BarChart3, color: C.primary },
        { key: "cierre", label: "Cierre de Bodega", icon: ClipboardCheck, color: C.accent1 },
      ],
    },
  ];

  return (
    <div style={{ paddingBottom: 90 }}>
      <SectionHeader title="Más" subtitle={`Sesión: ${usuarioActual}`} />
      <div style={{ padding: 16 }}>
        {gruposMenu.map((grupo) => (
          <div key={grupo.titulo} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, margin: "4px 2px 8px" }}>{grupo.titulo}</div>
            {grupo.opciones.map((o) => {
              const Icon = o.icon;
              return (
                <button key={o.key} onClick={() => setSub(o.key)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Icon size={20} color={o.color} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.foreground }}>{o.label}</span>
                  </div>
                  {!!o.badge && <span style={{ background: C.error, color: textoContraste(C.error), fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "2px 8px" }}>{o.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}

        <button onClick={onDeshacer} disabled={!puedeDeshacer} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, cursor: puedeDeshacer ? "pointer" : "not-allowed", opacity: puedeDeshacer ? 1 : 0.5 }}>
          <Undo2 size={20} color={C.muted} />
          <span style={{ fontSize: 14, fontWeight: 600, color: C.foreground }}>Deshacer último movimiento</span>
        </button>

        {permisoNotificaciones !== "unsupported" && (
          <button
            onClick={permisoNotificaciones === "granted" ? undefined : onActivarNotificaciones}
            disabled={permisoNotificaciones === "granted"}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, cursor: permisoNotificaciones === "granted" ? "default" : "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Bell size={20} color={permisoNotificaciones === "granted" ? C.success : C.muted} />
              <span style={{ fontSize: 14, fontWeight: 600, color: C.foreground }}>
                {permisoNotificaciones === "granted" ? "Notificaciones activadas" : permisoNotificaciones === "denied" ? "Notificaciones bloqueadas" : "Activar notificaciones"}
              </span>
            </div>
            {permisoNotificaciones === "granted" && <Check size={18} color={C.success} />}
          </button>
        )}

        <button onClick={onToggleDark} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, cursor: "pointer" }}>
          {isDark ? <Sun size={20} color={C.warning} /> : <Moon size={20} color={C.muted} />}
          <span style={{ fontSize: 14, fontWeight: 600, color: C.foreground }}>{isDark ? "Modo claro" : "Modo oscuro"}</span>
        </button>

        <button onClick={onCambiarUsuario} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, cursor: "pointer" }}>
          <UserCircle size={20} color={C.muted} />
          <span style={{ fontSize: 14, fontWeight: 600, color: C.foreground }}>Cambiar de usuario</span>
        </button>

        <button onClick={onVolverHub} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, cursor: "pointer" }}>
          <img src={LOGO_PHOTOGRAF} alt="Photograf" style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: C.foreground }}>Cambiar de app (Inventario / Asistencia)</span>
        </button>

        <button onClick={onAdminMode} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, cursor: "pointer" }}>
          <Shield size={20} color={C.muted} />
          <span style={{ fontSize: 14, fontWeight: 600, color: C.foreground }}>Panel de administrador</span>
        </button>
      </div>
    </div>
  );
}

const tabs = [
  { key: "home", label: "Home", icon: Home },
  { key: "equipo", label: "Equipo", icon: Camera },
  { key: "almacen", label: "Almacén", icon: Warehouse },
  { key: "materiales", label: "Materiales", icon: Package },
  { key: "miInventario", label: "Mi Inv.", icon: User },
  { key: "mas", label: "Más", icon: MoreHorizontal },
];

function BottomNav({ active, onChange, badge }) {
  return (
    <div className="pf-shell" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.background, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "8px 2px" }}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} style={{ position: "relative", background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 4px", cursor: "pointer", minWidth: 40 }}>
            <Icon size={20} color={isActive ? C.primary : C.muted} />
            {t.key === "mas" && !!badge && <span style={{ position: "absolute", top: 0, right: 4, background: C.error, borderRadius: 6, width: 8, height: 8 }} />}
            <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, color: isActive ? C.primary : C.muted }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================================
   APP RAÍZ
   ========================================================================= */

export default function PhotografInventario() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [empleados, setEmpleados] = useState(EMPLEADOS_INICIALES);
  const [allData, setAllData] = useState({ queretaro: generarDatosIniciales("queretaro"), salinas: generarDatosIniciales("salinas") });
  const [sucursalActiva, setSucursalActiva] = useState(null);
  const [screen, setScreen] = useState("home");
  const [vistaExterna, setVistaExterna] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [snapshot, setSnapshot] = useState({});
  const [mostrarAdmin, setMostrarAdmin] = useState(false);
  const [adminAutenticado, setAdminAutenticado] = useState(false);
  const [transferenciasPendientes, setTransferenciasPendientes] = useState([]);
  const [transferenciasBasesPendientes, setTransferenciasBasesPendientes] = useState([]);
  const [toast, setToast] = useState(null);
  const [datosListos, setDatosListos] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState(false);
  const [abrirEquipoId, setAbrirEquipoId] = useState(null);
  const [appActiva, setAppActiva] = useState(null); // null (hub) | "inventario" | "asistencia"
  const [config, setConfig] = useState(CONFIG_INICIAL);
  const [, forceRender] = useState(0);

  /* La app se queda abierta días en la tablet del mostrador. Cada minuto se
     revisa si ya cambió el día para redibujar con la fecha correcta; si no,
     los atrasos y los plazos de los paquetes se quedaban congelados. */
  useEffect(() => {
    const t = setInterval(() => {
      if (refrescarHoy()) forceRender((n) => n + 1);
    }, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  /* Un empujoncito táctil breve cada vez que algo se confirma — el celular
     ya lo trae integrado (navigator.vibrate), solo hay que usarlo. Si el
     navegador no lo soporta (la mayoría de iPhone en Safari, por ejemplo)
     simplemente no pasa nada; nunca truena por su ausencia. */
  const mostrarToast = (msg) => {
    setToast(msg);
    try {
      navigator.vibrate?.(msg && msg.includes("✓") ? 15 : [10, 40, 10]);
    } catch (e) {
      // Algunos navegadores lo bloquean si no hubo interacción reciente; no pasa nada.
    }
  };

  /* Notificaciones locales del navegador: no requieren servidor ni PWA para
     funcionar, pero solo llegan mientras esta pestaña siga abierta (para
     que lleguen con la pestaña cerrada, hace falta convertir esto en PWA
     con service worker — ese es el siguiente paso que ya platicamos). */
  const DOC_REF = doc(db, "photograf", "inventario-datos");
  const escribiendoRef = useRef(false);

  /* Se conecta a Firestore y escucha en tiempo real — ya no es "cargar una
     vez", es una conexión que se queda abierta: si Ana presta una cámara
     desde su celular, a Carlos se le actualiza solo, sin que tenga que
     refrescar nada. Antes cada celular tenía su propia copia aislada. */
  /* Solo se permite escribir en la nube después de haber leído bien al
     menos una vez. Antes, si la lectura fallaba (mal internet un segundo),
     la app subía sus datos de ejemplo y borraba el inventario real. */
  const lecturaOkRef = useRef(false);
  /* Última versión del documento que sabemos que está confirmada en el
     servidor — la base contra la que se compara antes de cada guardado
     para saber qué cambiamos nosotros y qué hay que dejar como está. */
  const prevSyncedRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(
      DOC_REF,
      (snap) => {
        lecturaOkRef.current = true;
        if (snap.exists()) prevSyncedRef.current = normalizarDocumento(snap.data());
        if (escribiendoRef.current) {
          // Este cambio lo acabamos de escribir nosotros mismos — ya lo
          // tenemos reflejado en el estado, no hace falta re-aplicarlo.
          escribiendoRef.current = false;
          setDatosListos(true);
          return;
        }
        if (snap.exists()) {
          const d = snap.data();
          // Se rellena lo que falte: los datos pueden venir de una versión
          // anterior de la app y antes eso tronaba la pantalla completa.
          if (d.allData) setAllData(normalizarTodo(d.allData));
          if (d.empleados) setEmpleados(d.empleados);
          if (d.transferenciasPendientes) setTransferenciasPendientes(d.transferenciasPendientes);
          if (d.transferenciasBasesPendientes) setTransferenciasBasesPendientes(d.transferenciasBasesPendientes);
          setConfig(normalizarConfig(d.config));
        }
        setDatosListos(true);
      },
      () => {
        // Sin internet o sin permisos todavía — seguimos con los datos de
        // ejemplo en memoria mientras tanto, sin trabar la app.
        setDatosListos(true);
        setErrorGuardado(true);
      }
    );
    return () => unsub();
  }, []);

  /* Cada cambio (préstamo, ajuste, transferencia, etc.) se sube a Firestore
     — de ahí se reparte solo a todos los demás celulares conectados.
     Se hace dentro de una transacción: se lee lo que de verdad hay en el
     servidor justo antes de guardar y se fusiona con fusionarDocumento,
     así que solo se sobreescribe lo que nosotros cambiamos de verdad —
     ver el comentario junto a fusionarDocumento arriba. */
  useEffect(() => {
    if (!datosListos || !lecturaOkRef.current) return;
    const propio = { allData, empleados, transferenciasPendientes, transferenciasBasesPendientes, config };
    const base = prevSyncedRef.current;
    if (base && JSON.stringify(base) === JSON.stringify(propio)) return;

    escribiendoRef.current = true;
    runTransaction(db, async (tx) => {
      const snap = await tx.get(DOC_REF);
      const servidor = snap.exists() ? snap.data() : {};
      const fusion = fusionarDocumento(base, propio, servidor);
      tx.set(DOC_REF, fusion);
      return fusion;
    })
      .then((fusion) => {
        prevSyncedRef.current = normalizarDocumento(fusion);
        // Si el servidor traía algo de otro celular que nosotros no
        // teníamos todavía, reflejarlo en pantalla ahora.
        if (JSON.stringify(fusion) !== JSON.stringify(propio)) {
          if (fusion.allData) setAllData(normalizarTodo(fusion.allData));
          if (fusion.empleados) setEmpleados(fusion.empleados);
          if (fusion.transferenciasPendientes) setTransferenciasPendientes(fusion.transferenciasPendientes);
          if (fusion.transferenciasBasesPendientes) setTransferenciasBasesPendientes(fusion.transferenciasBasesPendientes);
          setConfig(normalizarConfig(fusion.config));
        }
        setErrorGuardado(false);
      })
      .catch(() => {
        escribiendoRef.current = false;
        setErrorGuardado(true);
      });
  }, [allData, empleados, transferenciasPendientes, transferenciasBasesPendientes, config, datosListos]);

  const notificadasRef = useRef(new Set());
  const [permisoNotificaciones, setPermisoNotificaciones] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  /* silencioso=true: no muestra el toast ni cuenta como que el usuario lo
     acaba de activar — se usa para refrescar el token solo, en segundo
     plano (ver el useEffect de abajo), porque el permiso del navegador
     puede quedar en "granted" mientras el token real ya se perdió o
     rotó, y antes no había forma de reintentarlo (el botón se deshabilita
     en cuanto el permiso está concedido). */
  const activarNotificaciones = async (silencioso = false) => {
    if (typeof Notification === "undefined") return;
    const resultado = await Notification.requestPermission();
    setPermisoNotificaciones(resultado);
    if (resultado === "granted" && messaging) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
        if (token) {
          await setDoc(doc(db, "fcm_tokens", token), {
            usuario: usuarioActual || "desconocido",
            sucursal: sucursalActiva || "desconocida",
            actualizado: new Date().toISOString(),
          });
          if (!silencioso) mostrarToast("Notificaciones activadas ✓");
        }
      } catch (e) {
        // Si falla obtener el token (navegador no compatible, sin
        // service worker listo, etc.), las notificaciones locales de
        // abajo (mientras la pestaña está abierta) siguen funcionando.
      }
    }
  };

  // Reintento silencioso: cada vez que se abre la app con una sucursal y
  // usuario ya elegidos, si el navegador ya tiene el permiso concedido se
  // vuelve a guardar el token (por si cambió o nunca se guardó bien la
  // primera vez), sin pedirle nada al empleado ni mostrarle un toast.
  useEffect(() => {
    if (!sucursalActiva || !usuarioActual) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    activarNotificaciones(true);
  }, [sucursalActiva, usuarioActual]);

  /* Igual que activarNotificaciones, pero para quien lo activa desde el
     Panel de Administrador: se guarda con sucursal "admin" en vez de la
     sucursal de un empleado, para que le lleguen los avisos de las DOS
     sucursales (ver /api/notify.js). No depende de haber elegido "quién
     eres" ni una sucursal — el admin entra con su propia contraseña. */
  const activarNotificacionesAdmin = async (silencioso = false) => {
    if (typeof Notification === "undefined") return false;
    const resultado = await Notification.requestPermission();
    setPermisoNotificaciones(resultado);
    if (resultado === "granted" && messaging) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
        if (token) {
          await setDoc(doc(db, "fcm_tokens", token), {
            usuario: "Administrador",
            sucursal: "admin",
            actualizado: new Date().toISOString(),
          });
          if (!silencioso) mostrarToast("Notificaciones de administrador activadas ✓");
          return true;
        }
      } catch (e) {
        // Mismo caso que en el flujo de empleado: si falla, no truena nada.
      }
    }
    return false;
  };

  // Mismo reintento silencioso que el de empleado, pero para cuando se
  // entra al Panel de Administrador con el permiso del navegador ya
  // concedido de antes.
  useEffect(() => {
    if (!adminAutenticado) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    activarNotificacionesAdmin(true);
  }, [adminAutenticado]);

  // Cuando llega una notificación real con la app abierta en primer plano,
  // el navegador no la muestra solo — aquí se recibe y se enseña como toast.
  useEffect(() => {
    if (!messaging) return;
    const unsub = onMessage(messaging, (payload) => {
      const titulo = payload.notification?.title || "Photograf";
      const cuerpo = payload.notification?.body || "";
      mostrarToast(`${titulo}: ${cuerpo}`);
    });
    return () => unsub && unsub();
  }, []);

  /* Alertas (stock bajo, choques de reservas, paquetes vencidos, equipo
     atrasado, etc.): antes solo se enseñaban como Notification local, que
     sólo suena si la pestaña sigue abierta en ese celular en ese momento
     — con la app cerrada, nunca llegaban. Ahora, además de eso, se manda
     un push real a la sucursal (y a admin) apenas se detecta una alerta
     nueva, igual que con las transferencias — así llega aunque nadie
     tenga la app abierta en ese momento. */
  useEffect(() => {
    if (!sucursalActiva) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const actuales = calcularAlertas(allData[sucursalActiva], config);
    actuales.forEach((a) => {
      const clave = `${sucursalActiva}:${a.tipo}:${a.texto}`;
      if (!notificadasRef.current.has(clave)) {
        notificadasRef.current.add(clave);
        try {
          // "badge" con fondo transparente (icon-192) para que la barra de
          // estado de Android dibuje la silueta del logo en vez de un
          // cuadro sólido blanco (ver sw.js para la explicación completa).
          new Notification(`Photograf — ${a.tipo}`, {
            body: a.texto,
            icon: "/icons/icon-maskable-192.png",
            badge: "/icons/icon-192.png",
          });
        } catch (e) {
          // Algunos navegadores en móvil no dejan crear Notification directo
          // sin un service worker; si falla, el aviso se sigue viendo en la
          // pantalla de Notificaciones dentro de la app.
        }
        enviarNotificacionPush([sucursalActiva, "admin"], `Photograf — ${a.tipo}`, a.texto);
      }
    });
  }, [allData, sucursalActiva]);

  const resolverCodigoEscaneado = (codigo, { navegar = true } = {}) => {
    const match = codigo.trim().match(/^(EQ|BASE)-(queretaro|salinas)-(\d+)$/i);
    if (!match) {
      mostrarToast("Código no reconocido");
      return null;
    }
    const [, tipo, suc, idStr] = match;
    const id = parseInt(idStr, 10);
    if (suc.toLowerCase() !== sucursalActiva) {
      mostrarToast(`Ese código es de ${NOMBRES_SUCURSAL[suc.toLowerCase()]}, no de aquí`);
      return null;
    }
    if (tipo.toUpperCase() === "EQ") {
      const item = allData[sucursalActiva].equipo.find((e) => e.id === id);
      if (!item) { mostrarToast("No se encontró ese equipo"); return null; }
      mostrarToast(`✓ ${item.nombre}`);
      if (navegar) {
        setAbrirEquipoId(id);
        setScreen("equipo");
        setVistaExterna(null);
      }
      return { tipo: "equipo", nombre: item.nombre, id };
    } else {
      const base = allData[sucursalActiva].bases.find((b) => b.id === id);
      if (!base) { mostrarToast("No se encontró esa base"); return null; }
      mostrarToast(`✓ Base: ${base.nombre}`);
      if (navegar) {
        setScreen("almacen");
        setVistaExterna(null);
      }
      return { tipo: "base", nombre: base.nombre, id };
    }
  };

  /* Cada entrada al panel queda anotada. Como la contraseña de admin es una
     sola y compartida, esto es lo único que permite saber después quién
     estuvo moviendo cosas y a qué hora. Se guardan las últimas 50. */
  const entrarComoAdmin = () => {
    const ahora = new Date();
    setConfig((c) => ({
      ...c,
      accesos: [
        ...(c.accesos || []),
        {
          usuario: usuarioActual || "Sin identificar",
          sucursal: sucursalActiva || "",
          fecha: fmt(ahora),
          hora: ahora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        },
      ].slice(-50),
    }));
    setAdminAutenticado(true);
  };

  const toggleDark = () => {
    Object.assign(C, isDark ? LIGHT : DARK);
    setIsDark(!isDark);
    forceRender((n) => n + 1);
  };

  /* El snapshot para "deshacer" se guarda fuera del updater: dentro, React
     puede ejecutar la función dos veces y se acababa guardando un estado
     equivocado, así que deshacer regresaba a donde no era. */
  const setData = (updater) => {
    setSnapshot((s) => ({ ...s, [sucursalActiva]: allData[sucursalActiva] }));
    setAllData((prev) => {
      const next = typeof updater === "function" ? updater(prev[sucursalActiva]) : updater;
      return { ...prev, [sucursalActiva]: next };
    });
  };

  /* La bitácora se queda con los últimos 400 movimientos por sucursal: sin
     tope crecía para siempre hasta rebasar el límite de la nube y dejar de
     guardar todo lo demás. El historial de cada equipo no se toca. */
  const agregarBitacora = (texto, quien) => {
    setAllData((prev) => ({
      ...prev,
      [sucursalActiva]: {
        ...prev[sucursalActiva],
        bitacora: [...prev[sucursalActiva].bitacora, { texto, quien: quien || "", fecha: fmt(hoy) }].slice(-400),
      },
    }));
  };

  /* Alta de un pedido a proveedor. Nace "Por aprobar": antes no había
     ninguna forma de crear pedidos desde la app, solo venían los de
     ejemplo, y nadie los autorizaba. */
  const crearPedido = (item, tipo, cantidad, urgencia, color) => {
    if (!item) return;
    setData((d) => ({
      ...d,
      pedidos: [...(d.pedidos || []), { id: Math.max(0, ...(d.pedidos || []).map((p) => p.id)) + 1, item, tipo, cantidad, urgencia, color: color || "", estado: "Por aprobar", pedidoPor: usuarioActual || "" }],
    }));
    agregarBitacora(`Pedido solicitado: ${item}${color ? ` (${color})` : ""} (${cantidad})`, usuarioActual);
    mostrarToast("Pedido mandado a autorizar ✓");
  };

  const deshacer = () => {
    const prevSnap = snapshot[sucursalActiva];
    if (!prevSnap) return;
    setAllData((prev) => ({ ...prev, [sucursalActiva]: prevSnap }));
    setSnapshot((s) => ({ ...s, [sucursalActiva]: null }));
  };

  /* Notificación push real (llega aunque el celular esté bloqueado o la app
     cerrada) — solo para lo que de verdad cruza de una sucursal a otra: al
     enviar una transferencia y al confirmarla. "sucursales" es a quién le
     llega: la otra sucursal involucrada, más "admin" siempre. La función
     serverless en /api/notify.js reparte el push a cada celular que haya
     activado notificaciones para esa sucursal (o para admin).
     Es "dispara y olvida": si falla (sin internet, o si todavía no se
     configuró la llave de Firebase en Vercel — ver README), no interrumpe
     el flujo, la transferencia ya quedó registrada igual. */
  const enviarNotificacionPush = (sucursales, titulo, cuerpo) => {
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sucursales, titulo, cuerpo }),
    }).catch(() => {});
  };

  /* Envía un equipo a la otra sucursal: lo saca de la sucursal activa y lo
     deja "En tránsito" hasta que la sucursal destino confirme su recepción.
     Antes, este paso borraba el equipo y nunca lo volvía a agregar en
     ningún lado — se perdía. */
  const iniciarTransferenciaEquipo = (item, quien) => {
    const destino = OTRA_SUCURSAL[sucursalActiva];
    setData((d) => ({ ...d, equipo: d.equipo.filter((e) => e.id !== item.id) }));
    setTransferenciasPendientes((t) => [
      ...t,
      {
        id: Date.now(),
        nombre: item.nombre,
        categoria: item.categoria,
        foto: item.foto || null,
        // Antes solo viajaban nombre, categoría y foto: al llegar a la otra
        // sucursal el equipo aparecía sin costo (bajaba el valor del
        // inventario), sin sus fotos y sin nada de su historial.
        fotos: item.fotos || [],
        costo: item.costo || 0,
        historialOriginal: item.historial || [],
        notasOriginales: item.notas,
        origen: sucursalActiva,
        destino,
        estado: "En tránsito",
        quienEnvio: quien,
        fechaEnvio: fmt(hoy),
        quienRecibio: null,
        fechaRecepcion: null,
      },
    ]);
    agregarBitacora(`${item.nombre} enviado a ${NOMBRES_SUCURSAL[destino]}`, quien);
    mostrarToast(`Enviado a ${NOMBRES_SUCURSAL[destino]} ✓`);
    enviarNotificacionPush(
      [destino, "admin"],
      `Equipo en camino — ${NOMBRES_SUCURSAL[destino]}`,
      `${item.nombre} viene de ${NOMBRES_SUCURSAL[sucursalActiva]}. Confírmalo en Más → Transferencias cuando llegue.`
    );
  };

  /* Confirma la recepción del lado del destino: recién aquí el equipo
     vuelve a aparecer, ahora sí en la sucursal que lo recibió. Si llegó
     con un problema, se documenta y queda marcado como Dañado en vez de
     Disponible — igual que documentar una diferencia en una transferencia
     de cantidades. */
  const confirmarRecepcionTransferencia = (transferId, quienRecibe, llegoBien, motivoProblema) => {
    const t = transferenciasPendientes.find((x) => x.id === transferId);
    if (!t) return;
    setAllData((prev) => {
      const destinoData = prev[t.destino];
      const nuevoId = Math.max(0, ...destinoData.equipo.map((e) => e.id)) + 1;
      const nuevoEquipo = {
        id: nuevoId,
        nombre: t.nombre,
        categoria: t.categoria,
        estado: llegoBien ? "Disponible" : "Dañado",
        foto: t.foto || null,
        fotos: t.fotos || [],
        costo: t.costo || 0,
        quienLoTiene: null,
        quienAutorizo: null,
        fechaPrestamo: null,
        fechaDevolucion: null,
        notas: (llegoBien ? t.notasOriginales : motivoProblema) || "",
        historial: [
          ...(t.historialOriginal || []),
          { texto: `Recibido por transferencia desde ${NOMBRES_SUCURSAL[t.origen]}`, fecha: fmt(hoy) },
          ...(!llegoBien ? [{ texto: `Llegó con un problema: ${motivoProblema}`, fecha: fmt(hoy) }] : []),
        ],
      };
      return {
        ...prev,
        [t.destino]: {
          ...destinoData,
          equipo: [...destinoData.equipo, nuevoEquipo],
          bitacora: [...destinoData.bitacora, { texto: `${t.nombre} recibido de ${NOMBRES_SUCURSAL[t.origen]}${llegoBien ? "" : ` (con problema: ${motivoProblema})`}`, quien: quienRecibe, fecha: fmt(hoy) }],
        },
        [t.origen]: {
          ...prev[t.origen],
          bitacora: [...prev[t.origen].bitacora, { texto: `${t.nombre} confirmado como recibido en ${NOMBRES_SUCURSAL[t.destino]}`, quien: quienRecibe, fecha: fmt(hoy) }],
        },
      };
    });
    setTransferenciasPendientes((ts) => ts.map((x) => (x.id === transferId ? { ...x, estado: "Recibido", quienRecibio: quienRecibe, fechaRecepcion: fmt(hoy) } : x)));
    mostrarToast("Transferencia confirmada ✓");
    enviarNotificacionPush(
      [t.origen, "admin"],
      `Transferencia confirmada — ${NOMBRES_SUCURSAL[t.origen]}`,
      llegoBien
        ? `${t.nombre} llegó bien a ${NOMBRES_SUCURSAL[t.destino]}, recibido por ${quienRecibe}.`
        : `${t.nombre} llegó con un problema a ${NOMBRES_SUCURSAL[t.destino]}: ${motivoProblema}`
    );
  };

  /* Transferencia de bases entre sucursales — mismo espíritu que la de
     equipo, pero por cantidad en vez de por pieza única: la resta ya se
     hizo en AlmacenScreen (junto con su movimiento en el ledger); aquí solo
     se registra el viaje pendiente. */
  const iniciarTransferenciaBase = (base, cantidad, quien, nota) => {
    const destino = OTRA_SUCURSAL[sucursalActiva];
    setTransferenciasBasesPendientes((t) => [
      ...t,
      {
        id: Date.now(),
        nombre: base.nombre,
        catalogo: base.catalogo,
        costo: base.costo || 0,
        cantidad,
        nota: nota || "",
        origen: sucursalActiva,
        destino,
        estado: "En tránsito",
        quienEnvio: quien,
        fechaEnvio: fmt(hoy),
        quienRecibio: null,
        fechaRecepcion: null,
        cantidadRecibida: null,
      },
    ]);
    mostrarToast(`Préstamo enviado a ${NOMBRES_SUCURSAL[destino]} ✓`);
    enviarNotificacionPush(
      [destino, "admin"],
      `Préstamo en camino — ${NOMBRES_SUCURSAL[destino]}`,
      `${cantidad} × ${base.nombre} viene de ${NOMBRES_SUCURSAL[sucursalActiva]}. Confírmalo en Más → Transferencias cuando llegue.`
    );
  };

  /* Al confirmar, la cantidad recibida entra al inventario de la sucursal
     destino como una base más (si ya existe una con ese nombre, se suma a
     su "tenemos"; si no, se crea) y queda anotada en su propio ledger. */
  const confirmarRecepcionTransferenciaBase = (transferId, quienRecibe, cantidadRecibida, notaDiferencia) => {
    const t = transferenciasBasesPendientes.find((x) => x.id === transferId);
    if (!t) return;
    setAllData((prev) => {
      const destinoData = prev[t.destino];
      const existente = destinoData.bases.find((b) => b.nombre === t.nombre);
      const nota = cantidadRecibida !== t.cantidad ? `Recibido por transferencia de ${NOMBRES_SUCURSAL[t.origen]} (se enviaron ${t.cantidad})${notaDiferencia ? ` — ${notaDiferencia}` : ""}` : `Recibido por transferencia de ${NOMBRES_SUCURSAL[t.origen]}`;
      let bases;
      if (existente) {
        bases = destinoData.bases.map((b) =>
          b.id === existente.id
            ? { ...b, tenemos: b.tenemos + cantidadRecibida, movimientos: [...(b.movimientos || []), movimientoBase("entrada", cantidadRecibida, quienRecibe, nota, { origen: t.origen })] }
            : b
        );
      } else {
        const nuevoId = Math.max(0, ...destinoData.bases.map((b) => b.id)) + 1;
        bases = [
          ...destinoData.bases,
          {
            id: nuevoId,
            nombre: t.nombre,
            catalogo: t.catalogo,
            costo: t.costo || 0,
            tenemos: cantidadRecibida,
            pedidoProveedor: 0,
            reservas: [],
            movimientos: [movimientoBase("entrada", cantidadRecibida, quienRecibe, nota, { origen: t.origen })],
          },
        ];
      }
      return {
        ...prev,
        [t.destino]: {
          ...destinoData,
          bases,
          bitacora: [...destinoData.bitacora, { texto: `${t.nombre} ×${cantidadRecibida} recibido de ${NOMBRES_SUCURSAL[t.origen]}`, quien: quienRecibe, fecha: fmt(hoy) }],
        },
        [t.origen]: {
          ...prev[t.origen],
          bitacora: [...prev[t.origen].bitacora, { texto: `Préstamo de ${t.nombre} ×${t.cantidad} confirmado como recibido en ${NOMBRES_SUCURSAL[t.destino]}`, quien: quienRecibe, fecha: fmt(hoy) }],
        },
      };
    });
    setTransferenciasBasesPendientes((ts) => ts.map((x) => (x.id === transferId ? { ...x, estado: "Recibido", quienRecibio: quienRecibe, fechaRecepcion: fmt(hoy), cantidadRecibida } : x)));
    mostrarToast("Recepción confirmada ✓");
    enviarNotificacionPush(
      [t.origen, "admin"],
      `Préstamo confirmado — ${NOMBRES_SUCURSAL[t.origen]}`,
      cantidadRecibida === t.cantidad
        ? `${cantidadRecibida} × ${t.nombre} llegó bien a ${NOMBRES_SUCURSAL[t.destino]}, recibido por ${quienRecibe}.`
        : `${t.nombre} llegó a ${NOMBRES_SUCURSAL[t.destino]}: se enviaron ${t.cantidad}, llegaron ${cantidadRecibida}. ${notaDiferencia || ""}`
    );
  };

  if (!datosListos) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.background, fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>
        <GlobalStyles />
        <img src={LOGO_PHOTOGRAF} alt="Photograf" style={{ width: 48, height: 48 }} className="pf-pop" />
        <div style={{ marginTop: 10, fontSize: 13, color: C.muted }}>Cargando inventario…</div>
      </div>
    );
  }

  if (mostrarAdmin) {
    return (
      <div className="pf-shell" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>
        <GlobalStyles />
        {adminAutenticado ? (
          <AdminScreen
            empleados={empleados}
            setEmpleados={setEmpleados}
            allData={allData}
            setAllData={setAllData}
            config={config}
            setConfig={setConfig}
            transferencias={transferenciasPendientes}
            setTransferencias={setTransferenciasPendientes}
            transferenciasBases={transferenciasBasesPendientes}
            setTransferenciasBases={setTransferenciasBasesPendientes}
            mostrarToast={mostrarToast}
            onBack={() => setMostrarAdmin(false)}
            permisoNotificaciones={permisoNotificaciones}
            onActivarNotificacionesAdmin={activarNotificacionesAdmin}
          />
        ) : (
          <AdminGate config={config} onSuccess={entrarComoAdmin} onCancel={() => setMostrarAdmin(false)} />
        )}
      </div>
    );
  }

  if (!appActiva) {
    return (
      <div className="pf-shell" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>
        <GlobalStyles />
        <HubScreen
          usuario={usuarioActual}
          onAbrirInventario={() => setAppActiva("inventario")}
          onAbrirAsistencia={() => setAppActiva("asistencia")}
          onCambiarUsuario={() => setUsuarioActual(null)}
        />
      </div>
    );
  }

  if (appActiva === "asistencia") {
    return (
      <div className="pf-shell" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif', background: C.background, minHeight: "100vh" }}>
        <GlobalStyles />
        <AsistenciaScreen onBack={() => setAppActiva(null)} />
      </div>
    );
  }

  // A partir de aquí, appActiva === "inventario": recién aquí se pide el nombre.
  if (!usuarioActual) {
    return (
      <div className="pf-shell" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>
        <GlobalStyles />
        <UserPicker empleados={empleados} onSelect={setUsuarioActual} onAdminMode={() => setMostrarAdmin(true)} />
      </div>
    );
  }

  if (!sucursalActiva) {
    if (vistaExterna === "miInventario") {
      return (
        <div className="pf-shell" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif', background: C.background, minHeight: "100vh" }}>
        <GlobalStyles />
          <SectionHeader title="Mi Inventario" onBack={() => setVistaExterna(null)} />
          <MiInventarioScreen allData={allData} usuarioActual={usuarioActual} />
        </div>
      );
    }
    if (vistaExterna === "buscar") {
      const etiquetar = (arr, suc) => arr.map((x) => ({ ...x, _sucursal: suc }));
      const combinado = {
        equipo: [...etiquetar(allData.queretaro.equipo, "queretaro"), ...etiquetar(allData.salinas.equipo, "salinas")],
        materiales: [...etiquetar(allData.queretaro.materiales, "queretaro"), ...etiquetar(allData.salinas.materiales, "salinas")],
        bases: [...etiquetar(allData.queretaro.bases, "queretaro"), ...etiquetar(allData.salinas.bases, "salinas")],
      };
      return (
        <div className="pf-shell" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif', background: C.background, minHeight: "100vh" }}>
        <GlobalStyles />
          <BuscadorGeneral data={combinado} onClose={() => setVistaExterna(null)} />
        </div>
      );
    }
    return (
      <div className="pf-shell" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>
        <GlobalStyles />
        <SucursalSelector usuario={usuarioActual} onCambiarUsuario={() => setUsuarioActual(null)} onUnlock={(s) => { setSucursalActiva(s); setScreen("home"); }} onOpenMiInventario={() => setVistaExterna("miInventario")} onOpenBuscar={() => setVistaExterna("buscar")} config={config} />
      </div>
    );
  }

  const data = allData[sucursalActiva];
  const alertas = calcularAlertas(data, config);

  if (vistaExterna === "buscar") {
    const irABuscarResultado = (tipo, id) => {
      if (tipo === "Equipo") setAbrirEquipoId(id);
      setScreen(tipo === "Equipo" ? "equipo" : tipo === "Base" ? "almacen" : "materiales");
      setVistaExterna(null);
    };
    return (
      <div className="pf-shell" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif', background: C.background, minHeight: "100vh" }}>
        <GlobalStyles />
        <BuscadorGeneral data={data} onClose={() => setVistaExterna(null)} onSelect={irABuscarResultado} />
      </div>
    );
  }

  if (vistaExterna === "escanear") {
    return (
      <div className="pf-shell" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif', background: C.background, minHeight: "100vh" }}>
        <GlobalStyles />
        <EscanearScreen sucursalActiva={sucursalActiva} onClose={() => setVistaExterna(null)} onEncontrado={resolverCodigoEscaneado} />
      </div>
    );
  }

  const screens = {
    home: <HomeScreen data={data} goTo={setScreen} alertas={alertas} sucursalNombre={NOMBRES_SUCURSAL[sucursalActiva]} mostrarToast={mostrarToast} usuarioActual={usuarioActual} />,
    equipo: <EquipoScreen data={data} setData={setData} bitacora={agregarBitacora} usuarioActual={usuarioActual} onIniciarTransferencia={iniciarTransferenciaEquipo} sucursalActiva={sucursalActiva} mostrarToast={mostrarToast} abrirEquipoId={abrirEquipoId} onAbrirConsumido={() => setAbrirEquipoId(null)} />,
    almacen: <AlmacenScreen data={data} setData={setData} bitacora={agregarBitacora} usuarioActual={usuarioActual} sucursal={sucursalActiva} mostrarToast={mostrarToast} onPedir={crearPedido} onIniciarTransferenciaBase={iniciarTransferenciaBase} />,
    materiales: <MaterialesScreen data={data} setData={setData} bitacora={agregarBitacora} usuarioActual={usuarioActual} mostrarToast={mostrarToast} config={config} onPedir={crearPedido} sucursal={sucursalActiva} />,
    miInventario: <MiInventarioScreen allData={allData} usuarioActual={usuarioActual} />,
    mas: <MasScreen data={data} setData={setData} bitacora={agregarBitacora} mostrarToast={mostrarToast} alertas={alertas} config={config} isDark={isDark} onToggleDark={toggleDark} onDeshacer={deshacer} puedeDeshacer={!!snapshot[sucursalActiva]} usuarioActual={usuarioActual} onCambiarUsuario={() => setUsuarioActual(null)} onAdminMode={() => setMostrarAdmin(true)} transferenciasPendientes={transferenciasPendientes} transferenciasBasesPendientes={transferenciasBasesPendientes} sucursalActiva={sucursalActiva} onConfirmarTransferencia={confirmarRecepcionTransferencia} onConfirmarTransferenciaBase={confirmarRecepcionTransferenciaBase} permisoNotificaciones={permisoNotificaciones} onActivarNotificaciones={activarNotificaciones} onVolverHub={() => { setAppActiva(null); setSucursalActiva(null); }} />,
  };

  return (
    <div className="pf-shell" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif', background: C.background, minHeight: "100vh", position: "relative" }}>
        <GlobalStyles />
      {screen === "home" && <TopHeader sucursal={sucursalActiva} onLogout={() => setSucursalActiva(null)} onSearch={() => setVistaExterna("buscar")} onScan={() => setVistaExterna("escanear")} />}
      <div key={screen} className="pf-fade-in">{screens[screen]}</div>
      <BottomNav active={screen} onChange={setScreen} badge={alertas.length + transferenciasPendientes.filter((t) => t.destino === sucursalActiva && t.estado === "En tránsito").length + transferenciasBasesPendientes.filter((t) => t.destino === sucursalActiva && t.estado === "En tránsito").length} />
      <Toast text={toast} />
      {errorGuardado && (
        <div style={{ position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", background: C.error, color: textoContraste(C.error), fontSize: 11, padding: "6px 12px", borderRadius: 20, zIndex: 60 }}>
          No se pudo guardar. Revisa tu conexión.
        </div>
      )}
    </div>
  );
}
