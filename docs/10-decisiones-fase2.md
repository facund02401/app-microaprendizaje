# Decisiones de la Fase 2 — "Directorio"

> Pedido del dueño (2026-09-23): cuando haya dudas, deliberar como un directorio de cuatro voces —
> **Usuario** (quien estudia con la app; su voz pesa más), **Técnica/backend**, **Diseño/frontend** y
> **Negocio** — y registrar la decisión. Formato: pregunta · voces · decisión · cómo revertirla.

---

### D1 — ¿Qué IA procesa los textos? *(decisión del dueño)*
- **Contexto:** los docs originales decían Gemini Flash para la ingesta y Claude para el diálogo.
- **Decisión del dueño:** Claude para todo (una sola cuenta, una sola clave).
- **Técnica:** Claude lee PDFs escaneados como imagen, sirve para todo el flujo. Modelo por defecto `claude-opus-5`, configurable con `CLAUDE_MODEL`.
- **Negocio:** es más caro que Gemini (ver docs/09 §4). Se muestra el costo antes de gastar y se documenta la alternativa `claude-sonnet-5` (~40 % del costo).
- **Actualiza:** `AGENTS.md` (stack) y `docs/03`.

### D2 — ¿Cómo se entra: link por email o contraseña?
- **Usuario:** "Quiero entrar desde el celular sin vueltas; no soy técnico."
- **Técnica:** el link mágico falla en celulares cuando el email abre otro navegador, y en iPhone la app instalada tiene su propia sesión (el link abre Safari, no la app). Además exige configurar plantillas de email en Supabase.
- **Diseño:** formulario estándar con "mostrar contraseña" y autocompletado para que el celular la recuerde.
- **Negocio:** cero costo, cero dependencia del email.
- **Decisión:** **email + contraseña**. Registro solo una vez ("Primera vez").

### D3 — ¿Quién puede usar la app? *(dueño: "solo yo")*
- **Decisión:** lista de emails habilitados en la base (`allowed_emails`) + un trigger que rechaza registros de otros emails + reglas RLS que exigen ser dueño habilitado en cada tabla y en los archivos. El email no está en el repo.
- **Consecuencia:** la confirmación por email puede apagarse sin perder seguridad (docs/09 paso 1).

### D4 — ¿Cómo garantizar que el texto del autor quede intacto?
- **Usuario:** "El texto no se toca; nada de resúmenes." (regla de producto 2)
- **Técnica:** si la IA copiara el texto en su respuesta podría alterarlo y costaría el doble (se paga lo que escribe). Mejor: numerar párrafos y que Claude devuelva solo **en qué párrafo empieza cada nodo**; el código corta el original.
- **Decisión:** segmentación por "párrafo de inicio". Una prueba automática verifica que la unión de todos los nodos reproduce el texto completo.
- **Extras:** el último nodo de cada tanda se revisa en la siguiente (para no cortar un argumento a la mitad); un nodo nunca empieza con una nota al pie ni termina con un título suelto; los términos de glosario que no aparecen literalmente en el nodo se descartan.

### D5 — ¿Dónde corre el procesamiento largo?
- **Técnica:** un libro lleva 10–40 minutos; el servidor gratis de Vercel corta a los 5 minutos por pedido. Procesar "en segundo plano" exigiría una clave de administración de Supabase o funciones extra, con más configuración manual.
- **Usuario:** "No quiero pasos de configuración."
- **Diseño:** mostrar progreso claro, permitir pausar y retomar, y evitar que el celular apague la pantalla.
- **Decisión:** el navegador pide **un paso a la vez** (≤ 5 min cada uno); todo queda guardado paso a paso; si se cierra, se retoma solo al volver. Un candado impide que dos pestañas procesen a la vez.
- **Revisar si molesta:** migrar a proceso en segundo plano (Supabase Edge Functions) — anotado en TODO.

### D6 — ¿Se procesa apenas se sube?
- **Negocio:** cada libro cuesta dinero; el dueño ya decidió en v1.2 que la IA se dispara a mano ("él decide cuándo gastar").
- **Decisión:** subir y leer el archivo es gratis; se muestra **costo y tiempo estimados** y recién se procesa al tocar **Procesar con IA**.

