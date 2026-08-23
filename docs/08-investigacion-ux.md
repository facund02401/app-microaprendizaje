# Investigación UX/UI: Mejores Prácticas y Decisiones para Nodos

> Investigación complementaria a `docs/07-guia-diseno-ui.md`. La guía sigue siendo la fuente de verdad visual; este documento la valida con evidencia actual y define decisiones operativas para implementar.

## 1. Fuentes consultadas (síntesis)

| Fuente | Hallazgo principal relevante |
|---|---|
| Readwise Reader (docs + análisis de diseño) | La superficie de lectura debe "desaparecer": sin barras de acción visibles durante la lectura; interfaz revelada por hover o teclado. Keyboard-first habilita estados de flow. Vista "long-form" que oculta chrome innecesario. Controles de apariencia: tamaño, interlineado, ancho de línea. |
| Typography in Reading Apps (font.news, 2026) | Benchmarks: cuerpo 16–20px, 45–75 caracteres/línea, line-height 1.3–1.8. Separar tipografía de contenido vs UI. En modo oscuro los trazos se ven más pesados: ajustar tamaño/interlineado por tema. Tokens tipográficos en design system para evitar drift. Defaults actúan como "nudges". Evitar FOIT/FOUT con `font-display: swap` y fallbacks locales. |
| DAISY Reading Apps User Requirements (2025) | Modo "Zen"/interfaz simplificada como requisito. Usuario debe poder cambiar tipoface, peso, colores fondo/texto. Preferencias globales + por documento. Navegación clara con encabezados y cues consistentes. HTML semántico para lectores de pantalla. |
| Apple / WCAG accesibilidad | Contraste mínimo 4.5:1 texto normal, 3:1 elementos no-textuales (bordes, iconos). Verificar contraste en AMBOS modos. Focus indicators visibles en ambos temas. Nunca gris-sobre-negro demasiado bajo. |
| Dark Mode Accessibility (2026) | Evitar negro puro #000000 (halación con astigmatismo, afecta 30–60% de la población); usar grises oscuros suaves. Desaturar acentos sobre fondo oscuro. En dark, elevación por cambios tonales y bordes, no sombras. |
| ScholarPhi (CHI 2021) | Tooltips de definición DEBAJO del término, compactos (≤ medio ancho de columna, ≤4 líneas), minimizar oclusión del texto, cerrar con click/Esc, no distraer con definiciones ya visibles. |
| Inline Definition pattern (LeafyGreen/Stile/Soomo) | Término con subrayado punteado + `cursor: help`. Hover con delay ~200ms, foco por teclado, tap en touch. Semántica `<dfn>` + `aria-describedby`. Regla: máximo ~1 término definido por párrafo corto; si se necesitan 3+, mover a glosario lateral. |
| CtxRead (DTU 2025) | Al cambiar tipografía/tema, transiciones graduales preservan el contexto visual y reducen el tiempo de reubicación de lectura (mejor intervención evaluada). |
| Polaridad de contraste (Applied Ergonomics) | Ventaja de polaridad positiva (texto oscuro sobre claro) en legibilidad, especialmente en ambientes oscuros; el modo oscuro es preferencia legítima nocturna pero exige buen contraste. |

## 2. Validación de nuestra Guía de Diseño

La guía ya cumple la mayoría de los hallazgos:

- ✅ Paleta Tokyo Night usa grises oscuros (`#181825`/`#1E1E2E`), no negro puro → evita halación. Texto `#CDD6F4` sobre editor ≈ 12:1 de contraste (supera WCAG AAA).
- ✅ Ancho 60–68ch, 18–20px, line-height 1.7–1.85 → dentro de todos los benchmarks.
- ✅ Máx. 3 términos de glosario por sesión → coincide con la regla de carga cognitiva del glossing.
- ✅ Tipografía dual serif/UI+mono → patrón estándar de lectura apps.
- ✅ Sin botones flotantes ni distracciones → coincide con filosofía Reader/Zen.

## 3. Decisiones operativas para implementar (Nodos v1)

| # | Decisión | Detalle técnico |
|---|---|---|
| D1 | **Tokens por variables CSS** | Colores y tipografía como custom properties por tema (`[data-theme]`); Tailwind referencia los tokens. Cambiar un token ripples en toda la app. |
| D2 | **Glosario flotante estándar** | `<dfn>` con subrayado punteado + `cursor-help`; tooltip debajo del término, ancho ~320px, máx 4 líneas, flecha apuntando al término; abre con hover (200ms delay) y foco por teclado; cierra con Esc/click fuera; `aria-describedby`; nunca ocluye más de media columna. |
| D3 | **Teclado first-class** | ←/→ navega nodos, `s` alterna sidebar, `t` alterna tema, Tab visible con anillos de foco en ambos temas. |
| D4 | **Cambio de tema sin flash** | Script inline antes del paint lee localStorage y setea `data-theme`; transición CSS suave de colores (principio CtxRead). Default: Dark IDE/Tokyo Night. |
| D5 | **Ajustes dark-mode** | Acento desaturado `#89B4FA` solo para UI secundaria; elevación por bordes tonales (`#45475A`) no sombras; peso del texto de lectura 400 constante entre temas. |
| D6 | **Fuentes sin FOIT** | Serif de lectura desde fuentes de sistema (Charter→Georgia→serif stack) = cero descarga y cero flash; Inter y JetBrains Mono vía next/font con `display: swap` y fallbacks. |
| D7 | **Zen por defecto** | Sidebar colapsable con estado recordado; status bar mínima monoespaciada; nada flota sobre el texto; controles aparecen en hover de zona o por teclado. |
| D8 | **Accesibilidad base v1** | HTML semántico (nav/main/article/aside), `prefers-reduced-motion` respetado, contraste verificado en los 3 temas. Controles de tamaño de fuente personalizable quedan en backlog (post-MVP, requisito DAISY). |
| D9 | **Estados de nodo discretos** | ✓ completado · • en curso · 🔒 bloqueado, con `aria-label` descriptivo (no solo color/icono). |

## 4. Backlog accesorio (post-MVP, documentado para no perder)

- Control de tamaño de fuente e interlineado por usuario (DAISY).
- Fuente accesible opcional (Atkinson Hyperlegible / OpenDyslexic).
- Glosario consolidado por libro ("priming glossary", ScholarPhi).
- Resaltados cálidos estilo marcador físico (#FBDA83 etc.) si se agregan anotaciones.
- Scroll paginado opcional (paged scroll).
