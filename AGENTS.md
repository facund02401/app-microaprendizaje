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

## Stack mandatorio (no negociable)

- Next.js 14+ App Router con **TypeScript**
- Tailwind CSS + Shadcn UI + `@tailwindcss/typography`
- Supabase (PostgreSQL, Auth, Storage) — desde Fase 2
- Google Gemini Flash (ingesta) + Anthropic Claude (diálogo) — desde Fase 2
- El código vive en la **raíz del repo**; la documentación en `docs/`

## Reglas de producto (de Bases Cognitivas — jamás violar)

1. **Chunking conceptual, nunca por páginas/palabras**: nodos de 300–600 palabras con unidad argumental completa.
2. **Andamiaje, no simplificación**: el texto del autor va intacto, sin resúmenes.
3. **Diseño antipunitivo**: prohibido contadores de deuda, rachas perdidas, alertas rojas o acumuladores de pendientes. El mapa se recalcula sin sanción.
4. **Autoexplicación obligatoria** para completar un nodo; feedback de IA ≤150 palabras, tono colega, NO evaluativo (sin notas/puntajes).
5. **Glosario flotante in situ** (tooltips), máximo 3 términos por sesión.
6. **Lectura completa bloqueada como hito**: se desbloquea al completar los nodos.

## Reglas visuales (de Guía de Diseño)

- Estética "IDE para el pensamiento": sidebar izquierdo retráctil (árbol Libro→Capítulo→Nodo), lienzo central de lectura, status bar inferior monoespaciada, breadcrumbs superiores.
- Tipografía dual: serif humanista (`Charter`, `Merriweather`, `Georgia`) para lectura; `Inter` para UI; `JetBrains Mono` para metadatos/status bar.
- Lectura: 18–20px, line-height 1.7–1.85, ancho 60–68ch (`max-w-[65ch]`), párrafos con `margin 1.5em`, sin sangría.
- Tres temas con paletas exactas de `docs/07`: Dark IDE/Tokyo Night (**default**), Paper Sepia, Minimal Light. Nunca negro puro sobre blanco puro.
- Sin distracciones: nada de colores neón, botones flotantes sobre el texto, ni gamificación agresiva.
- Iconografía discreta de estado: ✓ completado · • en curso · 🔒 bloqueado.
- **Adaptación móvil (desde v1.1):** escritorio sigue siendo la experiencia primaria, pero <768px el explorador es cajón flotante (nace cerrado, cierra con toque fuera/Esc/al elegir nodo), el glosario abre por toque (Popover híbrido, ver APRENDIZAJES), botones con área táctil ≥40px y altura `100dvh`. Punto de corte: `md` de Tailwind.

## Flujo de trabajo esperado

- Cambios pequeños y verificables; después de cada tarea indicar cómo comprobarla en el navegador.
- Antes de commitear: `npm run lint` y `npm run build` sin errores.
- No commitear secretos: las claves van en `.env.local` (ignorado por git); mantener `.env.example` como plantilla.
- Datos de prueba siempre ficticios y claramente inventados ("Paciente Ejemplo"). Nunca material real con derechos de autor ni datos clínicos reales.
- Idioma del código e interfaz: español; identificadores de código en inglés estándar.
- Al terminar una sesión donde se corrigió un error: sumar la lección a `APRENDIZAJES.md`.

## Fase actual

Ver `docs/06-roadmap.md`. **Fase 1 — MVP estático: completa**, más adaptación móvil v1.1 (cajón flotante, glosario táctil). Próxima: **Fase 2 — backend Supabase + ingesta con IA** (las cuentas se crean desde cero; ver docs/03 y docs/04).
