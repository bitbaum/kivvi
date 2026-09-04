# Self-Hosting Kivvi

Kivvi is MIT-licensed and designed to run on your own infrastructure. This guide covers production deployment on a Linux server using Docker: the repo's `docker-compose.yml` provides PostgreSQL (and an optional Ollama service), and the app image is built from the root `Dockerfile`.

---

## Prerequisites

- Linux server (Ubuntu 22.04 LTS recommended)
- Docker 24+ and Docker Compose v2
- A domain name with DNS pointing to your server
- SMTP credentials for transactional email (password resets)

---

## Quick Start

```bash
git clone https://github.com/bitbaum/kivvi.git
cd kivvi
cp .env.example .env
# Edit .env — see Environment Variables section below
docker compose up -d postgres        # PostgreSQL 16
pnpm install && pnpm db:migrate      # migrations are manual (Node 20 + pnpm 9)
docker build -t kivvi .              # build the app image
docker run -d --name kivvi-app --network kivvi_default \
  --env-file .env -p 3000:3000 kivvi
```

The app will be available on port 3000. Put a reverse proxy (nginx, Caddy) in front for HTTPS.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in every value. Required variables:

### Database

```env
DATABASE_URL=postgresql://kivvi:STRONG_PASSWORD@postgres:5432/kivvi
```

Use a strong, random password. The `postgres` hostname refers to the PostgreSQL service in `docker-compose.yml` (use `localhost` when connecting from the host, e.g. for `pnpm db:migrate`).

### Authentication

```env
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<64 random hex chars>
```

Generate `NEXTAUTH_SECRET` with:

```bash
openssl rand -hex 32
```

### Email (required for password resets)

```env
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@your-domain.com
EMAIL_PASS=your-smtp-password
EMAIL_FROM=Kivvi <noreply@your-domain.com>
```

Without these, the app runs but users cannot reset their passwords.

### AI features (optional — at least one required for AI command bar)

```env
# Groq (free tier, first in the fallback chain)
GROQ_API_KEY=gsk_...

# xAI Grok (free tier)
XAI_API_KEY=xai-...

# OpenRouter (multi-model, free models by default)
OPENROUTER_API_KEY=sk-or-...

# Ollama (self-hosted, no API key)
OLLAMA_BASE_URL=http://ollama:11434

# Anthropic Claude (paid — used as fallback only when ALLOW_PAID_AI is set)
ANTHROPIC_API_KEY=sk-ant-...
```

If no AI key is set, the AI command bar is disabled; all other ERP features work normally.

---

## Docker Compose

The included `docker-compose.yml` runs:

| Service    | Description                                        |
| ---------- | -------------------------------------------------- |
| `postgres` | PostgreSQL 16 (port 5432)                          |
| `ollama`   | Optional self-hosted AI (behind the `ai` profile)  |

The Next.js app itself is not a compose service — build it from the root `Dockerfile` and run it with `docker run` (see Quick Start).

```bash
# Start the database
docker compose up -d postgres

# View logs
docker compose logs -f postgres
docker logs -f kivvi-app

# Stop
docker compose down

# Stop and remove data volumes (destructive!)
docker compose down -v
```

---

## Database Migrations

Migrations do not run automatically — run them from the checkout (Node 20 + pnpm 9) before the first start and after every upgrade with schema changes:

```bash
DATABASE_URL="postgresql://kivvi:STRONG_PASSWORD@localhost:5432/kivvi" pnpm db:migrate
```

**Never edit existing migration files.** Always create new ones:

```bash
pnpm db:generate   # after editing packages/database/src/schema.ts
```

---

## Initial Setup

After the first `docker compose up`:

1. Open `https://your-domain.com/register`
2. Create your admin account
3. Complete the 3-step onboarding wizard:
   - **Step 1**: Company name, address, VAT number
   - **Step 2**: Default VAT rate, payment terms, bank IBAN
   - **Step 3**: "Start fresh" or upload a Kivitendo CSV export

The onboarding wizard seeds the 139-account Swiss KMU Kontenrahmen, all number sequences, and a default warehouse automatically.

---

## Reverse Proxy (Caddy)

Caddy is the simplest option — it handles HTTPS automatically:

```caddy
your-domain.com {
  reverse_proxy localhost:3000
}
```

```bash
caddy run --config Caddyfile
```

### nginx alternative

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

---

## Backups

Back up the PostgreSQL database regularly. With Docker Compose:

```bash
# Dump
docker compose exec postgres pg_dump -U kivvi kivvi > backup-$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U kivvi kivvi < backup-20260101.sql
```

Automate with cron:

```cron
0 2 * * * cd /path/to/kivvi && docker compose exec -T postgres pg_dump -U kivvi kivvi | gzip > /var/backups/kivvi-$(date +\%Y\%m\%d).sql.gz
```

