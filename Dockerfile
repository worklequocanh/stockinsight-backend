# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for StockInsight Backend (Node.js + Express + Prisma)

# Base image with OpenSSL (required for Prisma binaries)
FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update -qq && apt-get install --no-install-recommends -y openssl && rm -rf /var/lib/apt/lists/*

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
# Install production & dev dependencies so prisma generate can run properly
RUN npm ci
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Production build/runtime stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001

# Copy package files and installed modules + generated Prisma client
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/prisma.config.ts ./prisma.config.ts
COPY src ./src

# Create non-root user for security
RUN groupadd -r stockinsight && useradd -r -g stockinsight stockinsight
USER stockinsight

EXPOSE 3001

# Start server
CMD ["npm", "start"]
