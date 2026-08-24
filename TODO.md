# TODO.md — Cosas por hacer (fuente centralizada)

> **Regla:** este es el lugar único donde vive lo próximo a hacer. Todo agente debe leerlo al empezar una sesión. Las decisiones ya tomadas se registran acá para no re-discutirlas. Lo implementado se tacha y se resume en `docs/06-roadmap.md`.

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

### ⚪ Falta implementar

| # | Tarea | Especificación | Estimación |
|---|-------|----------------|------------|
| T4 | **Explicación real con IA** | Ruta interna `/api/concept`: recibe término + párrafo + ubicación, llama a Claude Haiku (Anthropic) con clave del `.env.local` (`ANTHROPIC_API_KEY`), devuelve definición ≤60 palabras según prompt ya especificado en `docs/04 §4.2`. Sin clave configurada → mensaje neutro, nada se rompe. Instalar SDK `@anthropic-ai/sdk`. La clave NUNCA llega al navegador. | M (~25k) |
| T5 | **Cola de reconexión ("Explicar ahora")** | Detectar internet (`navigator.onLine` + eventos online/offline). En el Banco, aviso discreto "N conceptos pendientes — [Explicar ahora]". El botón procesa uno por uno contra `/api/concept` usando el párrafo guardado como contexto; exitosos pasan a `explicado`; los que fallan siguen pendientes sin castigo. Resumen final en una línea ("3 explicados, 1 para reintentar"). **Decisión del dueño (2026-08-23): botón MANUAL, no automático**, porque cada llamada cuesta dinero y él decide cuándo gastar. | M (~18k) |
| T2 | **Jerarquía visual del Banco** | Agrupar por libro → capítulo → nodo (encabezados monoespaciados tipo IDE), ordenado por posición en el libro. Los campos ya están guardados; es trabajo de vista. | M (~15k) |

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
