# syntax=docker/dockerfile:1
FROM node:20-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @chess/server exec prisma generate
RUN pnpm --filter @chess/engine build
RUN pnpm --filter @chess/server build

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "packages/server/dist/index.js"]
