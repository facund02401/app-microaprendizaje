# APRENDIZAJES.md — Conocimiento acumulado del proyecto

> Registro vivo de errores cometidos y lecciones aprendidas durante el desarrollo.
> **Regla:** cada vez que un agente comete y corrige un error, debe sumar una entrada al final. Leer este archivo al empezar cada sesión.

## Formato de entrada

```
### YYYY-MM-DD — Título corto de la lección
- **Contexto:** qué se estaba haciendo.
- **Error:** qué salió mal.
- **Corrección:** cómo se resolvió.
- **Lección:** regla general para no repetirlo.
```

---

## Entradas

### 2026-08-23 — Los PDFs exportados de Gemini cortan las líneas largas
- **Contexto:** Lectura de los documentos fundacionales del proyecto (PDFs) para estructurar la documentación.
- **Error:** La primera extracción de texto devolvió líneas truncadas a ~100 caracteres: prompts incompletos, SQL con `NOT NULL` cortado en `NO`.
- **Corrección:** Re-extracción con pdfminer.six (mejor manejo de layout). Las líneas seguían cortadas: el recorte está dentro del propio PDF, no es culpa del extractor. Se marcaron los faltantes con `[truncado]` en los markdown y se decidió completarlos antes de implementar los prompts reales.
- **Lección:** Antes de asumir que un extractor falló, comparar dos extractores; si ambos coinciden, el problema está en el archivo fuente. Documentar los huecos explícitamente en vez de inventar contenido.

### 2026-08-23 — Contradicción entre docs sobre paleta clara
- **Contexto:** Estructuración del sistema de diseño.
- **Error:** Bases Cognitivas propone modo claro crema `#FAF8F5`/texto `#1A1A1A`; la Guía de Diseño define Minimal Light `#F8F9FA`/`#1F2328`. Sin decisión, cada sesión podría implementar colores distintos.
- **Corrección:** Se declaró a `docs/07-guia-diseno-ui.md` fuente de verdad visual (es más específica y posterior); la diferencia quedó anotada en ese documento.
- **Lección:** Cuando dos documentos fuente entran en conflicto, nombrar una jerarquía explícita de autoridad en AGENTS.md y registrar la discrepancia donde vive el dato.

### 2026-08-23 — create-next-app no arranca en carpetas con archivos
- **Contexto:** Scaffold del proyecto en la raíz del repo, que ya tenía docs/ y README.
- **Error:** Ejecutar el instalador directamente en la raíz habría fallado por archivos existentes.
- **Corrección:** Se creó el proyecto en carpeta temporal fuera del repo y luego se copiaron solo los archivos del scaffold (sin pisar README/.gitignore propios) y se corrió `npm install` en la raíz.
- **Lección:** Los instaladores interactivos exigen carpetas limpias: generar afuera y mover adentro es más seguro que borrar cosas del repo.

### 2026-08-23 — Next.js 16 trae reglas del React Compiler que cambian cómo escribir componentes
- **Contexto:** Primer build del MVP; lint fallaba con 4 errores nuevos (`react-hooks/immutability`, setState síncrono en effects).
- **Error:** (1) Mutar una variable local (`let running`) dentro de `.map()` durante el render; (2) leer localStorage y hacer setState síncrono dentro de `useEffect`; (3) mutar `document.documentElement` desde una función definida dentro del componente (el compilador la considera potencialmente parte del render).
- **Corrección:** (1) Precomputar estructuras derivadas con Map/flatMap antes del JSX; (2) usar inicialización perezosa de estado `useState(() => ...)` con guard `typeof window === "undefined"` + `suppressHydrationWarning`; (3) mover funciones que tocan el DOM a nivel de módulo, fuera del componente.
- **Lección:** En proyectos nuevos con React 19/Next 16, diseñar los componentes "compiler-safe" desde el inicio: nada de mutaciones durante render ni efectos que solo inicialicen estado; preferir lazy init y helpers a nivel módulo.

