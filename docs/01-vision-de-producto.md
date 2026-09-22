# Documento de Visión de Producto: Nodos — Lector Psicoanalítico de Micro-Dosis

> Fuente: `docs/original/Vision de producto.pdf`

## 1. Resumen Ejecutivo

**Nodos** es una aplicación web de lectura tipo e-reader de escritorio diseñada para eliminar la inercia y la fricción cognitiva asociadas al estudio de textos teóricos densos (especialmente en psicoanálisis y ciencias humanas).

En lugar de enfrentar obras extensas de manera masiva, la plataforma fragmenta el material en unidades conceptuales lógicas (**micro-dosis diarias**) de 5 a 10 minutos de lectura. A través de andamiaje progresivo, contexto dinámico y consignas de articulación clínica/teórica, la herramienta acompaña al usuario hasta que alcanza la densidad crítica de conceptos necesaria para encarar la lectura profunda del texto completo de forma fluida y placentera.

## 2. Definición del Problema y Filosofía de Diseño

### 2.1 El Problema

- **Inercia de Entrada:** El obstáculo principal para el profesional o estudiante no es la falta de comprensión, sino la resistencia psicológica a iniciar la lectura de textos extensos y complejos (seminarios, escritos metapsicológicos, casos clínicos).
- **Parálisis por Extensión:** El formato tradicional (PDFs de 30 a 500 páginas) genera ansiedad de rendimiento y postergación.
- **Aislamiento del Concepto:** Al leer fragmentos sueltos, se pierde la red conceptual y la genealogía de los términos clave (significanttes, formulaciones clínicas).

### 2.2 Principios de Diseño

1. **Andamiaje, no Simplificación:** La app no "resume" ni "facilita" el texto hasta volverlo superficial. Preserva la letra y la complejidad del autor original, pero controla la tasa de exposición.
2. **Estética E-Reader Minimalista:** Diseñada exclusivamente para web/escritorio. Espacios en blanco generosos, tipografía serif de alta legibilidad, ausencia de elementos de distracción (sin gamificación agresiva, sin contadores rojos de culpa).
3. **Ritmo Reorganizable (Sin Culpa):** Si el usuario no lee durante varios días, el sistema no acumula "tareas pendientes notificadas con alarma", sino que recalcula el mapa de nodos sin sanción.
4. **El Texto Abierto:** La micro-dosis no es el destino final; es la rampa de lanzamiento hacia la lectura del texto original completo.

## 3. Flujo del Usuario (User Journey)

```
[1. Subida de PDF/Texto]
        │
        ▼
[2. Procesamiento e Ingesta de IA] ──► Generación del Mapa de Nodos Conceptuales
        │
        ▼
[3. Sesión Diaria en E-Reader] ──────► Muestra: Fragmento Central + Glosario Flotante
        │
        ▼
[4. Elaboración Dialógica] ──────────► El usuario escribe o dicta su reflexión
        │
        ▼
[5. Desbloqueo de Hito] ─────────────► "Has completado la red conceptual del Capítulo"
        │
        ▼
[6. Modo Lectura Profunda] ──────────► Lector completo del documento con zonas trabajadas resaltadas
```

## 4. Funcionalidades Clave del MVP (Producto Mínimo Viable)

### 4.1 Módulo de Ingesta y Segmentación Inteligente

- Permite arrastrar archivos PDF o TXT.
- La IA analiza la estructura discursiva del texto y **no corta por número de páginas**, sino por coherencia de nodo temático.
- Asigna a cada nodo:
  - **Texto fuente intacto** (2 a 4 párrafos).
  - **Fichas de Contexto/Glosario:** Breves notas flotantes sobre términos previos o referencias implícitas del autor.
  - **Pregunta de Anclaje:** Una consigna abierta de reflexión clínica o teórica.

### 4.2 Interfaz E-Reader de Escritorio

- Tipografía Serif seleccionable (Georgia, Merriweather, Garamond).
- Controles de ancho de columna de lectura (60–70 caracteres por línea óptimos).
- Modo claro, modo sepia y modo noche.
- Panel lateral desplegable con el Mapa de Nodos del libro.

> **Ajustes v1.1 (decisión del dueño, ya implementados):**
> - **Tamaño de lectura ajustable** (control "Aa", presets 16–24px, ver docs/07 §3).
> - **Glosario del nodo**: sección plegable con todos los términos del nodo; complementa los tooltips flotantes sin reemplazarlos (el límite de 3 por sesión rige solo para los flotantes, que interrumpen la lectura; esta sección es estática y no interrumpe).
> - **Banco de conceptos (v1 local)**: el lector guarda términos del glosario (⊕) y los consulta desde la pestaña "Banco" del panel lateral. Persistencia local del navegador en el MVP; migrará a Supabase en Fase 2.
> - **Adaptación móvil**: explorador como cajón flotante <768px, glosario táctil, áreas de toque ≥40px (ver docs/08 D-notas y AGENTS.md).

### 4.5 Funcionalidades aprobadas para Fase 2 (pendientes)

- **Preguntas de recuperación rotativas**: 2–3 preguntas nuevas por visita a cada nodo, generadas por IA al momento de la ingesta. Formato compatible con el diseño antipunitivo: preguntas abiertas para pensar, devolución estilo colega, sin puntajes ni correcto/incorrecto.
- **Banco de conceptos v2 con IA**: marcar cualquier palabra del texto → la IA explica el término → se puede guardar en el banco (tabla Supabase `concept_bank`).

### 4.3 Diálogo de Elaboración

- Espacio de escritura minimalista al pie de la micro-dosis.
- Integración opcional con micrófono para dictado por voz.
  > **Decisión 2026-09-08:** confirmado como objetivo, supeditado a costo/calidad. Se implementa primero con el **Web Speech API nativo del navegador** (gratis, sin backend ni proveedor externo); se migra a un proveedor pago (ej. Whisper) solo si la calidad de transcripción de vocabulario técnico (psicoanálisis, términos en alemán) no alcanza. Con el patrón de uso esperado (3–4 sesiones/día, pocas llamadas cada una) el costo de la alternativa paga sería marginal (<$1/mes) — no es un bloqueo real, es una cuestión de calidad primero, no de plata.
- Retroalimentación inmediata del modelo de IA que valida la interpretación del usuario y la enlaza con el siguiente nodo teórico.

### 4.4 Vista de Lectura Completa

> **Ajuste 2026-09-08 (decisión del dueño):** se elimina el bloqueo original. Un candado binario contradecía el principio antipunitivo aplicado a todo lo demás (docs/02 §4.3) — es fricción autoimpuesta sin salida para el propio dueño del texto. El hito de "completar el libro" pasa a ser informativo/celebratorio, no una condición de acceso.

- La vista de lectura completa del documento está disponible en cualquier momento, sin depender de haber completado los nodos.
- Visualmente resalta en un tono tenue las secciones que ya fueron trabajadas en las dosis diarias, generando una sensación de familiaridad al navegar el escrito entero; las secciones no trabajadas se muestran en estilo normal, sin candado ni bloqueo.
