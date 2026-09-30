# TODO.md — Cosas por hacer (fuente centralizada)

> **Regla:** este es el lugar único donde vive lo próximo a hacer. Todo agente debe leerlo al empezar una sesión. Las decisiones ya tomadas se registran acá para no re-discutirlas. Lo implementado se tacha y se resume en `docs/06-roadmap.md`.
>
> **Para Fase 2 y 3:** el desglose paso a paso, en milestones chicos y con lo que necesita al dueño marcado aparte, vive en [`docs/11-plan-implementacion.md`](docs/11-plan-implementacion.md) — empezar sesión ahí cuando se retome la implementación.

---

## 0. Fase 2 online — lo que falta (actualizado 2026-09-23)

### 👤 Pasos del dueño (una sola vez; guía detallada en `docs/09` §2)

- [ ] **Paso 1:** Supabase → proyecto `nodos` → Authentication → Email → apagar "Confirm email".
- [ ] **Paso 2:** crear clave en console.anthropic.com, cargar crédito, pegarla en Vercel como `ANTHROPIC_API_KEY` y hacer Redeploy.
- [ ] **Paso 3:** crear la cuenta en https://nodos-seven.vercel.app ("Primera vez").
- [ ] **Paso 4:** instalar la app en el celular (Agregar a pantalla de inicio).
- [ ] **Probar con un texto real corto** (un artículo) y contar cómo se sintieron los nodos: largo, títulos, preguntas. Con eso se ajustan las instrucciones de Claude.
- [ ] Decidir si se mergea la rama `claude/mobile-app-usage-us3sfw` a `master` (así cada cambio futuro se publica solo).

### ⚪ Próximas tareas técnicas (sin prioridad asignada todavía)

| # | Tarea | Por qué |
|---|-------|---------|
| F2-1 | Progreso de lectura sincronizado (tabla en Supabase) | Hoy el último nodo leído se guarda por dispositivo. |
| ✅ F2-2 | Banco de conceptos sincronizado con la cuenta (2026-09-24) | Tabla `concept_bank` + `syncBank()`; sigue funcionando sin conexión. |
| F2-3 | T4/T5 con la misma clave de Claude | La clave ya existe tras el paso 2. |
| F2-4 | Preguntas de recuperación rotativas | Pospuesto por costo (docs/10 D11). |
| F2-5 | Procesamiento en segundo plano (Supabase Edge Functions) | Hoy hay que dejar la pantalla abierta (docs/10 D5). |
| F2-6 | Modo sin conexión para libros ya procesados | docs/10 D10. |
| F2-7 | Reprocesar un documento / editar cortes de nodos a mano | Si un corte no convence. |
| ✅ F2-8 | Procesar por partes elegidas del índice, a medida que se lee (2026-09-24) | Ahorro: se paga solo lo que se lee (docs/10 D12). |
| ✅ F2-9 | Artículos como una sola pieza; reconstrucciones marcadas en escaneados; respuestas/notas guardadas y exportación PDF (2026-09-24) | docs/10 D13–D15. |
| F2-10 | Número de página en las referencias del banco exportado | Hoy la ubicación es capítulo · nodo. |

---

## 1. Banco de conceptos v1.2 — estado actual

### ✅ Ya funcionando (prototipo, commit actual)

- Seleccionar texto en el nodo → aparece botón **⊕** flotante cerca de la selección (mouse y táctil; límite 300 caracteres).
- Al tocarlo: tarjeta con explicación. Si el texto coincide con el glosario del nodo usa esa definición (queda *explicado*); si no, muestra explicación claramente marcada **(Demo)** y guarda como *pendiente de explicación*.
- Botón "Guardar en mi banco de conceptos" → el concepto aparece en la pestaña **"Banco de conceptos"** del panel con etiqueta gris "pendiente" si corresponde.
- Se guarda contexto completo: término, párrafo contenedor, `documentId`, capítulo y número de nodo, fecha.
- Migración automática de conceptos guardados antes de existir estados → pasan a `explicado`.
- Cierra la tarjeta: Esc, × o scroll; una nueva selección reinicia el flujo.
- Pestaña renombrada de "Banco" a "Banco de conceptos".
- **Jerarquía del Banco (T2, 2026-08-23):** agrupado por Libro → Capítulo → Nodo con encabezados monoespaciados tipo IDE; capítulos ordenados por posición del nodo más temprano, términos por fecha descendente; cada libro es plegable (nace abierto) con contador.

