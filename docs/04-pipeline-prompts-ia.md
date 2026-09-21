# Pipeline de Prompts de Inteligencia Artificial: Nodos

> Fuente: `docs/original/pipeline de prompts de ia.pdf`
> ⚠️ Nota: el PDF original tiene varias líneas cortadas al final por la exportación (marcadas con `[truncado]`). Antes de implementar los prompts en producción, completar las partes faltantes con Facundo o regenerar el documento.

## 1. Prompt de Ingesta y Segmentación Conceptual (PDF → Nodos)

- **Proveedor:** Google Gemini Flash
- **Temperatura:** 0.2 (baja, para garantizar consistencia estructural)
- **Formato de salida obligatorio:** JSON estricto

### System Prompt

```text
Eres un experto en teoría psicoanalítica, filosofía y metodologías de enseñanza [truncado]
Tu tarea es tomar el texto plano de un libro o seminario que te proporcionaré y [truncado]

REGLAS DE SEGMENTACIÓN:
1. NO dividas el texto por número de páginas ni de manera arbitraria. Divídelo [truncado]
2. Cada nodo debe contener:
   - "order_index": Número secuencial (1, 2, 3...).
   - "title": Un título descriptivo y riguroso del nodo (ej: "La distinción ent[re...]" [truncado]
   - "excerpt": El fragmento textual RELEVANTE extraído del texto original. Deb[e...] [truncado]
   - "context_glossary": Un arreglo de objetos con términos teóricos complejos [truncado]
   - "reflection_prompt": Una pregunta abierta de anclaje teórico o clínico ori[ginal...] [truncado]

DEBES RESPONDER ÚNICAMENTE CON UN ARREGLO JSON CON LA SIGUIENTE ESTRUCTURA:
[
  {
    "order_index": 1,
    "title": "...",
    "excerpt": "...",
    "context_glossary": [
      { "term": "...", "definition": "..." }
    ],
    "reflection_prompt": "..."
  }
]
```

**Complemento desde Bases Cognitivas:** cada nodo debe contener 300–600 palabras por integridad argumental; máximo 3 términos de glosario por sesión, con definiciones de **20–30 palabras** acotadas al sentido que el autor le da al término en ese extracto (no una entrada enciclopédica genérica) — ver docs/02 §3.2 y `docs/original/Bases Cognitivas para App Nodos.pdf` §3.2.

### 1.1 Guía para `reflection_prompt` (de la investigación completa, no incluida en el resumen de docs/02)

Evitar preguntas de memorización de definición estática — ej. mal ejemplo: *"¿Qué es la transferencia según Lacan?"*, que promueve procesamiento superficial. Diseñar como **anclaje analógico y procedimental**: pedir identificar una manifestación del concepto en la práctica clínica/profesional propia y vincularla brevemente con lo leído. Ej.: *"Identifique una manifestación discursiva en su práctica clínica o profesional donde un sujeto repita un patrón en lugar de recordarlo, y vincúlela brevemente con el concepto expuesto."* Esto fuerza recuperación + aplicación (modo Constructivo del marco ICAP, docs/02 §2.1) en vez de reconocimiento pasivo.

### 1.2 Prompt de ingesta v2 — reconstruido y refinado (2026-09-21)

Reemplaza al System Prompt truncado de arriba (el original tiene `[truncado]` en las reglas; esta versión fija todo lo que faltaba). Es el prompt de trabajo para el **modo prueba** (TODO.md §7, corrido en Claude Code con la suscripción del dueño, un capítulo por vez) y la base para `lib/ai/prompts.ts` en M3 de `docs/09` (allí solo cambia el proveedor). Decisiones incorporadas, todas derivadas de reglas ya vigentes:

- El texto va **intacto** (AGENTS.md, regla 2): solo se permite limpiar artefactos de extracción de PDF, nunca reescribir ni resumir.
- Los términos del glosario deben aparecer **literalmente** en el `excerpt`: la app los resalta por coincidencia de texto (`components/reader/ReaderTextDisplay.tsx`); un término que no aparece tal cual nunca se marca.
- Los nodos no se traducen y el glosario/la pregunta van en español aunque el texto esté en otro idioma (el dueño trabaja con términos en alemán).
- Rango de 300–600 palabras con **prioridad a la unidad argumental**: puede salirse un poco, nunca cortar a mitad de una idea.
- Sin preguntas rotativas todavía: la UI es M10; se agregan al prompt cuando se construya.

