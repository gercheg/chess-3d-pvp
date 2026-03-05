# 3D Chess PvP Platform

Real-time multiplayer chess with ELO matchmaking, leaderboard, and admin panel.

## Stack

- **Server**: Fastify + Socket.io + Prisma + PostgreSQL
- **Chess Engine**: Custom TypeScript engine (move validation, FEN, SAN, castling, en passant)
- **Auth**: JWT + bcrypt
- **Rating**: ELO system with K-factor scaling
- **Deploy**: Docker + Google Cloud Run

## Quick Start

```bash
pnpm install
docker compose up -d          # PostgreSQL + Redis
cp .env.example .env
pnpm --filter @chess/server exec prisma migrate deploy
pnpm --filter @chess/server db:seed
pnpm dev
```

## Project Structure

```
packages/
  chess-engine/   # Pure TypeScript chess engine
  server/         # Fastify API + WebSocket server
  client/         # React + Three.js frontend (WIP)
  admin/          # Admin dashboard (WIP)
  e2e/            # Playwright E2E tests
  loadtest/       # k6 load tests
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user (auth required) |
| GET | /api/leaderboard | ELO leaderboard |
| GET | /api/games | List games |
| GET | /api/games/:id | Game details with moves |
| GET | /api/admin/stats | Admin dashboard stats |
| GET | /api/admin/users | Admin user list |
| GET | /health | Health check |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| game:create | Client -> Server | Create game room |
| game:join | Client -> Server | Join as player |
| game:spectate | Client -> Server | Join as spectator |
| game:leave | Client -> Server | Leave room |
| game:state | Server -> Client | Room state update |
| game:error | Server -> Client | Error notification |
