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
      const roomId = typeof payload === "object" && payload && "roomId" in payload
        ? String((payload as { roomId?: string }).roomId ?? "")
        : "";
      const room = roomManager.createRoom({ roomId, creatorSocketId: socket.id });
      socket.join(room.roomId);
      broadcastState(room.roomId);
    } catch (error) {
      emitError(error);
    }
  });

  socket.on("game:join", (payload?: unknown) => {
    try {
      const roomId = typeof payload === "object" && payload && "roomId" in payload
        ? String((payload as { roomId?: string }).roomId ?? "")
        : "";
      const room = roomManager.joinRoom({ roomId, socketId: socket.id });
      socket.join(room.roomId);
      broadcastState(room.roomId);
    } catch (error) {
      emitError(error);
    }
  });

  socket.on("game:spectate", (payload?: unknown) => {
    try {
      const roomId = typeof payload === "object" && payload && "roomId" in payload
        ? String((payload as { roomId?: string }).roomId ?? "")
        : "";
      const room = roomManager.spectateRoom({ roomId, socketId: socket.id });
      socket.join(room.roomId);
      broadcastState(room.roomId);
    } catch (error) {
      emitError(error);
    }
  });

  socket.on("game:leave", (payload?: unknown) => {
    try {
      const roomId = typeof payload === "object" && payload && "roomId" in payload
        ? String((payload as { roomId?: string }).roomId ?? "")
        : "";
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