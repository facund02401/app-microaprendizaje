# Bases Cognitivas y Psicopedagógicas del Lector de Micro-Dosis "Nodos"

> Fuente: `docs/original/Bases Cognitivas para App Nodos.pdf`
> Este archivo resume los hallazgos y las reglas de diseño que se derivan de ellos. El PDF original conserva la investigación completa con citas.

## 1. Teoría de Carga Cognitiva y Tamaño Óptimo de la Micro-Dosis

### 1.1 Límites de la Memoria de Trabajo y Tasa de Exposición

- La **Teoría de Carga Cognitiva** (Cognitive Load Theory, CLT — John Sweller) distingue tres cargas:
  - **Intrínseca:** dada por la complejidad propia del texto.
  - **Extránea:** provocada por la forma de presentación (interfaz).
  - **Germana (relevante):** dedicada al procesamiento profundo y a la construcción de esquemas.
- En textos densos (Lacan, Kant), la carga intrínseca ya es estructuralmente elevada: un solo párrafo exige mantener activos múltiples esquemas interrelacionados.
- Velocidades de lectura: narrativa simple ≈ 250–300 ppm; texto académico denso ≈ 100–150 ppm; lectura crítica con análisis conceptual ≈ **50–100 ppm**.

**Regla derivada:** la micro-dosis diaria debe fijarse entre **300 y 600 palabras por sesión**, lo que a ritmo analítico equivale a **5–10 minutos** de lectura focalizada, reservando capacidad sobrante para reflexión y autoexplicación.

### 1.2 Chunking Conceptual vs. Chunking por Número de Palabras

| Criterio | Chunking arbitrario (conteo de palabras) | Chunking conceptual (nodos semánticos) |
|---|---|---|
| Mecanismo de segmentación | Corte métrico rígido (ej. cada 500 palabras o límite de página) | Unidades de sentido discursivo y coherencia proposicional |
| Impacto en carga intrínseca | Desestructurado; fractura proposiciones y premisas teóricas | Optimizado; preserva la continuidad del modelo de situación |
| Efecto en memoria de trabajo | Sobrecarga por retención de ideas inconclusas | Facilita la clausura cognitiva y la consolidación de esquemas |
| Aplicación en "Nodos" | Inadecuado para filosofía y psicoanálisis | **Mandatorio:** extractos intactos de 300–600 palabras |

- Según el **Modelo de Construcción-Integración** de Walter Kintsch, interrumpir una cadena deductiva antes de que el autor cierre la idea incrementa la carga extránea.
- La unidad de segmentación es el **Nodo Conceptual Autónomo**: fragmento que encierra una unidad lógica argumental completa (premisa → desarrollo → conclusión teórica).

## 2. Elaboración y Retención Contextual

### 2.1 Marco ICAP y Efecto de Autoexplicación

- El marco **ICAP** (Michelene Chi) clasifica el compromiso cognitivo en cuatro modos jerárquicos:
  - **Pasivo:** recibir información (leer sin más).
  - **Activo:** manipular el material (subrayar, pausar).
  - **Constructivo:** generar contenido nuevo no presente en el material (autoexplicarse).
  - **Interactivo:** diálogo con pares/tutor.
- El **Efecto de Autoexplicación** (Chi): generar explicaciones propias produce aprendizajes más profundos que la recepción pasiva.
- **Regla derivada:** completar un nodo exige redactar o dictar una autoexplicación (fase constructiva mínima obligatoria).

### 2.2 Práctica de Recuperación y Prompts de Transferencia

- La **Práctica de Recuperación** (Roediger & Karpicke): recuperar información desde la memoria fortalece la retención más que releer.
- **Regla derivada:** la pregunta de anclaje funciona como prompt de recuperación/transferencia clínica-teórica.

## 3. Andamiaje Cognitivo y Glosarios Dinámicos

### 3.1 Efecto de Atención Dividida (Split-Attention)

Ocurre cuando múltiples fuentes de información deben integrarse mentalmente (ej.: leer el texto y buscar un término en un glosario aparte). Genera carga extránea innecesaria.

### 3.2 Integración Espacial mediante Glosarios Flotantes

- **Regla derivada:** los términos teóricos complejos se resuelven con fichas flotantes *in situ* (tooltips), nunca enviando al usuario a otra página o documento.
- Limitar estrictamente las definiciones flotantes a un **máximo de 3 términos por sesión**.
- **Extensión de la definición: 20–30 palabras**, acotada exclusivamente al sentido que el autor le da al término en ese extracto (no una entrada enciclopédica genérica). Detalle de la investigación completa (`docs/original/Bases Cognitivas para App Nodos.pdf` §3.2) que no había quedado en este resumen — aplica al `context_glossary` generado en la ingesta (docs/04 §1), que es distinto del límite de ≤60 palabras del Banco de conceptos v2 (docs/04 §4.2), una explicación on-demand más larga.

### 3.3 Efecto de Inversión de la Experticia (Expertise Reversal)

