# Kivvi ERP — Deployment Guide

**created_date**: 2026-06-18
**last_modified_date**: 2026-08-17
**last_modified_summary**: Production is Hetzner Postgres `kivvi` only. Neon / `USE_NEON` / neon.tech signup steps removed as live options.

Target audience: technical founder or DevOps engineer doing first deployment.

Production today is `kivvi.orangecat.ch` on Hetzner **bitbaum**. The database is Postgres **`kivvi`** on that box. Neon was decommissioned 2026-06-12. Do not sign up at neon.tech. Do not set `USE_NEON`. A laptop `.env.local` naming `neon.tech` is leftover garbage.

---

## Contents

1. [Prerequisites](#prerequisites)
2. [Option A: Self-hosted on Hetzner (production)](#option-a-self-hosted-on-hetzner-production)
3. [Option B: Docker + self-hosted PostgreSQL](#option-b-docker--self-hosted-postgresql)
4. [Option C: Railway or Render](#option-c-railway-or-render)
5. [Environment variables reference](#environment-variables-reference)
6. [Database setup](#database-setup)
7. [Post-deployment checklist](#post-deployment-checklist)
8. [Upgrading](#upgrading)

---

## Prerequisites

- **Node 20** and **pnpm 9** (local build) or Docker (container build)
- **PostgreSQL 14+** — self-hosted (production is Postgres 17 on Hetzner bitbaum, database `kivvi`). Neon is not used.
- **SMTP credentials** — Brevo free tier works (password resets, invoice emails)
- **At least one AI API key** — OpenRouter free tier, Anthropic, or OpenAI (AI command bar requires this; all other ERP features work without it)
- A domain name with DNS pointed at your deployment target

---

## Option A: Self-hosted on Hetzner (production)

This is how `kivvi.orangecat.ch` runs today: a build is produced, rsynced to the Hetzner box, and served by a persistent systemd-managed Node server behind Caddy (which terminates TLS). No serverless — a plain Node process with self-hosted PostgreSQL.

### 1. Provision PostgreSQL

Use a PostgreSQL 14+ instance (on the box or managed). Note its connection string — it becomes `DATABASE_URL`.

### 2. Run migrations

From your local machine or the box:

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```

This runs all Drizzle migrations. Do this once before the first deployment and after every upgrade with schema changes.

### 3. Build and deploy

Deployment is push-to-deploy from `main`: the build runs, the standalone output is rsynced to the box, and the systemd service is restarted. The Hetzner deploy tooling lives outside this repo; the manual equivalent is:

```bash
pnpm build --filter=@kivvi/web                     # produce the standalone build
rsync -a <build-output>/  <box>:/opt/kivvi/app/    # ship it to the box
ssh <box> 'sudo systemctl restart kivvi'           # restart the service
```

### 4. Environment variables

Set the variables from the [reference table](#environment-variables-reference) in the service's environment file on the box (e.g. `/opt/kivvi/app/.env`).

Minimum required set:

```
DATABASE_URL
NEXTAUTH_URL         # https://kivvi.orangecat.ch
NEXTAUTH_SECRET      # openssl rand -hex 32
CRON_SECRET          # openssl rand -hex 32
```

### 5. Reverse proxy (Caddy)

Caddy terminates TLS and proxies to the app on port 3000:

```caddyfile
kivvi.orangecat.ch {
    reverse_proxy localhost:3000
}
```

### 6. Cron jobs

There is no serverless cron. Schedule the `/api/cron/*` endpoints with system cron or systemd timers — see [Option B → schedule cron jobs](#6-schedule-cron-jobs):

| Cron path                      | Schedule    | What it does                     |
| ------------------------------ | ----------- | -------------------------------- |
| `/api/cron/recurring-invoices` | `0 6 * * *` | Generate due recurring invoices  |
| `/api/cron/dunning`            | `0 7 * * *` | Escalate overdue invoice dunning |
| `/api/cron/webhook-retry`      | `0 8 * * *` | Retry failed outbound webhooks   |

Cron endpoints are protected by `CRON_SECRET`, sent as an `Authorization: Bearer` header.

---

## DB driver selection

`createDb()` in `packages/database/src/index.ts` uses **postgres-js** (TCP pool, full ACID `db.transaction()`). That is what production on Hetzner uses.

`USE_NEON` is a leftover switch from before 2026-06-12. Leave it unset. Do not point `DATABASE_URL` at `neon.tech`.

---

## Staging Integration Runbook

Use this when rolling out the Kivvi ↔ revamp-it sync on staging before touching production.

### Scope

This runbook covers:

- Kivvi staging deploy on current `main`
- revamp-it staging deploy of PR `#206`
- webhook + API-token wiring
- forward-sync verification for intake create + edit

### Prerequisites

- Staging Kivvi domain
- Staging revamp-it domain
- Staging PostgreSQL access
- Access to Kivvi Settings for API tokens and webhooks
- Access to revamp-it staging environment variables

### Phase A — Wire the systems

#### A1. Deploy Kivvi staging

Deploy current `main`, then run the database step against the staging database:

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```

If your staging flow uses schema push instead of migrations:

```bash
DATABASE_URL="postgresql://..." pnpm db:push
```

**Verify:**

- The app boots successfully.
- The `api_idempotency_keys` table exists.
- The latest document, inventory, and accounting changes are present.

#### A2. Deploy revamp-it staging

Deploy revamp-it PR `#206` (`feat/kivvi-bidirectional-sync`) to staging.

Set these environment variables in revamp-it staging:

```bash
KIVVI_API_URL=https://<kivvi-staging-domain>
KIVVI_API_TOKEN=kv_...
KIVVI_DEFAULT_WAREHOUSE_ID=<staging-default-warehouse-id>
KIVVI_WEBHOOK_SECRET=<same-secret-configured-in-kivvi>
```

**Verify:**

- The staging app boots.
- `POST /api/webhooks/kivvi` fails closed without a valid signature.

#### A3. Configure Kivvi staging

In Kivvi staging:

1. Create an API token in `Settings → API Tokens`.
2. Add a webhook endpoint in `Settings → Webhooks`:
   - URL: `https://<revampit-staging-domain>/api/webhooks/kivvi`
   - Events: `inventory_item.updated`, `inventory_item.status_changed`
3. Copy the generated webhook secret into revamp-it as `KIVVI_WEBHOOK_SECRET`.
4. Set `KIVVI_DEFAULT_WAREHOUSE_ID` in revamp-it to the default warehouse for the staging tenant.

### Phase B — Forward-sync verification

#### B1. Intake create sync

Create one new revamp-it-owned item in revamp-it staging via the normal intake flow.

**Verify in Kivvi staging:**

- A new inventory item appears.
- Description matches.
- Status is `intake`.
- `askingPrice` matches revamp-it.

#### B2. Idempotency replay

Retry the same logical create with the same `Idempotency-Key`.

**Verify in Kivvi staging:**

- No duplicate inventory item is created.
- The same inventory item ID is returned/reused.

**Verify in logs/proxy if available:**

- Response includes `Idempotent-Replayed: true`.

#### B3. Edit sync

Edit the same revamp-it-owned item in revamp-it staging:

- Change price
- Change condition

**Verify in Kivvi staging:**

- The existing inventory item is updated in place.
- `askingPrice` reflects the new value.
- `condition` reflects the new value.
- No duplicate row is created.

### Known staging gap

Publishing an item for sale still does not automatically advance the Kivvi item from `intake` to `listed`.

Current workaround:

- either patch the Kivvi status manually during dogfooding
- or implement the status-on-publish follow-up described in `docs/SYSTEM_DESIGN.md`

### Exit criteria

Staging is ready to proceed to reverse sync and accounting verification only when all of the following are true:

- Kivvi staging is deployed on current `main`
- `api_idempotency_keys` exists in the staging database
- revamp-it staging is deployed with PR `#206`
- webhook secret matches on both sides
- API token works
- B1, B2, and B3 all pass with no duplicate items

---

## Option B: Docker + self-hosted PostgreSQL

Full control. Data stays on your servers. Works with any Linux VPS.

### 1. Provision a server

Recommended minimum: 2 vCPU, 2 GB RAM, 20 GB SSD.  
Ubuntu 22.04 LTS. Install Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Clone and configure

```bash
git clone https://github.com/revamp-it/kivvi.git
cd kivvi
cp apps/web/.env.example .env
```

Edit `.env` — at minimum set `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.

The `docker-compose.yml` at the repo root runs both `app` and `db` services. The `DATABASE_URL` for Docker Compose is:

```
DATABASE_URL=postgresql://kivvi:STRONG_PASSWORD@db:5432/kivvi
```

(`db` resolves to the PostgreSQL container inside the Docker network.)

### 3. Set a strong DB password

In `docker-compose.yml`, change the default `POSTGRES_PASSWORD: kivvi_dev` to a random password:

```bash
openssl rand -hex 20
```

Match it in `DATABASE_URL`.

### 4. Start services

```bash
docker compose up -d
```

The first start pulls images, initialises PostgreSQL, and starts the app. Migrations run automatically via the container entrypoint.

To verify:

```bash
docker compose ps
docker compose logs -f app
```

### 5. Configure a reverse proxy

The app listens on port 3000. Expose it via HTTPS using Caddy (simplest) or nginx.

**Caddy** (handles TLS automatically):

```caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo apt install caddy
caddy run --config Caddyfile
```

**nginx + Certbot**:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. Schedule cron jobs

Serverless cron is not available for self-hosted. Use system cron instead.

Add to `/etc/cron.d/kivvi`:

```cron
# Kivvi ERP cron jobs
# Replace YOUR_SECRET with the value of CRON_SECRET in your .env

0 6 * * * root curl -s -X POST -H "Authorization: Bearer YOUR_SECRET" https://your-domain.com/api/cron/recurring-invoices
0 7 * * * root curl -s -X POST -H "Authorization: Bearer YOUR_SECRET" https://your-domain.com/api/cron/dunning
0 8 * * * root curl -s -X POST -H "Authorization: Bearer YOUR_SECRET" https://your-domain.com/api/cron/webhook-retry
```

Or use a systemd timer — same effect, better logging.

### 7. Configure backups

Back up PostgreSQL daily. Minimal cron script:

```bash
#!/bin/bash
# /opt/kivvi-backup.sh
BACKUP_DIR=/var/backups/kivvi
mkdir -p "$BACKUP_DIR"
docker compose -f /path/to/kivvi/docker-compose.yml exec -T db \
  pg_dump -U kivvi kivvi | gzip > "$BACKUP_DIR/$(date +%Y%m%d-%H%M).sql.gz"

# Keep last 30 days
find "$BACKUP_DIR" -mtime +30 -delete
```

```cron
0 2 * * * root /opt/kivvi-backup.sh
```

Store backups off-server (S3, Backblaze B2, rsync to another machine). All company data lives in PostgreSQL — losing the database means losing everything.

---

## Option C: Railway or Render

Both platforms support Docker deployments from a GitHub repo with minimal setup.

### Railway

1. Create a new project → Deploy from GitHub → select the repo
2. Add a PostgreSQL service (Railway provides managed Postgres)
3. Set the `DATABASE_URL` variable — Railway injects it automatically if you link the Postgres service
4. Set remaining env vars (see reference table)
5. Configure the root directory to `apps/web` in service settings
6. Set the start command: `node apps/web/server.js` (matches the Dockerfile `CMD`)
7. For cron: Railway supports cron jobs as separate services — create one per endpoint

### Render

1. New Web Service → connect GitHub repo
2. Build command: `pnpm build --filter=@kivvi/web`
3. Start command: `node apps/web/server.js`
4. Add environment variables
5. Create a Render PostgreSQL database, copy the connection string to `DATABASE_URL`
6. For cron: Render Cron Jobs (paid) or use an external scheduler (cron-job.org, Zapier)

**DB driver note for Railway/Render**: These are persistent-server deployments. Leave `USE_NEON` unset (retired). postgres-js is the driver. Our actual production is Hetzner, not Railway.

---

## Environment variables reference

| Variable              | Required             | Description                                                          |
| --------------------- | -------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`        | Yes                  | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `NEXTAUTH_URL`        | Yes                  | Public HTTPS URL of the app (e.g. `https://app.kivvi.ch`)            |
| `NEXTAUTH_SECRET`     | Yes                  | Random secret, min 32 chars. Generate: `openssl rand -hex 32`        |
| `CRON_SECRET`         | Yes                  | Protects `/api/cron/*` endpoints. Any random string, min 32 chars    |
| `ANTHROPIC_API_KEY`   | At least one AI key  | Claude models                                                        |
| `OPENAI_API_KEY`      | At least one AI key  | GPT-4 models                                                         |
| `OPENROUTER_API_KEY`  | At least one AI key  | Multi-model access, has free tier                                    |
| `OLLAMA_BASE_URL`     | At least one AI key  | Self-hosted models, e.g. `http://localhost:11434`                    |
| `EMAIL_HOST`          | Yes (email features) | SMTP host (e.g. `smtp-relay.brevo.com`)                              |
| `EMAIL_PORT`          | Yes (email features) | SMTP port (587 for STARTTLS, 465 for SSL)                            |
| `EMAIL_SECURE`        | Yes (email features) | `false` for port 587, `true` for port 465                            |
| `EMAIL_USER`          | Yes (email features) | SMTP username                                                        |
| `EMAIL_PASS`          | Yes (email features) | SMTP password or API key                                             |
| `EMAIL_FROM`          | Yes (email features) | From address, e.g. `Kivvi <noreply@your-domain.com>`                 |
| `SENTRY_DSN`          | No                   | Sentry error tracking DSN                                            |
| `USE_NEON`            | No                   | Retired. Leave unset. Neon is not the database.                      |
| `DB_POOL_MAX`         | No                   | postgres-js pool size, default `10`                                  |
| `DB_IDLE_TIMEOUT`     | No                   | Connection idle timeout in seconds, default `20`                     |
| `DB_CONNECT_TIMEOUT`  | No                   | Connection timeout in seconds, default `10`                          |
| `NEXT_PUBLIC_APP_URL` | No                   | Set at build time only for absolute URL generation in emails         |

**Email without SMTP**: Password resets and invoice emails will silently fail. All other ERP functionality works. Configure email before go-live.

**AI without any key**: The AI command bar (Cmd+K) is disabled. All ERP features — invoices, contacts, inventory, accounting — work normally.

---

## Database setup

### Production PostgreSQL (Hetzner)

Live database is **`kivvi`** on bitbaum (`127.0.0.1:5432` on the box). Env SSOT is the box `.env`, not a laptop file. Neon was decommissioned 2026-06-12 — do not create a Neon project.

### Self-hosted PostgreSQL (Docker / local)

The Docker Compose setup runs PostgreSQL 16 Alpine. For production:

- Use a dedicated volume with regular backups (see [Option B — backups](#7-configure-backups))
- Do not expose port 5432 to the public internet (firewall rule)
- Set `POSTGRES_PASSWORD` to a strong random value before first start

For an external managed PostgreSQL (not our production — our production is the box):

1. Create a database named `kivvi`
2. Set `DATABASE_URL` to the connection string (include `?sslmode=require` for managed services)
3. Run `pnpm db:migrate` once from local or a migration job

### Migrations

Migrations live in `packages/database/src/migrations/`. They are generated by Drizzle Kit and must never be edited manually.

```bash
# Apply all pending migrations
pnpm db:migrate

# After changing packages/database/src/schema.ts:
pnpm db:generate   # generates new migration file
pnpm db:migrate    # applies it
```

Run `pnpm db:migrate` before first start and after every upgrade that includes schema changes.

---

## Post-deployment checklist

After the first deployment, before going live:

### Functional checks

- [ ] Open `https://your-domain.com/register` — create the first admin account
- [ ] Complete the 3-step onboarding wizard:
  - Step 1: Company name, address, VAT number (UID)
  - Step 2: Default VAT rate (8.1%), payment terms, bank IBAN
  - Step 3: "Start fresh" or upload Kivitendo CSV export
- [ ] Verify the dashboard loads with the sidebar and no console errors
- [ ] Create a test invoice and verify number sequence generates (`RE-2026-00001`)
- [ ] Send a test invoice by email — verify it arrives with the correct FROM address
- [ ] Verify the AI command bar (Cmd+K) responds (requires at least one AI key)
- [ ] **Intake → Items → Import** loads (`/intake/items/import`); upload `docs/fixtures/inventory-import-sample-10.csv` and confirm the review worklist appears
- [ ] **P2P API** (revamp-it integration): `POST /api/v1/marketplace/agency-sales` accepts a test payload with `Idempotency-Key` (see `docs/SYSTEM_DESIGN.md` §3.4)

### Security checks

- [ ] `NEXTAUTH_SECRET` is at least 32 random bytes, not committed to git
- [ ] `DATABASE_URL` password is strong and unique
- [ ] `CRON_SECRET` is set and not guessable
- [ ] HTTPS is enforced — HTTP requests redirect to HTTPS
- [ ] Port 5432 (PostgreSQL) is not publicly accessible
- [ ] Port 3000 (app) is not directly accessible — only via reverse proxy on 443

### Operational checks

- [ ] Cron jobs are configured and firing (check logs after scheduled times)
- [ ] Database backups are running and restorable (test a restore)
- [ ] Error tracking is configured (Sentry DSN set) or you have another log monitoring path

---

## Upgrading

### Self-hosted (Hetzner)

```bash
git pull
# If schema changed: run migrations against the database first
DATABASE_URL="..." pnpm db:migrate
# Push to main — the deploy hook builds, rsyncs to the box, and restarts the service
git push origin main
```

### Docker (self-hosted)

```bash
cd /path/to/kivvi
git pull
docker compose build app
# Run migrations before restarting (zero-downtime is not guaranteed across schema changes)
docker compose run --rm app pnpm db:migrate
docker compose up -d app
```

### Pre-upgrade steps

1. Read the release notes — schema changes require running `pnpm db:migrate`
2. Back up the database before any upgrade that includes migrations
3. Test in a staging environment first if possible

### Rollback

If something breaks after an upgrade:

```bash
# Docker: roll back to previous image
git stash
docker compose build app
docker compose up -d app
```

Database migrations cannot be rolled back automatically. Keep a pre-upgrade backup and restore it if a rollback is needed.

---

## Troubleshooting

**App won't start**  
Check logs: `docker compose logs app`, or `journalctl -u kivvi` for the systemd service. The most common cause is a missing or malformed `DATABASE_URL`.

**`DATABASE_URL` connection refused**  
On Docker Compose: verify the `db` service is healthy (`docker compose ps`). The hostname must be `db`, not `localhost`.

**Migrations fail**  
Ensure `DATABASE_URL` points to the correct database and the user has `CREATE TABLE` privileges. The database name in production is `kivvi` on Hetzner, not a cloud pooler.

**Password reset emails not arriving**  
Test SMTP credentials:

```bash
docker compose exec app node -e "
  const nodemailer = require('nodemailer');
  const t = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  t.verify().then(() => console.log('SMTP OK')).catch(console.error);
"
```

**Onboarding redirect loop**  
The `onboardingComplete` flag may be inconsistent. Check:

```bash
docker compose exec db psql -U kivvi kivvi \
  -c 'SELECT id, email, "onboardingComplete" FROM users;'
```

**Cron jobs not running (self-hosted)**  
Verify the `curl` commands return `200 OK`. Check the `Authorization: Bearer` header matches `CRON_SECRET`. Check that the domain resolves correctly from the server running cron.

**AI command bar returns no response**  
Verify at least one AI key is set and the API key is valid. Each provider can be tested independently by selecting it in the company settings.
