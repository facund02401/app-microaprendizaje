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

### 2026-08-23 — La emulación móvil de DevTools no reproduce la selección nativa
- **Contexto:** Prueba del prototipo selección→⊕ en el simulador de teléfono del navegador.
- **Error:** Arrastrar en modo dispositivo no selecciona texto, dando la impresión de que la función está rota en móvil.
- **Corrección:** Es una limitación del simulador: traduce el arrastre a scroll táctil, pero la selección real en celulares viene del long-press nativo, que la emulación no reproduce. Verificar con ventana angosta (<768px, layout móvil + mouse real) o con el teléfono físico vía LAN.
- **Lección:** El device-mode de Chrome sirve para layout/tamaños, NO para gestos nativos (long-press, selección, teclado virtual); esas interacciones se prueban en hardware real.
