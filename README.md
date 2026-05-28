<div align="center">

# Kivvi

**The ERP that knows things have a history.**

The operating system for the circular economy. Built for businesses that sell used, donated, and refurbished goods — refurbishers, Brockenhäuser, repair workshops, vintage shops.

[![CI](https://github.com/g-but/kivvi/actions/workflows/ci.yml/badge.svg)](https://github.com/g-but/kivvi/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Made in Switzerland](https://img.shields.io/badge/Made%20in-Switzerland-D52B1E.svg)](https://revampit.ch)

[**Live demo**](https://kivvi.vercel.app) · [**Product brief**](PRODUCT.md) · [**Docs**](docs/) · [**Architecture**](#architecture)

![Kivvi landing](docs/screenshots/landing-desktop.png)

</div>

---

## Why Kivvi exists

Every generic ERP assumes you buy new and sell new. A Brockenhaus volunteer accepting a box of donated kitchenware, an IT refurbisher logging fifty laptops from a corporate donor, a repair café tracking spare parts across twenty bikes — none of that fits a "purchase → sell" data model. So secondhand businesses run on spreadsheets and 25-year-old desktop ERPs, and the operational drag keeps them from scaling their impact.

Kivvi handles intake, condition grading, repair workflows, flexible pricing, and impact reporting _natively_, with the Swiss compliance layer (QR-bills, VAT, KMU Kontenrahmen, CAMT bank import) and an AI command bar that understands secondhand workflows.

Open source. Self-hostable. Built in Switzerland.

## Seven ways used goods break a normal ERP

1. **Intake is not purchasing.** Donations have no purchase price; the "supplier" is often a one-time individual.
2. **Every item has a condition.** "Like new" and "parts only" route differently and price differently.
3. **Products flow backwards.** Trade-ins, take-backs, and returns are the business, not the exception.
4. **Testing and repair is part of operations.** Multi-step workflows, multiple roles, before an item can sell.
5. **Pricing is flexible.** Richtpreise (guide prices), condition-based pricing, consignment splits, "pick your own."
6. **Inventory is mixed.** 500 identical power cables _and_ one specific Dell laptop with one specific dent — in the same system.
7. **Impact is the point.** Items saved, CO2 avoided, people served — first-class metrics, not afterthoughts.

Full positioning in [`PRODUCT.md`](PRODUCT.md).

## What's in the box

| Module                     | What it does                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Intake**                 | Accept donations, trade-ins, consignment. Condition grading. Donation receipts.                                        |
| **Inventory**              | Mixed model: bulk quantities _and_ per-item tracking with status (intake → testing → repair → ready_for_sale → sold).  |
| **Repair workflow**        | Per-item repair log, parts consumption, labour tracking, condition gates before sale.                                  |
| **Sales documents**        | Unified document model — Angebot, Auftrag, Lieferschein, Rechnung, Gutschrift, Mahnung. Convert by changing one field. |
| **Swiss QR-bills**         | Generated automatically. Legally compliant since 2022.                                                                 |
| **Accounting**             | 227-account KMU Kontenrahmen, journal entries auto-generated, balance sheet + P&L + VAT report.                        |
| **Banking**                | CAMT.053/054 import, automatic payment matching via QR reference.                                                      |
| **Impact reporting**       | Devices saved, kg diverted from landfill, CO2 avoided. Auto-generated annual Vereinsbericht.                           |
| **AI command bar**         | Cmd+K. "50 laptops donated by UBS" → intake created. Same domain functions the UI uses.                                |
| **Self-service migration** | CSV import with auto-detection (kivitendo profiles included).                                                          |

## Architecture

A pnpm monorepo. Domain logic is the source of truth — the UI, the public REST API, and the AI tools all delegate to the same functions in `packages/core`.

```
kivvi/
├── apps/
│   └── web/                  # Next.js 14 App Router, Server Actions, server components
├── packages/
│   ├── database/             # Drizzle ORM schema — THE source of truth
│   ├── core/                 # Domain logic (pure functions, one tx per business op)
│   │   └── src/domain/
│   │       ├── documents.ts          # Unified document model (quote → invoice → credit note)
│   │       ├── inventory-items.ts    # Per-item lifecycle, condition, repair
│   │       ├── accounting.ts         # Journal entries, balance sheet, P&L, VAT
│   │       ├── banking.ts            # CAMT import, payment matching
│   │       ├── impact.ts             # CO2, devices saved, donation receipts
│   │       └── ...
│   └── ai/                   # AI providers + tool registry (Anthropic / OpenAI / Ollama)
└── docs/                     # Deployment, self-hosting, audit reports, OpenAPI
```

**Data flow.** Server Action → domain function (transactional) → Drizzle → Postgres → `revalidatePath` → UI. The AI command bar calls the _same_ domain functions through tool definitions, so every AI action is auditable in `aiActionAudit`.

Full engineering bible in [`CLAUDE.md`](CLAUDE.md).

## Tech stack

| Layer      | Technology                                       | Why this one                                                                |
| ---------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| Framework  | Next.js 14 (App Router)                          | Server Components + Server Actions = fewer moving parts                     |
| Language   | TypeScript (strict)                              | Types derived from Drizzle schema (`$inferSelect`) — single source of truth |
| Database   | PostgreSQL + Drizzle ORM                         | Full SQL control, best TS inference, no codegen                             |
| Money      | `decimal.js`                                     | `0.1 + 0.2 !== 0.3` in IEEE 754; financial software cannot use floats       |
| Auth       | NextAuth.js v5                                   | Credentials provider, JWT strategy                                          |
| AI         | Anthropic Claude · OpenAI · Ollama (self-hosted) | Configurable per company; default Claude                                    |
| UI         | Tailwind + shadcn/ui + Radix                     | CSS variables as the only design SSOT; semantic tokens everywhere           |
| Validation | Zod                                              | Schema = SSOT for validation _and_ types                                    |
| Hosting    | Vercel · Docker · self-host                      | Pick your tradeoffs                                                         |

## Quick start

```bash
# 1. Clone
git clone https://github.com/g-but/kivvi.git && cd kivvi

# 2. Install
pnpm install

# 3. Start Postgres
docker compose up -d postgres

# 4. Env
cp .env.example .env.local
# edit DATABASE_URL, NEXTAUTH_SECRET, and an AI key

# 5. Schema + seed
pnpm db:push

# 6. Run
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The onboarding wizard creates your company, seeds the 227-account Swiss KMU Kontenrahmen, and offers a kivitendo CSV import if you're migrating.

### Minimal `.env.local`

```bash
DATABASE_URL="postgresql://kivvi:kivvi_dev@localhost:5432/kivvi"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Pick one AI provider (or none — the app runs without AI)
ANTHROPIC_API_KEY="sk-ant-..."          # recommended default
# OPENAI_API_KEY="sk-..."
# OLLAMA_BASE_URL="http://localhost:11434"
```

## Self-hosted AI

Companies that can't send data to a third-party LLM can run Kivvi end-to-end on their own hardware with Ollama:

```bash
docker compose --profile ai up -d ollama
docker exec -it kivvi-ollama-1 ollama pull qwen2.5:32b
# then set OLLAMA_BASE_URL in .env.local
```

Same AI tools, same UX, zero data egress.

## Engineering principles

Six ground truths, applied ruthlessly. Full reasoning in [`CLAUDE.md`](CLAUDE.md).

1. **Software exists to serve humans.** Complexity must earn its place.
2. **State defines behavior — one source of truth.** Types derived from schema. Constants centralized.
3. **Change is constant — design for it.** DRY, KISS, YAGNI.
4. **Automate the mechanical.** Human attention is for judgment, not data entry.
5. **Complexity compounds; simplicity scales.** Three similar lines beats premature abstraction.
6. **Correctness beats speed.** Wrong-but-fast loses to right-but-deliberate.

Practical consequences:

- Every multi-table operation wrapped in `db.transaction()`.
- Every query filters by `companyId` (multi-tenant isolation is a security invariant, not a feature).
- Every monetary calculation uses `decimal.js`, rounded at line-item level (Swiss standard).
- Every design token lives in `apps/web/app/globals.css` — no hex colors in components.

## Roadmap

**Shipped** (used in production by [revamp-it](https://revampit.ch) and partner shops):

- ✅ Multi-tenant company model, role-based access, team invitations
- ✅ Unified document model — quote, order, delivery note, invoice, credit note, dunning
- ✅ Intake workflow with condition grading and donation receipts
- ✅ Per-item inventory with repair lifecycle (testing → repair → ready_for_sale → sold/returned)
- ✅ Swiss QR-bill generation, CAMT import, automatic payment matching
- ✅ Accounting: 227-account KMU Kontenrahmen, journal entries, balance sheet + P&L + VAT report
- ✅ Recurring invoices with cron-driven generation
- ✅ Impact reporting (devices saved, CO2 avoided)
- ✅ AI command bar (Anthropic, OpenAI, OpenRouter, Ollama)
- ✅ Public REST API + webhooks for ERP-to-warehouse / ERP-to-shop integrations
- ✅ Kivitendo CSV migration with auto-detection
- ✅ German, French, English UI

**Next** (open issues track these):

- 🛠 Shop-front for marketplace listings (Ricardo, Tutti integration)
- 🛠 Mobile app for warehouse staff (intake on the floor, no laptop)
- 🛠 Autopilot mode — AI takes routine actions with human-review thresholds

## Contributing

PRs welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the loop.

```bash
git checkout -b feat/your-change
pnpm install && pnpm dev
# … make changes …
pnpm lint && pnpm type-check && pnpm test
# open a PR; CI runs lint + type-check + 880+ tests + production build
```

## Security

Found a vulnerability? See [`SECURITY.md`](SECURITY.md). Do _not_ open a public issue for security reports.

## Who builds this

Kivvi is built by [RevampIT](https://revampit.ch) (Zürich) — a nonprofit IT refurbisher running it in production — and the wider community of secondhand shops that want their software to fit their workflow, not the other way around.

If you run a Brockenhaus, refurbishing workshop, or vintage shop and your ERP is fighting you, [get in touch](https://kivvi.vercel.app).

## License

MIT — see [`LICENSE`](LICENSE). Use it, fork it, sell it, embed it.

---

<div align="center">

_Every item that passes through your hands deserves to be tracked, valued, and given its best possible future._

</div>
