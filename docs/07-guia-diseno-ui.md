# Guía de Sistema de Diseño UI/UX y Tipografía Cognitiva: Nodos

> Fuente: `docs/original/Guia de diseño.pdf`
> Este documento define la dirección de arte, la ergonomía visual y el sistema de diseño. Combina la estética minimalista de un editor de código (VS Code / Zen Mode) con hallazgos de las ciencias cognitivas sobre tipografía y retención en pantallas de escritorio.

## 1. La Filosofía Visual: "IDE para el Pensamiento Teórico"

Trasladar la sensación de foco, orden estructural y sobriedad de un entorno de desarrollo (VS Code) a un e-reader de alta densidad conceptual.

```
┌───────────────────────────────────────────────────────────────────────┐
│ [≡] Libros / Seminarios > Seminario 11 > Nodo 04: La Pulsión   [Tema 🌙]│
├──────────┬────────────────────────────────────────────────────────────┤
│ NODOS    │                                            │
│ ├─ Cap 1 │   4. LA DISTINCIÓN ENTRE TRIEB E INSTINKT  │
│ │  ├─ 01 │                                            │
│ │  ├─ 02 │   La pulsión no es el instinto...          │
│ │  ├─ 03 │                                            │
│ │  └─ 04*│   [💡 Trieb: Fuerza constante que emana...]│
│ ├─ Cap 2 │                                            │
│ └─ Cap 3 │   Escribe o dicta tu articulación clínica: │
│          │   [                                    ] [🎙]│
├──────────┴────────────────────────────────────────────────────────────┤
│ 🟢 Nodo 4/18  │  ⏱ 6 min  │  📖 Seminario 11  │  Tokens: 380         │
└───────────────────────────────────────────────────────────────────────┘
```

### Principios de Distribución Espacial (Layout inspirado en VS Code)

1. **Sidebar Izquierdo Retráctil (Explorador de Nodos):**
   - Árbol jerárquico tipo archivos/carpetas: Libro → Capítulo → Nodo.
   - Estado del nodo con iconos discretos: completado ( ✓ ), en curso ( • ), bloqueado ( 🔒 ).
2. **Área Central de Lectura ("Editor Canvas"):**
   - Panel limpio, centrado, ancho de columna estrictamente controlado (60–70ch).
   - Sin barras de desplazamiento llamativas ni botones flotantes que tapen el texto.
3. **Barra de Estado Inferior ("Status Bar"):**
   - Estilo terminal/IDE al pie, tipografía monoespaciada pequeña.
   - Muestra progreso del libro, tiempo estimado de la micro-dosis e indicador de sincronización.
4. **Header de Navegación ("Breadcrumbs"):**
   - Migas de pan superiores que ubican al lector en la genealogía del texto.

## 2. Investigación Científica sobre Tipografía y Memorización

### 2.1 La Falsa Promesa de la "Dificultad Deseable" en Tipografía

- Se popularizó la idea de que tipografías "difíciles" (Sans Forgetica) mejoran la memoria forzando reconstrucción de caracteres.
- Meta-análisis recientes (Geller et al., 2021; DiMandando et al., 2020) demuestran:
  - La disfluencia visual solo funciona en textos muy breves y simples.
  - Con alta densidad conceptual intrínseca (seminario de Lacan, ensayo filosófico), agregar disfluencia causa **sobrecarga extránea** y reduce comprensión.
- **Conclusión aplicada:** para textos de alta complejidad, tipografía del cuerpo de **mínima fricción perceptiva** (alta legibilidad); el 100% de la capacidad se destina a la comprensión conceptual.

### 2.2 Elección del Par Tipográfico (Serif Humanista + Monospace/Sans UI)

Sistema dual de fuentes:

**A. Cuerpo de lectura — Serif humanista de transición**
- Fuentes: `Charter`, `Merriweather`, `Georgia`, `Source Serif Pro`.
- Las serifas dan línea de base visual continua que guía el movimiento sacádico.
- Alta "altura de x" (x-height) y contraste de trazo moderado → menos fatiga ocular.

