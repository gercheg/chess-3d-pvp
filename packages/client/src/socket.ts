import { io, type Socket } from "socket.io-client";

export type PlayerColor = "white" | "black";

export interface GameState {
  fen: string;
  board: string;
  clocks: { whiteMs: number; blackMs: number };
  turn: PlayerColor;
  history: string[];
  status: "waiting" | "active" | "finished";
  winner: PlayerColor | null;
  endReason: "checkmate" | "stalemate" | "draw" | "timeout" | "resign" | "forfeit" | null;
  isCheck: boolean;
}

export interface RoomPlayer {
  socketId: string;
  color: PlayerColor;
}

export interface RoomState {
  roomId: string;
  players: { white: RoomPlayer | null; black: RoomPlayer | null };
  spectators: string[];
  game: GameState;
}

export interface GameError {
  code: string;
  message: string;
}

const SERVER_URL =
  import.meta.env.VITE_API_URL ||
  "https://chess-server-801657053917.europe-west1.run.app";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const token = localStorage.getItem("chess_token");

  socket = io(SERVER_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: token ? { token } : undefined,
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
