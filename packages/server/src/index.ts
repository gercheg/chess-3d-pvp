import Fastify from "fastify";
import cors from "@fastify/cors";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authMiddleware, requireAdmin, type AuthConfig } from "./auth/middleware.js";
import { RoomManager } from "./game/room-manager.js";
import { registerGameRoomHandlers, type SocketLike, type IoLike } from "./ws/game-room-events.js";

const PORT = parseInt(process.env.PORT || "8080", 10);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const prisma = new PrismaClient();
const roomManager = new RoomManager();

const fastify = Fastify({
  logger: true,
  serverFactory: (handler) => {
    const server = createServer(handler);
    return server;
  },
});

const io = new SocketIOServer(fastify.server, {
  cors: { origin: [CLIENT_URL, "http://localhost:5174"], credentials: true },
});

await fastify.register(cors, {
  origin: [CLIENT_URL, "http://localhost:5174"],
  credentials: true,
});

const authConfig: AuthConfig = { jwtSecret: JWT_SECRET, prisma };

// --- Root / Landing ---
fastify.get("/", async (_req, reply) => {
  reply.type("text/html").send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chess 3D PvP</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:#0f0f13;color:#e4e4e7;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center}
.c{max-width:720px;width:100%;padding:2rem}
h1{font-size:2.5rem;font-weight:800;background:linear-gradient(135deg,#a78bfa,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.25rem}
.sub{color:#71717a;font-size:1.1rem;margin-bottom:2rem}
.status{display:inline-flex;align-items:center;gap:.5rem;background:#16a34a18;border:1px solid #16a34a40;border-radius:999px;padding:.35rem 1rem;font-size:.85rem;color:#4ade80;margin-bottom:2rem}
.dot{width:8px;height:8px;border-radius:50%;background:#4ade80;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:2rem}
.card{background:#18181b;border:1px solid #27272a;border-radius:12px;padding:1.25rem}
.card h3{font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;color:#71717a;margin-bottom:.75rem}
.card ul{list-style:none}
.card li{padding:.3rem 0;font-size:.9rem}
.card li a{color:#818cf8;text-decoration:none}
.card li a:hover{text-decoration:underline}
.method{display:inline-block;width:3.2rem;font-size:.75rem;font-weight:700;color:#a78bfa;margin-right:.5rem}
.ws{color:#f59e0b}
.ft{color:#52525b;font-size:.8rem;text-align:center;margin-top:1rem}
@media(max-width:500px){.grid{grid-template-columns:1fr}h1{font-size:1.8rem}}
</style>
</head>
<body><div class="c">
<h1>&#9819; Chess 3D PvP</h1>
<p class="sub">Real-time multiplayer chess with ELO matchmaking</p>
<div class="status"><span class="dot"></span> API Online</div>
<div class="grid">
<div class="card"><h3>Auth</h3><ul>
<li><span class="method">POST</span><a href="/api/auth/register">/api/auth/register</a></li>
<li><span class="method">POST</span><a href="/api/auth/login">/api/auth/login</a></li>
<li><span class="method">GET</span><a href="/api/auth/me">/api/auth/me</a></li>
</ul></div>
<div class="card"><h3>Game Data</h3><ul>
<li><span class="method">GET</span><a href="/api/leaderboard">/api/leaderboard</a></li>
<li><span class="method">GET</span><a href="/api/games">/api/games</a></li>
<li><span class="method">GET</span>/api/games/:id</li>
</ul></div>
<div class="card"><h3>Admin</h3><ul>
<li><span class="method">GET</span>/api/admin/stats</li>
<li><span class="method">GET</span>/api/admin/users</li>
</ul></div>
<div class="card"><h3>WebSocket</h3><ul>
<li><span class="method ws">WS</span>game:create</li>
<li><span class="method ws">WS</span>game:join</li>
<li><span class="method ws">WS</span>game:spectate</li>
<li><span class="method ws">WS</span>game:leave</li>
</ul></div>
</div>
<p class="ft">Powered by Fastify + Prisma + Socket.io &middot; Cloud Run</p>
</div></body></html>`);
});

// --- Health ---
fastify.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

// --- Auth routes ---
fastify.post<{ Body: { email: string; username: string; password: string } }>("/api/auth/register", async (req, reply) => {
  const { email, username, password } = req.body;
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) return reply.code(409).send({ error: "Email or username already taken" });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, username, passwordHash } });
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });
  return { token, user: { id: user.id, email: user.email, username: user.username, eloRating: user.eloRating } };
});

fastify.post<{ Body: { email: string; password: string } }>("/api/auth/login", async (req, reply) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.code(401).send({ error: "Invalid credentials" });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return reply.code(401).send({ error: "Invalid credentials" });
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });
  return { token, user: { id: user.id, email: user.email, username: user.username, eloRating: user.eloRating } };
});

fastify.get("/api/auth/me", { preHandler: authMiddleware(authConfig) }, async (req) => {
  return { user: req.user };
});

// --- Leaderboard ---
fastify.get<{ Querystring: { limit?: string; offset?: string } }>("/api/leaderboard", async (req) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);
  const offset = parseInt(req.query.offset || "0", 10);
  const users = await prisma.user.findMany({
    select: { id: true, username: true, eloRating: true, gamesPlayed: true, wins: true, losses: true, draws: true },
    orderBy: { eloRating: "desc" },
    take: limit,
    skip: offset,
  });
  const total = await prisma.user.count();
  return { users, total, limit, offset };
});

// --- Games ---
fastify.get<{ Querystring: { limit?: string; offset?: string; status?: string } }>("/api/games", async (req) => {
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
  const offset = parseInt(req.query.offset || "0", 10);
  const where = req.query.status ? { status: req.query.status as any } : {};
  const games = await prisma.game.findMany({
    where,
    include: {
      whitePlayer: { select: { id: true, username: true, eloRating: true } },
      blackPlayer: { select: { id: true, username: true, eloRating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
  const total = await prisma.game.count({ where });
  return { games, total, limit, offset };
});

fastify.get<{ Params: { id: string } }>("/api/games/:id", async (req, reply) => {
  const game = await prisma.game.findUnique({
    where: { id: req.params.id },
    include: {
      whitePlayer: { select: { id: true, username: true, eloRating: true } },
      blackPlayer: { select: { id: true, username: true, eloRating: true } },
      moves: { orderBy: { moveNumber: "asc" } },
    },
  });
  if (!game) return reply.code(404).send({ error: "Game not found" });
  return game;
});

// --- Admin ---
fastify.get("/api/admin/stats", { preHandler: requireAdmin(authConfig) }, async () => {
  const [totalUsers, totalGames, activeGames, queueSize] = await Promise.all([
    prisma.user.count(),
    prisma.game.count(),
    prisma.game.count({ where: { status: "ACTIVE" } }),
    prisma.matchQueue.count(),
  ]);
  return { totalUsers, totalGames, activeGames, queueSize, activeRooms: 0 };
});

fastify.get<{ Querystring: { limit?: string } }>("/api/admin/users", { preHandler: requireAdmin(authConfig) }, async (req) => {
  const limit = Math.min(parseInt(req.query.limit || "100", 10), 500);
  return prisma.user.findMany({
    select: { id: true, email: true, username: true, role: true, eloRating: true, gamesPlayed: true, wins: true, losses: true, draws: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
});

// --- WebSocket ---
io.on("connection", (socket) => {
  fastify.log.info({ socketId: socket.id }, "Client connected");
  registerGameRoomHandlers(socket as any, io as any, roomManager);
});

// --- Start ---
try {
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  fastify.log.info(`Server running on port ${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