El andamiaje debe ser gradual, no estático. La investigación completa (`docs/original/Bases Cognitivas para App Nodos.pdf` §3.3) especifica el mecanismo: cuando el sistema detecta que el usuario comprendió un concepto — evidenciado por sus **respuestas de reflexión validadas por la IA** (Fase 3, diálogo activo) —, las apariciones futuras de ese término dejan de mostrarse resaltadas/con cue visual por defecto, aunque la definición sigue disponible bajo demanda manual (nunca desaparece del todo).

> **Nota de implementación (2026-09-08):** esta señal de dominio depende del feedback de IA sobre la reflexión del usuario (Fase 3, todavía no construida) — **no** del estado `explained`/`pending` del Banco de conceptos. Ese estado solo indica que se le mostró una definición al lector, no que la entendió; usarlo como proxy de maestría sería la señal equivocada (confunde el modo Activo del marco ICAP §2.1 con el Constructivo/Interactivo). No existe un atajo válido para implementar el fading antes de tener el circuito de retroalimentación dialógica funcionando — queda marcado como dependiente de Fase 3 en `TODO.md`, no como mejora de corto plazo sobre el Banco de conceptos.

## 4. Psicología del Hábito, Dificultades Deseables y Mitigación de la Culpa

### 4.1 Modelo de Comportamiento de Fogg (BJ Fogg)

Un comportamiento ocurre cuando coinciden **Motivación × Capacidad × Disparador**. Frente a un PDF de 300 páginas la Capacidad percibida es mínima y exige motivación excepcional (fluctuante → procrastinación). Fragmentar en micro-dosis de 5–10 minutos modifica radicalmente la variable Capacidad: la sesión se completa aun con motivación baja, consolidando el hábito.

### 4.2 Dificultades Deseables (Bjork) vs. Fricción Extránea

- Separar estrictamente:
  - **Fricción inútil** (buscar el archivo, hallar la página, buscar términos lejos del texto) → se elimina por completo.
  - **Dificultad deseable** (texto original sin resumir, esfuerzo de autoexplicación) → se preserva intacta.

### 4.3 Diseño Antipunitivo

La gamificación punitiva (rachas perdidas, alertas rojas, contadores de deuda) genera reactancia y ansiedad de rendimiento → abandono. Pautas obligatorias:

- **Ausencia de contadores de deuda:** sin advertencias ni acumuladores de tareas pendientes. Al ingresar, simplemente se presenta el nodo del día.
- **Recálculo silencioso de la ruta:** el mapa reajusta el itinerario según el ritmo real, sin plazos fijos ni penalizaciones.
- **Lectura completa como hito de desbloqueo:** el lector corrido permanece bloqueado hasta trabajar los nodos clave; aprovecha la necesidad de cierre cognitivo (Gestalt) y convierte la lectura completa en recompensa de maestría.

## 5. Recomendaciones de UI/UX Basadas en Ergonomía Cognitiva

| Principio | Especificación técnica | Fundamento |
|---|---|---|
| Tipografía serif | Merriweather / Georgia, 16–18px mínimo | Guía el barrido sacádico, reduce regresiones |
| Ancho de columna | 60–70 caracteres por línea (`max-w-2xl`) | Elimina errores de retorno de la mirada |
| Paleta y contraste | Fondo crema `#FAF8F5`, texto `#1A1A1A` (WCAG AAA); modo noche fondo `#121212`, texto `#E0E0E0` | Evita deslumbramiento por luminancia extrema |
| Feedback de IA | Texto dialógico, máx. 150 palabras, tono colega | Fomenta modo Interactivo (ICAP) y metas de dominio |
| Visualización de progreso | Sidebar retráctil con Mapa de Nodos Semánticos (Completado / Actual / Bloqueado) | Reduce carga metacognitiva, da cierre |

Principios detallados:

1. **Tipografía Serif optimizada** para lectura continuada.
2. **Ancho de columna restringido + interlineado 1.6–1.8.**
3. **Paleta de contraste "bajas calorías"** (WCAG AAA).
4. **Retroalimentación dialógica NO evaluativa:** nada de notas numéricas o letras (activan metas de ejecución y defensas). Estructura en 3 fases: validación de lo logrado → articulación del concepto con el resto del texto → transición motivadora al nodo siguiente.
5. **Mapa de nodos semántico con indicadores de cierre:** estados visuales inequívocos (completado / actual / bloqueado).

## 6. Líneas de Acción Recomendadas (Síntesis Operativa)

1. Configurar prompts de ingesta para **chunking conceptual**: nodos de 300–600 palabras por integridad argumental; máx. 3 términos de glosario por sesión.
2. Exigir la **fase constructiva**: autoexplicación obligatoria para completar el nodo; devolución de IA máx. 150 palabras.
3. Adoptar **filosofía antipunitiva**: cero indicadores de retraso, racha perdida o deuda de lectura; recálculo transparente del itinerario.
4. Aplicar **ergonomía visual**: serif 18px, columna 60–70 caracteres, glosarios flotantes integrados (erradicar atención dividida).
