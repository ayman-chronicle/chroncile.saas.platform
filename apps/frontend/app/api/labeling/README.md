# Labeling API (frontend)

Rutas bajo `/api/labeling/*` y flujo de **trace escalation por email**.

## Patrón del monorepo

- **Backend (Rust)** es la fuente de verdad: envía emails, guarda log de escalación, verifica tokens de acciones.
- **Frontend** solo: construye payload/HTML, hace **proxy** al backend y (para email-actions) devuelve el redirect.

## Rutas en el frontend

| Ruta | Método | Rol | ¿Necesaria? |
|------|--------|-----|-------------|
| `/api/labeling/notify` | POST | Recibe `memberId`, `traceId`, `channel`, `message`. Si `channel === "email"`: resuelve revisor y trace, construye resumen, genera tokens y HTML (React Email), luego **llama al backend** `POST /api/platform/labeling/notify` con ese payload. Para Slack solo reenvía el body al backend. | **Sí** — el cliente (ReviewerRecommendation) llama aquí. |
| `/api/email-actions/[token]` | GET | **Proxy**: hace `GET {BACKEND}/api/platform/email-actions/:token`. El backend verifica el token y responde 302; el frontend devuelve ese redirect. Los enlaces del email apuntan a esta URL (frontend) para no exponer la URL del backend. | **Sí** — sin ella los links del email no funcionarían. |

## Rutas que no viven aquí

- **Resend webhook**: `POST /api/webhooks/resend` existe como stub (501). El log de escalación está en el backend; cuando se implemente el webhook en Rust, Resend debe apuntar a la URL del backend.
- **Escalation log**: ya no hay store en el frontend; solo en el backend.

## Archivos de apoyo (frontend)

- `lib/email-templates/trace-escalation.tsx` — componente React Email para el cuerpo del correo.
- `lib/email-actions.ts` — creación de tokens firmados (HMAC) para los enlaces; el backend verifica con la misma clave (`ENCRYPTION_KEY`).
- `lib/labeling/notification-summary.ts` — construye el resumen del trace para el email y el payload al backend.
