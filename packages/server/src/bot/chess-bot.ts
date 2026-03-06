import { io, type Socket } from "socket.io-client";
import { findBestMove } from "./engine.js";

interface GameState {
  fen: string;
  board: string;
  clocks: { whiteMs: number; blackMs: number };
  turn: "white" | "black";
  history: string[];
  status: "waiting" | "active" | "finished";
  winner: "white" | "black" | null;
  endReason: string | null;
  isCheck: boolean;
}

interface RoomPlayer {
  socketId: string;
  color: "white" | "black";
  userId?: string;
  username?: string;
}

interface RoomState {
  roomId: string;
  players: { white: RoomPlayer | null; black: RoomPlayer | null };
  spectators: string[];
  game: GameState;
}

const SERVER_URL = process.env.BOT_SERVER_URL || "http://localhost:8080";
const BOT_NAME = process.env.BOT_NAME || "ChessBot";
const BOT_EMAIL = process.env.BOT_EMAIL || "bot@chess3d.ai";
const BOT_PASSWORD = process.env.BOT_PASSWORD || "BotPass123!";
const SEARCH_DEPTH = parseInt(process.env.BOT_DEPTH || "3", 10);
const MOVE_DELAY_MS = parseInt(process.env.BOT_MOVE_DELAY || "800", 10);
const AUTO_CREATE_ROOM = process.env.BOT_AUTO_CREATE !== "false";

class ChessBot {
  private socket: Socket | null = null;
  private token: string | null = null;
  private currentRoom: string | null = null;
  private myColor: "white" | "black" | null = null;
  private gameActive = false;
  private moveTimeout: ReturnType<typeof setTimeout> | null = null;
  private gamesPlayed = 0;
  private wins = 0;
  private losses = 0;

  async start(): Promise<void> {
    console.log(`[BOT] ${BOT_NAME} starting...`);
    console.log(`[BOT] Server: ${SERVER_URL}`);
    console.log(`[BOT] Search depth: ${SEARCH_DEPTH}`);

    await this.authenticate();
    this.connect();
  }

