# Despliegue y operación (Fase 2)

> Guía en lenguaje simple para usar Nodos online, desde la computadora o el celular.
> Actualizada: 2026-09-23. Las decisiones detrás de cada punto están en `docs/10-decisiones-fase2.md`.

## 1. Qué quedó armado

| Pieza | Dónde | Para qué |
|---|---|---|
| **App online** | https://nodos-seven.vercel.app | La dirección para entrar desde cualquier dispositivo. |
| **Vercel**, proyecto `nodos` | cuenta de Vercel del dueño (junto a `consultapp`) | Publica la app. Plan gratis: admite hasta 200 proyectos. |
| **Supabase**, proyecto `nodos` (São Paulo) | organización `facund0`, junto a `consultori0` | Base de datos, cuentas y archivos. Plan gratis: 2 proyectos activos. |
| **Claude (Anthropic)** | falta crear la clave (paso 2) | Transcribe páginas escaneadas y divide los textos en nodos. |

La app y la base están en São Paulo (región más cercana a Uruguay/Argentina), así carga rápido.

## 2. Pasos que te tocan a vos (una sola vez, ~15 minutos)

Estos pasos no los puede hacer Claude Code por seguridad: son configuraciones de tus cuentas.

### Paso 1 — Supabase: que no pida confirmar el email (2 min)

El servicio de email gratuito de Supabase solo manda correos a direcciones autorizadas, y puede fallar. Como **solo tu email puede crear cuenta** (la base rechaza cualquier otro), la confirmación por email no agrega seguridad y conviene apagarla.

1. Entrá a https://supabase.com/dashboard y abrí el proyecto **nodos**.
2. Menú izquierdo: **Authentication** → **Sign In / Providers** (o "Providers").
3. En **Email**, apagá **Confirm email** y tocá **Save**.

*Cómo verificar:* en el paso 3, al crear la cuenta, entrás directo a la biblioteca sin esperar ningún email.

*(Opcional, 1 min más)* **Authentication → URL Configuration → Site URL**: pegá `https://nodos-seven.vercel.app` y guardá. Sirve si algún día usás "olvidé mi contraseña".

### Paso 2 — Clave de Claude (10 min)

1. Entrá a https://console.anthropic.com y creá una cuenta con tu email.
2. **Billing / Plans**: cargá crédito (con US$ 10 alcanza para empezar; ver costos en §4).
3. **API Keys** → **Create Key** → nombre `nodos` → copiá la clave (empieza con `sk-ant-`). Se muestra una sola vez.
4. Entrá a https://vercel.com → proyecto **nodos** → **Settings** → **Environment Variables**.
5. **Add**: nombre `ANTHROPIC_API_KEY`, valor = la clave, entornos: Production y Preview. Guardá.
6. Pestaña **Deployments** → en el primero de la lista, menú **⋯** → **Redeploy**. Esperá 2 minutos.

*Cómo verificar:* al subir un documento, la pantalla ya no muestra "Falta conectar Claude" y el botón **Procesar con IA** queda activo.

> 🔒 La clave es como una tarjeta de crédito: no la pegues en chats, emails ni en el repositorio. Vive solo en Vercel.

### Paso 3 — Crear tu cuenta en Nodos (1 min)

1. Abrí https://nodos-seven.vercel.app → **Entrar a la biblioteca**.
2. Pestaña **Primera vez** → tu email → una contraseña (mínimo 8 caracteres) → **Crear mi cuenta**.
3. Desde ahí, siempre **Ingresar** con ese email y contraseña.

### Paso 4 — Instalarla en el celular (1 min)

- **Android (Chrome):** abrí la dirección → menú **⋮** → **Agregar a la pantalla principal** (o "Instalar app").
- **iPhone (Safari):** abrí la dirección → botón **Compartir** (cuadrado con flecha) → **Agregar a inicio**.

Queda un ícono "Nodos" que abre la app a pantalla completa. La primera vez te pide ingresar (en iPhone la app instalada guarda su propia sesión).

## 3. Cómo se usa

1. **Biblioteca → Subir documento.** Formatos: PDF con texto, PDF escaneado, Word (.docx), EPUB y .txt. Hasta 50 MB.
2. **Índice gratis:** Nodos lee el archivo (sin IA, sin costo) y arma el índice con los títulos del libro. Cada parte muestra páginas, tiempo de lectura y **costo estimado**. Si el texto no tiene títulos, se divide en partes de unas 5.000 palabras; si es escaneado, en bloques de 10 páginas.
3. **Elegí qué leer:** marcá las partes que te interesan (por ejemplo: introducción, cap. 7 y cap. 12) y tocá **Preparar y empezar a leer**. Se prepara **solo la primera** (1–3 minutos); las demás quedan "en tu lista".
4. **Leé:** cuando te faltan 3 nodos para terminar lo preparado, la app prepara sola la siguiente parte de tu lista. Al final de lo elegido te ofrece "¿Seguimos con…?" (con su costo) o volver al índice para sumar otras partes. **Si dejás el libro, no se gasta en lo que no leíste.**
   - Mientras prepara, la pantalla queda encendida. Si la cerrás, se pausa y retoma sin volver a cobrar lo hecho.
   - **Preparar todo ahora** procesa toda tu lista de una vez (útil si vas a leer sin esperas).
