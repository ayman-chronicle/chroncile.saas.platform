# Doppler Setup — What You Need to Do

This checklist covers **your side** of the [Doppler integration](https://linear.app/chronicle-labs/project/doppler-integration-for-secrets-collaboration-0c9039d9e04b/overview). The repo is already configured (see root `doppler.yaml` and [doppler-integration-proposal.md](./doppler-integration-proposal.md)); you need to create the Doppler projects and secrets, then run the app with the CLI.

---

## 1. Doppler account and CLI

1. **Create or join the org**  
   Sign up at [doppler.com](https://www.doppler.com) and create an organization (e.g. **Chronicle Labs**) or get invited.

2. **Install the CLI** (macOS):
   ```bash
   brew install gnupg
   curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sudo sh
   ```
   Or: `brew install dopplerhq/cli/doppler`  
   See [Doppler CLI docs](https://docs.doppler.com/docs/cli) for other OS.

3. **Log in**:
   ```bash
   doppler login
   ```

---

## 2. Create projects and configs in the dashboard

In the [Doppler dashboard](https://dashboard.doppler.com), create **three projects** with configs `dev`, `staging`, and `prd` (or at least `dev` to start):

| Project name                     | Configs (min.) | Purpose                    |
|----------------------------------|----------------|----------------------------|
| **chronicle-platform-frontend** | dev, prd       | Next.js frontend (SaaS UI) |
| **chronicle-platform-backend**   | dev, prd       | Rust backend               |
| **chronicle-env-manager**        | dev, prd       | Env-manager (Fly/Vercel)   |

---

## 3. Add secrets per project

Use the **full env inventory** in [doppler-integration-proposal.md §3](./doppler-integration-proposal.md#3-full-env--secrets-inventory) and add the corresponding keys in each project’s config.

- **chronicle-platform-frontend**  
  §3.1 (shared: `AUTH_SECRET`, `SERVICE_SECRET`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_*`, Google, Pipedream, Stripe, Resend, etc.) + §3.4 (e.g. `NEXT_PUBLIC_INTERCOM_APP_ID`).  
  For `prd`, copy values from your current Vercel env.

- **chronicle-platform-backend**  
  §3.1 (same shared vars; `SERVICE_SECRET`, `AUTH_SECRET`, `ENCRYPTION_KEY` must match frontend) + §3.2 (backend-only: `BACKEND_MODE`, `API_HOST`, `API_PORT`, `RUST_LOG`, `RESEND_TEMPLATES_JSON`, `STRIPE_WEBHOOK_SECRET`, etc.).

- **chronicle-env-manager**  
  §3.3 (env-manager DB, Fly, Vercel, GitHub, `CRON_SECRET`, k6, Resend, per-env `SERVICE_SECRET_*`, etc.).

You can start with **dev** only and add **staging** / **prd** when you’re ready.

---

## 4. Wire the repo to Doppler (one-time)

From the **repo root**:

```bash
doppler setup --no-interactive
```

This uses the root `doppler.yaml` to associate:

- `apps/frontend` → **chronicle-platform-frontend** / **dev**
- `backend` → **chronicle-platform-backend** / **dev**
- `apps/env-manager` → **chronicle-env-manager** / **dev**

(If you prefer another config, run `doppler setup` in each app directory and choose project/config interactively.)

---

## 5. Run the apps with Doppler

No code changes are required; the apps already read from `process.env` / `std::env::var()`. Run them with the CLI so Doppler injects env:

**Frontend**

```bash
cd apps/frontend
doppler run -- yarn dev
```

**Backend (Rust)**

```bash
cd backend
doppler run -- cargo run --bin chronicle-backend
```

**Env-manager**

```bash
cd apps/env-manager
doppler run -- yarn dev
```

You can keep using a local `.env` for overrides; Doppler injects first, then your shell/env files. Prefer not committing `.env`; use Doppler as the source of truth.

---

## 6. Production (later)

- **Vercel (frontend / env-manager):** In Doppler, add the Vercel integration and sync the **prd** config to the right Vercel project(s). See proposal §6 and §7 Phase 3.
- **Fly.io (backend):** Sync **prd** to the Fly app via Doppler’s Fly integration, or run the container with `doppler run` and a service token in Fly secrets. See proposal §6.

---

## Quick reference

| I want to…                    | Command / action |
|------------------------------|-------------------|
| First-time setup             | `doppler login` → create projects & secrets in dashboard → `doppler setup --no-interactive` at repo root |
| Run frontend with secrets    | `cd apps/frontend && doppler run -- yarn dev` |
| Run backend with secrets     | `cd backend && doppler run -- cargo run --bin chronicle-backend` |
| Run env-manager with secrets | `cd apps/env-manager && doppler run -- yarn dev` |
| Use another config (e.g. prd)| In that app dir: `doppler setup` and select config, or `doppler run -c prd -- ...` |

For the full design, env list, and phased rollout, see [doppler-integration-proposal.md](./doppler-integration-proposal.md).
