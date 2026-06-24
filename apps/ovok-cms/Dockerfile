# syntax=docker/dockerfile:1.7
#
# Railway / Docker deploy (monorepo root context):
#   docker build -f apps/ovok-cms/Dockerfile .
#
# Railway service settings:
#   Root Directory: .  (repo root)
#   Dockerfile Path: apps/ovok-cms/Dockerfile
#   Healthcheck: GET /api/_ovok/health

ARG NODE_VERSION=24.16.0
ARG PNPM_VERSION=10.27.0

FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN apk add --no-cache libc6-compat vips
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache python3 make g++ vips-dev
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ovok-contracts/package.json ./packages/ovok-contracts/
COPY packages/ovok-contracts/src ./packages/ovok-contracts/src
COPY packages/ovok-contracts/tsconfig.json ./packages/ovok-contracts/tsconfig.json
COPY apps/ovok-cms/package.json ./apps/ovok-cms/

RUN pnpm install --frozen-lockfile --ignore-scripts --filter @actimi/ovok-cms...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/ovok-cms/node_modules ./apps/ovok-cms/node_modules
COPY --from=deps /app/packages/ovok-contracts ./packages/ovok-contracts
COPY . .

WORKDIR /app/apps/ovok-cms

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm --filter @ovok/contracts run build
RUN pnpm run build
RUN mkdir -p public
RUN chmod +x docker-entrypoint.sh

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

WORKDIR /app

COPY --from=builder --chown=nextjs:nodejs /app/apps/ovok-cms/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/ovok-cms/.next/static ./apps/ovok-cms/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/ovok-cms/public ./apps/ovok-cms/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/ovok-cms/docker-entrypoint.sh ./apps/ovok-cms/docker-entrypoint.sh
COPY --from=builder --chown=nextjs:nodejs /app/packages/ovok-contracts /app/packages/ovok-contracts

USER nextjs

WORKDIR /app/apps/ovok-cms

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
