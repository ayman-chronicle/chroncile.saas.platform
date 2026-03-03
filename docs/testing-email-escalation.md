# Cómo probar la escalación por email (trace escalation)

Guía paso a paso para probar el flujo de "Request Review" por email y los enlaces View / Claim / Escalate.

---

## 1. Requisitos

- **Backend (Rust)** corriendo en el puerto que uses (por defecto `8080`).
- **Frontend (Next.js)** corriendo (por defecto `3000`).
- Sesión iniciada en el frontend (para que `tenantId` y auth existan).
- Opcional: **Resend** para recibir el correo real; si no, el backend puede enviar en modo "noop" y la petición sigue siendo correcta.

---

## 2. Variables de entorno

### Frontend (`.env` en la raíz o `apps/frontend/.env`)

```bash
# Obligatorias para el flujo
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

# Mismo valor que en el backend (para token-exchange; sin esto falla "Failed to exchange session for backend token")
SERVICE_SECRET=<mismo valor que en backend, ej. openssl rand -base64 32>

# Para que el backend pueda verificar los enlaces del email (mismo valor en backend)
ENCRYPTION_KEY=<64 caracteres hex o 44 base64>
```

### Backend (`.env` en la raíz o `backend/.env`)

```bash
# Mismo valor que en el frontend (el frontend lo usa para obtener el JWT del backend)
SERVICE_SECRET=<mismo valor que en frontend>

# Mismo valor que en el frontend (para verificar tokens de los enlaces)
ENCRYPTION_KEY=<mismo que arriba>

# Opcional: para enviar el correo real con Resend
RESEND_API_KEY=re_xxxx
# Opcional:
RESEND_FROM_ADDRESS="Chronicle Labs <noreply@tudominio.com>"
```

Si no pones `RESEND_API_KEY`, el backend sigue aceptando la petición y devuelve éxito pero no envía correo (NoopEmailService).

---

## 3. Arrancar backend y frontend

**Terminal 1 – Backend**

```bash
cd backend
cargo run --bin chronicle-backend
```

Espera a ver algo como: `Listening on http://0.0.0.0:8080`.

**Terminal 2 – Frontend**

```bash
# Desde la raíz del monorepo
yarn install
yarn workspace frontend dev
```

O desde `apps/frontend`: `yarn dev`.

Abre en el navegador: **http://localhost:3000** (o el puerto que uses).

---

## 4. Iniciar sesión

1. Ve a **http://localhost:3000/login** (o la ruta de login de tu app).
2. Inicia sesión con un usuario que tenga `tenantId` (por ejemplo el que use tu auth en desarrollo).
3. Sin sesión, las rutas de labeling devuelven 401.

---

## 5. Ir al dashboard de Labeling