### D7 — PDFs: ¿cómo se reconstruyen los párrafos?
- **Técnica:** un PDF no guarda "párrafos", solo renglones con posición. Se detectan por sangría, espacio extra y renglón final corto; los títulos por tamaño de letra; las notas por letra chica en la parte baja; se quitan números de página y encabezados repetidos; se unen palabras cortadas con guion y párrafos partidos entre páginas.
- **Plan B:** si un "párrafo" queda gigante (más de 450 palabras), se parte en oraciones completas.
- **Escaneados:** las páginas con menos de 80 caracteres de texto se transcriben con Claude de a 5.

### D8 — ¿Dónde se aloja?
- **Decisión:** Supabase en São Paulo (`sa-east-1`) y funciones de Vercel en São Paulo (`gru1`, en `vercel.json`): misma región = respuestas rápidas desde Uruguay/Argentina.

### D9 — Lector con libros reales
- **Usuario:** "Con un libro de 200 nodos no puedo empezar siempre desde el 1."
- **Decisión:** el lector recuerda el último nodo por libro (en el dispositivo). Se agregó acceso a la biblioteca en el encabezado (en la app instalada no hay botón "atrás").
- **Pendiente:** sincronizar el progreso entre computadora y celular (tabla en Supabase).

### D10 — ¿App instalable u offline?
- **Decisión:** instalable ya (manifest + ícono); **offline completo queda para después** (requiere guardar libros en el dispositivo y resolver sincronización). El banco de conceptos ya funciona sin conexión.

### D11 — Preguntas de recuperación rotativas (docs/04 §4.1)
- **Negocio:** generarlas en la ingesta sube ~50 % el costo de salida.
- **Decisión:** posponer hasta que el dueño pruebe la lectura con libros reales; se agregan re-procesando solo esa parte.

### D12 — Procesar de a partes, a medida que se lee *(propuesta del dueño, 2026-09-24)*
- **Usuario:** "Muchas veces subo el libro entero pero no lo leo todo: capaz leo la introducción, el capítulo 7 y el 12, o lo dejo por la mitad. No quiero pagar por lo que no leo. Esperar un par de minutos entre capítulos no me molesta."
- **Negocio:** es la forma de gastar solo en lo que se lee; con un libro abandonado a la mitad se ahorra la mitad o más.
- **Técnica:** al subir se arma gratis un **índice** (con los títulos de Word/EPUB/PDF; sin títulos, partes de ~5.000 palabras; PDFs escaneados, bloques de 10 páginas). Cada parte tiene estado: disponible → en tu lista → preparándose → lista. Los nodos guardan su **posición en el libro**, así se ordenan bien aunque se prepare el capítulo 12 antes que el 3.
- **Diseño:** índice con casillas, tiempo de lectura y costo de cada parte; "Preparar y empezar a leer" prepara solo la primera elegida. En el lector, 3 nodos antes del final de lo preparado se prepara sola la siguiente parte de la lista; al final se ofrece "¿Seguimos con…?" con su costo, o volver al índice. "Preparar todo ahora" queda como opción.
- **Decisión:** el procesamiento por partes es el modo normal.
- **Límite conocido:** en PDFs escaneados los bloques de 10 páginas pueden cortar un capítulo; el corte cae entre nodos, nunca dentro de un párrafo.

### D13 — Artículos y textos breves: una sola pieza *(pedido del dueño, 2026-09-24)*
- **Usuario:** "Un artículo no tiene capítulos: que no me ofrezca un índice que no existe."
- **Decisión:** hasta **15.000 palabras** (o 40 páginas escaneadas) el documento es una sola parte: se muestra una tarjeta con tiempo, costo y "Preparar y empezar a leer", sin casillas. Sus subtítulos (Resumen, Método, Discusión…) igual ordenan los nodos por dentro, y la bibliografía se omite.
- **Por qué por tamaño y no por "tipo":** es una regla predecible y gratis; un capítulo suelto de un libro también se comporta mejor así.

