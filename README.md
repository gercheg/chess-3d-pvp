# 3D Chess PvP Platform

Full-stack 3D chess platform with real-time PvP, matchmaking, leaderboard, and admin panel.

## Tech Stack

- **Frontend**: React 18 + Three.js (react-three-fiber) + Tailwind CSS + Vite
- **Backend**: Node.js + Fastify + Socket.io + Prisma ORM
- **Database**: PostgreSQL 16 + Redis 7
- **Testing**: Vitest, Supertest, Playwright, k6
- **Infrastructure**: Docker, Terraform, GCP

## Setup

```bash
pnpm install
docker compose up -d
pnpm prisma migrate dev --filter server
pnpm dev
```

## Project Structure

```
packages/
  chess-engine/    # Pure chess logic library
  server/          # Fastify API + WebSocket
  client/          # React + Three.js frontend
  admin/           # Admin panel
  e2e/             # E2E tests
  loadtest/        # Load tests
```