1. En el menú o rutas, entra al **dashboard**.
2. Entra a la sección **Labeling** (por ejemplo **http://localhost:3000/dashboard/labeling**).
3. Deberías ver una lista de **traces** (datos de demo). Si no ves ninguno, revisa que el store esté seeded con `MOCK_TRACES` (ver nota al final).

---

## 6. Abrir un trace y el panel "Request Review"

1. Haz clic en **un trace** de la lista para abrir su detalle (p. ej. **/dashboard/labeling/[id]**).
2. En la página del trace, localiza el panel **"Request Review"** (recomendaciones de revisores).
3. Verás una lista de revisores sugeridos y, para cada uno, botones tipo **Slack** y **Email**.

---

## 7. Enviar la solicitud por Email

1. Elige un revisor (por ejemplo "Diana Patel" o "Marcus Rivera").
2. Haz clic en el botón **Email** (no en Slack).
3. La app llamará a `POST /api/labeling/notify` con `channel: "email"`.
4. El frontend construye el HTML del correo y hace **proxy** a `POST /api/platform/labeling/notify` en el backend.
5. Deberías ver que el botón pasa a estado "Sent" o similar y la respuesta es correcta (sin error en consola/network).

**Comprobar en el navegador**

- **DevTools → Network**: la petición a `/api/labeling/notify` debe ser **200** y la respuesta tener `success: true` y `channel: "email"`.
- Si el backend tiene `RESEND_API_KEY` configurado, el correo llegará al **email del revisor** (en los datos de demo, p. ej. `diana.patel@company.com`). Para pruebas, puedes usar un email tuyo temporal si cambias ese valor en `ORG_MEMBERS` en `lib/labeling/org.ts` (solo para dev).

---

## 8. Probar los enlaces del email (View / Claim / Escalate)

Si recibiste el correo (o quieres probar el flujo sin correo real), puedes simular los enlaces.

**Obtener un token de prueba**

- Opción A: Revisar el HTML del correo (en Resend o en logs si lo guardas) y copiar una de las URLs, p. ej.  
  `http://localhost:3000/api/email-actions/<token>`.
- Opción B: Generar un token manualmente en la consola del frontend (mismo secret que el backend). Ejemplo mínimo en Node:

```js
// Solo para dev: generar token "view" para un trace conocido
const crypto = require('crypto');
const payload = {
  action: 'view',
  traceId: '<id del trace que abriste>',
  escalationId: 'esc_test',
  toUserId: 'mgr_03',
  exp: Math.floor(Date.now()/1000) + 48*3600
};
const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
const sig = crypto.createHmac('sha256', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'))
  .update(payloadB64).digest('base64url');
const token = payloadB64 + '.' + sig;
console.log('http://localhost:3000/api/email-actions/' + token);
```

Sustituye `<id del trace que abriste>` por un id real (p. ej. el del trace en la URL al abrirlo).

**Probar en el navegador**

1. **View**  
   Abre:  
   `http://localhost:3000/api/email-actions/<token_view>`.  
   Debe redirigir a **/dashboard/labeling/{traceId}** (página del trace).

2. **Claim**  
   Abre un token con `action: "claim"`.  
   Debe redirigir a **/dashboard/labeling/{traceId}?claimed=1**.

3. **Escalate**  
   Abre un token con `action: "escalate"`.  
   Debe redirigir a **/dashboard/labeling/{traceId}?escalated=1**.

En los tres casos, la petición va a **GET /api/email-actions/[token]** en el frontend, que hace **proxy** al backend; el backend verifica el token y responde **302** con `Location` a la URL del trace. El frontend devuelve ese redirect al navegador.

---

## 9. Comprobar el backend

- **Logs del backend**: al hacer "Send Email" deberías ver la petición a `POST /api/platform/labeling/notify` y, si hay Resend, el envío.
- **Sin RESEND_API_KEY**: el backend sigue respondiendo 200 y el flujo funciona; solo no se envía correo real.

---

## 10. Errores frecuentes

| Síntoma | Qué revisar |
|--------|--------------|
| 401 en `/api/labeling/notify` | Sesión (auth) y que el usuario tenga `tenantId`. |
| "Failed to exchange session for backend token" | **SERVICE_SECRET** debe estar definido y ser **idéntico** en frontend y backend (`.env`). Generar con: `openssl rand -base64 32`. |
| 400 "toEmail is required" | El revisor elegido debe tener `email` en `ORG_MEMBERS` (frontend). |
| 404 "Trace not found" | Ese trace existe para tu `tenantId` (store con MOCK_TRACES y `ensureTenant`). |
| Redirect a `?error=invalid_or_expired_link` | Token expirado o `ENCRYPTION_KEY` distinta entre frontend y backend. |
| No llega el correo | Revisar `RESEND_API_KEY`, dominio/remitente y que el email del revisor en demo sea válido (o cambiarlo en `org.ts` para dev). |

---

**Nota sobre datos de demo:** El store de labeling se inicializa con `MOCK_TRACES` (tenantId `demo-tenant`). Para tu usuario, el store clona esos traces a tu `tenantId` la primera vez que listas; así deberías ver traces en **/dashboard/labeling** sin pasos extra.