### 2026-08-23 — El CLI de shadcn actual ya no usa --base-color
- **Contexto:** Inicialización de Shadcn UI sobre Tailwind v4.
- **Error:** La opción documentada en tutoriales (`--base-color neutral`) ya no existe; además el CLI lanza prompts interactivos si falta un flag, lo que cuelga sesiones automatizadas.
- **Corrección:** Consultar `--help` primero; usar `init -y -b radix -p nova`. Regla general: siempre correr `<cli> --help` antes de confiar en flags de memoria.
- **Lección:** Las CLIs de frontend cambian rápido: verificar ayuda del comando instalado, no la documentación recordada.

### 2026-08-23 — Los tooltips de Radix no responden al tacto
- **Contexto:** Adaptación móvil del glosario flotante.
- **Error:** El componente Tooltip de Radix está diseñado para mouse/teclado; en pantallas táctiles el término no abre de forma confiable con un toque.
- **Corrección:** Se reemplazó por un Popover controlado con patrón híbrido: en escritorio hover con 200ms de demora y cierre con 150ms de gracia; en móvil el toque alterna abierto/cerrado; teclado con Tab + Enter/Espacio. Se descartó abrir por foco porque focus dispara antes que click y lo cerraba de inmediato.
- **Lección:** Para elementos que deben funcionar con mouse Y dedo, usar Popover controlado con temporizadores de intención (abrir-lento/cerrar-tardío); nunca combinar apertura por foco con toggle por click en el mismo disparador.

### 2026-08-23 — Estado responsive sin desincronización de hidratación
- **Contexto:** Cajón flotante del explorador que nace cerrado en móvil pero abierto en escritorio.
- **Error:** Detectar el ancho de pantalla con `useState(() => window.innerWidth)` produce HTML de servidor distinto al del cliente (error de hidratación); corregirlo con setState síncrono dentro de `useEffect` viola las reglas del React Compiler.
- **Corrección:** `useSyncExternalStore` sobre `window.matchMedia("(min-width: 768px)")` con snapshot de servidor `true`; la preferencia de localStorage se lee diferida (`setTimeout 0`) en un estado separado que actúa solo como default en escritorio.
- **Lección:** Para decisiones dependientes del viewport, usar `useSyncExternalStore` + matchMedia: React resuelve la diferencia servidor/cliente sin warnings ni efectos síncronos.

### 2026-08-23 — Los celulares disparan eventos sintéticos de mouse antes del toque
- **Contexto:** En móvil, tocar un término del glosario lo abría y cerraba instantáneamente, sin dejar guardar en el banco.
- **Error:** iOS/Android generan `mouseenter`→`click` al tocar. Nuestro `mouseenter` programaba apertura a 200ms y el `click` de Radix alternaba: según el timing, el toque terminaba cerrando lo que acababa de abrir.
- **Corrección:** Todos los handlers de hover consultan `window.matchMedia("(hover: hover)").matches` y no hacen nada en táctil. Además, la apertura por toque/click ahora "fija" el popover (flag `openedByHover`): solo cierra con toque fuera, Esc o ×; el cierre por salir con el mouse aplica únicamente si abrió por hover. Se agregó × visible dentro del popover.
- **Lección:** En componentes híbridos hover/touch, gatear SIEMPRE los handlers de mouse con `(hover: hover)`; nunca depender del timing entre eventos sintéticos y click. Y definir dos modos claros: transitorio (hover) vs fijado (toque).

### 2026-09-08 — El resumen de un doc de investigación puede recortar el dato que importa
- **Contexto:** al discutir cómo implementar el andamiaje decreciente (Expertise Reversal, docs/02 §3.3), propuse usar el estado `explained`/`pending` del Banco de conceptos como señal de "término dominado".
- **Error:** `docs/02` es un resumen de `docs/original/Bases Cognitivas para App Nodos.pdf`; al condensarlo se perdió el detalle de que la señal de dominio que especifica la investigación es "respuestas de reflexión **validadas por la IA**" (Fase 3), no el Banco de conceptos (que solo registra que se mostró una definición, modo Activo del marco ICAP — no Constructivo/Interactivo). Mi propuesta habría implementado el principio correcto con la señal equivocada.
- **Corrección:** se releyó el PDF original completo antes de tocar código o documentación; se corrigió `docs/02` §3.3 para citar la señal correcta y se marcó el fading como dependiente de Fase 3 en `TODO.md`, en vez de como mejora rápida sobre Fase 1/2.
- **Lección:** cuando una decisión de diseño se apoya en un doc resumido (`docs/0X`), releer el PDF original en `docs/original/` antes de implementar algo no trivial basado en él — el resumen puede omitir precisamente el detalle que cambia la implementación correcta.

