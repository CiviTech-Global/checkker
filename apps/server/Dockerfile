FROM node:22-alpine AS builder

WORKDIR /app

# Workspace manifests first for layer caching.
COPY package.json package-lock.json turbo.json ./
COPY packages ./packages
COPY apps/server ./apps/server

# The root "prepare": "husky" hook cannot run inside an image.
RUN sed -i 's/"prepare": "husky"/"prepare": ""/' package.json
ENV HUSKY=0
RUN npm ci -w apps/server -w packages/ai-brain -w packages/database --include=dev

RUN npx -w packages/database prisma generate
RUN npm run bundle -w apps/server

FROM node:22-alpine

# npm/npx are only needed while building. Removing them from the runtime image
# also removes npm's bundled dependencies (a recurring source of HIGH findings).
RUN apk add --no-cache tini \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
WORKDIR /app

COPY --from=builder /app/apps/server/dist/server.bundle.js /app/
COPY --from=builder /app/packages/database/prisma /app/prisma/
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma/
# Only the runtime client is needed; the rest of @prisma is CLI/build tooling
# and would unnecessarily enlarge the image and its CVE surface.
COPY --from=builder /app/node_modules/@prisma/client /app/node_modules/@prisma/client

ENV PRISMA_SCHEMA_PATH=/app/prisma/schema.prisma
ENV NODE_ENV=production
EXPOSE 3001/tcp
EXPOSE 47831/udp

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-3001}/health" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.bundle.js"]