### D14 — Apuntes guardados en la cuenta y exportación en PDF *(pedido del dueño)*
- **Hallazgo:** el botón "Guardar reflexión" del prototipo decía "guardada" pero no guardaba nada. Se corrigió antes de exportar.
- **Usuario:** "Al terminar un capítulo, un artículo o el libro, quiero llevarme mis respuestas, mis notas y los conceptos que guardé, con su referencia al texto."
- **Decisión:**
  - En la caja de cada nodo, conmutador **Respuesta / Nota** (la nota es libre). Se guarda sola mientras se escribe (tabla `node_responses`), con copia en el dispositivo si no hay conexión.
  - El banco de conceptos se sincroniza con la cuenta (tabla `concept_bank`): sigue funcionando sin conexión y aparece igual en compu y celular.
  - **PDF** (formato elegido por el dueño): título, autor y fecha; por capítulo y nodo, pregunta + respuesta y notas; al final, cada concepto con definición, ubicación (capítulo · nodo) y la oración del autor donde aparece. Se exporta un capítulo (al terminarlo) o el documento entero (al final y en la pantalla del documento). Tipografía Liberation Serif (licencia OFL).
- **Pendiente:** número de página en las referencias del banco.

### D15 — Escaneados que se leen mal *(pedido del dueño)*
- **Usuario:** "Que la IA corrija por contexto lo que no se lee bien, pero que lo señale."
- **Técnica:** la transcripción marca lo reconstruido entre ⟦ ⟧ solo cuando el contexto lo hace muy probable; si no, escribe [ilegible]. Nunca inventa.
- **Diseño:** en el lector, lo reconstruido lleva subrayado discontinuo discreto; al tocarlo: "Reconstruido por contexto: en el original escaneado esta parte se lee mal". En el índice, cada parte lista cuántas palabras se reconstruyeron.
- **Coherencia con "texto intacto":** nada se corrige en silencio; el lector siempre sabe qué es del original y qué es inferido.

### D16 — Sacar un texto ya leído de la biblioteca *(pedido del dueño, 2026-09-29)*
- **Hallazgo:** la opción existía pero escondida (Biblioteca → "índice y partes" → al final "Eliminar documento"), sin avisar que se pierden las respuestas y notas, y sin mostrar error si fallaba.
- **Usuario:** "Un texto que ya terminé no tiene por qué seguir ocupando la lista."
- **Técnica:** borrar `documents` arrastra en cascada nodos, capítulos, partes y `node_responses`; los conceptos (`concept_bank`) **no** se borran porque guardan el título del libro como texto.
- **Diseño:** botón discreto "Eliminar de la biblioteca" en cada tarjeta (mismo componente que en la pantalla del documento). La confirmación explica qué se pierde y ofrece **bajar los apuntes en PDF** antes. Antipunitivo: nunca aparece como pendiente ni se sugiere borrar.
- **Negocio:** cero costo; no hay papelera.
- **Decisión:** eliminación definitiva con aviso + PDF previo (`components/library/DeleteDocument.tsx`). Si falla la base, se muestra el error y no se dice "eliminado".
- **Revertir / alternativa:** si el dueño prefiere "archivar" (ocultar sin borrar), agregar columna `archived_at` y filtro en el dashboard.

### D17 — Subrayar con resaltador *(pedido del dueño, 2026-09-29)*
- **Usuario:** "Además de marcar cosas en el banco de conceptos, poder subrayar con resaltador; que salga en la exportación. Sería muy útil para estudiar."
- **Diseño:** al seleccionar texto aparecen dos botones: marcador (subrayar) y ⊕ (banco). **Un solo color**, tipo marcador físico y sin neón (`--highlight-bg` en `app/globals.css`, un tono por tema). Tocar un pasaje subrayado ofrece "Quitar subrayado" (deshacer sin culpa). Sin contadores ni resúmenes de "cuánto subrayaste" (regla 3). Se distingue del tono tenue de "secciones ya trabajadas". Subrayar admite pasajes largos y que cruzan párrafos; el banco sigue limitado a términos cortos (300 caracteres).
- **Técnica:** cada subrayado se ancla a nodo + párrafo + posición de inicio/fin (el texto del autor no cambia) y guarda la cita para verificarla al dibujar. Se dibuja con la CSS Custom Highlight API: **no modifica el texto del autor**. Si el navegador no la soporta (Chrome <105, Safari <17.2, Firefox <140) el botón de subrayar no aparece. Los que se pisan se unen en uno. Se guarda en el dispositivo y se sincroniza con la cuenta (tabla `highlights`, migración `20260929_005_subrayados.sql`, mismo patrón que el banco). Al eliminar un documento se borran sus subrayados.
- **Exportación (recomendación del directorio):** en el PDF, dentro de cada nodo, después de la respuesta y las notas: "Pasajes subrayados" con la cita literal sobre marcador amarillo suave. El banco de conceptos sigue al final.
- **Negocio:** cero costo (no usa IA).
- **Pendiente (fase 2, solo si el dueño lo pide):** nota corta atada a un subrayado y vista "mis subrayados" del libro.
- **Revertir:** quitar `HighlightLayer` de `ReaderView` y el botón de `SelectionSave`; la tabla puede quedar sin uso.