### 2026-08-23 — La emulación móvil de DevTools no reproduce la selección nativa
- **Contexto:** Prueba del prototipo selección→⊕ en el simulador de teléfono del navegador.
- **Error:** Arrastrar en modo dispositivo no selecciona texto, dando la impresión de que la función está rota en móvil.
- **Corrección:** Es una limitación del simulador: traduce el arrastre a scroll táctil, pero la selección real en celulares viene del long-press nativo, que la emulación no reproduce. Verificar con ventana angosta (<768px, layout móvil + mouse real) o con el teléfono físico vía LAN.
- **Lección:** El device-mode de Chrome sirve para layout/tamaños, NO para gestos nativos (long-press, selección, teclado virtual); esas interacciones se prueban en hardware real.

### 2026-09-21 — Resetear estado al cambiar de "ítem actual" con `key`, no con `setState` en un efecto
- **Contexto:** El switch consigna/notas de `ReflectionBox.tsx` necesitaba que el texto no se arrastrara de un nodo al siguiente (el componente no se remonta al cambiar `node`, solo recibe una prop nueva).
- **Error:** Primer intento: un `useEffect([documentId, node.orderIndex])` que llamaba `setMode("prompt")` y `setSavedMode(null)` de forma síncrona al notar el cambio de nodo. `eslint-plugin-react-hooks` (regla `set-state-in-effect`) lo marcó como error: cascada de renders evitable.
- **Corrección:** En `ReaderView.tsx` se le puso `key={`${book.documentId}-${node.orderIndex}`}` a `<ReflectionBox>`. React desmonta y crea una instancia nueva por nodo, así que el estado inicial (`useState`) ya nace limpio sin tocarlo a mano. El efecto quedó solo para la carga async de localStorage, que si es asíncrona (via `setTimeout`) no dispara la regla.
- **Lección:** Si un componente necesita "olvidar" su estado cuando cambia el ítem que muestra (nodo, tab, id de una lista), usar `key` en el padre para forzar el remonte, no un `useEffect` que resetea manualmente — más simple, sin efectos secundarios de timing, y no dispara `set-state-in-effect`.

### 2026-09-23 — `next dev` agrega un bloque a AGENTS.md
- **Contexto:** Primera vez corriendo `next dev` con Next 16 en la Fase 2.
- **Error:** Apareció `AGENTS.md` modificado sin que nadie lo tocara; parecía un cambio accidental.
- **Corrección:** Next 16 escribe un bloque `nextjs-agent-rules` en AGENTS.md (ver `node_modules/next/dist/server/lib/generate-agent-files.js`). Se commitea para que no vuelva a aparecer.
- **Lección:** Antes de revertir un cambio inesperado, leer el diff: puede venir de una herramienta y ser útil.

### 2026-09-23 — El entorno de Claude Code en la nube no llega a Supabase ni Vercel
- **Contexto:** Probar login y procesamiento contra la base real.
- **Error:** `curl` a `*.supabase.co` y `vercel.com` falla (la política de red del entorno los bloquea), así que no se puede probar la app contra la base real desde el contenedor.
- **Corrección:** (1) Administrar Supabase/Vercel con sus MCP (SQL, migraciones, deploys, `web_fetch_vercel_url`); (2) probar el motor (`lib/ingest/pipeline.ts`) con un Supabase en memoria y un servidor falso de la API de Anthropic apuntado con `ANTHROPIC_BASE_URL` (streaming SSE), correr con `npx tsx --conditions react-server` (por `server-only`); (3) revisar pantallas con una página de vista previa temporal y Playwright, sin variables de Supabase.
- **Lección:** Cuando la red bloquea un servicio, probar con dobles que ejerciten el código real sin modificarlo, y verificar producción con las herramientas del proveedor. Si hace falta acceso directo, se habilita en la configuración de red del entorno.

