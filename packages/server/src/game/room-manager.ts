import {
  type CreateRoomInput,
  type GameState,
  type JoinRoomInput,
  type LeaveRoomInput,
  type MoveInput,
  type ResignInput,
  type RoomPlayer,
  type RoomState,
  type PlayerColor,
  RoomError,
} from "./types.js";
import { ChessEngine } from "./chess-engine.js";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function makeDefaultGameState(): GameState {
  return {
    fen: STARTING_FEN,
    board: STARTING_FEN,
    clocks: { whiteMs: 5 * 60 * 1000, blackMs: 5 * 60 * 1000 },
    turn: "white",
    history: [],
    status: "waiting",
    winner: null,
    endReason: null,
    isCheck: false,
  };
}

const generateRoomId = (): string => `room_${Math.random().toString(36).slice(2, 10)}`;

export class RoomManager {
  private readonly rooms = new Map<string, RoomState>();
  private readonly engines = new Map<string, ChessEngine>();
  private readonly socketRooms = new Map<string, Set<string>>();
  private readonly clockIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private readonly lastMoveTime = new Map<string, number>();

  private onStateChange?: (roomId: string) => void;

  setOnStateChange(callback: (roomId: string) => void): void {
    this.onStateChange = callback;
  }

  createRoom(input: Partial<CreateRoomInput> & Pick<CreateRoomInput, "creatorSocketId">): RoomState {
    const roomId = input.roomId?.trim() || generateRoomId();
    if (!roomId) {
      throw new RoomError("INVALID_ROOM_ID", "Room id is required.");
    }
    if (this.rooms.has(roomId)) {
      throw new RoomError("ROOM_EXISTS", `Room ${roomId} already exists.`);
    }

    const room: RoomState = {
      roomId,
      players: {
        white: this.player(input.creatorSocketId, "white", input.userId, input.username),
        black: null,
      },
      spectators: [],
      game: makeDefaultGameState(),
    };

    this.rooms.set(roomId, room);
    this.engines.set(roomId, new ChessEngine());
    this.trackMembership(input.creatorSocketId, roomId);
    return this.cloneRoom(room);
  }

  joinRoom(input: JoinRoomInput): RoomState {
    const room = this.getRequiredRoom(input.roomId);
    this.assertSocketNotInRoom(room, input.socketId);

    if (!room.players.black) {
      room.players.black = this.player(input.socketId, "black", input.userId, input.username);
      if (room.players.white) {
        room.game.status = "active";
        this.startClock(input.roomId);
      }
      this.trackMembership(input.socketId, input.roomId);
      return this.cloneRoom(room);
    }

    throw new RoomError("ROOM_FULL", "Room already has two players. Use spectate.");
  }

  spectateRoom(input: JoinRoomInput): RoomState {
    const room = this.getRequiredRoom(input.roomId);

    if (this.isPlayer(room, input.socketId)) {
      throw new RoomError("ALREADY_PLAYER", "Players cannot join as spectators.");
    }
    if (room.spectators.includes(input.socketId)) {
      throw new RoomError("ALREADY_SPECTATING", "Socket is already spectating this room.");
    }

    room.spectators.push(input.socketId);
    this.trackMembership(input.socketId, input.roomId);
    return this.cloneRoom(room);
  }

