# Arquitectura Técnica y Stack Tecnológico: Nodos

> Fuente: `docs/original/Arquitectura y stack tecnologico.pdf`
> Nota: algunas líneas del PDF original aparecen cortadas por la exportación (marcadas con `[truncado]`); el sentido se completa por contexto.

## 1. Visión General de la Arquitectura

Aplicación web moderna, liviana y de bajo costo de mantenimiento. Arquitectura **serverless** centrada en Next.js (App Router), Supabase como Backend-as-a-Service, y APIs de LLMs (Google Gemini / Anthropic Claude) para procesamiento de lenguaje natural.

> **Actualizado 2026-09-08:** mono-usuario por ahora (sin Auth) y modelo de diálogo actualizado a Claude Haiku 4.5 — ver notas en la sección 2 y 3.

```
┌───────────────────────────────────────────────────────────┐
│                     Cliente (Navegador)                    │
│    Next.js (React) + Tailwind CSS + Tipografía Serif       │
└──────────────┬────────────────────────────▲───────────────┘
               │  APIs / Server Actions      │  Datos / Estado
               ▼                             │
┌───────────────────────────────────────────────────────────┐
│               Next.js Backend (Serverless)                 │
│   - Orquestación de Ingesta de PDFs                        │
│   - Prompt Pipeline Manager (LLM Interface)                │
└──────────────┬────────────────────────────▲───────────────┘
               │  API Requests               │  Responses
      ┌────────┴────────┐           ┌────────┴────────┐
      ▼                  ▼           ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│   Supabase   │  │ Google Gemini │  │ Anthropic Claude │
│  - PostgreSQL│  │ Flash         │  │ Haiku 4.5        │
│  - Storage   │  │ (Ingesta &    │  │ (Retroalimentación│
│  (sin Auth,  │  │  Chunking)    │  │  fina y diálogo) │
│   por ahora) │  │               │  │                  │
└──────────────┘  └──────────────┘  └──────────────────┘
```

## 2. Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Framework Web | Next.js 14+ (App Router, TypeScript) | Rendimiento, Server Components para e-reader rápido, despliegue fácil en Vercel |
| Estilos & UI | Tailwind CSS + `@tailwindcss/typography` | Interfaces e-reader limpias, adaptables, control tipográfico estricto |
| Base de Datos | Supabase (PostgreSQL) | Capa gratuita generosa, base relacional sólida. Auth diferido: app mono-usuario por ahora (decisión 2026-09-08); se agrega si se comparte con otras personas |
| Almacenamiento | Supabase Storage | Guarda los PDFs originales subidos por el usuario |
| Procesamiento PDF | `pdf-parse` / `pdfjs-dist` (Node.js) | Extracción rápida de texto plano desde PDFs |
| Motor IA (Ingesta) | Google Gemini 2.5/1.5 Flash API | Contexto gigante (1M+ tokens), bajo costo, respuesta rápida para libros enteros |
| Motor IA (Diálogo) | Anthropic Claude Haiku 4.5 (actualizado 2026-09-08, ver docs/04) | Suficiente precisión para salidas cortas (~150 palabras) a costo mínimo; se sube de tier solo si el uso real pierde matiz clínico/teórico |
| Hosting Frontend | Vercel (Plan Hobby/Free) | Despliegue continuo integrado con GitHub |

## 3. Modelo de Datos (Esquema PostgreSQL en Supabase)

> **Decisión 2026-09-08 — alcance mono-usuario en Fase 2:** el dueño confirmó que, por ahora, la app es de un solo usuario (él). Se difiere Supabase Auth y la tabla `profiles`; las tablas de contenido no llevan `user_id` todavía. Si en el futuro se comparte con otras personas, se agrega `profiles` + Auth + RLS como migración (agregar columna `user_id` con default a cada tabla), no como rediseño — el esquema original con multiusuario queda documentado en `docs/original/Arquitectura y stack tecnologico.pdf` §3 por si se retoma.

```sql
-- TABLA DE DOCUMENTOS / LIBROS SUBIDOS
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    file_path TEXT NOT NULL, -- Ruta en Supabase Storage
    total_nodes INT DEFAULT 0,
    status TEXT DEFAULT 'processing', -- 'processing', 'ready', 'error'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- TABLA DE NODOS CONCEPTUALES (MICRO-DOSIS)
CREATE TABLE nodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    order_index INT NOT NULL, -- Secuencia de lectura (1, 2, 3...)
    title TEXT NOT NULL, -- Ej: "La pulsión y sus destinos: Concepto de Represión"
    excerpt TEXT NOT NULL, -- Párrafos originales extraídos
    context_glossary JSONB DEFAULT '[]'::jsonb, -- [{ "term": "Trieb", "definition": "..." }], definiciones de 20-30 palabras (docs/02 §3.2)
    reflection_prompt TEXT NOT NULL, -- Pregunta de anclaje analógico/procedimental (docs/04 §1.1)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- TABLA DE PROGRESO Y RESPUESTAS (sin user_id: un solo usuario implícito)
CREATE TABLE user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE NOT NULL,
    user_response TEXT, -- Texto escrito o transcripto por el usuario
    ai_feedback TEXT, -- Respuesta del bot
    status TEXT DEFAULT 'pending', -- 'pending', 'completed'
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(node_id)
);
```

## 4. Pipeline de Procesamiento de Textos (PDF → Nodos)

1. **Subida:** El usuario arrastra un archivo `.pdf` en la aplicación.
2. **Almacenamiento:** El archivo se guarda en el bucket de Supabase Storage.
3. **Extracción:** Un Server Action extrae el texto bruto del PDF usando `pdf-parse`.
4. **Segmentación mediante Gemini:**
   - Se envía el texto completo (o capítulos grandes) a Gemini Flash con un System Prompt de Estructuración.
   - Gemini devuelve un JSON estructurado con el arreglo de nodos (Extracto, Título, Glosario contextual, Consigna).
5. **Persistencia:** Los nodos creados se insertan en la tabla `nodes` vinculados al `document_id`. El documento cambia de estado a `ready`.

## 5. Análisis de Costos Estimados

Para uso personal activo o grupo reducido de estudio:

| Concepto | Costo |
|---|---|
| Hosting Vercel (Free) | $0/mes |
| Supabase (Free: 500MB DB + 1GB Storage ≈ +300 libros) | $0/mes |
| Ingesta de 1 libro de 200 páginas (~100.000 palabras) vía Gemini Flash | ~$0.05–0.10 USD |
| Explicación de términos + feedback dialógico con Claude Haiku 4.5, uso esporádico real (~5 nodos/día, 3–4 sesiones/día) — recalculado 2026-09-08 | ~$0.70 USD |
| Dictado por voz: $0 con Web Speech API nativo (primera opción); si se migra a Whisper por calidad, ~$0.90 USD con el mismo patrón de uso | $0–0.90 USD |
| **Total mensual estimado** | **< $2.00 USD/mes** (se mantiene incluso con dictado pago incluido) |
