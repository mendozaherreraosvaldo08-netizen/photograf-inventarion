# Photograf Inventario — listo para publicar

Este es el mismo Photograf Inventario que ya probaste, pero empacado como
proyecto real (con Vite) para subirlo a internet con su propio link — algo
que Claude no puede hacer por ti, porque solo tú puedes crear cuentas y
publicar en tu nombre.

Ya trae:
- **Manifest + íconos** con tu logo real → se puede "instalar" en el celular.
- **Service worker** → funciona sin internet una vez cargada.
- **`window.storage` reemplazado por el navegador real** → los datos si se
  guardan de verdad entre visitas (esto no funcionaba fuera de la vista
  previa de Claude, aquí ya está resuelto).
- Base lista para notificaciones push reales (falta conectar un servicio,
  ver el apartado de abajo).

## 1. Instala las dependencias

Con Node.js ya instalado (el mismo que instalaste para lo de Expo), abre
una terminal **dentro de esta carpeta** y corre:

```
npm install
```

## 2. Pruébala en tu compu antes de publicar

```
npm run dev
```

Te da un link tipo `http://localhost:5173` — ábrelo en tu navegador para
confirmar que todo se ve bien antes de publicarla de verdad.

## 3. Publícala en Vercel (gratis, con tu propio link)

1. Instala la herramienta de Vercel (una sola vez):
   ```
   npm install -g vercel
   ```
2. Dentro de esta misma carpeta, corre:
   ```
   vercel
   ```
3. Te va a pedir iniciar sesión — abre el link que te dé en el navegador,
   crea una cuenta gratis con tu correo o con Google, y regresa a la
   terminal.
4. Te va a hacer 3-4 preguntas (nombre del proyecto, etc.) — dale Enter a
   todas para aceptar lo que viene por default.
5. Al final te da un link real, algo como
   `https://photograf-inventario.vercel.app` — ese es el que vas a usar
   para instalarla en el celular y, después, para generar el `.apk`.

Para volver a publicar cambios más adelante, dentro de la carpeta corre:
```
vercel --prod
```

## 4. Instalarla en el celular (antes de convertirla en .apk)

Abre ese link en Chrome (Android) desde el celular → menú (⋮) → **"Instalar
aplicación"** o **"Agregar a pantalla de inicio"**. Ya se ve como una app,
con su ícono y sin la barra del navegador.

## 5. Sobre las notificaciones reales y Asistencia

- **Notificaciones con la app cerrada:** el `sw.js` ya tiene la estructura
  lista, pero para que de verdad lleguen falta conectar un servicio como
  **Firebase Cloud Messaging** o **OneSignal** (ambos gratis para este
  tamaño de uso). Es el siguiente paso natural una vez que ya esté
  publicada — antes no tenía caso configurarlo.
- **Asistencia embebida:** una vez publicada aquí, pruébala de nuevo. Si
  sigue sin cargar embebida, es que esa página tiene una restricción de
  seguridad propia (no algo que se arregle desde este lado) y habría que
  pedirle a quien la programó que la ajuste.

## Estructura del proyecto

```
index.html              → punto de entrada, con el manifest y los íconos
public/
  manifest.json          → configuración de la PWA
  sw.js                  → service worker (offline + base de notificaciones)
  icons/                 → tu logo en los tamaños necesarios
src/
  main.jsx               → arranca la app y registra el service worker
  App.jsx                → toda la aplicación (idéntica a la que ya probaste)
```

---

## Actualización — Panel de administrador y correcciones

### Panel de administrador

Se entra igual que antes: **Más → Panel de administrador**, con la contraseña de admin
(inicial `admin2024`, ya se puede cambiar desde el propio panel).

El panel abre con un **resumen con gráficas** de las dos sucursales: valor total del
inventario, cómo está repartido el equipo, movimientos por semana, valor por categoría,
quién pide más equipo y cuál se presta más. Debajo están las secciones:

| Sección | Para qué sirve |
|---|---|
| Empleados | Agregar, renombrar y quitar. Muestra qué trae prestado cada quien. |
| Pedidos a proveedor | Autorizar o rechazar, con el costo estimado del total pendiente. |
| Paquetes sin recoger | Clientes ordenados por días esperando, con botón de WhatsApp, llamada y correo. |
| Equipo fuera de servicio | Dañado o en reparación, con cuánto dinero está parado. |
| Editar inventario | Corregir o eliminar equipo, materiales y bases de cualquier sucursal. |
| Categorías | Renombrar o juntar categorías repetidas en ambas sucursales a la vez. |
| Historial de movimientos | Bitácora completa con filtros por sucursal, persona y texto. |
| Ajustes | Contraseñas, mínimo de stock, respaldo/restauración y registro de entradas al panel. |