### 2026-09-23 — Detalles de Next 16 al crear rutas nuevas
- **Contexto:** Rutas `/api/documents/[id]/...` y una página de prueba temporal.
- **Error:** (1) `RouteContext<...>` no existe hasta que Next genera los tipos; `tsc` fallaba. (2) Tras borrar una página, `tsc` seguía buscándola en `.next/dev/types`. (3) `pkill -f "next dev ..."` (y luego `pgrep -f` + `kill` en un bucle) mató la propia terminal porque el patrón coincidía con su comando. Pasó dos veces.
- **Corrección:** (1) Tipar a mano `{ params: Promise<{ id: string }> }`; (2) borrar `.next` antes de verificar tipos; (3) guardar el PID al lanzar el servidor (`… & echo $! > pid`) y matar ese PID; o usar el truco `[n]ext` en el patrón para que no coincida consigo mismo.
- **Lección:** Tras cambios de rutas, limpiar `.next`; no depender de tipos generados en archivos que deben compilar antes del primer build.

### 2026-09-23 — El email gratuito de Supabase solo envía a direcciones autorizadas
- **Contexto:** Registro de la cuenta del dueño con confirmación por email.
- **Error potencial:** el SMTP por defecto de Supabase solo manda a miembros de la organización y tiene límite por hora; si el email no coincide, el registro falla.
- **Corrección:** Como solo los emails de `allowed_emails` pueden registrarse (trigger en `auth.users`), se recomienda apagar "Confirm email" (docs/09 paso 1) y la pantalla de registro explica qué hacer si falla el envío.
- **Lección:** Con acceso restringido por lista, la confirmación por email no suma seguridad y sí fricción; evaluar cada paso de email contra el uso real.

### 2026-09-24 — Un botón decía "guardado" sin guardar nada
- **Contexto:** Diseño de la exportación de apuntes.
- **Error:** En el prototipo, "Guardar reflexión" solo cambiaba el texto a "Reflexión guardada ✓"; al cambiar de nodo, lo escrito se perdía. Nadie lo notó porque el mensaje decía lo contrario.
- **Corrección:** Autoguardado real en `node_responses`, con copia local mientras no hay confirmación y mensaje honesto ("Sin conexión: quedó en este dispositivo…").
- **Lección:** Un mensaje de éxito solo se muestra después de confirmar el éxito. En prototipos, si algo no persiste, decirlo en pantalla ("se pierde al recargar").

### 2026-09-24 — Detener el servidor de prueba por su PID
- **Contexto:** Revisión visual con `next dev` en segundo plano.
- **Corrección aplicada:** `… & echo $! > dev.pid` al lanzar y `kill $(cat dev.pid)` al terminar (más `ps | grep "[n]ext-server"` para el proceso hijo). No volvió a cortarse la terminal.
- **Lección:** Nunca matar procesos con patrones que coincidan con el propio comando.

### 2026-09-29 — El menú nativo del móvil tapa el botón ⊕ del banco de conceptos
- **Contexto:** Al seleccionar texto en el celular, el navegador muestra su propio menú (copiar / seleccionar todo) pegado a la selección, justo donde flotaba el ⊕.
- **Corrección aplicada:** con `(pointer: coarse)` el ⊕ y la tarjeta se anclan abajo de la pantalla (fuera del alcance del menú nativo); en escritorio sigue junto a la selección. En táctil el botón abre en `pointerdown` porque tocarlo puede colapsar la selección antes del `click`. Archivo: `components/reader/SelectionSave.tsx`.
- **Lección:** En móvil nunca poner controles pegados a una selección de texto; anclarlos a un borde de la pantalla.
