# syntax=docker/dockerfile:1.7
# Dockerfile for the ovok-cms Payload app.
#
# Build context: apps/ovok-cms/ (narrow — single package, matches Railway's
# default service root). A standalone pnpm-lock.yaml lives next to this file,
# generated via `pnpm install --ignore-workspace --lockfile-only`.
#
# Alpine needs python3 + make + g++ + vips-dev for the native post-install
# scripts (bufferutil, better-sqlite3, sharp, workerd).

ARG NODE_VERSION=24.16.0
ARG PNPM_VERSION=10.27.0

FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# --- deps ----------------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache python3 make g++ vips-dev

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- builder -------------------------------------------------------------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm run build

# Ensure public/ exists so the runner COPY below doesn't fail when the app
# ships no static assets at the workspace root.
RUN mkdir -p public

# --- runner --------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
