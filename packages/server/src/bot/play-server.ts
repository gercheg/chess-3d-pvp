/**
 * Standalone game server with mock auth + chess bot.
 * No PostgreSQL required — everything in memory.
 * 
 * Usage: npx tsx src/bot/play-server.ts
 * Then open http://localhost:5173 (client dev server)
 */
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { RoomManager } from "../game/room-manager.js";
import { registerGameRoomHandlers, type SocketLike, type IoLike } from "../ws/game-room-events.js";
import { findBestMove } from "./engine.js";

const PORT = parseInt(process.env.PORT || "8080", 10);
const BOT_DEPTH = parseInt(process.env.BOT_DEPTH || "3", 10);
const BOT_DELAY = parseInt(process.env.BOT_DELAY || "800", 10);

interface MockUser {
  id: string;
  email: string;
  username: string;
  eloRating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

const users = new Map<string, MockUser & { passwordHash: string }>();
let userCounter = 0;

function createMockToken(userId: string): string {
  return Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + 7 * 24 * 3600 * 1000 })).toString("base64");
}

async function main() {
  const httpServer = createServer((req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);
    
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<h1>Chess Server (dev mode)</h1><p>Bot is waiting for you!</p>`);
      return;
    }

    if (url.pathname === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (url.pathname === "/api/auth/register" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        try {
          const { email, username, password } = JSON.parse(body);
          
          for (const u of users.values()) {
            if (u.email === email || u.username === username) {
              res.writeHead(409, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Email or username already taken" }));
              return;
            }
          }

          const id = `user_${++userCounter}`;
          const user: MockUser & { passwordHash: string } = {
            id, email, username, passwordHash: password,
            eloRating: 1200, gamesPlayed: 0, wins: 0, losses: 0, draws: 0,
          };
          users.set(id, user);
          const token = createMockToken(id);
          
          console.log(`[AUTH] Registered: ${username} (${email})`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ token, user: { id, email, username, eloRating: 1200 } }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid request" }));
        }
      });
      return;
    }

    if (url.pathname === "/api/auth/login" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        try {
          const { email, password } = JSON.parse(body);
          let found: (MockUser & { passwordHash: string }) | null = null;
          for (const u of users.values()) {
            if (u.email === email && u.passwordHash === password) { found = u; break; }
          }
          if (!found) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid credentials" }));
            return;
          }
          const token = createMockToken(found.id);
          console.log(`[AUTH] Login: ${found.username}`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ token, user: { id: found.id, email: found.email, username: found.username, eloRating: found.eloRating } }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid request" }));
        }
      });
      return;
    }

    if (url.pathname === "/api/auth/me" && req.method === "GET") {
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer ")) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
      try {
        const payload = JSON.parse(Buffer.from(auth.slice(7), "base64").toString());
        const user = users.get(payload.sub);
        if (!user) throw new Error("not found");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ user: { id: user.id, email: user.email, username: user.username, eloRating: user.eloRating } }));
      } catch {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid token" }));
      }
      return;
    }

    if (url.pathname === "/api/leaderboard" && req.method === "GET") {
      const allUsers = [...users.values()].map(u => ({
        id: u.id, username: u.username, eloRating: u.eloRating,
        gamesPlayed: u.gamesPlayed, wins: u.wins, losses: u.losses, draws: u.draws,
      })).sort((a, b) => b.eloRating - a.eloRating);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ users: allUsers, total: allUsers.length, limit: 50, offset: 0 }));
      return;
    }

    if (url.pathname === "/api/games" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ games: [], total: 0, limit: 20, offset: 0 }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  const ioServer = new SocketIOServer(httpServer, {
    cors: { origin: "*", credentials: true },
  });

  const roomManager = new RoomManager();

  roomManager.setOnStateChange((roomId: string) => {
    try {
      const state = roomManager.getRoomState(roomId);
      ioServer.to(roomId).emit("game:state", state);
    } catch { /* room deleted */ }
  });

  ioServer.on("connection", (socket) => {
    console.log(`[WS] Connected: ${socket.id}`);
    registerGameRoomHandlers(socket as unknown as SocketLike, ioServer as unknown as IoLike, roomManager);
    socket.on("disconnect", () => console.log(`[WS] Disconnected: ${socket.id}`));
  });

  await new Promise<void>((resolve) => httpServer.listen(PORT, resolve));
  console.log(`\n========================================`);
  console.log(`  Chess Server running on port ${PORT}`);
  console.log(`  Bot depth: ${BOT_DEPTH}`);
  console.log(`========================================\n`);

  startBot(`http://localhost:${PORT}`);
}

function startBot(serverUrl: string) {
  const socket = ioClient(serverUrl, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });

  let myColor: "white" | "black" | null = null;
  let currentRoom: string | null = null;
  let gameActive = false;
  let moveTimeout: ReturnType<typeof setTimeout> | null = null;
  let gamesPlayed = 0;
  let wins = 0;

  const createRoom = () => {
    const roomId = `bot_${Date.now().toString(36)}`;
    console.log(`[BOT] Creating room: ${roomId} — waiting for player...`);
    socket.emit("game:create", { roomId });
  };

  socket.on("connect", () => {
    console.log(`[BOT] Connected (${socket.id})`);
    createRoom();
  });

  socket.on("disconnect", () => {
    console.log(`[BOT] Disconnected`);
    gameActive = false;
    currentRoom = null;
    myColor = null;
  });

  socket.on("game:state", (state: any) => {
    if (state.players.white?.socketId === socket.id) {
      myColor = "white";
    } else if (state.players.black?.socketId === socket.id) {
      myColor = "black";
    } else {
      return;
    }

    currentRoom = state.roomId;

    if (state.game.status === "waiting") {
      return;
    }

    if (state.game.status === "finished") {
      gameActive = false;
      gamesPlayed++;
      if (state.game.winner === myColor) wins++;

      const result = state.game.winner === myColor ? "WON" : state.game.winner ? "LOST" : "DRAW";
      console.log(`[BOT] ${result} by ${state.game.endReason} (${gamesPlayed} games, ${wins} wins)`);

      if (moveTimeout) clearTimeout(moveTimeout);

      setTimeout(() => {
        socket.emit("game:leave", { roomId: currentRoom });
        currentRoom = null;
        myColor = null;
        setTimeout(createRoom, 2000);
      }, 3000);
      return;
    }

    if (state.game.status === "active") {
      gameActive = true;

      if (state.game.turn === myColor) {
        if (moveTimeout) clearTimeout(moveTimeout);
        const delay = BOT_DELAY + Math.floor(Math.random() * 500);
        moveTimeout = setTimeout(() => {
          if (!gameActive || !currentRoom) return;

          const start = Date.now();
          const best = findBestMove(state.game.fen, BOT_DEPTH);
          const elapsed = Date.now() - start;

          if (best) {
            const moveNum = Math.ceil((state.game.history.length + 1) / 2);
            console.log(`[BOT] ${myColor === "white" ? "W" : "B"} #${moveNum}: ${best.san} (${elapsed}ms)`);
            socket.emit("game:move", {
              roomId: currentRoom,
              from: best.from,
              to: best.to,
              promotion: best.promotion,
            });
          }
        }, delay);
      }
    }
  });

  socket.on("game:error", (err: any) => {
    console.error(`[BOT] Error: ${err.code} - ${err.message}`);
    if (err.code === "ROOM_EXISTS") {
      setTimeout(createRoom, 1000);
    }
  });
}

process.on("SIGINT", () => { console.log("\nShutting down..."); process.exit(0); });

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