Store backups off-server (S3, Backblaze B2, etc.). The database contains all company data — losing it means losing everything.

---

## Upgrading

```bash
git pull
DATABASE_URL="postgresql://kivvi:STRONG_PASSWORD@localhost:5432/kivvi" pnpm db:migrate
docker build -t kivvi .
docker rm -f kivvi-app
docker run -d --name kivvi-app --network kivvi_default --env-file .env -p 3000:3000 kivvi
```

Run migrations before restarting the app. Always read the release notes before upgrading across major versions.

---

## Multi-Tenant vs Single-Tenant

Kivvi is multi-tenant by design. One instance can serve multiple companies — each with complete data isolation enforced at the database level (`companyId` on every row).

For a single company, this doesn't change anything. You still use the same setup; you just have one company in the database.

---

## Troubleshooting

### App won't start

```bash
docker logs kivvi-app
```

Check for missing environment variables or database connection errors.

### Database connection refused

```bash
docker compose ps   # is the postgres service running?
docker compose logs postgres
```

### Password reset emails not arriving

Verify `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` are set. Test SMTP credentials with:

```bash
docker exec kivvi-app node -e "
  const nodemailer = require('nodemailer');
  const t = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  t.verify().then(() => console.log('SMTP OK')).catch(console.error);
"
```

### Onboarding redirect loop

If you're stuck in the onboarding redirect, the `onboardingComplete` flag on your user record may be mismatched. Check:

```bash
docker compose exec postgres psql -U kivvi kivvi -c "SELECT id, email, \"onboardingComplete\" FROM users;"
```

---

## Security Checklist

Before going live:

- [ ] `NEXTAUTH_SECRET` is 32+ random bytes, never committed to git
- [ ] `DATABASE_URL` password is strong and unique
- [ ] HTTPS is enforced (redirect HTTP → HTTPS in your reverse proxy)
- [ ] Server firewall only exposes ports 80 and 443 (not 3000 or 5432 directly)
- [ ] Regular database backups are configured and tested
- [ ] Docker images are kept up to date (`docker compose pull`)

---

## CAMT Bank Statement Import

Kivvi supports importing bank statements in the CAMT.053 format (ISO 20022), which is the standard electronic account statement format used by Swiss banks.

### Supported Banks

All major Swiss banks that offer e-banking export CAMT.053 files:

- **PostFinance** — "Kontoauszug herunterladen" → XML / CAMT.053
- **UBS** — "Kontoauszug" → ISO-Zahlungsdatei / CAMT.053
- **Raiffeisen** — "Umsatzübersicht" → CAMT.053 XML
- **Credit Suisse / UBS** — Statement export in ISO 20022 format
- Any bank compliant with the Swiss implementation of ISO 20022

### Exporting from Your Bank

The exact steps vary by bank, but the general flow is:

1. Log into your bank's e-banking portal
2. Navigate to your account statements or transaction history
3. Select the date range you want to import
4. Choose the export format — look for **CAMT.053**, **ISO 20022**, or **XML**
5. Download the file (usually a `.xml` file, sometimes `.zip` containing multiple XML files)

### Importing in Kivvi

1. Go to **Banking** in the left sidebar
2. Select the bank account you want to reconcile
3. Click **Transaktionen importieren** (Import transactions)
4. Upload the CAMT.053 XML file
5. Review the preview — Kivvi shows the transactions before committing
6. Confirm the import

### What Gets Imported

Each transaction in the CAMT file is imported as a bank transaction record:

| Field            | Source in CAMT                              |
| ---------------- | ------------------------------------------- |
| Date             | Booking date (`<BookgDt>`)                  |
| Value date       | Value date (`<ValDt>`)                      |
| Amount           | `<Amt>` with currency                       |
| Description      | Remittance information / unstructured text  |
| Reference number | `<Ref>` or structured creditor reference    |
| Counterparty     | Debtor/creditor name and IBAN where present |

### Automatic Payment Matching

Kivvi automatically matches imported transactions to open invoices using the **QR reference number** (Swiss QR-Rechnung). When a customer pays an invoice generated by Kivvi and their bank includes the QR reference in the payment, the import will:

1. Detect the reference in the CAMT transaction
2. Find the matching open invoice
3. Mark the transaction as reconciled
4. Record the payment against the invoice
5. Update the invoice status to `paid` or `partially_paid`

Transactions without a matching reference are imported as unreconciled and can be matched manually from the Banking view.

### Duplicate Prevention

Importing the same CAMT file twice is safe — Kivvi uses the bank transaction ID from the CAMT file as an idempotency key. Duplicate transactions are silently skipped.

---

## Getting Help

- **Issues**: Open a GitHub issue at the project repository
- **Email**: Contact the maintainers at the address in the Impressum
- **Self-hosting is community-supported** — we run the managed version ourselves, but we're happy to help with reasonable self-hosting questions