### ✅ T4 y T5 hechas (2026-09-29)

`/api/concept` (Claude Haiku 4.5, tope 60/hora por usuario, modelo cambiable con `CLAUDE_CONCEPT_MODEL`). La tarjeta ofrece "Explicar con IA" (manual) y el Banco tiene "Explicar ahora" para los pendientes. Ya no hay texto "(Demo)". Sin probar aún con la clave real en producción.

### ⚪ (Histórico) Especificación de T4/T5

| # | Tarea | Especificación | Estimación |
|---|-------|----------------|------------|
| ✅ T4 (2026-09-29) | **Explicación real con IA** | Ruta interna `/api/concept`: recibe término + párrafo + ubicación, llama a **Claude Haiku 4.5** (Anthropic, actualizado 2026-09-08 — ver docs/04 §4.2) con clave del `.env.local` (`ANTHROPIC_API_KEY`), devuelve definición ≤60 palabras según prompt ya especificado en `docs/04 §4.2`. Costo estimado ~$1 cada 1000 llamadas. Sin clave configurada → mensaje neutro, nada se rompe. Instalar SDK `@anthropic-ai/sdk`. La clave NUNCA llega al navegador. Incluir un tope de uso simple (ver advertencias abajo) como red de seguridad. | M (~25k) |
| ✅ T5 (2026-09-29) | **Cola de reconexión ("Explicar ahora")** | Detectar internet (`navigator.onLine` + eventos online/offline). En el Banco, aviso discreto "N conceptos pendientes — [Explicar ahora]". El botón procesa uno por uno contra `/api/concept` usando el párrafo guardado como contexto; exitosos pasan a `explicado`; los que fallan siguen pendientes sin castigo. Resumen final en una línea ("3 explicados, 1 para reintentar"). **Decisión del dueño (2026-08-23): botón MANUAL, no automático**, porque cada llamada cuesta dinero y él decide cuándo gastar. | M (~18k) |

> **T2 (jerarquía visual) quedó completada el 2026-08-23** — ver sección ✅ arriba.

### Reemplazo de la explicación demo

Cuando T4 esté lista, los conceptos `pendiente` que tengan la explicación demo se actualizan con la real al ejecutar "Explicar ahora". No hace falta migración: basta sobrescribir `definition` y pasar `status` a `"explained"`.

---

## 2. Cuentas externas (para T4/T5) — desde cero

1. Crear cuenta en **Anthropic Console** (console.anthropic.com) con email del dueño.
2. Generar API key y pegarla en `.env.local` como `ANTHROPIC_API_KEY=sk-ant-...`.
3. Agregar la variable a `.env.example` (sin valor real).
4. Costo estimado: modelo Haiku ≈ fracciones de centavo por consulta; uso intensivo < $1/mes.

---

## 3. Advertencias permanentes (no negociables)

- **Privacidad:** usar la explicación IA envía término + párrafo a servidores de Anthropic. Material teórico de estudio, nunca datos clínicos ni de pacientes (regla de AGENTS.md).
- **Diseño antipunitivo:** los pendientes se muestran con etiqueta gris neutra; prohibido rojo, alertas o contadores de deuda.
- **Táctil:** todo control nuevo ≥40px; probar siempre en móvil (<768px).
- **Tope de gasto:** avisar (y opcionalmente bloquear temporalmente) si el uso mensual acumulado de IA supera un umbral de referencia (ej. $3), como red de seguridad ante bugs o doble-click. Con el patrón de uso real esperado (3–4 sesiones/día, pocas llamadas cada una) no debería activarse nunca — es una salvaguarda, no una restricción pensada para el uso normal.

---

