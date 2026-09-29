# AGENTS.md — Reglas para Agentes de Código IA

> Léelo completo antes de hacer cambios. Si encontrás un conflicto entre este archivo y los docs, avisá antes de decidir solo.

## Qué es este proyecto

**Nodos**: e-reader web de escritorio para estudiar textos teóricos densos (psicoanálisis) mediante micro-dosis de 5–10 minutos. El dueño del proyecto es psicólogo/psicoanalista, no desarrollador: explicar en lenguaje simple cada cambio y cómo verificarlo.

## Documentación fuente (en orden de autoridad)

1. `docs/07-guia-diseno-ui.md` — fuente de verdad visual (paletas, tipografía, layout)
2. `docs/02-bases-cognitivas.md` — principios de producto obligatorios
3. `docs/01-vision-de-producto.md` — alcance y funcionalidades
4. `docs/03-arquitectura-y-stack.md` + `docs/05-estructura-repositorio.md` — técnica
5. `docs/08-investigacion-ux.md` — decisiones de diseño investigadas
6. `APRENDIZAJES.md` — **leer siempre al empezar; actualizar al cometer/corregir un error**
7. `TODO.md` — lugar centralizado de lo próximo a hacer y decisiones frescas del dueño
8. `docs/09-despliegue-y-operacion.md` (operación, cuentas, pasos manuales) y `docs/10-decisiones-fase2.md` (decisiones del "directorio")
9. `docs/11-plan-implementacion.md` — desglose de Fase 2 y 3 en milestones; **ojo:** se escribió antes de que la otra rama construyera la Fase 2, así que varios milestones (M1–M4, M12) ya están hechos; verificar contra `docs/09-despliegue-y-operacion.md` antes de retomar

## Stack mandatorio (no negociable)

- Next.js 14+ App Router con **TypeScript**
- Tailwind CSS + Shadcn UI + `@tailwindcss/typography`
- Supabase (PostgreSQL, Auth, Storage) — desde Fase 2
- Anthropic Claude para ingesta y diálogo — desde Fase 2 (el dueño reemplazó Gemini el 2026-09-23; ver docs/10 D1). Modelo por `CLAUDE_MODEL`, default `claude-opus-5`
- El código vive en la **raíz del repo**; la documentación en `docs/`

## Reglas de producto (de Bases Cognitivas — jamás violar)

1. **Chunking conceptual, nunca por páginas/palabras**: nodos de 300–600 palabras con unidad argumental completa.
2. **Andamiaje, no simplificación**: el texto del autor va intacto, sin resúmenes.
3. **Diseño antipunitivo**: prohibido contadores de deuda, rachas perdidas, alertas rojas o acumuladores de pendientes. El mapa se recalcula sin sanción.
4. **Autoexplicación obligatoria** para completar un nodo; feedback de IA ≤150 palabras, tono colega, NO evaluativo (sin notas/puntajes).
5. **Glosario flotante in situ** (tooltips), máximo 3 términos por sesión.
6. **Lectura completa siempre accesible**: nunca hay candado. Las secciones ya trabajadas se resaltan en tono tenue como señal de familiaridad; el hito de completar el libro es informativo/celebratorio, no una condición de acceso (decisión 2026-09-08: el hard-lock original iba contra el punto 3 de esta misma lista).

## Reglas visuales (de Guía de Diseño)

- Estética "IDE para el pensamiento": sidebar izquierdo retráctil (árbol Libro→Capítulo→Nodo), lienzo central de lectura, status bar inferior monoespaciada, breadcrumbs superiores.
- Tipografía dual: serif humanista (`Charter`, `Merriweather`, `Georgia`) para lectura; `Inter` para UI; `JetBrains Mono` para metadatos/status bar.
- Lectura: 18–20px, line-height 1.7–1.85, ancho 60–68ch (`max-w-[65ch]`), párrafos con `margin 1.5em`, sin sangría.
- Tres temas con paletas exactas de `docs/07`: Dark IDE/Tokyo Night (**default**), Paper Sepia, Minimal Light. Nunca negro puro sobre blanco puro.
- Sin distracciones: nada de colores neón, botones flotantes sobre el texto, ni gamificación agresiva.
- Iconografía discreta de estado: ✓ completado · • en curso · 🔒 bloqueado.
- **Adaptación móvil (desde v1.1):** escritorio sigue siendo la experiencia primaria, pero <768px el explorador es cajón flotante (nace cerrado, cierra con toque fuera/Esc/al elegir nodo), el glosario abre por toque (Popover híbrido, ver APRENDIZAJES), botones con área táctil ≥40px y altura `100dvh`. Punto de corte: `md` de Tailwind.
- **Lectura ajustable (v1.1):** control "Aa" en header, presets 16–24px (default 19) vía variable CSS `--reading-fs` aplicada pre-paint (sin flash). Interlineado/ancho en ch se adaptan solos.
- **Glosario y banco (v1.1):** tooltips flotantes mantienen límite de 3/sesión; la sección "Glosario del nodo" es estática y no cuenta en ese límite. El Banco de conceptos persiste en localStorage (`nodos-concept-bank`) hasta migrar a Supabase en Fase 2.
- **Banco de conceptos v1.2:** selección de texto → ⊕ flotante → guarda con estado `explained`/`pending`; pendientes muestran etiqueta gris neutra y se explican con IA vía botón manual "Explicar ahora" (decisión del dueño). Especificación completa en `TODO.md`.

