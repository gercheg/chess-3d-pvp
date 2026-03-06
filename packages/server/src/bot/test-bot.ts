/**
 * Test script: spawns a minimal server (without Prisma) + 2 bots playing against each other.
 * Usage: npx tsx src/bot/test-bot.ts
 */
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { RoomManager } from "../game/room-manager.js";
import { registerGameRoomHandlers, type SocketLike, type IoLike } from "../ws/game-room-events.js";
import { findBestMove } from "./engine.js";

const PORT = 9999;
const DEPTH = 3;
const MOVE_DELAY = 300;

async function main() {
  const httpServer = createServer((_req, res) => {
    res.writeHead(200);
    res.end("test server");
  });

  const ioServer = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  const roomManager = new RoomManager();

  roomManager.setOnStateChange((roomId: string) => {
    try {
      const state = roomManager.getRoomState(roomId);
      ioServer.to(roomId).emit("game:state", state);
    } catch { /* room deleted */ }
  });

  ioServer.on("connection", (socket) => {
    console.log(`[SERVER] Client connected: ${socket.id}`);
    registerGameRoomHandlers(socket as unknown as SocketLike, ioServer as unknown as IoLike, roomManager);
  });

  await new Promise<void>((resolve) => httpServer.listen(PORT, resolve));
  console.log(`[SERVER] Running on port ${PORT}`);

  const botWhite = createBot("BotWhite", `http://localhost:${PORT}`);
  const botBlack = createBot("BotBlack", `http://localhost:${PORT}`);

  await Promise.all([botWhite.ready, botBlack.ready]);
  console.log(`[TEST] Both bots connected`);

  const ROOM_ID = "test_room";

  botWhite.socket.emit("game:create", { roomId: ROOM_ID });
  await sleep(500);

  botBlack.socket.emit("game:join", { roomId: ROOM_ID });

  await new Promise<void>((resolve) => {
    const onFinish = () => {
      console.log(`\n[TEST] Game finished! Cleaning up...`);
      botWhite.socket.disconnect();
      botBlack.socket.disconnect();
      ioServer.close();
      httpServer.close();
      resolve();
    };

    let finished = false;
    const checkFinish = () => {
      if (!finished) {
        finished = true;
        setTimeout(onFinish, 1000);
      }
    };

    botWhite.onFinish = checkFinish;
    botBlack.onFinish = checkFinish;

    setTimeout(() => {
      if (!finished) {
        console.log(`[TEST] Timeout after 5 minutes`);
        checkFinish();
      }
    }, 5 * 60 * 1000);
  });
}

interface BotInstance {
  socket: ClientSocket;
  ready: Promise<void>;
  onFinish?: () => void;
}

function createBot(name: string, serverUrl: string): BotInstance {
  const socket = ioClient(serverUrl, {
    transports: ["websocket"],
    reconnection: false,
  });

  let myColor: "white" | "black" | null = null;
  let moveCount = 0;
  let instance: BotInstance;

  const ready = new Promise<void>((resolve) => {
    socket.on("connect", () => {
      console.log(`[${name}] Connected as ${socket.id}`);
      resolve();
    });
  });

  socket.on("game:state", (state: any) => {
    if (state.players.white?.socketId === socket.id) {
      myColor = "white";
    } else if (state.players.black?.socketId === socket.id) {
      myColor = "black";
    }

    if (state.game.status === "finished") {
      const result = state.game.winner === myColor
        ? "WON"
        : state.game.winner
          ? "LOST"
          : "DRAW";
      console.log(`[${name}] Game ${result} by ${state.game.endReason} (${moveCount} moves made)`);
      instance.onFinish?.();
      return;
    }

    if (state.game.status === "active" && state.game.turn === myColor) {
      setTimeout(() => {
        const start = Date.now();
        const bestMove = findBestMove(state.game.fen, DEPTH);
        const elapsed = Date.now() - start;

        if (bestMove) {
          moveCount++;
          const moveNum = Math.ceil(state.game.history.length / 2) + 1;
          console.log(
            `[${name}] ${myColor === "white" ? "W" : "B"} #${moveNum}: ${bestMove.san} (${elapsed}ms)`
          );
          socket.emit("game:move", {
            roomId: state.roomId,
            from: bestMove.from,
            to: bestMove.to,
            promotion: bestMove.promotion,
          });
        }
      }, MOVE_DELAY);
    }
  });

  socket.on("game:error", (err: any) => {
    console.error(`[${name}] Error: ${err.code} - ${err.message}`);
  });

  instance = { socket, ready };
  return instance;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().then(() => {
  console.log(`[TEST] Done!`);
  process.exit(0);
}).catch((err) => {
  console.error(`[TEST] Fatal:`, err);
  process.exit(1);
});