### D18 — Lectura en voz alta, gratis *(pedido del dueño, 2026-10-03)*
- **Usuario:** "¿Hay forma gratis de que me lea el texto?" — de acuerdo; opcional, que no empiece sola ni cambie de nodo sola.
- **Técnica:** `speechSynthesis` (voz del navegador): sin servidor, sin clave, sin costo; el texto del autor no se toca. Se lee por frases (Chrome corta los textos largos). Las notas al pie se omiten; `⟦reconstruido⟧` se lee sin corchetes y `[ilegible]` se salta.
- **Diseño:** control en el header junto al "Aa" (▶/⏸, ■ y velocidad/voz), nunca flotando sobre el texto. El párrafo en curso se marca con un tono tenue (`bg-muted/60`), distinto del subrayado y de "ya trabajado". Al terminar no avanza de nodo (reglas 4 y 6).
- **Negocio:** cero costo y cero dependencia de proveedores.
- **Límites conocidos:** la calidad depende del dispositivo (en Edge las voces "Natural" son muy buenas; en Chrome/Safari son correctas); si no hay voz en español se usa la predeterminada. Pausar corta y retoma desde la frase actual.
- **Código:** `lib/tts.ts` (qué se lee y qué voz), `components/reader/ReadAloud.tsx`. Velocidad y voz se guardan en `localStorage` (`nodos-tts-rate`, `nodos-tts-voice`).
- **Revertir:** quitar `<ReadAloud>` de `ReaderView` y la prop `speaking` de `ReaderTextDisplay`.
- **Alternativa futura, solo si la voz no alcanza:** voz neuronal en el navegador (Piper/Kokoro, descarga de 50–300 MB) o un servicio de pago; la interfaz no cambia.

### D19 — Errores de lectura en PDFs con texto *(pedido del dueño, 2026-10-27)*
- **Problema:** un PDF que ya trae capa de texto (p. ej. escaneado con una app del celular) se usa tal cual y nunca pasa por Claude. Su OCR viejo deja errores como "nos nevó a proponer" (por "llevó"). Caso real: "Proceso y no proceso en el trabajo analítico".
- **Decisión:** en PDFs, la misma llamada que divide la parte en nodos también marca errores de lectura **claros**. Sin lectura extra de imágenes, así que el costo agregado son centavos (solo respuesta más larga). Word/EPUB/TXT no se revisan.
- **Texto intacto:** Claude no devuelve texto. Propone `{párrafo, fragmento, reemplazo}` y el código lo aplica solo si pasa las guardas (`lib/ai/corrections.ts`): fragmento de ≤4 palabras que aparece una sola vez, cambio de pocas letras (no reescrituras), no en títulos, no dentro de otra marca, máximo 40 por tanda. Lo aplicado queda marcado `⟦…⟧` (subrayado discontinuo, "Reconstruido por contexto"), nunca en silencio.
- **Límite conocido:** la palabra original ("nevó") no se guarda; para compararla hay que mirar el PDF.
- **Apagar:** variable `CLAUDE_REVIEW_READING=off` en Vercel + Redeploy. Solo afecta partes que se preparen después.
- **Pendiente de medir:** cuántos errores reales detecta y cuántas falsas alarmas da cada modelo (Opus / Sonnet / Haiku vía `CLAUDE_MODEL`) y el costo real. Ver TODO.md.