Además, un botón descarga **todo en Excel**: hojas de resumen, equipo, materiales, bases,
paquetes de clientes, pedidos y bitácora.

### Pedidos a proveedor

Antes no había forma de crear pedidos, solo existían los de ejemplo. Ahora:

1. Se crean desde **Almacén → Pedidos**, o con el botón **Pedir más** que aparece en los
   materiales con stock bajo.
2. Nacen como *Por aprobar* y el administrador los autoriza o rechaza.
3. Ya autorizados, se marcan como recibidos y suman solos al inventario.

### Correcciones importantes

- **Fotos comprimidas.** Una foto de celular pesa entre 2 y 5 MB, y el límite de Firestore
  es 1 MB por documento: con una sola foto la app dejaba de guardar todo, en silencio.
  Ahora se reescalan a 1000 px antes de subirse (quedan en ~150 KB).
- **La fecha ya no se congela.** Estaba fija en el momento de abrir la app; en una tablet
  que se queda prendida, los atrasos y los plazos de paquetes quedaban mal por días.
- **Las transferencias ya no pierden datos.** Al mandar equipo a la otra sucursal se perdía
  el costo, las fotos y todo el historial, y el valor del inventario bajaba solo.
- **El equipo dañado ya se puede reparar.** Antes quedaba dañado para siempre: no había
  cómo mandarlo a reparación ni regresarlo al servicio.
- **No se puede transferir equipo prestado.** Antes desaparecía de las dos sucursales.
- **Ya no se sobrescriben los datos reales.** Si fallaba la lectura de internet un segundo,
  la app subía sus datos de ejemplo y borraba el inventario.
- **Datos de versiones anteriores.** Antes tronaban la pantalla completa; ahora se
  completan solos al cargar.
- **Deshacer** ya no regresa a un estado equivocado.
- **La bitácora tiene tope** de 400 movimientos por sucursal (antes crecía sin límite hasta
  rebasar el límite de la nube).
- **Escanear un QR** estando ya en la pantalla de Equipo ahora sí abre la ficha.
- **Mínimo de stock configurable**, general o por material, en vez del 3 fijo de antes.

---

## Catálogo 2026 cargado

Los 22 paquetes de los dos catálogos ya vienen en la app, con su precio de venta,
medidas y descripción de lo que incluye cada uno.

**Escolar (las dos sucursales)** — Fotográfico $500, Rectangular $530, Testimonial $550,
Foto Plaquita $630, Book Vertical $650, Book Horizontal $650, Triple $680, Silvatrin $730,
Collage JR $780, Collage Máster $880, Collage 3D $1,100.

**UNICEQ (solo Querétaro)** — Basic: Star Light $2,850 · Clásica: Alcala, Flimsy y Paralelo
$3,400 · Ejecutiva: Petatillo Arena, Mayab Arena y Polaris $4,950 · Platino: Elegance,
Colonial Cristal, Antares y Petatillo Cristal $6,020.

En Almacén, cada paquete muestra su precio y, al tocar las medidas, se despliega qué
incluye. Ahí mismo se recuerda lo que va parejo en todos: el préstamo de la toga en los
escolares, y en UNICEQ el boleto para el alumno y un acompañante, las fotos de trámite,
el anillo de plata y el préstamo de toga, birrete, estola y borla (más capa y lámpara
para Enfermería).

### Cargarlo en la app que ya está en uso

Como ya tienen datos guardados en la nube, el catálogo no aparece solo. Entra a
**Panel de administrador → Editar inventario → Bases** y usa el botón **Cargar catálogo
2026**. Hazlo una vez en cada sucursal.

- Agrega los paquetes que falten (en Salinas nunca carga los de UNICEQ).
- A los que ya existan solo les refresca precio, medidas y descripción.
- **No toca** las existencias ni los paquetes de clientes que ya tengas capturados.

Después, captura en cada paquete cuántos tienes en existencia y su costo — el precio es
lo que cobras, el costo es lo que te cuesta a ti, y es el que se usa para valuar el
inventario.

### Qué se desbloquea con los precios

- El panel de **Paquetes sin recoger** ahora dice cuánto dinero representan los paquetes
  que los clientes no han recogido, para priorizar a quién llamar primero.
- El Excel incluye el precio de venta de cada paquete y de cada paquete de cliente.

---

## Fotos de cada paquete

Los 22 paquetes ya traen su foto de muestra, sacada del catálogo real de Photograf
(están en `public/catalogo/`, ~1.3 MB en total, ya comprimidas para verse bien sin pesar).