## 4. Andamiaje decreciente del glosario (Expertise Reversal) — depende de Fase 3

**Decisión 2026-09-08**, tras revisar `docs/original/Bases Cognitivas para App Nodos.pdf` §3.3 (investigación completa, más específica que el resumen de `docs/02`):

- El mecanismo de fading (ocultar el cue visual de un término una vez dominado) requiere una señal de **maestría validada por el feedback de IA sobre la reflexión del usuario** — eso es Fase 3 (diálogo activo), todavía no construida.
- **No** se implementa como atajo sobre el estado `explained`/`pending` del Banco de conceptos: ese estado solo indica que se mostró una definición, no que el usuario demostró entenderla (son dos modos distintos del marco ICAP — Activo vs. Constructivo/Interactivo).
- Cuando Fase 3 esté lista: al validar una reflexión, marcar como "dominado" cualquier término del `context_glossary` del nodo que la IA considere correctamente vinculado en la respuesta del usuario. Definir dónde vive ese estado (extender `user_progress` o tabla nueva) al planificar Fase 3, no antes.
- Comportamiento del fading una vez implementado: el término deja de mostrarse resaltado/con cue por defecto, pero la definición sigue disponible bajo demanda manual — nunca desaparece del todo.

## 5. Dictado por voz — decisión 2026-09-08

- Confirmado como objetivo (el dueño lo quiere), supeditado a costo/calidad — ver `docs/01` §4.3.
- **Plan:** arrancar con **Web Speech API nativo del navegador** (gratis, sin backend, sin API key). Evaluar en uso real si la calidad de transcripción alcanza para vocabulario técnico (psicoanálisis, términos en alemán).
- Si no alcanza, migrar a un proveedor pago (ej. Whisper). Con el patrón de uso esperado el costo adicional sería marginal (~$0.90/mes) — no es un bloqueo real, es una decisión de calidad primero.
- No estimado todavía en tamaño de tarea — se agenda cuando se decida el momento (¿Fase 2 junto con T4, o Fase 3 junto al resto del diálogo?).

---

## 6. Backlog menor (sin prioridad asignada)

- Gestos swipe entre nodos en móvil (docs/08 backlog).
- Fuente accesible opcional (Atkinson Hyperlegible / OpenDyslexic).
- Glosario consolidado por libro ("priming glossary").
- Resaltados estilo marcador físico; scroll paginado opcional.

---

## 7. Modo prueba: libro real generado offline con la suscripción del dueño (2026-09-21)

**Objetivo.** Que el dueño pueda leer un texto suyo real, con nodos de verdad, y probar L1–L4 (§8) para decidir si le sirve seguir con el proyecto, **sin API keys, sin Supabase y sin costo por llamada**. Es un atajo deliberado que no sustituye a M2–M4 (`docs/09`): produce la misma forma de datos que M3, así que el día que exista la ingesta real, solo cambia el origen del JSON. Elegida por el dueño entre tres opciones (2026-09-21); las otras dos (más datos de prueba fijos, rellenar explicaciones del Banco a mano) quedan como complemento posible.

**Por qué hace falta tocar código.** La app lee un único libro hardcodeado: `app/reader/[documentId]/page.tsx:3,9,15` y `app/dashboard/page.tsx:2` importan `mockBook` de `lib/mock-data.ts` (`documentId: "texto-de-prueba"`). No hay forma de cargar otro.

**Estado (2026-09-21): pasos 2–5 implementados** (`lib/book-validation.ts`, `lib/books.ts`, dashboard y lector conectados, `npm run check-book`, `data/books/` en `.gitignore`); ejemplo mínimo inventado en `data/books/prueba-formato.json`. Falta el paso 1 (generar un capítulo real) y la revisión del dueño.

