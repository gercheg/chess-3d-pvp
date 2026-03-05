import Fastify from "fastify";
import cors from "@fastify/cors";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authMiddleware, requireAdmin, type AuthConfig } from "./auth/middleware.js";
import { RoomManager } from "./game/room-manager.js";
import { registerGameRoomHandlers } from "./ws/game-room-events.js";

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
