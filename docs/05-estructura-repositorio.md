# Estructura del Repositorio y Guía para Agentes de Código IA

> Fuente: `docs/original/Estructura del repositorio y guia para agentes.pdf`
> Documento diseñado para ser entregado a un asistente de código IA (Cursor, Windsurf, Claude Code, GitHub Copilot o v0) para iniciar la construcción desde cero.
> ⚠️ Algunas líneas del bloque "prompt maestro" están cortadas en el PDF original (marcadas `[truncado]`). Las reglas operativas destiladas viven en `AGENTS.md` de la raíz.

## 1. Estructura de Carpetas Sugerida (Next.js App Router)

```
nodos-ereader/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── dashboard/
│   │   ├── page.tsx                 # Lista de libros y progreso general
│   │   └── upload/
│   │       └── page.tsx             # Pantalla de subida de PDF
│   ├── reader/
│   │   └── [documentId]/
│   │       ├── page.tsx             # Interfaz E-Reader específica
│   │       └── full/
│   │           └── page.tsx         # Vista de Lectura Completa (Hito)
│   ├── api/
│   │   ├── process-pdf/
│   │   │   └── route.ts             # Webhook/Route handler para ingesta e IA
│   │   └── feedback/
│   │       └── route.ts             # Route handler para evaluación de la respuesta
│   ├── layout.tsx
│   └── page.tsx                     # Landing minimalista
├── components/
│   ├── ui/                          # Botones, Modales, Sliders (Shadcn UI)
│   ├── reader/
│   │   ├── ReaderTextDisplay.tsx    # Componente con estilo tipográfico cuidado
│   │   ├── GlossaryTooltip.tsx      # Fichas flotantes conceptuales
│   │   ├── ReflectionBox.tsx        # Caja de respuesta y dictado
│   │   └── NodeNavigation.tsx       # Sidebar con mapa de nodos
│   └── upload/
│       └── FileUploader.tsx         # Drag & Drop de PDF
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Cliente Supabase Browser
│   │   └── server.ts                # Cliente Supabase Server Component
│   ├── ai/
│   │   ├── gemini.ts                # Configuración API Google Gemini
│   │   ├── claude.ts                # Configuración API Anthropic
│   │   └── prompts.ts               # Prompts del sistema
│   └── pdf/
│       └── extractor.ts             # Extractor de texto desde PDF
├── types/
│   └── index.ts                     # Definiciones de TypeScript (Document, Node...)
├── .env.example
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## 2. Variables de Entorno (`.env.example`)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Provider API Keys
GEMINI_API_KEY=your-google-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

> 🔒 `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` y `ANTHROPIC_API_KEY` son secretos: NUNCA deben commitearse ni exponerse al navegador (sin prefijo `NEXT_PUBLIC_`).

## 3. Prompt Maestro para Agentes de Código

Bloque original del documento (con cortes marcados):

```text
Hola. Quiero que me ayudes a construir una Web App llamada "Nodos". Es un lecto[r...] [truncado]

### Tech Stack Mandatorio:
1. Framework: Next.js 14+ (App Router con TypeScript).
2. UI & Estilos: Tailwind CSS, Shadcn UI y la extensión `@tailwindcss/typograph[y]` [truncado]
3. Backend & Base de Datos: Supabase (Auth, PostgreSQL DB y Storage).
4. IA: Google Gemini API (para procesar el PDF y generar nodos) y Anthropic Cla[ude...] [truncado]

### Reglas de Diseño UI:
- La pantalla de lectura (`/reader/[documentId]`) debe parecerse a un e-reader [truncado]
- Tipografía serif elegante (`font-serif`, por ejemplo Merriweather o Georgia).
- Ancho de texto máximo centrado (`max-w-2xl` o `max-w-3xl`) con márgenes generosos [truncado]
- Sin distracciones visuales, paneles innecesarios ni colores neón. Usar una pa[leta...] [truncado]

### Instrucciones de Implementación Inmediata:
1. Crea la estructura básica del proyecto Next.js con TypeScript y Tailwind.
2. Configura los tipos de datos principales en `types/index.ts` basados en la[s tablas...] [truncado]
3. Diseña el layout del e-reader (`/reader/[documentId]`) con:
   - Panel central de texto con el extracto del nodo actual.
   - Términos destacados que desplieguen un Tooltip con su definición breve.
   - Caja de texto al final con la consigna de reflexión y un botón de "Enviar" [truncado]
   - Sidebar retráctil a la izquierda con la lista de nodos y el progreso.

Por favor, empieza generando los archivos base de tipos, la configuración de Ta[ilwind...] [truncado]
```

> Las reglas completas y vigentes para agentes están destiladas en `AGENTS.md` de la raíz del repo.