  makeMove(input: MoveInput): RoomState {
    const room = this.getRequiredRoom(input.roomId);

    if (room.game.status !== "active") {
      throw new RoomError("GAME_NOT_ACTIVE", "Game is not active.");
    }

    const playerColor = this.getPlayerColor(room, input.socketId);
    if (!playerColor) {
      throw new RoomError("NOT_A_PLAYER", "Only players can make moves.");
    }

    const engine = this.engines.get(input.roomId);
    if (!engine) {
      throw new RoomError("ENGINE_ERROR", "Chess engine not found for room.");
    }

    const expectedTurn = engine.turn === "w" ? "white" : "black";
    if (playerColor !== expectedTurn) {
      throw new RoomError("NOT_YOUR_TURN", "It's not your turn.");
    }

    const result = engine.tryMove({
      from: input.from,
      to: input.to,
      promotion: input.promotion,
    });

    if (!result) {
      throw new RoomError("ILLEGAL_MOVE", `Move ${input.from}-${input.to} is illegal.`);
    }

    this.tickClock(input.roomId);

    room.game.fen = result.fen;
    room.game.board = result.fen;
    room.game.history = engine.history;
    room.game.turn = result.turn === "w" ? "white" : "black";
    room.game.isCheck = result.isCheck;

    if (result.isCheckmate) {
      room.game.status = "finished";
      room.game.winner = playerColor;
      room.game.endReason = "checkmate";
      this.stopClock(input.roomId);
    } else if (result.isStalemate) {
      room.game.status = "finished";
      room.game.winner = null;
      room.game.endReason = "stalemate";
      this.stopClock(input.roomId);
    } else if (result.isDraw) {
      room.game.status = "finished";
      room.game.winner = null;
      room.game.endReason = "draw";
      this.stopClock(input.roomId);
    }

    return this.cloneRoom(room);
  }

  resign(input: ResignInput): RoomState {
    const room = this.getRequiredRoom(input.roomId);

    if (room.game.status !== "active") {
      throw new RoomError("GAME_NOT_ACTIVE", "Game is not active.");
    }

    const playerColor = this.getPlayerColor(room, input.socketId);
    if (!playerColor) {
      throw new RoomError("NOT_A_PLAYER", "Only players can resign.");
    }

    room.game.status = "finished";
    room.game.winner = playerColor === "white" ? "black" : "white";
    room.game.endReason = "resign";
    this.stopClock(input.roomId);

    return this.cloneRoom(room);
  }

  leaveRoom(input: LeaveRoomInput): { room: RoomState | null; deleted: boolean } {
    const room = this.getRequiredRoom(input.roomId);
    let changed = false;

    if (room.players.white?.socketId === input.socketId) {
      room.players.white = null;
      changed = true;
      this.applyForfeit(room, "black");
    }

    if (room.players.black?.socketId === input.socketId) {
      room.players.black = null;
      changed = true;
      this.applyForfeit(room, "white");
    }

    const previousSpectatorCount = room.spectators.length;
    room.spectators = room.spectators.filter((id: string) => id !== input.socketId);
    if (room.spectators.length !== previousSpectatorCount) {
      changed = true;
    }

    if (!changed) {
      throw new RoomError("NOT_IN_ROOM", "Socket is not part of this room.");
    }

    this.untrackMembership(input.socketId, input.roomId);

    if (!room.players.white && !room.players.black && room.spectators.length === 0) {
      this.rooms.delete(input.roomId);
      this.engines.delete(input.roomId);
      this.stopClock(input.roomId);
      return { room: null, deleted: true };
    }

    if (!room.players.white || !room.players.black) {
      if (room.game.status === "active") {
        room.game.status = "finished";
        this.stopClock(input.roomId);
      }
    }

    return { room: this.cloneRoom(room), deleted: false };
  }

  leaveAllRoomsForSocket(socketId: string): Array<{ roomId: string; room: RoomState | null; deleted: boolean }> {
    const memberships = Array.from(this.socketRooms.get(socketId) ?? []);
    const results: Array<{ roomId: string; room: RoomState | null; deleted: boolean }> = [];

    for (const roomId of memberships) {
      try {
        const result = this.leaveRoom({ roomId, socketId });
        results.push({ roomId, ...result });
      } catch {
        this.untrackMembership(socketId, roomId);
      }
    }

    return results;
  }

  getRoomState(roomId: string): RoomState {
    return this.cloneRoom(this.getRequiredRoom(roomId));
  }

  listActiveRooms(): RoomState[] {
    const result: RoomState[] = [];
    for (const room of this.rooms.values()) {
      if (room.game.status === "waiting") {
        result.push(this.cloneRoom(room));
      }
    }
    return result;
  }

