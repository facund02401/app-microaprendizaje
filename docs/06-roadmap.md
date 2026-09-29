# Roadmap de Desarrollo por Fases

> Fuente: `docs/original/pipeline de prompts de ia.pdf` (sección 3)
> Este archivo se usa como tablero de seguimiento: actualizar los estados a medida que se avanza.
> El desglose paso a paso de Fase 2 y 3 (milestones chicos, qué necesita al dueño, preguntas abiertas) vive en [`docs/11-plan-implementacion.md`](11-plan-implementacion.md).

## FASE 1: MVP Estático & Mockup (1-2 semanas)

- [x] Configuración de Next.js + Tailwind CSS.
- [x] Pantalla E-reader con datos hardcodeados o de prueba.
- [x] Ajuste de tipografía, márgenes y experiencia visual. *(pulido fino pendiente de feedback de uso)*

## FASE 2: Integración Backend & API IA (2-3 semanas)

- [x] Conexión con Supabase DB y Storage.
- [x] Subida de PDF y extracción de texto. *(también PDF escaneado, Word, EPUB y TXT)*
- [x] Segmentación con IA. *(Claude en vez de Gemini: decisión del dueño, docs/10 D1)*
- [x] Guardado de nodos en Supabase.
- [x] Login (solo el dueño), despliegue en Vercel y app instalable en el celular (docs/09).
- [ ] Preguntas de recuperación rotativas por nodo (banco generado en ingesta; ver docs/04 §4.1).
- [ ] Banco de conceptos v2 con IA: explicar término on-demand + migración localStorage → tabla `concept_bank` (docs/04 §4.2).
- [ ] Ideas tipo LingQ (marcado de términos del Banco en nodos siguientes, cierre de nodo, corte manual de nodos): detalle y tamaños en `TODO.md §8`.

## FASE 3: Diálogo Activo & Pulido Final (1-2 semanas)

- [ ] Caja de reflexión del usuario + Feedback con Claude Haiku 4.5.
- [ ] Mapa de nodos lateral con estados (completado/pendiente).
- [ ] Vista de lectura completa (siempre accesible, con resaltado de secciones trabajadas — ya no es un lock; ver docs/01 §4.4).
- [ ] Andamiaje decreciente del glosario (fading, Expertise Reversal): ocultar el cue visual de un término una vez que el feedback de IA valida que el usuario lo entendió en su reflexión — depende de que el circuito de retroalimentación dialógica esté funcionando (docs/02 §3.3). No implementable antes de esto.

---

## Estado actual del proyecto

| Etapa | Estado |
|---|---|
| Documentación y cimientos del repo | ✅ Completa |
| Investigación UX/UI complementaria | ✅ Completa (`docs/08`) |
| FASE 1: MVP estático | ✅ Completa (v1 funcional con datos mock) |
| Adaptación móvil v1.1 | ✅ Completa (cajón flotante, glosario táctil, áreas táctiles) |
| Features v1.1: tipografía ajustable + glosario del nodo + banco local | ✅ Completas |
| Banco v1.2: selección → ⊕ → pendientes (prototipo) | ✅ Completa — resto en `TODO.md` |
| FASE 2: Backend & IA | 🟡 Núcleo completo (2026-09-23): login, subida, ingesta con Claude, lector online. Faltan preguntas IA y banco v2 |
| FASE 3: Diálogo activo | ⚪ Pendiente |

> Decisiones ya tomadas: código en la raíz del repo · tema por defecto Dark IDE/Tokyo Night · deploy en Vercel desde Fase 2 (https://nodos-seven.vercel.app) · lectura ajustable 16–24px · preguntas de recuperación recién con IA en Fase 2.
> Otras decisiones vigentes: lectura completa sin bloqueo (2026-09-08) · IA de diálogo/explicación con Claude Haiku 4.5 (2026-09-08) · dictado por voz con Web Speech API nativo primero, Whisper solo si hace falta (2026-09-08) · andamiaje decreciente del glosario depende de Fase 3 (2026-09-08).
