# Nodos — Lector Psicoanalítico de Micro-Dosis

E-reader web de escritorio que fragmenta textos teóricos densos (psicoanálisis, filosofía, ciencias humanas) en **micro-dosis diarias de 5–10 minutos**, preservando intacta la letra del autor. Sin culpa, sin rachas, sin resúmenes: andamiaje hacia la lectura profunda del texto completo.

## Estado del proyecto

🟡 **Etapa formal** — sentando bases: documentación estructurada y sistema de diseño definido. El desarrollo de la primera versión (MVP estático) está comenzando.

## Documentación

| # | Documento | Contenido |
|---|-----------|-----------|
| 01 | [Visión de producto](docs/01-vision-de-producto.md) | Problema, filosofía, user journey, funcionalidades del MVP |
| 02 | [Bases cognitivas](docs/02-bases-cognitivas.md) | Evidencia científica: carga cognitiva, chunking conceptual, ICAP, diseño antipunitivo |
| 03 | [Arquitectura y stack](docs/03-arquitectura-y-stack.md) | Diagrama, stack tecnológico, modelo de datos SQL, pipeline PDF→nodos, costos |
| 04 | [Pipeline de prompts IA](docs/04-pipeline-prompts-ia.md) | Prompts exactos de ingesta (Gemini) y retroalimentación (Claude) |
| 05 | [Estructura del repositorio](docs/05-estructura-repositorio.md) | Árbol de carpetas objetivo, variables de entorno |
| 06 | [Roadmap](docs/06-roadmap.md) | Fases de desarrollo y estado actual |
| 07 | [Guía de diseño UI/UX](docs/07-guia-diseno-ui.md) | Estética "IDE para el pensamiento", tipografía dual, paletas de temas, reglas Tailwind |
| 08 | [Investigación UX](docs/08-investigacion-ux.md) | Mejores prácticas actuales investigadas y decisiones aplicadas |
| — | [Aprendizajes](APRENDIZAJES.md) | Conocimiento acumulado a partir de errores cometidos |

Los PDFs originales están en [`docs/original/`](docs/original/).

## Stack

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **UI:** Tailwind CSS + Shadcn UI + `@tailwindcss/typography`
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage)
- **IA:** Google Gemini Flash (ingesta/chunking) · Anthropic Claude (retroalimentación dialógica)

## Reglas para agentes de código IA

Leer [`AGENTS.md`](AGENTS.md) antes de trabajar en este repositorio.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir http://localhost:3000
