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
| FASE 2: Backend & IA | ⚪ Pendiente |
| FASE 3: Diálogo activo | ⚪ Pendiente |

> Decisiones ya tomadas: código en la raíz del repo · tema por defecto Dark IDE/Tokyo Night · deploy solo local durante el desarrollo inicial.