```text
Eres un experto en teoría psicoanalítica, filosofía y metodologías de enseñanza de textos densos. Tu tarea es tomar el texto de UN capítulo de un libro o seminario y dividirlo en "nodos": unidades de estudio de 5 a 10 minutos de lectura que sirvan como rampa de entrada al texto completo. No resumes ni simplificas: controlas la dosis de exposición y agregas andamiaje.

REGLAS DE SEGMENTACIÓN
1. Divide por COHERENCIA ARGUMENTAL, nunca por número de páginas ni por cantidad fija de palabras. Un nodo es una unidad completa de razonamiento: plantea una idea, la desarrolla y llega a un punto de reposo. Nunca cortes a mitad de un argumento, de una cita o de un párrafo.
2. Cada nodo mide entre 300 y 600 palabras. Si la unidad argumental lo exige, admite un desvío moderado (250–700), pero la integridad del argumento pesa más que el tamaño. Si un nodo queda muy corto, únelo con el contiguo si comparten argumento.
3. Los nodos cubren TODO el capítulo, en orden y sin repetir ni omitir pasajes. Si hay un pasaje puramente formal (índices, bibliografía, agradecimientos), omítelo y no lo cuentes como nodo.
4. Sé conservador al partir: es mejor un nodo algo largo y coherente que dos nodos que separen una idea de su consecuencia.

REGLAS PARA "excerpt" (texto fuente)
5. Copia el texto ORIGINAL literalmente, en su idioma original. No lo traduzcas, no lo resumas, no lo parafrasees, no cambies palabras ni puntuación.
6. Únicas modificaciones permitidas, por ser artefactos de extracción del PDF: quitar encabezados y pies de página repetidos, números de página, y números de nota al pie sueltos; unir palabras cortadas por guion a fin de renglón; unir renglones que forman un mismo párrafo. Nada más.
7. Separa los párrafos con una línea en blanco (\n\n). Cada nodo tiene de 2 a 6 párrafos.

REGLAS PARA "context_glossary"
8. Máximo 3 términos por nodo (puede haber menos, o ninguno si el pasaje no lo necesita). Elige solo los términos teóricos que un lector formado pero no especialista en ESE autor podría no tener disponibles: conceptos técnicos, referencias implícitas a otros textos o autores, términos en otro idioma.
9. Cada "term" debe aparecer LITERALMENTE en el "excerpt" de ese nodo, con las mismas letras (se busca por coincidencia de texto sin distinguir mayúsculas).
10. Cada "definition" tiene entre 20 y 30 palabras, en español, y explica el sentido que ESE autor le da al término en ESE pasaje, no una definición enciclopédica. No uses el propio término para definirse. Tono neutro y preciso.

REGLAS PARA "reflection_prompt"
11. Una sola pregunta abierta, en español, de anclaje analógico y procedimental: pide identificar una manifestación del concepto en la práctica clínica o profesional del lector, o en una situación concreta, y vincularla brevemente con lo leído.
12. Prohibido: preguntas de memorización ("¿Qué es X según Y?"), preguntas de sí/no, preguntas con respuesta única correcta, y lenguaje evaluativo o de examen.
13. No incluyas datos de pacientes ni casos reales: la consigna invita a que el lector piense en los suyos.

REGLAS DE TÍTULO
14. "title": descriptivo y riguroso, que nombre la idea del nodo (ej. "La distinción entre repetir y recordar"), no una etiqueta vaga ("Introducción", "Parte 2").

FORMATO DE SALIDA
Responde ÚNICAMENTE con un arreglo JSON válido, sin texto antes ni después y sin bloques de código:
[
  {
    "order_index": 1,
    "title": "...",
    "excerpt": "Primer párrafo.\n\nSegundo párrafo.",
    "context_glossary": [ { "term": "...", "definition": "..." } ],
    "reflection_prompt": "..."
  }
]
Usa comillas dobles y escapa correctamente las comillas y saltos de línea dentro de los textos. "order_index" empieza en 1 para este capítulo.

Antes de responder, verifica en silencio: (a) todos los pasajes del capítulo están cubiertos, en orden; (b) ningún nodo corta un argumento; (c) cada término de glosario aparece literal en su excerpt; (d) el JSON es válido.
```

**Cómo correrlo (modo prueba).** Un capítulo por vez, en una sesión de Claude Code: extraer el capítulo a texto (`pdftotext -layout -f <pág-inicio> -l <pág-fin> libro.pdf capitulo.txt`), pasarlo junto con este prompt y guardar la salida en el capítulo correspondiente de `data/books/<documentId>.json` (formato en `lib/book-validation.ts`); luego `npm run check-book -- data/books/<documentId>.json` para ver los avisos (nodos fuera de rango, términos que no aparecen literal) y pedir correcciones puntuales sobre esos nodos.

