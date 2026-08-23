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

**Complemento desde Bases Cognitivas:** cada nodo debe contener 300–600 palabras por integridad argumental; máximo 3 términos de glosario por sesión.

## 2. Prompt de Retroalimentación Dialógica (Elaboración del Usuario)

- **Proveedor:** Anthropic Claude 3.5 Sonnet o Google Gemini Flash
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
