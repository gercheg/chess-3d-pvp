import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket, type RoomState, type GameError } from "../socket";
import type { Socket } from "socket.io-client";

interface UseSocketReturn {
  socket: Socket;
  connected: boolean;
  roomState: RoomState | null;
  error: GameError | null;
  createRoom: (roomId?: string) => void;
  joinRoom: (roomId: string) => void;
  spectateRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  clearError: () => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket>(getSocket());
  const [connected, setConnected] = useState(socketRef.current.connected);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<GameError | null>(null);

  useEffect(() => {
    const s = socketRef.current;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onState = (state: RoomState) => setRoomState(state);
    const onError = (err: GameError) => setError(err);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("game:state", onState);
    s.on("game:error", onError);

    if (!s.connected) s.connect();

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("game:state", onState);
      s.off("game:error", onError);
    };
  }, []);

  const createRoom = useCallback((roomId?: string) => {
    setError(null);
    socketRef.current.emit("game:create", roomId ? { roomId } : {});
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    setError(null);
    socketRef.current.emit("game:join", { roomId });
  }, []);

  const spectateRoom = useCallback((roomId: string) => {
    setError(null);
    socketRef.current.emit("game:spectate", { roomId });
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    setError(null);
    socketRef.current.emit("game:leave", { roomId });
    setRoomState(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    socket: socketRef.current,
    connected,
    roomState,
    error,
    createRoom,
    joinRoom,
    spectateRoom,
    leaveRoom,
    clearError,
  };
}
