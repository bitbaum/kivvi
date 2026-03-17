# Kivvi

**Operations on Autopilot.** AI-first ERP for Swiss organizations.

---

## What is Kivvi?

Kivvi is an intelligent ERP system that automates your organization's operations. Unlike traditional ERPs where you navigate menus and fill forms, Kivvi watches your activity and takes action.

- **Meeting ended?** Invoice drafted and ready to send.
- **Payment received?** Automatically matched and reconciled.
- **Invoice overdue?** Reminder sent.

You focus on your work. Kivvi handles the paperwork.

## Features

- **AI-First Interface** — Chat naturally, get things done
- **Swiss Compliant** — QR-bills, Swiss VAT (8.1%, 2.6%), local banking
- **Your Data, Your AI** — Self-host with Ollama or use Claude/GPT
- **Modern Stack** — Next.js 14, TypeScript, PostgreSQL, Drizzle ORM

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local database)

### Setup

```bash
# Clone the repo
git clone https://github.com/kivvi/kivvi.git
cd kivvi

# Install dependencies
pnpm install

# Start the database
docker compose up -d postgres redis

# Set up environment
cp .env.example .env.local
# Edit .env.local with your settings

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://kivvi:kivvi_dev@localhost:5432/kivvi"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secret-here"

# AI (choose one)
ANTHROPIC_API_KEY="sk-ant-..."  # Claude
# OR
OLLAMA_BASE_URL="http://localhost:11434"  # Self-hosted
```

## Architecture

```
kivvi/
├── apps/
│   └── web/              # Next.js frontend + API
├── packages/
│   ├── database/         # Drizzle ORM schema
│   ├── ai/               # AI providers & conversation engine
│   ├── core/             # Business logic
│   └── ui/               # Shared components
└── docker-compose.yml
```

## Tech Stack

| Layer      | Technology                                     |
| ---------- | ---------------------------------------------- |
| Frontend   | Next.js 14, React, Tailwind, shadcn/ui         |
| Backend    | Next.js API Routes, TypeScript                 |
| Database   | PostgreSQL, Drizzle ORM                        |
| AI         | Anthropic Claude, OpenAI, Ollama (self-hosted) |
| Auth       | NextAuth.js                                    |
| Deployment | Vercel, Docker                                 |

## Roadmap

- [x] Project setup
- [x] Basic UI with dashboard and chat
- [x] AI provider abstraction
- [x] Database schema
- [ ] Invoice CRUD
- [ ] Swiss QR-bill generation
- [ ] Bank transaction import
- [ ] AI-powered reconciliation
- [ ] Autopilot mode (autonomous actions)

## Self-Hosted AI

Kivvi supports running AI locally with Ollama:

```bash
# Start Ollama with docker compose
docker compose --profile ai up -d ollama

# Pull a model
docker exec -it kivvi-ollama-1 ollama pull qwen2.5:32b

# Set in .env.local
OLLAMA_BASE_URL="http://localhost:11434"
```

## Contributing

Kivvi is open source under the MIT license. Contributions welcome!

```bash
# Fork the repo, then:
git checkout -b feature/your-feature
pnpm install
pnpm dev

# Make changes, then:
pnpm lint
pnpm type-check
git commit -m "Add your feature"
git push origin feature/your-feature
# Open a PR
```

## License

MIT — do whatever you want.

---

Built by [RevampIT](https://revampit.ch). Made in Switzerland.
