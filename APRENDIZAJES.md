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
