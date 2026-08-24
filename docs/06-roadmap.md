# Roadmap de Desarrollo por Fases

> Fuente: `docs/original/pipeline de prompts de ia.pdf` (sección 3)
> Este archivo se usa como tablero de seguimiento: actualizar los estados a medida que se avanza.

## FASE 1: MVP Estático & Mockup (1-2 semanas)

- [x] Configuración de Next.js + Tailwind CSS.
- [x] Pantalla E-reader con datos hardcodeados o de prueba.
- [x] Ajuste de tipografía, márgenes y experiencia visual. *(pulido fino pendiente de feedback de uso)*

## FASE 2: Integración Backend & API IA (2-3 semanas)

- [ ] Conexión con Supabase DB y Storage.
- [ ] Subida de PDF y extracción de texto.
- [ ] Script de segmentación con Gemini Flash API.
- [ ] Guardado de nodos en Supabase.
- [ ] Preguntas de recuperación rotativas por nodo (banco generado en ingesta; ver docs/04 §4.1).
- [ ] Banco de conceptos v2 con IA: explicar término on-demand + migración localStorage → tabla `concept_bank` (docs/04 §4.2).

## FASE 3: Diálogo Activo & Pulido Final (1-2 semanas)

- [ ] Caja de reflexión del usuario + Feedback con Claude/Gemini.
- [ ] Mapa de nodos lateral con estados (completado/pendiente).
- [ ] Vista de lectura completa (Hito alcanzado).

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
| FASE 2: Backend & IA | ⚪ Pendiente (incluye preguntas IA y banco v2) |
| FASE 3: Diálogo activo | ⚪ Pendiente |

> Decisiones ya tomadas: código en la raíz del repo · tema por defecto Dark IDE/Tokyo Night · deploy solo local durante el desarrollo inicial · lectura ajustable 16–24px · preguntas de recuperación recién con IA en Fase 2.