### D20 — Tiempos de lectura que se ajustan a tu ritmo *(pedido del dueño, 2026-10-30)*
- **Qué hace:** el "⏱ N min" (barra de estado, índice de partes, "¿Seguimos con…?") deja de usar 80 palabras por minuto fijas y usa el ritmo real del lector, medido en silencio. **Invisible:** no hay estadísticas, avisos ni pantallas; solo cambia el número de minutos. Nunca condiciona el acceso (reglas 3 y 6).
- **Qué se mide:** al pasar de un nodo al **siguiente** (botón o flecha), segundos de lectura *activa* del nodo anterior. El reloj corre solo con la pestaña visible y actividad (scroll, mouse, teclado, toque) en los últimos 120 s, y se pausa mientras se escribe en la caja de notas. No cuenta si se usó la lectura en voz alta, si se saltó con el explorador o con "anterior", ni las relecturas (la clave `(user_id, node_id)` solo guarda la primera vez).
- **Qué se descarta (`lib/reading-pace.ts`):** menos de 40 s, nodos de menos de 100 palabras, y ritmos fuera de 25–300 palabras por minuto (800 palabras en 1 minuto es pasar la vista; 240 en 1 minuto es lector rápido pero posible).
- **Cómo se calcula:** mediana de las últimas 10 lecturas válidas, global del lector (no por libro). Con menos de 5 lecturas se mezcla con el 80 de partida (con 1 lectura pesa 10 %, con 4 pesa 40 %); tope 40–200. Los umbrales se revalidan al calcular, así que se pueden cambiar sin perder historia.
- **Datos:** tabla `node_reading_times` (migración `20261030_006_ritmo_lectura.sql`, RLS como el resto). Si falla guardar o leer, se usa 80 y la lectura no se entera.
- **Se actualiza al pasar de nodo:** las lecturas recientes viajan al lector y, al guardar una lectura válida, el ritmo se recalcula en el momento (sin recargar). Cada nodo cuenta una sola vez.
- **Código:** `lib/reading-pace.ts` (reglas puras), `lib/reading-pace-server.ts` (carga), `components/reader/useReadingTimer.ts` (medidor).
- **Límite conocido:** quien lee sin tocar nada más de 120 s seguidos queda subcontado y el ritmo estimado sale algo más rápido. Si pasa, subir más `IDLE_PAUSE_SECONDS` (hoy 120 s).
- **Revertir:** quitar `useReadingTimer` de `ReaderView`; los tiempos vuelven al 80 si se borran las filas de `node_reading_times`.

### D21 — Notas al pie ligadas a su número *(pedido del dueño, 2026-10-30)*
- **Problema:** la nota era un párrafo suelto en letra chica al final de la página, sin vínculo con el numerito del texto (que quedaba pegado a la palabra) y a veces lejos de donde se la cita.
- **Qué hace:** la llamada del autor pasa a `[^3]` en el texto y la nota a `[nota 3] …`, ubicada justo después del párrafo que la cita. El lector muestra el número como superíndice; al tocarlo (o Enter) abre la nota en un globito, como el glosario. El texto queda limpio y las notas con pareja no ocupan lugar.
- **Cómo se detecta:** PDF con texto: número chico y elevado en medio del renglón (`lib/ingest/pdf.ts`), emparejado dentro de su página (la numeración reinicia por página). Escaneados: el prompt de OCR pide `[^N]`. Word/EPUB: `<sup>`/enlaces a `#` (`lib/ingest/html.ts`), y `placeNotes` acomoda notas que vienen juntas (p. ej. al final).
- **Sin pareja:** una llamada sin nota se ve como número tenue; una nota sin llamada sigue como bloque en letra chica. Lo ya preparado (`[nota] …`) se ve igual que antes.
- **Además:** las notas no cuentan en los minutos estimados; la voz alta las salta y no lee los números.
- **Alcance:** solo lo que se prepare después. Sin migración. Para rehacer un libro viejo hay que volver a prepararlo.

