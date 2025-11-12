# Stage 0: Base image definition (optional, but good for consistency)
FROM node:lts-alpine AS base

# Stage 1: Dependencies Installation
FROM base AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies (including devDependencies needed for the build)
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit

# Stage 2: Application Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ./ ./

# Build app
RUN npm run build

# Stage 3: Production Runner
FROM node:lts-alpine AS runner

USER node

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