5. **Artículos y textos breves** (hasta ~15.000 palabras): se leen como una sola pieza, sin índice; aparece directamente "Preparar y empezar a leer".
6. **Tus apuntes:** en cada nodo, la caja de abajo tiene un conmutador **Respuesta / Nota**. Se guarda solo mientras escribís (si no hay conexión, queda en el dispositivo y se sube después). Al terminar un capítulo aparece **Exportar apuntes del capítulo**; al final de lo preparado y en la pantalla del documento, **Exportar todos mis apuntes (PDF)**: preguntas y respuestas, notas y banco de conceptos con la frase del texto donde aparece cada uno.
7. **Escaneados:** si una parte se leía mal, la IA la reconstruye por contexto solo si es muy probable y la marca con subrayado discontinuo (tocala para ver la aclaración); si no se puede deducir, aparece **[ilegible]**. El índice muestra cuántas palabras se reconstruyeron en cada parte.
8. El lector recuerda en qué nodo quedaste de cada libro (en ese dispositivo). El ícono de libros arriba a la izquierda vuelve a la biblioteca; "índice y partes" en la biblioteca vuelve a la lista de partes.

### Qué hace Claude con tu texto

- **Nunca reescribe al autor.** Claude solo indica en qué párrafo empieza cada nodo, y la app corta el texto original. Además: título del nodo, hasta 3 términos de glosario y una pregunta de anclaje.
- **Páginas escaneadas:** Claude las "lee" como imagen y las transcribe literalmente (de a 5 páginas).
- Índices, créditos y bibliografía se omiten de los nodos. Los títulos del libro se ven como subtítulos y las notas al pie en letra más chica, debajo del párrafo donde aparecen.

## 4. Costos

| Concepto | Costo |
|---|---|
| Vercel, Supabase | US$ 0 (planes gratis) |
| Un capítulo típico (~8.000 palabras) con `claude-opus-5` | ~US$ 0,25 – 0,55 |
| Libro con texto de ~85.000 palabras (~210 págs.) completo, con `claude-opus-5` | ~US$ 2,5 – 5 |
| Mismo libro escaneado (transcripción + nodos) | ~US$ 8 – 17 |
| Con `claude-sonnet-5` (más económico) | ~40 % de lo anterior |

Como se procesa por partes, solo se paga lo que elegís leer. La app muestra la estimación de cada parte **antes** de gastar. Para usar el modelo más económico: en Vercel agregá la variable `CLAUDE_MODEL` = `claude-sonnet-5` y hacé **Redeploy** (paso 2.6). Se puede volver atrás borrando la variable.

## 5. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| "Supabase no pudo enviar el email de confirmación" | Hacé el paso 1 y volvé a tocar **Crear mi cuenta**. |
| "Este email no está habilitado" | Solo tu email está en la lista de acceso. Para sumar otro, pedíselo a Claude Code (ver §6). |
| "Falta conectar Claude" | Paso 2 (clave + Redeploy). |
| "La cuenta de Anthropic no tiene saldo" | Cargá crédito en console.anthropic.com y tocá **Reintentar**. |
| El proceso quedó "En pausa" | Abrí el documento desde la biblioteca: sigue solo. |
| Un PDF "no tiene texto" | Probablemente es escaneado con protección rara: probá exportarlo de nuevo a PDF. |

## 6. Referencia técnica (para agentes y desarrolladores)

- **Variables de entorno** (`.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (públicas por diseño; la seguridad la dan las reglas RLS), `ANTHROPIC_API_KEY` (secreta, solo servidor), `CLAUDE_MODEL` (opcional).
- **IDs:** Supabase `evgetytknfysnayrgjzi` (sa-east-1) · Vercel `prj_Iyp6VTyw5teBO8boQZX0Bpni1z1O` (team `consultorio11`, región `gru1` vía `vercel.json`).
- **Esquema:** `supabase/migrations/` (tablas `documents`, `document_pages`, `document_texts`, `chapters`, `nodes`; bucket privado `documents`). Aplicar migraciones nuevas con el MCP de Supabase (`apply_migration`) y guardarlas en esa carpeta.
- **Acceso:** tabla `public.allowed_emails` (no se lee desde la API) + trigger que bloquea registros de otros emails + RLS que exige dueño habilitado (`private.is_allowed_user()`). Sumar un email: `insert into public.allowed_emails (email) values ('...');`. El email del dueño no está en el repo a propósito.
- **Proceso por partes (docs/10 D12):** tabla `document_sections` (índice con estado `available`/`queued`/`processing`/`done`). `POST /api/documents/[id]/analyze` (sin IA, arma el índice), `POST .../queue` `{add, remove}` (lista del lector) y `POST .../step` `{section?}` (una unidad de trabajo ≤ 300 s sobre esa parte o la primera de la lista). Nodos y capítulos se ordenan por `start_position` = parte × 100000 + párrafo. El navegador llama a `step` en bucle; un candado (`lock_until`) evita pasos simultáneos. Código en `lib/ingest/` y `lib/ai/`.
- **Despliegues:** el proyecto de Vercel está conectado al repo. `master` = producción; otras ramas = vistas previas protegidas. La primera producción se creó desde la rama `claude/mobile-app-usage-us3sfw`; al mergear a `master` cada push publica solo.