**Plan:**
1. **Generar los nodos (fuera de la app).** En una sesión de Claude Code, con el PDF del dueño: extraer el texto por capítulos (pdftotext o leyendo el PDF por páginas; un libro entero no entra en un solo contexto, así que se procesa **capítulo por capítulo** y se concatena) y aplicar el prompt de ingesta de `docs/04 §1`. El prompt ya está reconstruido en `docs/04 §1.2` (2026-09-21; cierra la parte de reconstrucción de P1 de `docs/09`, falta solo el visto bueno del dueño). Salida: `[{order_index, title, excerpt, context_glossary, reflection_prompt}]` por capítulo, respetando 300–600 palabras y máx. 3 términos de glosario de 20–30 palabras (`docs/04 §1`, complemento).
2. **Guardar como archivo local, no versionado.** `data/books/<documentId>.json` con `{documentId, title, author, chapters:[{id,title,nodes:[...]}]}` ya en la forma de `Book` (`types/index.ts:24`; `excerpt` se parte en `excerptParagraphs` por línea en blanco, y `snake_case` → `camelCase`). Agregar `data/books/` al `.gitignore`: es texto con derechos de autor y material personal de estudio.
3. **Cargador `lib/books.ts`.** `listBooks()` y `getBook(documentId)` leen `data/books/*.json` con `fs` en el servidor y **validan la forma** (zod ya está en `node_modules`; si no es dependencia directa, usar un chequeo manual) con mensaje claro si el JSON viene mal. Siempre incluye `mockBook` como fallback para que la app funcione sin ningún archivo.
4. **Conectar las páginas.** `app/reader/[documentId]/page.tsx` pasa a `getBook(documentId)` (con `notFound()` si no existe; reemplaza `generateStaticParams` por lectura de la lista real) y `app/dashboard/page.tsx` lista todos los libros en lugar de uno fijo, mostrando "texto de prueba" solo para el mock (hoy el rótulo está fijo en la línea 36).
5. **Chequear la validación antes de leer.** Un script pequeño (`npm run check-book <archivo>`) que valide el JSON e informe nodos por capítulo y palabras por nodo fuera de 300–600, para corregir la generación antes de abrir la app.

**Límites conocidos (decirlos, no esconderlos):**
- No hay subida de PDF ni ingesta en vivo: agregar un libro nuevo implica repetir el paso 1 en Claude Code.
- Las explicaciones de conceptos seguirán siendo "(Demo)" (T4 no existe); para esa parte, ver opción 3 de la conversación (rellenar a mano) si hace falta.
- **Privacidad:** el texto pasa por tu suscripción de Claude, es decir, llega a Anthropic (mismo criterio que TODO §3). Solo material teórico de estudio, nunca casos ni datos de pacientes.
- El ID en `SavedConcept.documentId` (`types/index.ts:47`) será el del libro real: los conceptos guardados con el mock no aparecerán marcados en el libro nuevo (esperado, L1 filtra por libro).

**Tamaño:** M (~35–45k) el código (pasos 2–5); el paso 1 es trabajo de sesión aparte que **escala con la longitud del libro** (cada capítulo ≈ una pasada). Empezar con **un capítulo** (5–10 nodos) alcanza para juzgar la experiencia.

**Cómo se verifica:** con un JSON generado de un capítulo real, abrir `/dashboard` y ver el libro nuevo además del de prueba; entrar al lector, navegar todos los nodos con ← → y comprobar que el texto está intacto, los glosarios se ven y el banco funciona. Sin `data/books/`, la app sigue arrancando con el mock. Con un JSON roto, el mensaje de error dice qué campo falla.

**Necesita del dueño:** (a) el PDF, o un capítulo, con qué texto quiere probar; (b) confirmar el prompt de ingesta reconstruido (P1) antes de la primera corrida; (c) juzgar si los nodos generados respetan las unidades argumentales (M3 lo marca como juicio humano).

---

## 8. Ideas inspiradas en LingQ (investigado 2026-09-21)

LingQ (app de lectura de idiomas) parte los textos en "lecciones" de un curso, marca en colores qué palabras ya guardaste (esa marca **te sigue por todas las lecciones**) y cierra cada lección resolviendo lo pendiente. Su partición es mecánica (tope de 2000–4000 palabras, la última parte queda diminuta, no respeta capítulos de ePub): sus propios usuarios piden lo que Nodos ya hace (segmentar por unidad conceptual, ver `docs/01 §4.1`), así que **eso no se copia**. Se adaptan cuatro cosas, en este orden:

