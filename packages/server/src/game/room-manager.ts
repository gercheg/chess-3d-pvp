import {
  type CreateRoomInput,
  type GameState,
  type JoinRoomInput,
  type LeaveRoomInput,
  type RoomPlayer,
  type RoomState,
  RoomError
} from "./types.js";

const DEFAULT_GAME_STATE: GameState = {
  board: "startpos",
  clocks: {
    whiteMs: 5 * 60 * 1000,
    blackMs: 5 * 60 * 1000
  },
  history: [],
  status: "waiting",
  winner: null,
  endReason: null
};

const generateRoomId = (): string => `room_${Math.random().toString(36).slice(2, 10)}`;

export class RoomManager {
  private readonly rooms = new Map<string, RoomState>();
  private readonly socketRooms = new Map<string, Set<string>>();

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
        white: this.player(input.creatorSocketId, "white"),
        black: null
      },
      spectators: [],
      game: { ...DEFAULT_GAME_STATE }
    };

    this.rooms.set(roomId, room);
    this.trackMembership(input.creatorSocketId, roomId);
    return this.cloneRoom(room);
  }

  joinRoom(input: JoinRoomInput): RoomState {
    const room = this.getRequiredRoom(input.roomId);
    this.assertSocketNotInRoom(room, input.socketId);

    if (!room.players.black) {
      room.players.black = this.player(input.socketId, "black");
      if (room.players.white) {
        room.game.status = "active";
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
      return { room: null, deleted: true };
    }

    if (!room.players.white || !room.players.black) {
      if (room.game.status === "active") {
        room.game.status = "finished";
      } else if (room.game.status === "waiting") {
        room.game.status = "waiting";
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

  private player(socketId: string, color: RoomPlayer["color"]): RoomPlayer {
    return { socketId, color };
  }

  private applyForfeit(room: RoomState, winner: "white" | "black"): void {
    if (room.game.status === "active") {
      room.game.status = "finished";
      room.game.winner = winner;
      room.game.endReason = "forfeit";
    }
  }

  private trackMembership(socketId: string, roomId: string): void {
    const memberships = this.socketRooms.get(socketId) ?? new Set<string>();
    memberships.add(roomId);
    this.socketRooms.set(socketId, memberships);
  }

  private untrackMembership(socketId: string, roomId: string): void {
    const memberships = this.socketRooms.get(socketId);
    if (!memberships) {
      return;
    }
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
        black: room.players.black ? { ...room.players.black } : null
      },
      spectators: [...room.spectators],
      game: {
        board: room.game.board,
        clocks: { ...room.game.clocks },
        history: [...room.game.history],
        status: room.game.status,
        winner: room.game.winner,
        endReason: room.game.endReason
      }
    };
  }
}