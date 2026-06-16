# Security Policy

Kivvi handles real financial data — invoices, journal entries, bank transactions, customer PII. We take vulnerability reports seriously.

## Reporting a vulnerability

**Do not open a public GitHub issue.**

Email **security@revampit.ch** with:

- A description of the issue
- Steps to reproduce
- The version / commit you tested against
- Your name (so we can credit you, if you'd like)

We'll acknowledge receipt within 72 hours and aim to ship a fix within 14 days for high-severity issues. Critical issues (data exposure, tenant isolation breach, auth bypass) move faster.

## Scope

In scope:

- Authentication and authorization flows
- Multi-tenant isolation (cross-company data access)
- Server Actions and the public REST API (`/api/v1/*`)
- Webhook signature verification
- AI tool execution (any path where an LLM can trigger an action)
- Financial calculation correctness
- SQL injection, XSS, CSRF, SSRF
- Dependency vulnerabilities with a demonstrated exploit path

Out of scope:

- Issues only reproducible on outdated forks
- Self-XSS in dev tools
- Missing security headers without a demonstrated impact
- Rate limiting concerns without a real DoS scenario
- Social engineering or physical attacks

## Disclosure timeline

1. You report → we acknowledge within 72 hours.
2. We investigate, confirm, and develop a fix.
3. We ship the fix to our hosted production and to self-hosting users via release notes.
4. We publish a security advisory crediting you (unless you prefer to remain anonymous).

We coordinate on disclosure date with you. Typical embargo is 30 days from fix.

## Security guarantees, as code

The codebase enforces these invariants. If you find a path that violates one, that's a bug, please report it:

- **Tenant isolation.** Every query in `packages/core/src/domain/*` filters by `companyId`. Domain functions take `companyId` as a required parameter.
- **Transactional integrity.** Multi-table writes (document + items + journal entries + stock movements) run inside `db.transaction()`. Partial failures roll back.
- **Money is not a float.** All monetary calculations use `decimal.js`. We round at the line-item level (Swiss standard).
- **AI is audited.** Every AI tool execution writes to `aiActionAudit` with user, company, tool, and parameters.
- **Webhooks are signed.** Outbound webhooks include `X-Kivvi-Signature` (HMAC-SHA256 of the body with the endpoint secret).
- **No secrets in source.** `.env.local` is gitignored. CI does not log secrets.

## Hall of fame

Vulnerability reporters who chose to be credited will be listed here.

_(Empty so far — be the first.)_