| # | Idea | Tamaño | Depende de |
|---|------|--------|------------|
| L1 | **Marcado suave de términos del Banco en los nodos siguientes** | M (~35k) | nada (funciona hoy con localStorage) |
| L2 | Cierre suave de nodo ("esto guardaste, esto quedó sin tocar") | S–M | conviene tras M6/M7 (docs/09) |
| L3 | Mapa de progreso por capítulo | S | M7 (docs/09), ya planeado; solo confirmar el diseño |
| L4 | Corte ajustable a mano (fusionar / dividir nodos) | L → 2 fases | M3/M4 (docs/09, nodos reales) |

**Se descarta explícitamente:** monedas, rachas y flashcards con contador (chocan con el principio antipunitivo, `docs/01 §2.2`); pintar todo el texto por estado de palabra (en prosa teórica densa es ruido visual).

### L1 — Marcado suave de términos del Banco (M, ~35k)

**Qué pasa hoy / por qué.** El Banco guarda el término (`SavedConcept.id` = término en minúsculas, `lib/concept-bank.ts:10`, `types/index.ts:40`) con `documentId` y ubicación, pero **la lectura no lo consulta**: `renderParagraphs` (`components/reader/ReaderTextDisplay.tsx:38`) solo resalta los términos del `contextGlossary` del propio nodo (primera aparición, `indexOf` sobre el párrafo, líneas 39–80). Un término que guardaste en el nodo 2 reaparece en el nodo 5 sin ninguna marca: se pierde justo la "red conceptual" que `docs/01 §2.1` dice querer preservar. `ReaderTextDisplay` ya es componente cliente y `ReaderView.tsx:64` ya usa `useSyncExternalStore` contra el banco, así que el patrón de suscripción existe.

**Decisiones de diseño (ya tomadas, no re-discutir):**
- Marca **independiente de `explained`/`pending`**: dice "esto ya está en tu banco", no "lo dominás". Coherente con TODO §4: el fading real (ocultar la marca al dominar) es Fase 3 / M9; L1 no debe atajarlo.
- Estilo distinto al glosario del nodo (`dfn.glossary-term`, punteado con `--primary`, `app/globals.css:190`): subrayado **sólido, fino y tenue**, sin `cursor: help`. Dos marcas con el mismo aspecto significarían cosas distintas.
- Solo la **primera aparición por nodo**, igual que el glosario, para no llenar de subrayados.
- Solo conceptos del **mismo libro** (`documentId`); si falta (es opcional en el tipo), caer a `sourceBookTitle`.
- Sin color rojo ni contadores (TODO §3, diseño antipunitivo).

**Plan:**
1. Extraer la búsqueda de términos a una función pura en `lib/` (p. ej. `lib/term-marks.ts`): dado párrafo + lista de términos, devuelve rangos `[start,end)` sin solapamiento. Requisitos: coincidencia por **palabra completa** con límites Unicode (`\p{L}`; no `\b`, que falla con tildes y "ñ"), insensible a mayúsculas y a acentos, y que prefiera el término más largo. Hoy `indexOf` sin límites de palabra marcaría "yo" dentro de "proyecto"; para el glosario ya existente es un defecto latente, para L1 sería visible en todo el texto.
2. Filtrar qué términos del banco se marcan: descartar los de **menos de 3 caracteres** y los de **más de ~60** (`SelectionSave.tsx:23` permite selecciones de hasta 300; una frase larga no sirve como marca recurrente).
3. En `renderParagraphs`, pasar los rangos del glosario del nodo y los del banco por la misma función y resolver solapamientos: **el glosario gana** (tiene definición y popover). Un término que está en ambos se muestra como glosario.
4. Renderizar la marca como `<mark>`/`<span data-banco>` con `title` "En tu banco de conceptos" (sin popover nuevo en esta fase). Clase nueva junto a `dfn.glossary-term` en `app/globals.css`, con variante para modo claro/sepia/noche.
5. Suscribir `ReaderTextDisplay` al banco con `useSyncExternalStore(subscribeBank, getBankSnapshot, getBankServerSnapshot)` (mismo trío que `ReaderView.tsx:64`) y memoizar los términos filtrados por `documentId`. Snapshot de servidor vacío = sin mismatch de hidratación.
6. Actualizar `docs/07-guia-diseno-ui.md` con el nuevo estilo (regla: la norma se documenta en el mismo pase que se implementa).

