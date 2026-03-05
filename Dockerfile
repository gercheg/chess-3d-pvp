# syntax=docker/dockerfile:1
FROM node:20-alpine

RUN apk add --no-cache python3 make g++

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm config set enable-pre-post-scripts true
RUN pnpm install --frozen-lockfile=false
RUN pnpm approve-builds bcrypt @prisma/client @prisma/engines prisma esbuild 2>/dev/null; \
    pnpm install --frozen-lockfile=false
RUN pnpm --filter @chess/server exec prisma generate
RUN pnpm --filter @chess/engine build
RUN pnpm --filter @chess/server build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "packages/server/dist/index.js"]
