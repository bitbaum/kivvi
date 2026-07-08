# Kivvi ERP — Deployment Guide

**created_date**: 2026-06-18
**last_modified_date**: 2026-07-08
**last_modified_summary**: Documented post-deploy verification for smart inventory import (`/intake/items/import`) and P2P marketplace API (`/api/v1/marketplace/agency-sales`, `/payouts`).

Target audience: technical founder or DevOps engineer doing first deployment.

---

## Contents

1. [Prerequisites](#prerequisites)
2. [Option A: Vercel + Neon (recommended)](#option-a-vercel--neon-recommended)
3. [Option B: Docker + self-hosted PostgreSQL](#option-b-docker--self-hosted-postgresql)
4. [Option C: Railway or Render](#option-c-railway-or-render)
5. [Environment variables reference](#environment-variables-reference)
6. [Database setup](#database-setup)
7. [Post-deployment checklist](#post-deployment-checklist)
8. [Upgrading](#upgrading)

---

## Prerequisites

- **Node 20** and **pnpm 9** (local build) or Docker (container build)
- **PostgreSQL 14+** — Neon serverless or self-hosted
- **SMTP credentials** — Brevo free tier works (password resets, invoice emails)
- **At least one AI API key** — OpenRouter free tier, Anthropic, or OpenAI (AI command bar requires this; all other ERP features work without it)
- A domain name with DNS pointed at your deployment target

---

## Option A: Vercel + Neon (recommended)

Fastest path. Zero server management. Scales to zero when idle.

### 1. Create a Neon database

Go to [neon.tech](https://neon.tech), create a project in your preferred region (Frankfurt for Swiss data). Copy the **connection string** — it looks like:

```
postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### 2. Run migrations against Neon

From your local machine:

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```

This runs all Drizzle migrations against the Neon database. Do this once before the first deployment and after every upgrade.

### 3. Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# From repo root
vercel
```

Or connect the GitHub repo via the Vercel dashboard (Settings → Git → Import Repository).

### 4. Set environment variables in Vercel

In the Vercel dashboard → Project → Settings → Environment Variables, add all variables from the [reference table](#environment-variables-reference) below.

Minimum required set:

```
DATABASE_URL
NEXTAUTH_URL         # https://your-domain.vercel.app or custom domain
NEXTAUTH_SECRET      # openssl rand -hex 32
```

### 5. Add `vercel.json` to the repo root (already present)

The `apps/web/vercel.json` configures cron jobs. Vercel picks it up automatically:

| Cron path                      | Schedule    | What it does                     |
| ------------------------------ | ----------- | -------------------------------- |
| `/api/cron/recurring-invoices` | `0 6 * * *` | Generate due recurring invoices  |
| `/api/cron/dunning`            | `0 7 * * *` | Escalate overdue invoice dunning |
| `/api/cron/webhook-retry`      | `0 8 * * *` | Retry failed outbound webhooks   |

Cron endpoints are protected by `CRON_SECRET`. Set it in Vercel env vars and Vercel will include it automatically in cron requests.

### 6. Set the root directory

In Vercel project settings → General → Root Directory, set to `apps/web`. Vercel builds from there.

### 7. Configure custom domain

Vercel Dashboard → Domains → Add your domain. Update DNS as instructed.

---

## DB driver selection

`createDb()` in `packages/database/src/index.ts` picks the driver from the environment:

- **Self-hosted / persistent server (default)**: `postgres-js` with connection pooling and full ACID `db.transaction()` support. This is what our hosted production (self-hosted Postgres on a Hetzner box) uses.
- **Serverless (`VERCEL=1` or `USE_NEON=true`)**: the Neon **WebSocket** driver (`drizzle-orm/neon-serverless`), which also supports native ACID transactions. Single pool queries are routed via HTTPS fetch (`neonConfig.poolQueryViaFetch`) to avoid a webpack `ws` bundling issue.

No configuration is required — set `USE_NEON=true` only if you deploy to a serverless host that needs the Neon driver but does not set `VERCEL`.

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

Vercel Cron is not available for self-hosted. Use system cron instead.

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

**DB driver note for Railway/Render**: These are persistent-server deployments, not serverless. The `VERCEL` env var is not set, so the app correctly uses the postgres-js driver with connection pooling and full ACID transaction support.

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
| `USE_NEON`            | No                   | Set to `true` to force Neon HTTP driver outside Vercel               |
| `DB_POOL_MAX`         | No                   | postgres-js pool size, default `10`                                  |
| `DB_IDLE_TIMEOUT`     | No                   | Connection idle timeout in seconds, default `20`                     |
| `DB_CONNECT_TIMEOUT`  | No                   | Connection timeout in seconds, default `10`                          |
| `NEXT_PUBLIC_APP_URL` | No                   | Set at build time only for absolute URL generation in emails         |

**Email without SMTP**: Password resets and invoice emails will silently fail. All other ERP functionality works. Configure email before go-live.

**AI without any key**: The AI command bar (Cmd+K) is disabled. All ERP features — invoices, contacts, inventory, accounting — work normally.

---

## Database setup

### Neon (serverless, for Vercel)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project — choose the region closest to your users (Frankfurt = `eu-central-1` for Switzerland)
3. Copy the connection string from the dashboard (include `?sslmode=require`)
4. Run migrations: `DATABASE_URL="..." pnpm db:migrate`
5. Use this connection string as `DATABASE_URL` in your deployment

Neon free tier: 0.5 GB storage, 1 project. Sufficient for small deployments.

### Self-hosted PostgreSQL

The Docker Compose setup runs PostgreSQL 16 Alpine. For production:

- Use a dedicated volume with regular backups (see [Option B — backups](#7-configure-backups))
- Do not expose port 5432 to the public internet (firewall rule)
- Set `POSTGRES_PASSWORD` to a strong random value before first start

For an external managed PostgreSQL (DigitalOcean, Hetzner, Supabase):

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

### Vercel

```bash
git pull
# If schema changed: run migrations against the database first
DATABASE_URL="..." pnpm db:migrate
# Push to main branch — Vercel auto-deploys
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
Check logs: `docker compose logs app` or Vercel function logs. The most common cause is a missing or malformed `DATABASE_URL`.

**`DATABASE_URL` connection refused**  
On Docker Compose: verify the `db` service is healthy (`docker compose ps`). The hostname must be `db`, not `localhost`.

**Migrations fail**  
Ensure `DATABASE_URL` points to the correct database and the user has `CREATE TABLE` privileges. On Neon, check the database name matches the connection string.

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