- **Escolar**: una foto del producto por paquete.
- **UNICEQ**: dos fotos por paquete — la Panorámica (grande) y el Agradecimiento/Diploma
  (chica), tal como se ven en el catálogo. Se muestran una junto a otra en la tarjeta;
  al tocar cualquiera se abre en grande.

Son fotos reales de generaciones anteriores, tomadas del propio catálogo público de
Photograf — es el mismo criterio que ya usan en su marketing, ahora dentro de la app.

Si cargas el catálogo en una sucursal que ya tenía sus paquetes capturados sin foto,
**Cargar catálogo 2026** también les agrega la imagen sin tocar existencias ni paquetes
de clientes.

---

## Ledger de bases, códigos de artículo y préstamos entre sucursales

Se completaron los cuatro puntos que estaban "a medias" según los requerimientos del negocio.

### 1. Entradas y salidas de bases con saldo auditable

Cada base ahora tiene su propio historial de movimientos (botón **Movimientos** en su
tarjeta, dentro de Almacén). Cantidad inicial + entradas − salidas = cantidad actual,
y cada acción que toca el número de existencias queda registrada sola:

- Alta de una base nueva → movimiento "Entrada" (alta inicial).
- Recibir un pedido de proveedor → movimiento "Entrada".
- Botón **Registrar salida** → elige **Entrega/uso** (se resta y ya) o **Préstamo a
  [la otra sucursal]** (se resta aquí y queda pendiente hasta que allá confirmen).
- Editar la cantidad a mano (el lápiz de siempre) → movimiento "Ajuste", con nota.

### 2. Préstamo de bases entre sucursales

Igual que ya existía para equipo, pero por cantidad en vez de por pieza:

1. En Almacén, **Registrar salida → Préstamo**, con cantidad y nota.
2. Aparece en **Más → Transferencias → pestaña Bases** de ambas sucursales como
   "En tránsito".
3. La sucursal que recibe confirma cuántas llegaron (por si alguna se rompió en el
   camino) y quién las recibió — eso mismo suma a su inventario y a su propio ledger.
4. Si un préstamo lleva **5 días o más** sin confirmarse, aparece como aviso tanto en
   la pantalla de Transferencias como en el resumen del Panel de Administrador.

### 3. Códigos por artículo

Equipo, materiales y bases ya traen un código corto y consistente, visible en sus
tarjetas y en el Excel: `EQ-QRO-14`, `MAT-SAL-6`, `BASE-QRO-3` (sucursal abreviada +
número). Antes el folio de equipo solo existía dentro del Excel; ahora también se ve
en la ficha del artículo.

> Nota: el formato del folio de equipo cambió de `EQ-queretaro-14` a `EQ-QRO-14` para
> que las tres categorías compartan el mismo formato. Si ya imprimiste etiquetas con
> el formato viejo, siguen siendo válidas para identificar el artículo — solo cambia
> cómo se ve un folio nuevo.

### 4. Papelería como categoría

Al dar de alta un material aparecen categorías sugeridas con un toque —
**Papelería**, Consumibles, Props chicos, Accesorios, Indumentaria, Sublimación —
sin dejar de poder escribir cualquier otra categoría a mano.

### Lo que sigue pendiente (no estaba "a medias", es nuevo)

Del documento de requerimientos original, todavía falta: variantes de color por
modelo en UNICEQ, catálogo de Reconocimientos como inventario, piezas sueltas
(Overlay, Personalizador MDF-Vidrio, etc.), calculadora de requerimiento por lista de
producción, inventario de mobiliario, indumentaria estructurada con préstamo por
prenda, emblemáticos (anillos/medallas/pines) con responsiva de firma, consumibles de
producción (esculturas, textura, adhesivos, cintas), placas contabilizadas por hoja, y
gafetes.

---

## Módulo de Indumentaria (togas, birretes, estolas, capas, lámparas)

Nueva sección completa, accesible desde **Más → Indumentaria**. Cubre el renglón del
documento de requerimientos: *"Control de indumentarias: Togas – Birretes Licenciatura
– Birretes Niños – Estolas (con fleco y sin fleco-con pico) – Capas – Birretes
Octagonal, Hexagonal – Capas de Enfermería – Lamparitas."*

### Cómo funciona

Cada pieza (ej. "Toga — Adulto, Negro") tiene una cantidad total y se presta por
sesión a una persona — no necesariamente un empleado, puede ser el alumno o el
cliente que se la lleva puesta:

1. **Prestar**: elige cuántas, a quién, y para cuándo se espera de vuelta (normalmente
   el mismo día).