  private startClock(roomId: string): void {
    this.lastMoveTime.set(roomId, Date.now());

    const interval = setInterval(() => {
      const room = this.rooms.get(roomId);
      if (!room || room.game.status !== "active") {
        this.stopClock(roomId);
        return;
      }

      const now = Date.now();
      const elapsed = now - (this.lastMoveTime.get(roomId) ?? now);

      if (room.game.turn === "white") {
        room.game.clocks.whiteMs = Math.max(0, room.game.clocks.whiteMs - elapsed);
        if (room.game.clocks.whiteMs <= 0) {
          room.game.status = "finished";
          room.game.winner = "black";
          room.game.endReason = "timeout";
          this.stopClock(roomId);
          this.onStateChange?.(roomId);
        }
      } else {
        room.game.clocks.blackMs = Math.max(0, room.game.clocks.blackMs - elapsed);
        if (room.game.clocks.blackMs <= 0) {
          room.game.status = "finished";
          room.game.winner = "white";
          room.game.endReason = "timeout";
          this.stopClock(roomId);
          this.onStateChange?.(roomId);
        }
      }

      this.lastMoveTime.set(roomId, now);
    }, 1000);

    this.clockIntervals.set(roomId, interval);
  }

  private tickClock(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const now = Date.now();
    const elapsed = now - (this.lastMoveTime.get(roomId) ?? now);

    if (room.game.turn === "white") {
      room.game.clocks.whiteMs = Math.max(0, room.game.clocks.whiteMs - elapsed);
    } else {
      room.game.clocks.blackMs = Math.max(0, room.game.clocks.blackMs - elapsed);
    }

    this.lastMoveTime.set(roomId, now);
  }

  private stopClock(roomId: string): void {
    const interval = this.clockIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.clockIntervals.delete(roomId);
    }
    this.lastMoveTime.delete(roomId);
  }

  private getRequiredRoom(roomId: string): RoomState {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new RoomError("ROOM_NOT_FOUND", `Room ${roomId} was not found.`);
    }
    return room;
  }

  private assertSocketNotInRoom(room: RoomState, socketId: string): void {
    if (this.isPlayer(room, socketId) || room.spectators.includes(socketId)) {
      throw new RoomError("ALREADY_IN_ROOM", "Socket is already in this room.");
    }
  }

  private isPlayer(room: RoomState, socketId: string): boolean {
    return room.players.white?.socketId === socketId || room.players.black?.socketId === socketId;
  }

  private getPlayerColor(room: RoomState, socketId: string): PlayerColor | null {
    if (room.players.white?.socketId === socketId) return "white";
    if (room.players.black?.socketId === socketId) return "black";
    return null;
  }

  private player(socketId: string, color: RoomPlayer["color"], userId?: string, username?: string): RoomPlayer {
    return { socketId, color, userId, username };
  }

  private applyForfeit(room: RoomState, winner: "white" | "black"): void {
    if (room.game.status === "active") {
      room.game.status = "finished";
      room.game.winner = winner;
      room.game.endReason = "forfeit";
      this.stopClock(room.roomId);
    }
  }

  private trackMembership(socketId: string, roomId: string): void {
    const memberships = this.socketRooms.get(socketId) ?? new Set<string>();
    memberships.add(roomId);
    this.socketRooms.set(socketId, memberships);
  }

  private untrackMembership(socketId: string, roomId: string): void {
    const memberships = this.socketRooms.get(socketId);
    if (!memberships) return;
    memberships.delete(roomId);
    if (memberships.size === 0) {
      this.socketRooms.delete(socketId);
    }
  }

  private cloneRoom(room: RoomState): RoomState {
    return {
      roomId: room.roomId,
      players: {
        white: room.players.white ? { ...room.players.white } : null,
        black: room.players.black ? { ...room.players.black } : null,
      },
      spectators: [...room.spectators],
      game: {
        fen: room.game.fen,
        board: room.game.board,
        clocks: { ...room.game.clocks },
        turn: room.game.turn,
        history: [...room.game.history],
        status: room.game.status,
        winner: room.game.winner,
        endReason: room.game.endReason,
        isCheck: room.game.isCheck,
      },
    };
  }
}
