# Plan de Implementación — Fase 2 y Fase 3

> Este documento es el desglose paso a paso de `docs/06-roadmap.md` (que dice el "qué" y el estado por fase) y de las especificaciones ya escritas en `docs/03`, `docs/04` y `TODO.md` (que dicen el "cómo" a nivel de spec). Acá está el "en qué orden y en qué pasos chicos".

## 0. Empezar acá la próxima sesión

1. Leer `AGENTS.md` y `APRENDIZAJES.md` (regla ya existente, no cambia).
2. Leer la sección **1. Preguntas abiertas** de este documento. Las que bloquean un milestone están marcadas — resolverlas antes de arrancar ese milestone (las demás se pueden resolver sobre la marcha).
3. Seguir los milestones en orden (M0 → M12). Cada uno dice de qué depende — no hay que saltar dependencias.
4. Cada milestone termina con "Cómo verificar" — no marcar un paso como terminado sin pasar por ahí.
5. Antes de cualquier commit: `npm run lint` y `npm run build` sin errores (regla de `AGENTS.md`).
6. Al cerrar la sesión: actualizar los checkboxes de este documento y, si se cometió/corrigió un error, sumar entrada a `APRENDIZAJES.md`.

---

## Registro de avances

- **2026-09-29** — Se unió la rama `claude/mobile-app-usage-us3sfw` (Fase 2 completa: login, subida, procesamiento con Claude, Supabase, Vercel) con `master`. Verificado: `npm run lint` (0 errores) y `npm run build` pasan. Quedan pendientes del dueño: cargar `ANTHROPIC_API_KEY` en Vercel + Redeploy (docs/09-despliegue-y-operacion.md, paso 2) y, para probar en local, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local`. Gemini quedó descartado (docs/10 D1). El cargador local de libros quedó en `lib/local-books.ts`, sin uso.

---

## 1. Preguntas abiertas

Preguntas que quedaron pendientes de esta sesión. Resolverlas no bloquea todo el plan — cada una dice a qué milestone afecta.

| # | Pregunta | Por qué importa | Bloquea | Mi recomendación |
|---|---|---|---|---|
| P1 | Los prompts de `docs/04 §1` (ingesta) y `§2` (feedback) tienen texto cortado del PDF original (`[truncado]`). ¿Reconstruyo la versión completa a partir de las reglas ya documentadas (los bullets están intactos en significado aunque la oración se corte), o preferís revisarlos vos primero? | Son los prompts que van a producción tal cual — un matiz mal puesto ahí afecta cada nodo generado. | M3, M6 | Reconstruyo la versión completa yo mismo (la spec ya tiene todo el contenido necesario en los bullets), pero la reviso con vos en un mensaje corto antes de la primera corrida real contra un libro de verdad — no hace falta que la escribas de cero. |
| P2 | Falta la cuenta para la **Gemini API key** — `TODO.md §2` solo tiene el paso a paso de Anthropic. ¿Usamos **Google AI Studio** (más simple, capa gratuita, alcanza para esto) o Vertex AI/GCP completo (más complejo, pide billing)? | Sin esto no se puede probar la ingesta (M3). | M3 | Google AI Studio — es lo que ya asume `docs/03` (contexto gigante, bajo costo) y no requiere configurar un proyecto de GCP con billing. |
| P3 | Para probar la ingesta real (M3) hace falta un PDF de prueba. Por `AGENTS.md` ("nunca material real con derechos de autor"), ¿tenés algo en dominio público que sirva (ej. un texto de Freud cuyos derechos ya vencieron en tu jurisdicción), o armo un PDF sintético inventado tipo "Seminario de Ejemplo" para no tocar el tema derechos de autor? | Determina qué uso como caso de prueba. | M3 | El sintético es más seguro (cero ambigüedad legal) pero no valida qué tan bien segmenta un texto psicoanalítico real de verdad. Ideal: probar primero con el sintético para validar que el pipeline funciona, y después con un texto real en dominio público si tenés uno a mano, para validar la calidad de la segmentación. |
| P4 | El fading (M9) necesita que el feedback de Claude diga *qué términos del glosario quedaron demostrados* en la reflexión del usuario. ¿Se lo pido como **salida estructurada** (Claude devuelve, además del texto de feedback, una lista JSON de términos validados) o lo inferimos después con matching de texto sobre la respuesta? | Define el diseño del prompt y de la respuesta de `/api/feedback`. | M9 (no bloquea M6-M8) | Salida estructurada (`output_config.format` en la Messages API) — mismo costo, mucho más confiable que parsear texto libre. |
| P5 | Para crear el proyecto de Supabase: esta sesión tiene acceso a un conector de Supabase que puede crear el proyecto y aplicar migraciones directo. ¿Lo usamos, o preferís crear el proyecto vos mismo desde supabase.com y pasarme después la URL/keys? | Cambia quién ejecuta los pasos de M1. | M1 | Si el conector está disponible y vinculado a tu cuenta, usarlo ahorra pasos manuales — pero la elección de organización/proyecto/plan la confirmás vos en el momento igual, así que el ahorro real es en los clics de "crear tabla por tabla". |
| P6 | ¿El tope de gasto sugerido en `TODO.md §3` (ejemplo: avisar sobre $3/mes) te parece bien como número, o preferís otro (o directamente no poner tope dado que el uso esperado es bajo)? | Define el umbral que se hardcodea en M6/M8. | M6, M8 (no bloquea, se puede poner un número provisorio) | $3/mes como umbral de aviso (no de bloqueo duro) — con el patrón de uso esperado (~$1.5-2/mes total) da margen sin ser inútilmente alto. |
| P7 | Preguntas rotativas (`docs/04 §4.1`): ¿se generan en la misma llamada de ingesta a Gemini (un prompt más largo que ya pide título + excerpt + glosario + preguntas) o en una llamada aparte por nodo? | Afecta el diseño del prompt de M3 y el costo de ingesta. | M3 | Misma llamada — el texto completo del nodo ya se está mandando, separar la llamada duplicaría el costo de contexto de entrada sin necesidad. |
| P8 | ¿Seguimos en local únicamente durante toda la Fase 2 y 3 (decisión ya tomada en `docs/06`), o en algún punto de este plan querés un deploy de prueba en Vercel para probar en el celular real sin togglear DevTools? | Determina si M12 se adelanta o se deja para el final. | M12 únicamente | Dejarlo para el final (M12), salvo que en algún momento necesites probar dictado de voz o gestos táctiles en tu celular real antes de terminar todo — ahí sí conviene adelantar un deploy de preview aunque sea temporal. |

---

## 2. Convenciones de este plan

Cada paso lleva una etiqueta:

- **[AGENTE]** — lo puede hacer un agente de código solo, sin que el dueño tenga que actuar.
- **[HUMANO]** — necesita que el dueño haga algo: crear una cuenta, pagar algo, tomar una decisión de producto, o verificar algo que requiere cuerpo/dispositivo real (mano tocando la pantalla, voz real al micrófono, criterio clínico sobre si un feedback "suena bien").
- **[AGENTE + revisión humana]** — el agente lo hace, pero conviene una mirada del dueño antes de darlo por definitivo (no bloquea el trabajo, sí la aceptación final).

### Resumen — todo lo que necesita al dueño en algún momento

Para no tener que leer el documento entero buscando qué te toca a vos:

1. Crear cuenta y proyecto en Supabase (o autorizar que se use el conector) — M1.
2. Crear cuenta en Google AI Studio y generar `GEMINI_API_KEY` — M0.
3. Crear cuenta en Anthropic Console y generar `ANTHROPIC_API_KEY` — M0 (ya estaba en `TODO.md §2`).
4. Pegar las tres claves en `.env.local` (mejor que lo hagas vos directo en el archivo, no pegándolas en el chat) — M0.
5. Decidir/confirmar las preguntas abiertas P1-P8 de la sección anterior (a tu ritmo, no hace falta todas de una).
6. Aportar (o aprobar el sintético) el PDF de prueba para la ingesta — M3.
7. Revisar con criterio clínico/teórico la calidad real de: la segmentación en nodos (M3), las explicaciones de términos (M5), el feedback dialógico (M6) — esto es juicio de contenido que un agente no puede validar solo.
8. Probar dictado de voz con tu voz real en tu navegador real — M11 (un agente no tiene micrófono).
9. Probar todo en tu celular físico, no solo en el emulador de Chrome — recordatorio ya registrado en `APRENDIZAJES.md` (2026-08-23), sigue aplicando a cada milestone con interacción táctil nueva.
10. Decidir cuándo hacer el primer deploy — M12.

Todo lo demás (escribir componentes, rutas de API, migraciones SQL, tipos, tests de build/lint) lo puede hacer un agente sin pedirte nada, salvo para pedirte que apruebes cambios grandes de código como de costumbre.

---

## 3. Milestones

### M0 — Prerrequisitos y cuentas externas

**Depende de:** nada, es el punto de partida.

- [ ] [HUMANO] Crear cuenta en [console.anthropic.com](https://console.anthropic.com), generar API key, guardarla vos (no compartirla en el chat).
- [ ] [HUMANO] Crear cuenta en [Google AI Studio](https://aistudio.google.com), generar `GEMINI_API_KEY` (ver P2 si preferís otra vía).
- [ ] [HUMANO] Decidir cuenta/proyecto de Supabase (ver P5) — crear el proyecto ahora o dejarlo para el arranque de M1.
- [ ] [AGENTE] Actualizar `.env.example` con las tres variables (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) sin valores reales.
- [ ] [HUMANO] Crear `.env.local` (git-ignorado) y pegar las claves reales ahí directamente en el editor, no en el chat.

**Cómo verificar:** `.env.local` existe, tiene las 5 variables, y `git status` no lo muestra como archivo para commitear (confirma que `.gitignore` lo cubre).

---

### M1 — Supabase: proyecto y esquema de datos

**Depende de:** M0 (cuenta Supabase decidida).

- [ ] [HUMANO o AGENTE vía conector, ver P5] Crear el proyecto de Supabase.
- [ ] [AGENTE] Escribir la migración SQL con el esquema mono-usuario ya definido en `docs/03 §3` (`documents`, `nodes`, `user_progress`) más la tabla `concept_bank` que falta agregar ahí (referenciada en `docs/04 §4.2` pero nunca definida formalmente — completar antes de este milestone).
- [ ] [HUMANO o AGENTE vía conector] Aplicar la migración al proyecto real.
- [ ] [AGENTE] Escribir `lib/supabase/client.ts` (cliente browser) y `lib/supabase/server.ts` (cliente server component/route handler), siguiendo la estructura ya prevista en `docs/05`.
- [ ] [AGENTE] Confirmar que `npm run build` sigue pasando con las nuevas dependencias (`@supabase/supabase-js` o el paquete que corresponda).

**Cómo verificar:** desde el dashboard de Supabase, las 4 tablas existen con las columnas esperadas; una query de prueba (`select * from documents`) devuelve vacío sin error.

---

### M2 — Subida de PDF y extracción de texto

**Depende de:** M1 (necesita `documents` y Supabase Storage listos).

- [ ] [AGENTE] Componente `components/upload/FileUploader.tsx` (drag & drop de PDF, según `docs/05`).
- [ ] [AGENTE] Server Action o route handler que sube el archivo a Supabase Storage y crea la fila en `documents` con `status: 'processing'`.
- [ ] [AGENTE] Extracción de texto plano con `pdf-parse` o `pdfjs-dist`.
- [ ] [AGENTE] Manejo de error visible (antipunitivo: mensaje neutro, no alarmante) si el PDF no se puede leer.

**Cómo verificar:** subir el PDF de prueba (ver P3) desde el navegador, confirmar que aparece en Supabase Storage y que el texto extraído (loguearlo o mostrarlo temporalmente) se ve razonable, sin caracteres corruptos.

---

### M3 — Ingesta con Gemini Flash (segmentación en nodos)

**Depende de:** M0 (`GEMINI_API_KEY`), M2 (texto extraído), P1 (prompt reconstruido), P7 (preguntas rotativas en la misma llamada).

- [ ] [AGENTE] Reconstruir el prompt completo de ingesta en `lib/ai/prompts.ts`, integrando: reglas de `docs/04 §1` (chunking conceptual 300-600 palabras, JSON estricto), longitud de glosario 20-30 palabras (`docs/02 §3.2`), guía de `reflection_prompt` con anclaje analógico (`docs/04 §1.1`), y generación de 5-8 preguntas rotativas por nodo (`docs/04 §4.1`) si P7 se confirma en la misma llamada.
- [ ] [AGENTE + revisión humana] Mandarte el prompt final armado para un vistazo rápido antes de la primera corrida real (ver P1).
- [ ] [AGENTE] `lib/ai/gemini.ts`: cliente configurado con temperatura 0.2, salida JSON estricta.
- [ ] [AGENTE] Route handler `app/api/process-pdf/route.ts`: orquesta extracción → prompt → parseo del JSON de respuesta → validación de estructura.
- [ ] [AGENTE] Manejo de error: si Gemini devuelve JSON inválido o la llamada falla, `documents.status = 'error'`, mensaje neutro al usuario (nada de alarmas rojas, coherente con diseño antipunitivo).
- [ ] [HUMANO] Correr la ingesta contra el PDF de prueba (P3) y leer los nodos generados: ¿el chunking respeta unidades argumentales completas? ¿el glosario tiene sentido? ¿las preguntas de anclaje son analógicas y no de memorización? Esto es juicio de contenido, no algo que un agente pueda autoevaluar con confianza.

**Cómo verificar:** subir el PDF de prueba, esperar a que `documents.status` pase a `'ready'`, y que la tabla `nodes` tenga filas con `order_index` secuencial, `excerpt` entre 300-600 palabras aprox., y `context_glossary` con como máximo algunos términos de 20-30 palabras cada uno.

---

### M4 — Guardado de nodos + reemplazo del mock

**Depende de:** M3.

- [ ] [AGENTE] Reemplazar las lecturas de `lib/mock-data.ts` en `app/reader/[documentId]/page.tsx` y `app/dashboard/page.tsx` por consultas reales a Supabase (mantener `mock-data.ts` como fallback/fixture de tests, no borrarlo).
- [ ] [AGENTE] `app/dashboard/page.tsx`: listar documentos reales del usuario único con su `status` y progreso.
- [ ] [AGENTE] Verificar que todos los componentes de `components/reader/*` siguen funcionando igual con datos reales (misma forma de tipo, ver `types/index.ts`).

**Cómo verificar:** navegar de `/dashboard` a `/reader/[documentId]` con un documento real ingerido en M3 y confirmar que el lector muestra el contenido real, no el mock.

---

### M5 — Banco de conceptos v2: explicación real + cola manual + migración a Supabase

**Depende de:** M0 (`ANTHROPIC_API_KEY`), M1 (tabla `concept_bank`). Esta es la tarea **T4 + T5** ya especificada en `TODO.md §1`.

- [ ] [AGENTE] `app/api/concept/route.ts`: recibe término + párrafo + ubicación, llama a Claude Haiku 4.5 con el prompt de `docs/04 §4.2`, devuelve definición ≤60 palabras.
- [ ] [AGENTE] Sin `ANTHROPIC_API_KEY` configurada → mensaje neutro, nada se rompe (ya especificado).
- [ ] [AGENTE] Tope de uso simple (ver P6 para el número) — contador que avisa si se supera el umbral mensual.
- [ ] [AGENTE] Migrar `lib/concept-bank.ts` de `localStorage` a la tabla `concept_bank` de Supabase, con migración automática de lo que ya esté guardado localmente (mismo criterio antipunitivo que la migración de estados `explained`/`pending` que ya se hizo en v1.2 — ver `TODO.md §1`, ítem ya completado).
- [ ] [AGENTE] Cola de reconexión ("Explicar ahora"): detectar `navigator.onLine`, botón manual en el panel del Banco que procesa los `pending` uno por uno contra `/api/concept`, resumen final tipo "3 explicados, 1 para reintentar" (ya especificado en `TODO.md §1`, T5).
- [ ] [HUMANO] Probar el flujo real: seleccionar texto → guardar como pendiente → tocar "Explicar ahora" → revisar si la explicación generada suena bien en tono y precisión (juicio de contenido).

**Cómo verificar:** con la app en modo sin conexión simulada (DevTools → Offline), guardar 2-3 conceptos pendientes; volver a conectar, tocar "Explicar ahora", confirmar que pasan a `explained` con definición real (no la de demo) y que el resumen final aparece.

---

### M6 — Caja de reflexión + feedback dialógico

**Depende de:** M0, M4 (nodos reales para tener contra qué reflexionar), P1 (prompt reconstruido).

- [ ] [AGENTE] Reconstruir el prompt de feedback dialógico en `lib/ai/prompts.ts` (`docs/04 §2`): 3 fases (validación → articulación → transición), máximo 150 palabras, tono colega no evaluativo.
- [ ] [AGENTE + revisión humana] Mismo chequeo rápido que en M3 antes de la primera corrida real.
- [ ] [AGENTE] `app/api/feedback/route.ts`: recibe nodo + `reflection_prompt` + respuesta del usuario, llama a Claude Haiku 4.5, guarda `user_response` y `ai_feedback` en `user_progress`, marca `status: 'completed'`.
- [ ] [AGENTE] Conectar `components/reader/ReflectionBox.tsx` al endpoint real (hoy probablemente simulado/mock — confirmar estado actual del componente antes de tocarlo).
- [ ] [AGENTE] Aplicar el mismo tope de uso que en M5 (mismo contador o uno combinado — definir al implementar, no es una decisión que necesite tu input).
- [ ] [HUMANO] Escribir un par de reflexiones de prueba y leer el feedback generado: ¿respeta las 3 fases? ¿sabe cuándo hay una confusión teórica real vs. cuándo validar? Juicio clínico/teórico, no automatizable.

**Cómo verificar:** completar un nodo escribiendo una reflexión real, confirmar que aparece el feedback de la IA en pantalla, que `user_progress.status` pasa a `'completed'`, y que el feedback mide ≤150 palabras.

---

### M7 — Estados reales del mapa de nodos

**Depende de:** M6 (necesita `user_progress.status` real para saber qué está completado).

- [ ] [AGENTE] Conectar `components/reader/NodeNavigation.tsx` a `user_progress` real en vez de al estado mock: íconos ✓ completado / • en curso / 🔒 bloqueado reflejando datos reales.
- [ ] [AGENTE] Confirmar que el recálculo silencioso de ruta (`docs/02 §4.3`) sigue sin mostrar contadores de atraso — chequeo de que ningún dato nuevo introduce, sin querer, un elemento punitivo.

**Cómo verificar:** completar 2-3 nodos reales y ver que el sidebar refleja el progreso correctamente al recargar la página (no solo en memoria del cliente).

---

### M8 — Vista de lectura completa sin bloqueo

**Depende de:** M4 (nodos reales para resaltar). No depende de M6/M7, se puede hacer en paralelo.

Esta es la implementación en código de la decisión ya tomada y documentada en `docs/01 §4.4` — acá no hay ambigüedad de producto que resolver, solo construirlo.

- [ ] [AGENTE] `app/reader/[documentId]/full/page.tsx`: vista de lectura corrida del documento completo, siempre accesible (sin gate de "nodos completados").
- [ ] [AGENTE] Resaltado en tono tenue de las secciones que coinciden con nodos trabajados (`user_progress.status = 'completed'`); estilo normal para las no trabajadas.
- [ ] [AGENTE] Enlace/botón hacia esta vista visible desde `/reader/[documentId]` en todo momento, no solo al completar el libro.

**Cómo verificar:** con solo 1 de 5 nodos completados, entrar a la vista completa y confirmar que se puede leer el documento entero sin bloqueo, con solo esa sección resaltada.

---

### M9 — Andamiaje decreciente del glosario (fading)

**Depende de:** M6 (necesita el feedback real funcionando) y de resolver **P4**.

- [ ] [HUMANO] Confirmar P4 (salida estructurada vs. matching de texto) antes de arrancar este milestone — es la única decisión de diseño real que falta acá.
- [ ] [AGENTE] Si P4 = salida estructurada: extender el prompt/response de `/api/feedback` (M6) para que devuelva también la lista de términos del `context_glossary` del nodo que la IA considera correctamente demostrados en la reflexión.
- [ ] [AGENTE] Definir dónde vive ese estado — probablemente una tabla `term_mastery` (o columna JSONB en `user_progress`) con término + estado dominado. Diseño a resolver en el momento, no necesita tu input previo.
- [ ] [AGENTE] En `GlossaryTooltip.tsx` / `NodeGlossarySection.tsx`: si el término ya está marcado como dominado, no mostrar el cue visual (subrayado punteado) por defecto — la definición sigue accesible si el usuario lo busca a propósito (nunca desaparece del todo, per `docs/02 §3.3`).

**Cómo verificar:** completar una reflexión que use correctamente un término del glosario del nodo; en un nodo posterior donde reaparezca ese mismo término, confirmar que ya no tiene el subrayado de "hay definición acá" por defecto.

---

### M10 — Preguntas de recuperación rotativas (UI)

**Depende de:** M3 (el banco de 5-8 preguntas ya se generó ahí).

- [ ] [AGENTE] Al cargar un nodo, elegir 2-3 preguntas al azar del banco guardado en la ingesta.
- [ ] [AGENTE] Mostrarlas como refuerzo/variación de la consigna de reflexión, sin costo de API adicional por visita (ya generadas en M3).

**Cómo verificar:** recargar el mismo nodo varias veces y confirmar que las preguntas mostradas varían entre las 5-8 generadas, sin llamar a ninguna API en el proceso.

---

### M11 — Dictado por voz

**Depende de:** nada técnico (no necesita Supabase ni claves) — se puede hacer en paralelo con cualquier otro milestone si hay ganas de una tarea más chica y autocontenida.

- [ ] [AGENTE] Integrar Web Speech API (`SpeechRecognition`) en `ReflectionBox.tsx`, con el botón 🎙 ya previsto en el diseño (`docs/07`).
- [ ] [AGENTE] Manejo de navegadores sin soporte (Safari/Firefox): ocultar el botón o mostrar mensaje neutro, nunca un error alarmante.
- [ ] [HUMANO] Probar con tu voz real en Chrome/Edge: ¿la transcripción de vocabulario técnico (psicoanálisis, términos en alemán) alcanza? Esto define si hace falta migrar a Whisper (ver `docs/01 §4.3` y `TODO.md §5`) — un agente no tiene micrófono para evaluar esto.
- [ ] [HUMANO, solo si la prueba anterior falla] Decidir si se migra a Whisper; si es que sí, crear cuenta OpenAI y `OPENAI_API_KEY` (nueva dependencia externa no contemplada hasta ahora).

**Cómo verificar:** dictar una reflexión completa de viva voz y confirmar que el texto transcripto entra al campo de reflexión sin intervención manual.

---

### M12 — Deploy

**Depende de:** todo lo anterior, o de una decisión explícita de adelantarlo (ver P8).

- [ ] [HUMANO] Decidir el momento (ver P8).
- [ ] [HUMANO] Crear cuenta/proyecto en Vercel si no existe.
- [ ] [AGENTE] Configurar variables de entorno en Vercel (`vercel env`) espejando `.env.local`.
- [ ] [AGENTE] Confirmar build de producción limpio (`npm run build`) antes del primer deploy.
- [ ] [HUMANO] Probar la app deployada en el celular físico real (no emulador) — necesario en especial para dictado (M11) y gestos táctiles.

**Cómo verificar:** URL de Vercel accesible, flujo completo (subir PDF → leer nodo → reflexionar → ver feedback → banco de conceptos) funcionando de punta a punta en producción.

---

## 4. Vista rápida de dependencias

```
M0 (cuentas) ──► M1 (Supabase) ──► M2 (upload+extracción) ──► M3 (ingesta Gemini) ──► M4 (nodos reales)
                                                                                          │
                              ┌───────────────────────────────────────────────────────────┤
                              ▼                              ▼                             ▼
                        M5 (banco v2)                  M8 (lectura completa)        M6 (reflexión+feedback)
                                                                                          │
                                                                              ┌───────────┴───────────┐
                                                                              ▼                        ▼
                                                                        M7 (mapa real)          M9 (fading, necesita P4)

M3 ──► M10 (preguntas rotativas UI)

M11 (dictado) — independiente, se puede hacer en cualquier momento

M12 (deploy) — al final, o antes si P8 lo adelanta
```