2. Mientras está prestada, resta de "Disponibles" pero no de "Total".
3. **Devolver**: confirma cuántas regresaron. Si falta alguna, se anota en la bitácora
   con la diferencia — no se descuenta sola del inventario, para que sea alguien quien
   decida si de verdad se perdió (y la ajuste a mano) o si solo se retrasó.
4. Si un préstamo pasa su fecha esperada sin devolverse, sale como alerta en
   Notificaciones y en el resumen del Panel de Administrador — es el aviso de
   "artículo no devuelto" que pedía el documento, usando exactamente el ejemplo que
   mencionaba (renta de togas).

### Dónde más aparece

- **Panel de administrador → Editar inventario → pestaña Indumentaria**: alta, edición
  y eliminación entre las dos sucursales.
- **Excel**: dos hojas nuevas, "Indumentaria" (existencias y valor) y "Préstamos de
  indumentaria" (historial completo).
- **Código por artículo**: `IND-QRO-3`, mismo formato que equipo/materiales/bases.

### Qué no incluye todavía

Cada pieza es un bulto por tipo+detalle (ej. "40 togas negras talla adulto"), no
artículos serializados uno por uno como el equipo fotográfico — para renta de togas
esto es normalmente suficiente. Si más adelante necesitan rastrear una toga
específica (por ejemplo, para saber cuál se dañó), eso sería un cambio de modelo
aparte.

---

## Módulo de Emblemáticos (anillos, medallas, pines)

Nueva sección en **Más → Emblemáticos**. Cubre el requerimiento: *"Inventario de
emblemáticos: Anillos (especificar material - responsiva de firma cuando sean de
oro para resguardo) – Medallas – Pines."*

### Cómo funciona

Cada pieza tiene tipo, material (solo relevante en anillos: Oro, Plata, Acero, Otro),
detalle, cantidad total y costo. Se **asigna a resguardo** de una persona — no es un
préstamo con fecha de devolución como indumentaria, sino una custodia que se libera
cuando corresponda (por ejemplo, cuando se entrega al cliente en la ceremonia).

**La regla especial que pedía el documento:** si el anillo es de oro, la app no deja
asignar el resguardo sin marcar primero que la firma de responsiva ya se capturó —
es un candado explícito, no solo un recordatorio. Para plata, medallas y pines, el
resguardo se puede asignar sin ese paso.

Si un anillo de oro queda en resguardo sin esa firma confirmada (por ejemplo, si se
edita después), sale como alerta en Notificaciones y en el resumen del Panel de
Administrador.

### Dónde más aparece

- **Panel de administrador → Editar inventario → pestaña Emblemáticos**.
- **Excel**: hojas "Emblemáticos" (existencias y valor) y "Custodia de emblemáticos"
  (historial completo, con columna explícita de si tiene o no la firma).
- **Código por artículo**: `EMB-QRO-2`.

### Qué no incluye todavía

No hay un repositorio de la firma en sí (foto o PDF escaneado) — solo la confirmación
de que existe, con quién la tiene y cuándo. Si más adelante quieren adjuntar la
responsiva escaneada a cada resguardo, es un cambio aparte (subir y guardar el archivo).

---

## Módulo de Mobiliario (computadoras, disco duro, escritorios, dispensadores)

Nueva sección en **Más → Mobiliario**. Cubre el requerimiento: *"Inventario de
mobiliario: Computadoras (registrado por modelo) – Disco Duro – Escritorio –
Dispensador de agua."*

Es el más simple de los módulos nuevos a propósito: no hay préstamo ni custodia,
solo existencias por modelo con su costo, ubicación y estado (Disponible, En
reparación, Baja) — igual que se pidió, "registrado por modelo" y con costo para
poder sumar la inversión.

- **Panel de administrador → Editar inventario → pestaña Mobiliario**.
- **Excel**: hoja "Mobiliario" con valor total por artículo.
- **Código por artículo**: `MOB-QRO-4`.

### Además: el valor total de inversión ahora es completo

*"Colocar costos a los equipos fotográficos, escritorios, para obtener la inversión
en mobiliario y equipo"* — la tarjeta de **Valor del inventario** en el resumen del
Panel de Administrador ya sumaba equipo, materiales y bases; ahora también suma
mobiliario, indumentaria y emblemáticos. Es el mismo número de siempre, solo que
ahora sí es el total real del negocio, no solo de tres categorías.

---

## Módulo de Piezas y Catálogos (Reconocimientos, piezas sueltas, gafetes)

