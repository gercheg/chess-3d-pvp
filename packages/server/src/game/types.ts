export type PlayerColor = "white" | "black";

export interface GameState {
  board: string;
  clocks: {
    whiteMs: number;
    blackMs: number;
  };
  history: string[];
  status: "waiting" | "active" | "finished";
  winner: PlayerColor | null;
  endReason: "checkmate" | "timeout" | "resign" | "forfeit" | null;
}

export interface RoomPlayer {
  socketId: string;
  color: PlayerColor;
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
}

export interface JoinRoomInput {
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