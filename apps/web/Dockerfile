# ---------------------------------------------------------------------------
# Web App (Next.js) — OpenLintel monorepo
# ---------------------------------------------------------------------------
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# ---------------------------------------------------------------------------
# Builder stage
# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./

# Copy only the shared packages the web app depends on
COPY packages/config/ packages/config/
COPY packages/core/ packages/core/
COPY packages/db/ packages/db/
COPY packages/ui/ packages/ui/

# Copy the web app
COPY apps/web/ apps/web/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build Next.js (skip env validation at build time)
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=true
RUN pnpm --filter @openlintel/web build

# ---------------------------------------------------------------------------
# Runner stage
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy everything needed to run `next start`
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/turbo.json ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/web/ ./apps/web/

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["pnpm", "--filter", "@openlintel/web", "start"]
