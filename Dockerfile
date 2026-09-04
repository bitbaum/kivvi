# ---------- Stage 1: Install dependencies ----------
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable corepack so the correct pnpm version (from packageManager) is used
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

# Copy lockfile and workspace manifests first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/core/package.json ./packages/core/
COPY packages/ai/package.json ./packages/ai/

RUN pnpm install --frozen-lockfile

# ---------- Stage 2: Build the application ----------
FROM node:24-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

# Copy installed node_modules from deps stage
COPY --from=deps /app/ ./

# Copy full source code
COPY . .

# Build args for values needed at build time only (Next.js inlines them).
# Runtime secrets (DATABASE_URL, NEXTAUTH_SECRET, etc.) are provided at
# container start and must NOT be set here.
ARG NEXT_PUBLIC_APP_URL=""
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build --filter=@kivvi/web

# ---------- Stage 3: Production runner ----------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone output (includes server + node_modules subset)
COPY --from=builder /app/apps/web/.next/standalone ./

# Copy static assets that standalone does not include
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Copy public assets if they exist (currently empty, but future-proof)
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set correct ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Next.js standalone server listens on 3000 by default
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The standalone output places the server entry point at apps/web/server.js
CMD ["node", "apps/web/server.js"]