Nueva sección en **Más → Piezas y Catálogos**. Agrupa tres listas del documento de
requerimientos que comparten exactamente la misma estructura — existencia y costo,
sin préstamo — así que en vez de tres módulos casi idénticos, es uno solo con un
filtro de grupo:

- **Reconocimientos**: Reconocimiento/Diploma enmarcado, Trofeo, Personalizador,
  Taza, Carpeta y Diploma.
- **Piezas de producción**: Book Vertical (pieza), Book Horizontal (pieza),
  Personalizador MDF-Vidrio, Overlay, Base 8x, Base 6x, Foto Birrete, Porta Estola —
  las piezas sueltas que arman los paquetes fotográficos.
- **Gafetes**.

Cada tipo lleva "Otro" como salida para lo que no encaje, y cualquier pieza puede
tener su propio mínimo de aviso (como los materiales), o usar el general de la
sucursal.

- **Panel de administrador → Editar inventario → pestaña Piezas**.
- **Excel**: hoja "Piezas y catálogos".
- **Código por artículo**: `PZA-QRO-3`.
- **Avisos de stock bajo**: igual que materiales, ya suenan también para estas piezas.
- Su valor ya está incluido en el total de inversión del resumen del admin.

### Nota sobre el "Catálogo de Reconocimientos"

El documento lo menciona por nombre pero no traía un PDF con precios como Escolar o
UNICEQ, así que los tipos de Reconocimientos los tomé de la página "Servicios y
artículos adicionales" del propio catálogo escolar que ya subieron. Si tienen una
lista de precios distinta para vender estos artículos (no solo el costo interno),
avísenme y se la agrego como precio de venta, igual que a las bases.

---

## Variantes de color (catálogo Universidad)

Cubre el requerimiento: *"Catálogo Universidad: Agregar los modelos con sus
respectivas variantes de color."*

### Cómo funciona

Cada modelo de UNICEQ puede llevar la existencia repartida por color en vez de un
solo número. Es opcional y por modelo — en Almacén, cada base de UNICEQ tiene un
botón **"Agregar variantes de color"**:

1. En cuanto agregas el primer color (ej. "Vino", cantidad inicial), ese modelo pasa
   a llevarse por color. El número general de "Tenemos" deja de editarse directo —
   se vuelve la suma de todos los colores, calculada sola.
2. **Registrar salida** te pide elegir de qué color sale, y resta solo de ese color.
3. **Pedir al proveedor** también deja elegir el color al pedir una base que ya
   maneja variantes; al recibirlo, la cantidad entra a ese color (o crea el color si
   era uno nuevo).
4. Los modelos que nunca agregan un color siguen funcionando exactamente igual que
   antes — un solo número, editable con el lápiz de siempre. Nada se rompe para los
   que no necesiten esto.

### Dónde más aparece

- **Panel de administrador → Editar inventario**: la tarjeta de la base muestra el
  desglose por color; el modal de edición ya no deja tocar "Cuántas tenemos" a mano
  cuando hay variantes (se ve el desglose, de solo lectura).
- **Excel**: la hoja "Bases" tiene la columna "Variantes de color" con el desglose
  completo, y "Tenemos" ya refleja el total real. La hoja "Movimientos de bases"
  tiene una columna "Color" para rastrear qué movimiento tocó qué color.
- **Alertas de choque de reservas**: ya comparan contra el total real por color, no
  contra un número desactualizado.
- **Valor del inventario**: ya suma con el total real, con o sin variantes.

### Qué no incluye todavía

Los paquetes de clientes (reservas) no capturan de qué color específico es cada
paquete — solo cuentan contra el total del modelo. Si más adelante necesitan saber
"el paquete de Fulanito es en Vino", habría que agregar un selector de color también
ahí, en el momento de asignar el paquete.

---

## Módulo de Placas por hoja (el último pendiente del documento)

Nueva sección en **Más → Placas por hoja**. Cubre el requerimiento: *"Placas:
Contabilizada por hoja (30x60 – 60x120) en formato grande, o en formato chico
(Panorámica – Agradecimiento – Diploma – Individual – Personalizador – Fotoplaquita
– Jr – Collage 3D – Collage Master – Triple – Book Vertical y Horizontal – Silvatrín
– Testimonial)."*

### Cómo funciona

Dos inventarios enlazados por una conversión:

1. **Hojas grandes** — la materia prima que se compra, en 30x60 o 60x120, con su costo.
2. **Placas chicas** — los 14 formatos exactos que menciona el documento, ya cortados
   y listos para armar un paquete.
3. **Producir placas desde una hoja** — el botón que conecta ambas: eliges tamaño de
   hoja, qué formato chico vas a cortar y cuántas hojas usas. La app calcula cuántas
   placas chicas resultan y mueve el inventario de las dos: resta hojas, suma placas.

