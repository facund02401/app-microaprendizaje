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