### D22 — Números de página y encabezados fuera del texto *(pedido del dueño, 2026-10-30)*
- **Problema:** a veces se colaban números de página, encabezados y pies ("Obras completas · Freud", "Capítulo II") dentro de los nodos. El limpiador anterior solo miraba 2 renglones por borde de página, confundía palabras como "Mil" con romanos, y no cubría escaneados ni .txt.
- **Dónde se limpia (`lib/ingest/clean.ts`, función pura):**
  1. **PDF con texto** (`pdf.ts`): mira 3 renglones por borde; quita números de página (`12`, `- 12 -`, `Página 12`, `12 / 300`, romanos en minúscula) y encabezados que se repiten en ≥ 3 páginas (o 15 %). La clave ignora el número de página pegado al encabezado, así que sirve para encabezados alternos par/impar; un "Capítulo 3" suelto conserva su número y no se confunde con un encabezado.
  2. **Escaneados:** el prompt de OCR ahora lista las formas de número y encabezado a omitir y distingue el título de capítulo (una vez) del encabezado (repetido). Además, al armar la sección (`assemblePages`) se pasa la misma limpieza sobre las páginas ya transcriptas, con la vista de todo el bloque.
  3. **Word/EPUB:** se ignoran las marcas de salto de página del EPUB (`epub:type="pagebreak"`) y se quitan párrafos que son solo un número o un renglón corto repetido ≥ 4 veces.
  4. **.txt:** por renglón, con contexto de todo el texto. Un número suelto en su renglón solo se quita si viene tras un punto o una línea en blanco ("hasta el / 20 / de mayo" se respeta).
  5. **Lector y voz alta:** ocultan los párrafos que son solo un número de página, aunque ya estén guardados. Es solo visual; no se cambia lo guardado.
- **Límites conocidos:** un número de página a mitad de oración con líneas en blanco alrededor en un .txt corta el párrafo en dos; un encabezado de una sola palabra con el número pegado ("FREUD 45") no se reconoce; un título de capítulo repetido arriba de ≥ 3 páginas se tomaría por encabezado. Lo ya preparado se corrige en el lector (solo números sueltos); para el resto hay que volver a preparar el libro.

### D23 — Diccionario + Haiku para errores de lectura *(pedido del dueño, 2026-10-30)*
- **Problema:** la revisión de D19 (dentro de la llamada de Opus) deja pasar errores. Un diccionario encuentra mejor las palabras que no existen.
- **Qué hace:** al preparar una parte de un PDF, después de la revisión de D19, el código pasa el texto por el diccionario de español (`dictionary-es` + `nspell`, gratis, sin red) y arma la lista de palabras que no existen. Haiku recibe solo esas frases (no el libro) y decide cuáles son errores claros. Código: `lib/ai/spell-suspects.ts` (lógica pura), `lib/ai/spellcheck.ts` (Haiku).
- **Texto intacto:** igual que D19: Haiku no devuelve texto, el código aplica `applyCorrections` con sus guardas y queda marcado `⟦…⟧`. Si Haiku falla, la ingesta sigue sin corregir.
- **Qué no se revisa:** palabras con mayúscula inicial (nombres, sustantivos alemanes), siglas, palabras con ä/ö/ß/k/w, términos de psicoanálisis en `LEXICON`, palabras que se repiten 4+ veces en la ventana (suelen ser términos del autor), títulos, notas y lo ya marcado. Tope: 150 sospechosas por ventana.
- **Costo:** del orden de 1 a 5 centavos de dólar por libro (solo frases sospechosas, tandas de 50).
- **Límite conocido:** una palabra válida pero equivocada ("nevó" por "llevó") no la ve el diccionario; esa sigue dependiendo de D19. Si falta un término técnico propio y marca falsas alarmas, sumarlo a `LEXICON`.
- **Apagar:** `CLAUDE_SPELLCHECK=off` (solo esta pasada) o `CLAUDE_REVIEW_READING=off` (ambas), en Vercel + Redeploy. Modelo: `CLAUDE_SPELL_MODEL` (por defecto el mismo Haiku de `CLAUDE_CONCEPT_MODEL`).
- **Verificado (2026-10-30):** `lint`, `tsc` y `build` sin errores; el diccionario queda incluido en el despliegue de `/api/documents/[id]/step`; prueba con texto ficticio ("inconscinete"→"inconsciente", "rnadre"→"madre"). Falta la prueba real con clave de Anthropic.