### La decisión importante: el rendimiento nunca se inventa

Cuántas placas de "Individual" salen de una hoja de 60x120 es un dato físico real del
taller — no algo que la app pueda adivinar. Por eso, **hasta que el administrador no
lo capture en Ajustes → Rendimiento de placas**, esa combinación de tamaño+formato
se queda en 0 y la app bloquea la producción con un aviso claro, en vez de calcular
con un número inventado que llevaría a un conteo de inventario equivocado.

La matriz de rendimiento es por sucursal (14 formatos × 2 tamaños = 28 casillas),
editable en cualquier momento.

### Dónde más aparece

- **Excel**: cuatro hojas nuevas — "Hojas grandes", "Placas chicas", "Rendimiento de
  placas" (la matriz completa) y "Producción de placas" (bitácora de cada corte:
  fecha, quién, cuántas hojas, cuántas placas resultaron).
- **Código por artículo**: `HOJA-QRO-2`, `PLACA-QRO-3`.
- **Avisos de stock bajo**: tanto para hojas grandes como para placas chicas.
- **Valor del inventario**: se suma el costo de las hojas grandes; las placas chicas
  no se sumaron aparte a propósito — ya están valuadas como parte de la hoja de la
  que salieron, sumarlas también sería contar el mismo material dos veces.

---

## Con esto, el documento de requerimientos original está completo

Los 15 puntos que llegaron en el PDF original ya están cubiertos en la app: los tres
catálogos con sus variantes, requerimiento de bases con ledger completo, inventario
de equipo/mobiliario/indumentaria/emblemáticos, placas por hoja con su conversión,
códigos por artículo, avisos de mínimo y de no devuelto, costos para calcular
inversión total, y reportes por artículo. Lo que quede después de esto ya es
construir sobre lo que existe, no cerrar huecos del documento original.

---

## Pasada de diseño — que se vea a la altura de lo que ya hace

Mientras me pasas los datos reales, elevé el diseño visual de toda la app. Cambié
el sistema de color y tipografía en un solo lugar (los tokens `LIGHT`/`DARK`), así
que el cambio se refleja en las más de 6,000 líneas de la app automáticamente, sin
tocar pantalla por pantalla.

### Qué cambió

- **Paleta nueva**: antes era azul y cian genéricos de dashboard (`#0066FF`,
  `#00B4D8`) — la misma que usa cualquier app hecha con plantilla. Ahora es un
  marino académico, oro de medalla/diploma y terracota (tomado del naranja real
  de tu logo), sobre neutros cálidos en vez de grises fríos. El oro se reserva
  para cifras de dinero y momentos de reconocimiento — no es un color decorativo
  suelto, tiene trabajo que hacer.
- **Tipografía**: ya tenías Fraunces (una serif con carácter) cargada pero casi
  sin usar — ahora todos los títulos de pantalla la usan de forma consistente.
- **El listón dorado**: un detalle de firma — una línea delgada en degradado oro
  que aparece bajo "Photograf" en las tres pantallas de entrada (elegir quién
  eres, elegir app, elegir sucursal), y como remate en las dos tarjetas
  "hero" de la app (valor del inventario, próximo evento). Es el único adorno
  que se repite, a propósito: que se vea intencional y no como decoración
  regada por todos lados.
- **Sombras más suaves y difusas** en las tarjetas — el detalle que hace que algo
  se sienta caro sin que se note por qué.
- **Fondo de escritorio** (cuando se abre en computadora) actualizado para que
  combine con la paleta nueva en vez de quedarse con el lavanda/rosa de antes.
- Revisé el contraste de cada combinación de color contra texto blanco y lo
  ajusté donde hacía falta, para que siga siendo accesible con la paleta nueva.

### Lo que no alcancé a cubrir en esta pasada

El modo oscuro heredó los mismos tonos más claros que ya tenía antes para
mostrarse sobre fondo oscuro, y siguen un poco bajos de contraste en texto
blanco pequeño sobre botones de color secundario/advertencia — es un problema
que ya existía antes de esta pasada, lo mejoré pero no lo resolví del todo.
Arreglarlo bien significaría cambiar el patrón de qué color de texto usa cada
botón en modo oscuro, que es un cambio de comportamiento, no solo de color —
lo dejo pendiente para no arriesgar romper algo a la mitad de esta entrega.

No pude ver la app corriendo en un navegador real en este entorno (no tengo
internet para `npm install`), así que validé cada color con cálculos de
contraste y revisé la sintaxis con TypeScript, pero no hay una captura de
pantalla real que te pueda enseñar todavía — eso lo vas a ver tú primero
cuando la corras.

