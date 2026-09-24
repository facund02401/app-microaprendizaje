# Decisiones de la Fase 2 — "Directorio"

> Pedido del dueño (2026-09-23): cuando haya dudas, deliberar como un directorio de cuatro voces —
> **Usuario** (quien estudia con la app; su voz pesa más), **Técnica/backend**, **Diseño/frontend** y
> **Negocio** — y registrar la decisión. Formato: pregunta · voces · decisión · cómo revertirla.

---

### D1 — ¿Qué IA procesa los textos? *(decisión del dueño)*
- **Contexto:** los docs originales decían Gemini Flash para la ingesta y Claude para el diálogo.
- **Decisión del dueño:** Claude para todo (una sola cuenta, una sola clave).
- **Técnica:** Claude lee PDFs escaneados como imagen, sirve para todo el flujo. Modelo por defecto `claude-opus-5`, configurable con `CLAUDE_MODEL`.
- **Negocio:** es más caro que Gemini (ver docs/09 §4). Se muestra el costo antes de gastar y se documenta la alternativa `claude-sonnet-5` (~40 % del costo).
- **Actualiza:** `AGENTS.md` (stack) y `docs/03`.

### D2 — ¿Cómo se entra: link por email o contraseña?
- **Usuario:** "Quiero entrar desde el celular sin vueltas; no soy técnico."
- **Técnica:** el link mágico falla en celulares cuando el email abre otro navegador, y en iPhone la app instalada tiene su propia sesión (el link abre Safari, no la app). Además exige configurar plantillas de email en Supabase.
- **Diseño:** formulario estándar con "mostrar contraseña" y autocompletado para que el celular la recuerde.
- **Negocio:** cero costo, cero dependencia del email.
- **Decisión:** **email + contraseña**. Registro solo una vez ("Primera vez").

### D3 — ¿Quién puede usar la app? *(dueño: "solo yo")*
- **Decisión:** lista de emails habilitados en la base (`allowed_emails`) + un trigger que rechaza registros de otros emails + reglas RLS que exigen ser dueño habilitado en cada tabla y en los archivos. El email no está en el repo.
- **Consecuencia:** la confirmación por email puede apagarse sin perder seguridad (docs/09 paso 1).

### D4 — ¿Cómo garantizar que el texto del autor quede intacto?
- **Usuario:** "El texto no se toca; nada de resúmenes." (regla de producto 2)
- **Técnica:** si la IA copiara el texto en su respuesta podría alterarlo y costaría el doble (se paga lo que escribe). Mejor: numerar párrafos y que Claude devuelva solo **en qué párrafo empieza cada nodo**; el código corta el original.
- **Decisión:** segmentación por "párrafo de inicio". Una prueba automática verifica que la unión de todos los nodos reproduce el texto completo.
- **Extras:** el último nodo de cada tanda se revisa en la siguiente (para no cortar un argumento a la mitad); un nodo nunca empieza con una nota al pie ni termina con un título suelto; los términos de glosario que no aparecen literalmente en el nodo se descartan.

### D5 — ¿Dónde corre el procesamiento largo?
- **Técnica:** un libro lleva 10–40 minutos; el servidor gratis de Vercel corta a los 5 minutos por pedido. Procesar "en segundo plano" exigiría una clave de administración de Supabase o funciones extra, con más configuración manual.
- **Usuario:** "No quiero pasos de configuración."
- **Diseño:** mostrar progreso claro, permitir pausar y retomar, y evitar que el celular apague la pantalla.
- **Decisión:** el navegador pide **un paso a la vez** (≤ 5 min cada uno); todo queda guardado paso a paso; si se cierra, se retoma solo al volver. Un candado impide que dos pestañas procesen a la vez.
- **Revisar si molesta:** migrar a proceso en segundo plano (Supabase Edge Functions) — anotado en TODO.

### D6 — ¿Se procesa apenas se sube?
- **Negocio:** cada libro cuesta dinero; el dueño ya decidió en v1.2 que la IA se dispara a mano ("él decide cuándo gastar").
- **Decisión:** subir y leer el archivo es gratis; se muestra **costo y tiempo estimados** y recién se procesa al tocar **Procesar con IA**.

### D7 — PDFs: ¿cómo se reconstruyen los párrafos?
- **Técnica:** un PDF no guarda "párrafos", solo renglones con posición. Se detectan por sangría, espacio extra y renglón final corto; los títulos por tamaño de letra; las notas por letra chica en la parte baja; se quitan números de página y encabezados repetidos; se unen palabras cortadas con guion y párrafos partidos entre páginas.
- **Plan B:** si un "párrafo" queda gigante (más de 450 palabras), se parte en oraciones completas.
- **Escaneados:** las páginas con menos de 80 caracteres de texto se transcriben con Claude de a 5.

### D8 — ¿Dónde se aloja?
- **Decisión:** Supabase en São Paulo (`sa-east-1`) y funciones de Vercel en São Paulo (`gru1`, en `vercel.json`): misma región = respuestas rápidas desde Uruguay/Argentina.

### D9 — Lector con libros reales
- **Usuario:** "Con un libro de 200 nodos no puedo empezar siempre desde el 1."
- **Decisión:** el lector recuerda el último nodo por libro (en el dispositivo). Se agregó acceso a la biblioteca en el encabezado (en la app instalada no hay botón "atrás").
- **Pendiente:** sincronizar el progreso entre computadora y celular (tabla en Supabase).

### D10 — ¿App instalable u offline?
- **Decisión:** instalable ya (manifest + ícono); **offline completo queda para después** (requiere guardar libros en el dispositivo y resolver sincronización). El banco de conceptos ya funciona sin conexión.

### D11 — Preguntas de recuperación rotativas (docs/04 §4.1)
- **Negocio:** generarlas en la ingesta sube ~50 % el costo de salida.
- **Decisión:** posponer hasta que el dueño pruebe la lectura con libros reales; se agregan re-procesando solo esa parte.

### D12 — Procesar de a partes, a medida que se lee *(propuesta del dueño, 2026-09-24)*
- **Usuario:** "Muchas veces subo el libro entero pero no lo leo todo: capaz leo la introducción, el capítulo 7 y el 12, o lo dejo por la mitad. No quiero pagar por lo que no leo. Esperar un par de minutos entre capítulos no me molesta."
- **Negocio:** es la forma de gastar solo en lo que se lee; con un libro abandonado a la mitad se ahorra la mitad o más.
- **Técnica:** al subir se arma gratis un **índice** (con los títulos de Word/EPUB/PDF; sin títulos, partes de ~5.000 palabras; PDFs escaneados, bloques de 10 páginas). Cada parte tiene estado: disponible → en tu lista → preparándose → lista. Los nodos guardan su **posición en el libro**, así se ordenan bien aunque se prepare el capítulo 12 antes que el 3.
- **Diseño:** índice con casillas, tiempo de lectura y costo de cada parte; "Preparar y empezar a leer" prepara solo la primera elegida. En el lector, 3 nodos antes del final de lo preparado se prepara sola la siguiente parte de la lista; al final se ofrece "¿Seguimos con…?" con su costo, o volver al índice. "Preparar todo ahora" queda como opción.
- **Decisión:** el procesamiento por partes es el modo normal.
- **Límite conocido:** en PDFs escaneados los bloques de 10 páginas pueden cortar un capítulo; el corte cae entre nodos, nunca dentro de un párrafo.
