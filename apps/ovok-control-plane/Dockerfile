# syntax=docker/dockerfile:1.7
#
# Railway / Docker deploy (monorepo root context):
#   docker build -f apps/ovok-control-plane/Dockerfile .
#
# Railway service settings:
#   Root Directory: .  (repo root)
#   Dockerfile Path: apps/ovok-control-plane/Dockerfile
#   Healthcheck: GET /health

ARG NODE_VERSION=24.16.0
ARG PNPM_VERSION=10.27.0

FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache python3 make g++
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ovok-contracts/package.json ./packages/ovok-contracts/
COPY packages/ovok-contracts/src ./packages/ovok-contracts/src
COPY packages/ovok-contracts/tsconfig.json ./packages/ovok-contracts/tsconfig.json
COPY apps/ovok-control-plane/package.json ./apps/ovok-control-plane/

RUN pnpm install --frozen-lockfile --ignore-scripts --filter @ovok/control-plane...

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/ovok-control-plane/node_modules ./apps/ovok-control-plane/node_modules
COPY --from=deps /app/packages/ovok-contracts ./packages/ovok-contracts
COPY . .

WORKDIR /app/apps/ovok-control-plane
RUN pnpm --filter @ovok/contracts run build
RUN pnpm run build
RUN chmod +x docker-entrypoint.sh

FROM base AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/ovok-contracts ./packages/ovok-contracts
COPY --from=build /app/apps/ovok-control-plane/dist ./apps/ovok-control-plane/dist
COPY --from=build /app/apps/ovok-control-plane/drizzle ./apps/ovok-control-plane/drizzle
COPY --from=build /app/apps/ovok-control-plane/drizzle.config.ts ./apps/ovok-control-plane/drizzle.config.ts
COPY --from=build /app/apps/ovok-control-plane/package.json ./apps/ovok-control-plane/package.json
COPY --from=build /app/apps/ovok-control-plane/docker-entrypoint.sh ./apps/ovok-control-plane/docker-entrypoint.sh
COPY --from=build /app/apps/ovok-control-plane/node_modules ./apps/ovok-control-plane/node_modules

WORKDIR /app/apps/ovok-control-plane

EXPOSE 4001

ENTRYPOINT ["./docker-entrypoint.sh"]