---

## Terminado: contraste en modo oscuro + experiencia para empleados

### Lo que quedó pendiente de la pasada de diseño, ya resuelto

En vez de ajustar colores a mano uno por uno, hice algo más sólido: una función
(`textoContraste`) que calcula la luminancia real de cualquier color de fondo y
decide sola si el texto encima debe ir en blanco o en tinta oscura. Se aplicó a
botones, chips, badges y las tarjetas de color sólido de toda la app — más de 30
lugares corregidos automáticamente. De paso encontré y corregí dos problemas reales
de contraste que no eran solo de modo oscuro: las tarjetas grandes de "Inventario" /
"Asistencia" en la pantalla de elegir app, y la tarjeta de valor total en Reportes
(usaba el dorado como fondo, no solo como texto, y el texto blanco encima casi no
se leía).

### Experiencia para empleados

- **Saludo personalizado**: la pantalla de inicio ahora saluda por el nombre de
  quien entró y la hora real del celular — "Buenos días, Ana", "Buenas tardes,
  Carlos". Cuando no hay pendientes, en vez de no decir nada, confirma que todo
  está en orden.
- **Menú "Más" reorganizado** en tres grupos con etiqueta — Para hoy, Producción y
  catálogos, Cierre y reportes — en vez de una lista plana de 10 cosas revueltas.
  Lo que se usa todos los días (notificaciones, transferencias, calendario) queda
  arriba; lo que se usa por temporada (mobiliario, piezas) o al cierre (reportes)
  queda después.
- **Vibración al confirmar**: cada acción que termina en una confirmación (guardar,
  registrar, prestar, devolver...) ahora da un empujoncito táctil breve en el
  celular, sin que se tenga que mirar la pantalla para saber que funcionó. Si el
  navegador no lo soporta, no pasa nada — no se siente el error.

### Otras ideas para la experiencia de empleados, todavía no hechas

Aquí van más ideas concretas, para cuando quieras seguirle:

- **Accesos directos en el Home** para las acciones más repetidas del día
  (prestar equipo, registrar salida de una base) en vez de tener que entrar a la
  sección primero — ahorra pasos en lo que se hace decenas de veces al día.
- **Modo de una sola mano**: mover los botones de acción principales más abajo en
  pantalla para que se alcancen con el pulgar sin cambiar de mano.
- **Buscador unificado** que ya busque en equipo, materiales, bases e indumentaria
  al mismo tiempo, en vez de tener que saber en qué sección buscar.
- **Un tip o ayuda rápida** la primera vez que alguien entra a un módulo nuevo
  (indumentaria, emblemáticos, placas), para que no tenga que preguntarle a otro
  compañero cómo funciona.

---

## Catálogo Universidad, foto real por paquete y mejor alta de bases

### Catálogo Universidad (nuevo, para las dos sucursales)

33 paquetes nuevos: Fotográfico, y las líneas Unitaria (una pieza), Clásica,
Ejecutiva, Tradicional, Premier, Platino y Diamante (de 3, 4 o 5 piezas). A
diferencia de UNICEQ, que sigue siendo solo para Querétaro, **Universidad
aparece en las dos sucursales**.

Varios nombres coinciden con paquetes que ya existían (Fotográfico, Collage
3D, Antares, y casi todos los de UNICEQ: Alcala, Flimsy, Paralelo, Polaris,
Petatillo Arena, Mayab Arena, Elegance, Colonial Cristal, Petatillo Cristal).
Como la app identifica cada base por su nombre, dejarlos exactamente iguales
habría confundido dos paquetes distintos entre sí — llevan la línea entre
paréntesis para diferenciarse, por ejemplo "Alcala (Ejecutiva)" de Universidad
es un producto y precio distinto de "Alcala" de UNICEQ.

Para verlo en una sucursal que ya tenía datos, usa **Cargar catálogo 2026**
igual que antes (Panel de administrador → Editar inventario → Bases), o
agrega los paquetes uno por uno desde Almacén con el selector nuevo (ver
abajo).

### Foto real por paquete, además de la del catálogo

Cada base en Almacén ahora tiene un botón **"Foto"** (o "Cambiar foto" si ya
tiene una) junto a Salida y Movimientos, igual que ya existía para equipo y
materiales — toma o sube la foto real del paquete tal como lo tienen en la
sucursal. Esto es aparte de la foto de catálogo que ya se cargó con **Cargar
catálogo 2026**: la de catálogo es la foto de muestra genérica del producto,
esta nueva es la del paquete físico que tienen en el mostrador. El mismo
control vive también en el editor del admin.