## Flujo de trabajo esperado

- **Al abrir cada sesión, antes de hacer nada:** correr `git fetch origin` y comparar con `git log HEAD..origin/master` y `git branch -a`. Si hay commits o ramas nuevas en GitHub (por ejemplo, de sesiones en la nube), leerlos y sincronizar (pull o merge) **antes** de proponer o empezar trabajo, y avisar al dueño qué cambió. Motivo: el 2026-09-29 una sesión en la nube construyó la Fase 2 entera y la sesión local rehízo trabajo que ya existía.
- **Al cerrar cada sesión:** commit y push, y dejar una línea de avance en la doc correspondiente (qué se hizo, cuándo, cómo se verificó).
- Cambios pequeños y verificables; después de cada tarea indicar cómo comprobarla en el navegador.
- Antes de commitear: `npm run lint` y `npm run build` sin errores.
- No commitear secretos: las claves van en `.env.local` (ignorado por git); mantener `.env.example` como plantilla.
- Datos de prueba siempre ficticios y claramente inventados ("Paciente Ejemplo"). Nunca material real con derechos de autor ni datos clínicos reales.
- Idioma del código e interfaz: español; identificadores de código en inglés estándar.
- Al terminar una sesión donde se corrigió un error: sumar la lección a `APRENDIZAJES.md`.

## Fase actual

Ver `docs/06-roadmap.md`. **Fase 1: completa.** **Fase 2 — núcleo completo (2026-09-23):** Supabase (proyecto `nodos`), login solo del dueño, subida de PDF/escaneado/Word/EPUB/TXT, ingesta con Claude por pasos, lector online y despliegue en Vercel. Detalles y pasos manuales en `docs/09`; decisiones en `docs/10`; pendientes en `TODO.md`.

## Reglas técnicas de Fase 2

- **Texto intacto por construcción:** Claude nunca devuelve el texto del autor; solo el número de párrafo donde empieza cada nodo (`lib/ai/segment.ts`). No cambiar esto sin consultar al dueño.
- **Convención de párrafos:** `# ` = título del libro, `[nota] ` = nota al pie (`lib/ingest/text.ts`). En escaneados, `⟦…⟧` = reconstruido por contexto y `[ilegible]` = no deducible (docs/10 D15); el lector los muestra marcados, nunca en silencio.
- **Textos breves (≤ 15.000 palabras / 40 págs. escaneadas):** una sola parte, sin índice (docs/10 D13).
- **Apuntes:** `node_responses` (respuesta + nota por nodo) y `concept_bank` (espejo del banco local, se sincroniza con `syncBank()`); exportación PDF en `/api/documents/[id]/export[?chapter=]` (`lib/export/`). Nunca mostrar "guardado" sin haber guardado.
- **Todo trabajo con IA es por pasos ≤ 300 s** (`/api/documents/[id]/step`), reanudable y con costo estimado antes de empezar.
- **Procesamiento por partes (docs/10 D12):** el lector elige partes del índice (`document_sections`); se prepara una a la vez y la siguiente al acercarse al final. Ordenar nodos/capítulos siempre por `start_position`, nunca por `order_index`.
- **Seguridad:** RLS + `allowed_emails`; nunca exponer `ANTHROPIC_API_KEY` al navegador; las migraciones nuevas van en `supabase/migrations/`.
- **Este entorno de Claude Code no llega a supabase.co ni vercel.com por red:** usar los MCP de Supabase/Vercel y probar el motor con los dobles de prueba descritos en APRENDIZAJES.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