**Riesgos a verificar:**
- Al guardar un concepto la marca aparece en vivo y **parte los nodos de texto del párrafo mientras la tarjeta de `SelectionSave` está abierta**. Se espera que el texto (`textContent`) no cambie, así que el párrafo de contexto guardado sigue igual, pero hay que comprobar que la tarjeta no se cierra ni salta (`SelectionSave.tsx:75-90`: selección colapsada con tarjeta abierta no la limpia).
- Rendimiento: N términos × párrafos por render; con un banco de cientos de términos, compilar **una sola regex** por render, no un bucle de `indexOf` por término.
- Móvil: la marca no debe agregar un objetivo táctil ni interferir con la selección larga (TODO §3, ≥40px solo aplica a controles, y esto no es un control).
- Patrón compartido: `NodeGlossarySection.tsx` y `ReflectionBox.tsx` también mencionan términos; **no** se tocan en L1 (solo el texto fuente), pero anotar si conviene extenderlo.

**Cómo se verifica:** test unitario de la función pura (tildes, "ñ", palabra completa —"yo" no marca dentro de "proyecto"—, solapamiento con glosario, término más largo primero, términos <3 y >60 descartados). A mano: guardar un término en el nodo 1, ir a otro nodo del mismo libro donde aparezca y ver el subrayado; borrarlo del Banco y ver que desaparece sin recargar; abrir otro libro y confirmar que **no** aparece. Revisar también en móvil (<768px) y en los tres temas.

### L2 — Cierre suave de nodo (S–M)

Al final del nodo (bajo `ReflectionBox`, `ReaderView.tsx:235`), una línea tipo "En este nodo guardaste 2 términos" con enlace al Banco filtrado por nodo. **Sin** "te faltan N" ni comparación con un objetivo. Antes de implementar, decidir si se muestra siempre o solo tras completar la reflexión (depende de M6/M7 en `docs/09`); si el nodo no tiene conceptos guardados, no mostrar nada. Verificación: con 0, 1 y varios conceptos guardados en el nodo, el texto es correcto y nunca aparece un tono de deuda.

### L3 — Mapa de progreso por capítulo (S)

Ya cubierto por M7 (`docs/09`, estados reales del mapa). Lo que aporta LingQ es solo confirmar que un resumen por capítulo ("3 de 5 nodos") ancla bien; falta decidir el formato **sin** porcentajes rojos ni atraso (`docs/02 §4.3`). Se resuelve dentro de M7; no abre tarea propia.

### L4 — Corte ajustable a mano (L → dos fases)

La IA propone los nodos en la ingesta (M3, `docs/09`); el usuario puede **fusionar dos nodos contiguos** o **dividir uno** cuando la segmentación falla. LingQ demuestra que es lo primero que los usuarios piden. Requiere nodos reales en Supabase, por eso se posterga.
- **Fase 1/2 — fusionar** (M): une `excerpt` y glosarios de dos nodos contiguos, renumera `order_index`, preserva `user_progress` y conceptos guardados (`sourceNodeIndex` de `SavedConcept` **queda apuntando a un índice que cambió**: hay que migrarlo o pasar a referenciar un id de nodo estable, decisión a tomar acá).
- **Fase 2/2 — dividir** (M): elegir el párrafo de corte; la `reflection_prompt` y las preguntas rotativas del nodo original no aplican a ninguna de las mitades, así que hay que decidir si se regeneran con IA (costo) o se dejan vacías con mensaje neutro.
- El texto fuente nunca se modifica, solo cómo se agrupa (principio 1, `docs/01 §2.2`).