**B. Interfaz, glosarios y código — Monoespaciada / Sans humanista**
- UI: `Inter` o `system-ui`.
- Código/Status bar: `JetBrains Mono`, `Fira Code`, `Cascadia Code`.
- El contraste Serif (pensamiento orgánico) vs Mono (metadatos técnicos) separa contenido de herramienta.

## 3. Especificaciones Visuales y Ergonomía Digital

### Métrica Tipográfica Óptima

| Parámetro | Valor recomendado | Justificación cognitiva |
|---|---|---|
| Ancho de línea (measure) | 60ch–68ch (≈650–720px) | Evita fatiga del retorno sacádico |
| Tamaño fuente principal | 18px–20px (1.125rem–1.25rem) | Reduce esfuerzo de acomodación del cristalino a 60–80cm |

> **Ajuste v1.1 (decisión del dueño):** además del default 19px dentro del rango
> anterior, la app ofrece un control de tamaño (botón "Aa") con presets
> **16 · 18 · 19 · 20 · 22 · 24 px**, persistente en localStorage (`nodos-font-size`)
> y aplicado antes del primer paint vía variable CSS `--reading-fs` (sin flash).
> El piso de 16px evita el zoom automático de iOS al enfocar campos de texto;
> el techo de 24px preserva la métrica de ancho en `ch`. Accesibilidad WCAG 1.4.4.
| Interlineado (line-height) | 1.7–1.85 | Previene "fusión de renglones" en lectura concentrada |
| Espaciado de párrafo | 1.5em | Reemplaza sangría por espacio claro entre unidades discursivas |

## 4. Paleta de Color y Temas (Atmósferas de Lectura)

Se evita el contraste extremo (negro puro sobre blanco puro). Temas inspirados en esquemas de VS Code (Solarized Light, Gruvbox, Tokyo Night).

### Tema 1: Dark IDE / Zen Night *(predeterminado — decisión del proyecto)*

| Rol | Color |
|---|---|
| Fondo principal (`bg`) | `#1E1E2E` (Tokyo Night) |
| Fondo del editor (`editor-bg`) | `#181825` |
| Texto principal (`text`) | `#CDD6F4` |
| Texto secundario / acentos | `#89B4FA` (azul pastel tenue) |
| Glosario / Tooltip | `#313244` con borde `#45475A` |

### Tema 2: Paper Sepia (lectura diurna relajante)

| Rol | Color |
|---|---|
| Fondo principal (`bg`) | `#F4EFEA` (pergamino cálido) |
| Fondo del editor (`editor-bg`) | `#FAF7F2` |
| Texto principal (`text`) | `#2D2B2A` (carbón muy oscuro) |
| Acentos / links | `#8C4A2B` (terracota tenue) |

### Tema 3: Minimal Light (estilo editor claro)

| Rol | Color |
|---|---|
| Fondo principal (`bg`) | `#F8F9FA` |
| Fondo del editor (`editor-bg`) | `#FFFFFF` |
| Texto principal (`text`) | `#1F2328` |
| Bordes / UI | `#D0D7DE` |

## 5. Reglas de Componentes en Tailwind CSS

### Configuración de Tailwind (`tailwind.config.js`)

```js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        serif: ['Charter', 'Merriweather', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        reader: {
          darkBg: '#181825',
          darkText: '#CDD6F4',
          sepiaBg: '#FAF7F2',
          sepiaText: '#2D2B2A',
        }
      }
    },
  },
}
```

### Clase de estilo para el editor de lectura

```jsx
{/* v1.1: tamaño ajustable vía variable CSS --reading-fs (control Aa en header).
    El interlineado unitless y el ancho en ch se adaptan automáticamente. */}
<article className="max-w-[65ch] mx-auto font-serif text-[length:var(--reading-fs,19px)] leading-[1.8]">
  {/* Texto del nodo */}
</article>
```

## Notas de reconciliación entre documentos

- *Bases Cognitivas* propone crema `#FAF8F5` + texto `#1A1A1A` y noche `#121212`/`#E0E0E0`.
- Esta guía (más específica y posterior) define las tres paletas exactas anteriores.
- **Decisión:** esta guía es la fuente de verdad para colores; los principios de ergonomía de Bases Cognitivas siguen vigentes (contraste suave WCAG AAA, sin negro/blanco puros).
