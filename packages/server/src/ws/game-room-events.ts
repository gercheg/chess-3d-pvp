import { RoomError } from "../game/types.js";
import { RoomManager } from "../game/room-manager.js";

type EventHandler = (payload?: unknown) => void;

export interface SocketLike {
  id: string;
  on(event: string, handler: EventHandler): void;
  join(roomId: string): void;
  leave(roomId: string): void;
  emit(event: string, payload: unknown): void;
}

export interface IoLike {
  to(roomId: string): { emit(event: string, payload: unknown): void };
}

function extractString(payload: unknown, key: string): string {
  if (typeof payload === "object" && payload && key in payload) {
    return String((payload as Record<string, unknown>)[key] ?? "");
  }
  return "";
}

export const registerGameRoomHandlers = (socket: SocketLike, io: IoLike, roomManager: RoomManager): void => {
  const broadcastState = (roomId: string): void => {
    io.to(roomId).emit("game:state", roomManager.getRoomState(roomId));
  };

  const emitError = (err: unknown): void => {
    if (err instanceof RoomError) {
      socket.emit("game:error", { code: err.code, message: err.message });
      return;
    }
    socket.emit("game:error", { code: "UNKNOWN", message: "Unexpected room operation failure." });
  };

  socket.on("game:create", (payload?: unknown) => {
    try {
      const roomId = extractString(payload, "roomId");
      const room = roomManager.createRoom({ roomId, creatorSocketId: socket.id });
      socket.join(room.roomId);
      broadcastState(room.roomId);
    } catch (error) {
      emitError(error);
    }
  });

  socket.on("game:join", (payload?: unknown) => {
    try {
      const roomId = extractString(payload, "roomId");
      const room = roomManager.joinRoom({ roomId, socketId: socket.id });
      socket.join(room.roomId);
      broadcastState(room.roomId);
    } catch (error) {
      emitError(error);
    }
  });

  socket.on("game:spectate", (payload?: unknown) => {
    try {
      const roomId = extractString(payload, "roomId");
      const room = roomManager.spectateRoom({ roomId, socketId: socket.id });
      socket.join(room.roomId);
      broadcastState(room.roomId);
    } catch (error) {
      emitError(error);
    }
  });

  socket.on("game:move", (payload?: unknown) => {
    try {
      const roomId = extractString(payload, "roomId");
      const from = extractString(payload, "from");
      const to = extractString(payload, "to");
      const promotion = extractString(payload, "promotion") || undefined;

      roomManager.makeMove({ roomId, socketId: socket.id, from, to, promotion });
      broadcastState(roomId);
    } catch (error) {
      emitError(error);
    }
  });

  socket.on("game:resign", (payload?: unknown) => {
    try {
      const roomId = extractString(payload, "roomId");
      roomManager.resign({ roomId, socketId: socket.id });
      broadcastState(roomId);
    } catch (error) {
      emitError(error);
    }
  });

  socket.on("game:rooms", (_payload?: unknown) => {
    try {
      const rooms = roomManager.listActiveRooms();
      socket.emit("game:rooms", rooms);
    } catch (error) {
      emitError(error);
    }
  });

  socket.on("game:leave", (payload?: unknown) => {
    try {
      const roomId = extractString(payload, "roomId");
      const result = roomManager.leaveRoom({ roomId, socketId: socket.id });
      socket.leave(roomId);
      if (!result.deleted && result.room) {
        broadcastState(roomId);
      }
    } catch (error) {
      emitError(error);
    }
  });

  socket.on("disconnect", () => {
    const results = roomManager.leaveAllRoomsForSocket(socket.id);
    for (const result of results) {
      if (!result.deleted && result.room) {
        broadcastState(result.roomId);
      }
    }
  });
};
