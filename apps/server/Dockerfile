# Checkker game server.
# Build from the repository root so workspace packages are available:
#   docker build -f apps/server/Dockerfile -t checkker-server .
FROM node:20-alpine

WORKDIR /app

# Workspace manifests first for layer caching.
COPY package.json package-lock.json turbo.json ./
COPY packages ./packages
COPY apps/server ./apps/server

# Install the server workspace and the packages it imports. ai-brain and
# database are listed explicitly: ai-brain is imported by the bot evaluators
# without being a declared dependency, and database needs its prisma devDep
# for client generation.
RUN npm ci -w apps/server -w packages/ai-brain -w packages/database --include=dev

# Generate the Prisma client. The database itself is optional at runtime
# (set DATABASE_URL to enable persistence).
RUN npx -w packages/database prisma generate

ENV NODE_ENV=production
EXPOSE 3001/tcp
EXPOSE 47831/udp

CMD ["npx", "tsx", "apps/server/src/index.ts"]
