# Cómo inicializar el proyecto Chronicle

Guía rápida para poner en marcha el monorepo (frontend Next.js + backend Rust).

---

## Requisitos

- **Node.js** ≥ 20.14.0
- **Yarn** 4.6.0 (o el que use el proyecto: `corepack enable && corepack prepare yarn@4.6.0 --activate`)
- **Rust** 1.75+ ([rustup](https://rustup.rs))
- **PostgreSQL** (opcional; solo si usas `DATABASE_URL` para el backend)

---

## 1. Clonar e instalar dependencias

```bash
cd chroncile.saas.platform   # o la ruta de tu repo
yarn install
```

---

## 2. Variables de entorno

### Opción A: Solo desarrollo local (sin base de datos)

Copia el ejemplo y ajusta si quieres:

```bash
cp .env.example .env
# Edita .env: NEXT_PUBLIC_BACKEND_URL debe apuntar al puerto del backend (ej. 8080)
```

Para el **backend Rust** puedes usar solo las variables por defecto (modo memoria). Si quieres configurarlo aparte:

```bash
cp backend/env.example backend/.env
# Opcional: edita backend/.env (API_PORT, RUST_LOG, etc.)
```

### Opción B: Con base de datos (SaaS completo)

1. Crea una base PostgreSQL (local o Supabase).
2. Copia y rellena el `.env` en la **raíz del repo**:

```bash
cp .env.example .env
```

En `.env` configura al menos:

- `DATABASE_URL` — conexión a Postgres (Supabase: usa el **pooler en puerto 6543**).
- `AUTH_SECRET` — mínimo 32 caracteres (ej: `openssl rand -base64 32`).
- `NEXT_PUBLIC_BACKEND_URL` — URL del backend (ej. `http://localhost:8080`).
- `NEXT_PUBLIC_APP_URL` — URL del frontend (ej. `http://localhost:3000`).

Opcional: Stripe, Google OAuth, Pipedream, etc. según la documentación del producto.

**Escalación por email (trace escalation):** para enviar notificaciones por correo desde el dashboard de labeling:

- `RESEND_API_KEY` — API key de Resend (ej. `re_xxxx`).
- `EMAIL_FROM` — Remitente (ej. `Chronicle Labs <noreply@notify.chronicle-labs.com>`).
- `RESEND_WEBHOOK_SECRET` — (opcional) Secret para verificar webhooks de Resend (delivery/opens/clicks).

Sin `RESEND_API_KEY`, el flujo de “Enviar por email” sigue funcionando en modo simulado (no se envía correo real).

---

## 3. Base de datos (si usas DATABASE_URL)

Con `DATABASE_URL` en `.env`, el backend aplica migraciones al arrancar. **Ejecuta el backend desde la carpeta `backend`** para que encuentre la carpeta `migrations`:

```bash
cd backend
cargo run --bin chronicle-backend
```

Las migraciones están en `backend/migrations/`. Si arrancas el binario desde otra ruta, puede que no se encuentren (el código busca `./migrations` respecto al directorio de trabajo).

---

## 4. Arrancar el backend (Rust)

Siempre desde la raíz del repo o desde `backend`:

```bash
# Desde la raíz del repo
cd backend && cargo run --bin chronicle-backend

# O ya dentro de backend/
cargo run --bin chronicle-backend
```

Por defecto:

- **Puerto:** 8080 (si en `.env` está `API_PORT=8080`) o 3000 (si usas `backend/.env` con `API_PORT=3000`).
- **Modo:** memoria (`BACKEND_MODE=memory`). No necesitas Kafka ni Postgres para probar.

El backend carga las variables desde `.env` en el directorio actual; si usas el `.env` de la raíz, arranca desde la raíz con `dotenvy` o pasa las variables (por ejemplo con `dotenv` en el comando).

Para cargar el `.env` de la raíz al ejecutar el backend:

```bash
cd backend
export $(grep -v '^#' ../.env | xargs) && cargo run --bin chronicle-backend
```

O copia/crea `backend/.env` con lo que necesite el backend (ver `backend/env.example`).

---

## 5. Arrancar el frontend (Next.js)

En **otra terminal**, desde la raíz del repo:

```bash
yarn dev
# o solo el frontend:
yarn dev:frontend
```

El frontend suele ir en **http://localhost:3000** y espera el backend en la URL que definas en `NEXT_PUBLIC_BACKEND_URL` (por ejemplo **http://localhost:8080**).

---

## Resumen de comandos

| Paso | Comando |
|------|--------|
| Dependencias | `yarn install` |
| Env | `cp .env.example .env` y editar |
| Backend | `cd backend && cargo run --bin chronicle-backend` |
| Frontend | `yarn dev` o `yarn dev:frontend` |

---

## Verificación

- **Backend:** `curl http://localhost:8080/health` (o el puerto que uses).
- **Frontend:** abrir `http://localhost:3000` en el navegador.

---

## Tests

```bash
# Tests Rust
yarn test:rust

# Tests Rust con Postgres (si tienes DB)
yarn test:rust-full

# Tests del frontend / E2E
yarn test:e2e
```

---

## Problemas frecuentes

1. **"migrations directory not found"**  
   Arranca el backend desde `backend/` para que exista `./migrations`.

2. **Frontend no conecta al backend**  
   Revisa `NEXT_PUBLIC_BACKEND_URL` en `.env` (ej. `http://localhost:8080`).

3. **Puerto en uso**  
   Cambia `API_PORT` (backend) o el puerto de Next.js en el script `dev` del frontend.

4. **Rust no encontrado**  
   Instala con `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` y reinicia la terminal.
