# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public env vars are inlined at build time.
# NEXT_PUBLIC_API_URL is the browser-facing API base (includes /api). Default
# is the relative "/api" — same-origin behind the compose reverse proxy (nginx
# location /api/ → backend). An absolute value must be https:// in production;
# src/lib/env.ts fails the build otherwise. Override via build arg.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Public site origin (no trailing slash) for SEO absolutes — metadataBase,
# canonical URLs, sitemap.xml, robots.txt (src/lib/env.ts). No default: the
# build fails fast if compose/CI omits it instead of baking in localhost links.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# Optional Sentry client DSN (inlined into the client bundle at build time).
ARG NEXT_PUBLIC_SENTRY_DSN=
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
# Server-only absolute backend URL for Node-side fetch (dal.ts, /api/auth/session)
# — the browser-facing NEXT_PUBLIC_API_URL may be the relative "/api", which
# Node fetch rejects. Read at build time too (prerender executes env.ts), hence
# an ARG. Compose overrides at runtime via the environment block.
ARG INTERNAL_API_URL=http://backend:8080/api
ENV INTERNAL_API_URL=$INTERNAL_API_URL
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# SESSION_SECRET is a runtime secret — do NOT bake into image.
# It is injected at runtime via docker-compose environment.

RUN pnpm build

# ---- Runner ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 10001 nextjs && adduser -S -u 10001 -G nextjs nextjs

# Standalone server + static assets
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["node", "server.js"]