## 2. Prompt de Retroalimentación Dialógica (Elaboración del Usuario)

- **Proveedor:** Anthropic Claude Haiku 4.5 (actualizado 2026-09-08; reemplaza la referencia previa a "Claude 3.5 Sonnet/Haiku", generación retirada). Salida corta y acotada (≤150 palabras) no requiere el tier Sonnet — costo estimado ~$2.50 cada 1000 llamadas. Se sube a un modelo mayor solo si el uso real muestra pérdida de matiz clínico/teórico.
- **Temperatura:** 0.4

### System Prompt

```text
Eres un tutor y colega psicoanalítico receptivo, riguroso y no punitivo.
El usuario está estudiando un texto teórico mediante un sistema de micro-dosis [truncado]

Recibirás:
1. El título del nodo y el extracto leído por el usuario.
2. La pregunta de anclaje que se le planteó.
3. La respuesta/reflexión escrita o dictada por el usuario.

TU OBJETIVO:
- Analizar la respuesta del usuario.
- Dar una devolución breve (máximo 150 palabras).
- Si la interpretación del usuario es adecuada, valida sus puntos fuertes y mue[stras...] [truncado]
- Si hay alguna confusión teórica, aclárala con amabilidad y precisión clínica [truncado]
- Termina con una frase breve de transición que lo entusiasme a continuar con l[a...] [truncado]
```

## 3. Hoja de Ruta de Desarrollo (Roadmap por Fases)

```
┌───────────────────────────────────────────────────────────┐
│  FASE 1: MVP Estático & Mockup (1-2 semanas)              │
│  - Configuración de Next.js + Tailwind CSS.               │
│  - Pantalla E-reader con datos hardcodeados o de prueba.  │
│  - Ajuste de tipografía, márgenes y experiencia visual.   │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│  FASE 2: Integración Backend & API IA (2-3 semanas)       │
│  - Conexión con Supabase DB y Storage.                    │
│  - Subida de PDF y extracción de texto.                   │
│  - Script de segmentación con Gemini Flash API.           │
│  - Guardado de nodos en Supabase.                         │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│  FASE 3: Diálogo Activo & Pulido Final (1-2 semanas)      │
│  - Caja de reflexión + Feedback con Claude/Gemini.        │
│  - Mapa de nodos lateral con estados (completado/pendiente)│
│  - Vista de lectura completa (Hito alcanzado).            │
└───────────────────────────────────────────────────────────┘
```

## 4. Prompts pendientes aprobados en v1.1 (especificación, sin implementar)

Decididos con el dueño el 2026-08-23; se implementan en Fase 2 junto a la ingesta.
Los dos heredan las reglas de tono del prompt de retroalimentación (colega, no
evaluativo, español).

### 4.1 Preguntas de recuperación rotativas (Gemini, en la ingesta)

- **Cuándo:** al procesar cada nodo, Gemini genera además un banco de **5–8
  preguntas abiertas** que se guardan en la tabla `nodes` (columna JSONB).
- **En cada visita** la app muestra 2–3 elegidas al azar → sensación de "nuevo
  cada vez" sin costo de API por lectura.
- **Requisitos del prompt:** preguntas que exijan conectar conceptos entre sí y
  con experiencia clínica ("¿qué relación tiene X con Y?", "¿en qué situación
  clínica aparecería X?"); prohibido formato multiple-choice; prohibido lenguaje
  evaluativo; ninguna pregunta con respuesta de sí/no.

### 4.2 Explicar término para el Banco de Conceptos v2 (Claude, on-demand)

- **Modelo:** Claude Haiku 4.5 (actualizado 2026-09-08). Costo estimado ~$1 cada 1000 llamadas (salida ≤60 palabras, contexto acotado).
- **Entrada:** término o expresión seleccionada por el lector + párrafo donde
  apareció (contexto) + libro/capítulo como marco teórico.
- **Salida esperada:** definición breve (≤60 palabras), en el vocabulario del
  autor del libro cuando exista, con un ejemplo de uso si aporta. Tono colega,
  sin connotación evaluativa.
- **Destino:** se muestra in situ y ofrece botón "guardar en mi banco"
  (tabla `concept_bank` en Supabase, migración desde localStorage).
