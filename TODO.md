# TODO.md — Cosas por hacer (fuente centralizada)

> **Regla:** este es el lugar único donde vive lo próximo a hacer. Todo agente debe leerlo al empezar una sesión. Las decisiones ya tomadas se registran acá para no re-discutirlas. Lo implementado se tacha y se resume en `docs/06-roadmap.md`.

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
| F2-2 | Banco de conceptos en Supabase (migrar desde localStorage) | Tenerlo igual en compu y celular (docs/04 §4.2). |
| F2-3 | T4/T5 con la misma clave de Claude | La clave ya existe tras el paso 2. |
| F2-4 | Preguntas de recuperación rotativas | Pospuesto por costo (docs/10 D11). |
| F2-5 | Procesamiento en segundo plano (Supabase Edge Functions) | Hoy hay que dejar la pantalla abierta (docs/10 D5). |
| F2-6 | Modo sin conexión para libros ya procesados | docs/10 D10. |
| F2-7 | Reprocesar un documento / editar cortes de nodos a mano | Si un corte no convence. |

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

### ⚪ Falta implementar

| # | Tarea | Especificación | Estimación |
|---|-------|----------------|------------|
| T4 | **Explicación real con IA** | Ruta interna `/api/concept`: recibe término + párrafo + ubicación, llama a Claude Haiku (Anthropic) con clave del `.env.local` (`ANTHROPIC_API_KEY`), devuelve definición ≤60 palabras según prompt ya especificado en `docs/04 §4.2`. Sin clave configurada → mensaje neutro, nada se rompe. Instalar SDK `@anthropic-ai/sdk`. La clave NUNCA llega al navegador. | M (~25k) |
| T5 | **Cola de reconexión ("Explicar ahora")** | Detectar internet (`navigator.onLine` + eventos online/offline). En el Banco, aviso discreto "N conceptos pendientes — [Explicar ahora]". El botón procesa uno por uno contra `/api/concept` usando el párrafo guardado como contexto; exitosos pasan a `explicado`; los que fallan siguen pendientes sin castigo. Resumen final en una línea ("3 explicados, 1 para reintentar"). **Decisión del dueño (2026-08-23): botón MANUAL, no automático**, porque cada llamada cuesta dinero y él decide cuándo gastar. | M (~18k) |

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

---

## 4. Backlog menor (sin prioridad asignada)

- Gestos swipe entre nodos en móvil (docs/08 backlog).
- Fuente accesible opcional (Atkinson Hyperlegible / OpenDyslexic).
- Glosario consolidado por libro ("priming glossary").
- Resaltados estilo marcador físico; scroll paginado opcional.
