# =============================================================================
# Checkker Server — Docker
# =============================================================================
# Build:
#   docker build -t checkker-server .
#
# Run (in-memory mode, no database):
#   docker run -d --name checkker -p 3001:3001 -p 47831:47831/udp checkker-server
#
# Run (with Postgres database):
#   docker run -d --name checkker -p 3001:3001 -p 47831:47831/udp \
#     -e DATABASE_URL=postgresql://user:pass@host:5432/checkker \
#     checkker-server
#
# Run (with crypto betting):
#   docker run -d --name checkker -p 3001:3001 -p 47831:47831/udp \
#     -e BSC_RPC_URL=https://bsc-testnet-rpc.publicnode.com \
#     -e CHECKKER_CONTRACT_ADDRESS=0x... \
#     -e REFEREE_PRIVATE_KEY=0x... \
#     -e HOUSE_WALLET_ADDRESS=0x... \
#     checkker-server
#
# Run with custom web client:
#   Mount your web export at /app/web:
#   docker run -d --name checkker -p 3001:3001 \
#     -v /path/to/web-dist:/app/web \
#     checkker-server
# =============================================================================

# ---- Stage 1: build -------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /build
RUN apk add --no-cache git

# Copy monorepo manifests first for layer caching
COPY package.json package-lock.json ./
COPY turbo.json tsconfig.base.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY packages/chess/package.json ./packages/chess/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/poker/package.json ./packages/poker/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/chess/src ./packages/chess/src
COPY packages/database/src ./packages/database/src
COPY packages/database/prisma ./packages/database/prisma
COPY packages/poker/src ./packages/poker/src
COPY packages/shared/src ./packages/shared/src
COPY apps/server/src ./apps/server/src
COPY apps/mobile ./apps/mobile

# Generate Prisma client (needed for optional DB support)
RUN npx prisma generate --schema=./packages/database/prisma/schema.prisma

# Export web client
RUN npm run export:web -w apps/mobile 2>/dev/null || echo "[web] Export skipped (may need expo)"

# Bundle server
RUN npm run bundle -w apps/server

# ---- Stage 2: runtime ----------------------------------------------------
FROM node:22-alpine

RUN apk add --no-cache tini
WORKDIR /app

# Copy only what's needed at runtime
COPY --from=builder /build/apps/server/dist/server.bundle.js /app/
COPY --from=builder /build/apps/mobile/dist /app/web/
COPY --from=builder /build/packages/database/prisma /app/prisma/
COPY --from=builder /build/node_modules/.prisma /app/node_modules/.prisma/
COPY --from=builder /build/node_modules/@prisma /app/node_modules/@prisma/
COPY --from=builder /build/node_modules/@checkker/database /app/node_modules/@checkker/database/

# Prisma schema path for runtime
ENV PRISMA_SCHEMA_PATH=/app/prisma/schema.prisma

EXPOSE 3001
EXPOSE 47831/udp

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.bundle.js"]
