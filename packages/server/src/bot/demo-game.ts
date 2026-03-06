/**
 * Demo: Bot (white) vs Scripted Player (black)
 * Shows full game with commentary. Also starts server on port 8080
 * so the browser client can spectate in real-time.
 */
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { io as ioClient } from "socket.io-client";
import { Chess } from "chess.js";
import { RoomManager } from "../game/room-manager.js";
import { registerGameRoomHandlers, type SocketLike, type IoLike } from "../ws/game-room-events.js";
import { findBestMove } from "./engine.js";

const PORT = 8080;
const BOT_DEPTH = 3;
const BOT_DELAY = 1200;
const PLAYER_DELAY = 1500;
const ROOM_ID = "demo_game";

async function main() {
  const httpServer = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url || "/", `http://localhost:${PORT}`);

    if (url.pathname === "/api/auth/register" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => body += c);
      req.on("end", () => {
        const { username } = JSON.parse(body);
        const token = Buffer.from(JSON.stringify({ sub: "demo" })).toString("base64");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ token, user: { id: "demo", email: "demo@test.com", username, eloRating: 1200 } }));
      });
      return;
    }

    if (url.pathname === "/api/auth/login" && req.method === "POST") {
      const token = Buffer.from(JSON.stringify({ sub: "demo" })).toString("base64");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ token, user: { id: "demo", email: "demo@test.com", username: "Demo", eloRating: 1200 } }));
      return;
    }

    if (url.pathname === "/api/auth/me") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ user: { id: "demo", email: "demo@test.com", username: "Demo", eloRating: 1200 } }));
      return;
    }

    if (url.pathname === "/api/leaderboard") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ users: [], total: 0, limit: 50, offset: 0 }));
      return;
    }

    if (url.pathname === "/api/games") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ games: [], total: 0, limit: 20, offset: 0 }));
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<h1>Demo Game Server</h1><p>Spectate at localhost:5174/game (join room: ${ROOM_ID})</p>`);
  });

  const ioServer = new SocketIOServer(httpServer, { cors: { origin: "*" } });
  const roomManager = new RoomManager();

  roomManager.setOnStateChange((roomId) => {
    try {
      ioServer.to(roomId).emit("game:state", roomManager.getRoomState(roomId));
    } catch {}
  });

  ioServer.on("connection", (socket) => {
    registerGameRoomHandlers(socket as unknown as SocketLike, ioServer as unknown as IoLike, roomManager);
  });

  await new Promise<void>((r) => httpServer.listen(PORT, r));
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  DEMO GAME: Bot (White) vs Smart Player (Black)`);
  console.log(`  Server: http://localhost:${PORT}`);
  console.log(`  Room: ${ROOM_ID}`);
  console.log(`  To spectate: open localhost:5174/game, join ${ROOM_ID}`);
  console.log(`${"=".repeat(60)}\n`);

  const botSocket = ioClient(`http://localhost:${PORT}`, { transports: ["websocket"] });
  const playerSocket = ioClient(`http://localhost:${PORT}`, { transports: ["websocket"] });

  await Promise.all([
    new Promise<void>((r) => botSocket.on("connect", r)),
    new Promise<void>((r) => playerSocket.on("connect", r)),
  ]);

  console.log(`[SETUP] Bot: ${botSocket.id}, Player: ${playerSocket.id}\n`);

  botSocket.emit("game:create", { roomId: ROOM_ID });
  await sleep(500);
  playerSocket.emit("game:join", { roomId: ROOM_ID });

  let moveNum = 0;

  function printBoard(fen: string) {
    const chess = new Chess(fen);
    const board = chess.ascii();
    console.log(board);
    console.log();
  }

  const finished = new Promise<void>((resolve) => {
    botSocket.on("game:state", (state: any) => {
      if (state.players.white?.socketId !== botSocket.id) return;

      if (state.game.status === "finished") {
        console.log(`\n${"=".repeat(40)}`);
        const winner = state.game.winner;
        if (winner === "white") console.log(`  BOT WINS by ${state.game.endReason}!`);
        else if (winner === "black") console.log(`  PLAYER WINS by ${state.game.endReason}!`);
        else console.log(`  DRAW by ${state.game.endReason}`);
        console.log(`  Total moves: ${state.game.history.length}`);
        console.log(`  Final FEN: ${state.game.fen}`);
        console.log(`${"=".repeat(40)}\n`);
        printBoard(state.game.fen);
        resolve();
        return;
      }

      if (state.game.status === "active" && state.game.turn === "white") {
        setTimeout(() => {
          const t0 = Date.now();
          const best = findBestMove(state.game.fen, BOT_DEPTH);
          const ms = Date.now() - t0;
          if (best) {
            moveNum++;
            console.log(`  ${moveNum}. ${best.san.padEnd(8)} [BOT, ${ms}ms]`);
            botSocket.emit("game:move", {
              roomId: ROOM_ID,
              from: best.from,
              to: best.to,
              promotion: best.promotion,
            });
          }
        }, BOT_DELAY);
      }
    });

    playerSocket.on("game:state", (state: any) => {
      if (state.players.black?.socketId !== playerSocket.id) return;

      if (state.game.status === "active" && state.game.turn === "black") {
        setTimeout(() => {
          const t0 = Date.now();
          const best = findBestMove(state.game.fen, 2);
          const ms = Date.now() - t0;
          if (best) {
            console.log(`  ${moveNum}...${best.san.padEnd(8)} [PLAYER, ${ms}ms]`);
            playerSocket.emit("game:move", {
              roomId: ROOM_ID,
              from: best.from,
              to: best.to,
              promotion: best.promotion,
            });
          }
        }, PLAYER_DELAY);
      }
    });
  });

  await finished;

  await sleep(2000);
  botSocket.disconnect();
  playerSocket.disconnect();

  console.log(`[DEMO] Game complete. Server still running for spectators.`);
  console.log(`[DEMO] Press Ctrl+C to stop.\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => { console.error(e); process.exit(1); });
