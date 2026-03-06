export type PlayerColor = "white" | "black";

export interface GameState {
  fen: string;
  board: string;
  clocks: {
    whiteMs: number;
    blackMs: number;
  };
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
  userId?: string;
  username?: string;
}

export interface RoomState {
  roomId: string;
  players: {
    white: RoomPlayer | null;
    black: RoomPlayer | null;
  };
  spectators: string[];
  game: GameState;
}

export interface CreateRoomInput {
  roomId: string;
  creatorSocketId: string;
  userId?: string;
  username?: string;
}

export interface JoinRoomInput {
  roomId: string;
  socketId: string;
  userId?: string;
  username?: string;
}

export interface MoveInput {
  roomId: string;
  socketId: string;
  from: string;
  to: string;
  promotion?: string;
}

export interface ResignInput {
  roomId: string;
  socketId: string;
}

export interface LeaveRoomInput {
  roomId: string;
  socketId: string;
}

export class RoomError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RoomError";
    this.code = code;
  }
}