### Selector al agregar una base nueva

El botón "+" en Almacén → Bases ahora abre a elegir entre **"Elegir del
catálogo"** (pestañas General / Universidad / UNICEQ, con buscador — al tocar
un nombre se llenan solos precio, medidas y qué incluye) o **"Escribir a
mano"** para algo que no esté en ningún catálogo. Ya no hay que escribir el
nombre exacto a ciegas.

### Contraseña de sucursal y de administrador: el teclado no abría solo

En varios celulares el `autoFocus` no bastaba para que el teclado apareciera
solo al entrar a la pantalla, y la tecla "Ir" del teclado no siempre enviaba
el formulario. Se corrigió con un enfoque manual con un pequeño retraso y
envolviendo el campo en un `<form>` de verdad, para que tanto "Ir" como
"Enter" funcionen.

---

## Notificaciones push reales (con la app cerrada) — por sucursal

Antes, `sw.js` ya traía la estructura lista pero no había nada del lado del
servidor que de verdad mandara el push — esto lo conecta.

### Cómo funciona

- **Un empleado** que activa notificaciones (Más → Activar notificaciones)
  solo recibe avisos de **su propia sucursal**.
- **El administrador** activa las suyas por separado, desde **Panel de
  administrador → Ajustes → Activar notificaciones de administrador**, y
  recibe avisos de **las dos sucursales**.
- Por ahora el push real solo se dispara en el caso que importa entre
  sucursales — transferencias:
  - Al **enviar** equipo o un préstamo de base a la otra sucursal: le llega
    a la sucursal que lo va a **recibir** (+ admin).
  - Al **confirmar** que llegó: le llega a la sucursal que lo **envió**
    (+ admin).
- Todo lo demás (stock bajo, paquetes vencidos, equipo atrasado, etc.) se
  sigue viendo en **Más → Notificaciones** dentro de la app, como antes —
  eso no manda push todavía, a propósito, para no saturar de avisos antes
  de probar que el circuito de transferencias funciona bien.

### Configurar (dos variables, una sola vez)

Esto solo lo puedes hacer tú, porque necesita tu propia cuenta de Firebase y
de Vercel — es exactamente lo mismo que ya hiciste una vez para conectar
Firebase a la app.

1. Entra a [console.firebase.google.com](https://console.firebase.google.com)
   → tu proyecto **photograf-2026** → el engranito ⚙️ arriba a la izquierda
   → **"Configuración del proyecto"** → pestaña **"Cuentas de servicio"**
   ("Service accounts").
2. Botón **"Generar nueva clave privada"** ("Generate new private key") →
   confirma. Se descarga un archivo `.json` — dentro trae tres datos que se
   necesitan: `project_id`, `client_email` y `private_key`.
3. Entra a [vercel.com](https://vercel.com) → tu proyecto de Photograf
   Inventario → **"Settings"** → **"Environment Variables"** → agrega estas
   tres, copiando el valor de cada una directo del archivo `.json` que se
   descargó:

   | Nombre de la variable | Valor (del archivo .json) |
   |---|---|
   | `FIREBASE_PROJECT_ID` | el valor de `project_id` |
   | `FIREBASE_CLIENT_EMAIL` | el valor de `client_email` |
   | `FIREBASE_PRIVATE_KEY` | el valor de `private_key` (pégalo completo, con los `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`) |

4. Guarda, y vuelve a publicar (**"Deployments" → los tres puntitos del
   último → "Redeploy"**, o simplemente vuelve a correr `vercel --prod` si
   publicas así) para que tome las variables nuevas.

Mientras no configures esto, el resto de la app sigue funcionando exactamente
igual — nada más el push real entre sucursales no hace nada todavía (falla
en silencio, no truena la app).

### Cómo probarlo

1. En un celular (o navegador) entra como empleado de Querétaro y activa
   notificaciones. En otro, como empleado de Salinas, también. En un
   tercero, entra al Panel de administrador → Ajustes y activa las de
   administrador.
2. Desde Querétaro, envía un equipo o un préstamo a Salinas.
3. El celular de Salinas (y el de admin) deben recibir la notificación aunque
   tengan la app cerrada o el celular bloqueado — si Salinas la confirma como
   recibida, ahora le toca a Querétaro (y admin) recibir el aviso de vuelta.

### Archivos nuevos

```
api/
  notify.js   → función serverless: recibe {sucursales, titulo, cuerpo} y
                manda el push real a los celulares de esas sucursales,
                usando Firebase Admin (las 3 variables de arriba)
```