  private async authenticate(): Promise<void> {
    try {
      const regResponse = await fetch(`${SERVER_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: BOT_EMAIL, username: BOT_NAME, password: BOT_PASSWORD }),
      });

      if (regResponse.ok) {
        const data = await regResponse.json() as { token: string };
        this.token = data.token;
        console.log(`[BOT] Registered as ${BOT_NAME}`);
        return;
      }

      const loginResponse = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: BOT_EMAIL, password: BOT_PASSWORD }),
      });

      if (loginResponse.ok) {
        const data = await loginResponse.json() as { token: string };
        this.token = data.token;
        console.log(`[BOT] Logged in as ${BOT_NAME}`);
        return;
      }

      console.warn(`[BOT] Auth failed (${loginResponse.status}), connecting without token`);
    } catch (err) {
      console.warn(`[BOT] Auth error, connecting without token:`, (err as Error).message);
    }
  }

  private connect(): void {
    this.socket = io(SERVER_URL, {
      auth: { token: this.token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      console.log(`[BOT] Connected (socket: ${this.socket!.id})`);
      if (AUTO_CREATE_ROOM && !this.currentRoom) {
        this.createRoom();
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`[BOT] Disconnected: ${reason}`);
      this.gameActive = false;
      this.currentRoom = null;
      this.myColor = null;
    });

    this.socket.on("game:state", (state: RoomState) => {
      this.handleGameState(state);
    });

    this.socket.on("game:error", (err: { code: string; message: string }) => {
      console.log(`[BOT] Error: ${err.code} - ${err.message}`);

      if (err.code === "ROOM_EXISTS" || err.code === "ALREADY_IN_ROOM") {
        setTimeout(() => this.createRoom(), 2000);
      }
    });
  }

  private createRoom(): void {
    const roomId = `bot_${Date.now().toString(36)}`;
    console.log(`[BOT] Creating room: ${roomId}`);
    this.socket!.emit("game:create", { roomId });
  }

  joinRoom(roomId: string): void {
    console.log(`[BOT] Joining room: ${roomId}`);
    this.socket!.emit("game:join", { roomId });
  }

  private handleGameState(state: RoomState): void {
    const socketId = this.socket!.id;

    if (state.players.white?.socketId === socketId) {
      this.myColor = "white";
    } else if (state.players.black?.socketId === socketId) {
      this.myColor = "black";
    } else {
      return;
    }

    this.currentRoom = state.roomId;

    if (state.game.status === "waiting") {
      console.log(`[BOT] Waiting for opponent in room ${state.roomId}...`);
      return;
    }

    if (state.game.status === "finished") {
      this.handleGameOver(state);
      return;
    }

    if (state.game.status === "active") {
      this.gameActive = true;

      if (state.game.turn === this.myColor) {
        this.scheduleMove(state);
      }
    }
  }

  private scheduleMove(state: RoomState): void {
    if (this.moveTimeout) clearTimeout(this.moveTimeout);

    const delay = MOVE_DELAY_MS + Math.floor(Math.random() * 500);
    this.moveTimeout = setTimeout(() => {
      this.makeMove(state);
    }, delay);
  }

  private makeMove(state: RoomState): void {
    if (!this.gameActive || !this.currentRoom || !this.myColor) return;

    const startTime = Date.now();
    const bestMove = findBestMove(state.game.fen, SEARCH_DEPTH);
    const elapsed = Date.now() - startTime;

    if (!bestMove) {
      console.log(`[BOT] No move found - game may be over`);
      return;
    }

    console.log(
      `[BOT] Move: ${bestMove.san} (${bestMove.from}->${bestMove.to}) [${elapsed}ms, depth=${SEARCH_DEPTH}]`
    );

    this.socket!.emit("game:move", {
      roomId: this.currentRoom,
      from: bestMove.from,
      to: bestMove.to,
      promotion: bestMove.promotion,
    });
  }

  private handleGameOver(state: RoomState): void {
    this.gameActive = false;
    this.gamesPlayed++;

    if (state.game.winner === this.myColor) {
      this.wins++;
      console.log(`[BOT] WON by ${state.game.endReason}! (${this.wins}W/${this.losses}L/${this.gamesPlayed}G)`);
    } else if (state.game.winner) {
      this.losses++;
      console.log(`[BOT] LOST by ${state.game.endReason}. (${this.wins}W/${this.losses}L/${this.gamesPlayed}G)`);
    } else {
      console.log(`[BOT] DRAW by ${state.game.endReason}. (${this.wins}W/${this.losses}L/${this.gamesPlayed}G)`);
    }

    if (this.moveTimeout) clearTimeout(this.moveTimeout);

    setTimeout(() => {
      if (this.currentRoom) {
        this.socket!.emit("game:leave", { roomId: this.currentRoom });
      }
      this.currentRoom = null;
      this.myColor = null;

      setTimeout(() => {
        if (AUTO_CREATE_ROOM) {
          this.createRoom();
        }
      }, 3000);
    }, 2000);
  }

  stop(): void {
    console.log(`[BOT] Shutting down...`);
    console.log(`[BOT] Stats: ${this.wins}W / ${this.losses}L / ${this.gamesPlayed} games`);

    if (this.moveTimeout) clearTimeout(this.moveTimeout);
    if (this.currentRoom && this.socket) {
      this.socket.emit("game:leave", { roomId: this.currentRoom });
    }
    this.socket?.disconnect();
  }
}

const bot = new ChessBot();

process.on("SIGINT", () => { bot.stop(); process.exit(0); });
process.on("SIGTERM", () => { bot.stop(); process.exit(0); });

bot.start().catch((err) => {
  console.error("[BOT] Fatal error:", err);
  process.exit(1);
});
