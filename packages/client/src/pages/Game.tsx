import { useState, useCallback, useEffect } from "react";
import { useSocket } from "../hooks/useSocket";
import { useAudio } from "../hooks/useAudio";
import { useAuth } from "../store";
import ChessBoard3D from "../components/ChessBoard3D";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import type { PlayerColor } from "../socket";

type Phase = "lobby" | "waiting" | "playing" | "finished";

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function Game() {
  const { auth } = useAuth();
  const { socket, connected, roomState, error, createRoom, joinRoom, leaveRoom, clearError } =
    useSocket();
  const { play, startBgm, stopBgm } = useAudio();
  const [roomInput, setRoomInput] = useState("");
  const [prevPhaseRef, setPrevPhase] = useState<Phase>("lobby");

  const phase: Phase = !roomState
    ? "lobby"
    : roomState.game.status === "waiting"
      ? "waiting"
      : roomState.game.status === "active"
        ? "playing"
        : "finished";

  const myColor: PlayerColor | null =
    roomState?.players.white?.socketId === socket.id
      ? "white"
      : roomState?.players.black?.socketId === socket.id
        ? "black"
        : null;

  const isSpectator = roomState ? !myColor : false;

  useEffect(() => {
    if (phase === "playing" && prevPhaseRef !== "playing") {
      startBgm();
      play("welcome");
    }
    if (phase === "finished" && prevPhaseRef === "playing") {
      stopBgm();
      play("game-over");
      if (roomState?.game.winner === myColor) play("victory");
      else if (roomState?.game.winner && !isSpectator) play("defeat");
    }
    if (phase === "lobby" && prevPhaseRef !== "lobby") {
      stopBgm();
    }
    setPrevPhase(phase);
  }, [phase, prevPhaseRef, startBgm, stopBgm, play, roomState, myColor, isSpectator]);

  const handleCreate = useCallback(() => {
    createRoom(roomInput.trim() || undefined);
  }, [createRoom, roomInput]);

  const handleJoin = useCallback(() => {
    if (roomInput.trim()) joinRoom(roomInput.trim());
  }, [joinRoom, roomInput]);

  const handleLeave = useCallback(() => {
    if (roomState) leaveRoom(roomState.roomId);
  }, [leaveRoom, roomState]);

  const handleMove = useCallback(
    (from: string, to: string) => {
      socket.emit("game:move", { roomId: roomState?.roomId, from, to });
    },
    [socket, roomState]
  );

  if (!auth.user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="text-center max-w-md">
          <h2 className="text-2xl font-heading neon-text mb-3">Login Required</h2>
          <p className="text-chess-muted mb-4">Sign in to play chess matches.</p>
          <a href="/login">
            <Button variant="primary">Login</Button>
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 animate-fade-in">
      <img
        src="/assets/game-bg.png"
        alt=""
        className="fixed inset-0 w-full h-full object-cover opacity-10 pointer-events-none -z-10"
        loading="lazy"
      />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading neon-text">
          {phase === "lobby" && "Game Lobby"}
          {phase === "waiting" && "Waiting for Opponent..."}
          {phase === "playing" && "Game In Progress"}
          {phase === "finished" && "Game Over"}
        </h1>
        <div className="flex items-center gap-3">
          <Badge variant={connected ? "success" : "danger"}>
            {connected ? "Connected" : "Disconnected"}
          </Badge>
          {roomState && (
            <Badge variant="info">{roomState.roomId}</Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <span>{error.message}</span>
          <button onClick={clearError} className="text-red-300 hover:text-white cursor-pointer transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {phase === "lobby" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-lg font-heading text-chess-text mb-4">Create a Room</h2>
            <div className="space-y-3">
              <Input
                placeholder="Room name (optional)"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
              />
              <Button onClick={handleCreate} className="w-full" variant="primary">
                Create Room
              </Button>
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-heading text-chess-text mb-4">Join a Room</h2>
            <div className="space-y-3">
              <Input
                placeholder="Enter room ID"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
              />
              <Button onClick={handleJoin} className="w-full" variant="ghost" disabled={!roomInput.trim()}>
                Join Room
              </Button>
            </div>
          </Card>
        </div>
      )}

      {phase === "waiting" && (
        <Card className="text-center py-12" glow>
          <Spinner size="lg" className="mb-4" />
          <p className="text-chess-muted text-lg">Waiting for an opponent to join...</p>
          <p className="text-chess-muted/60 text-sm mt-2">
            Room: <span className="text-chess-secondary font-mono">{roomState?.roomId}</span>
          </p>
          <Button onClick={handleLeave} variant="ghost" className="mt-6">Leave Room</Button>
        </Card>
      )}

      {(phase === "playing" || phase === "finished") && roomState && (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4">
            <div className="h-[500px] lg:h-[600px] rounded-2xl overflow-hidden neon-border scanline-overlay">
              <ChessBoard3D
                fen={roomState.game.fen}
                interactive={phase === "playing" && !!myColor && roomState.game.turn === myColor}
                playerColor={myColor ?? undefined}
                isCheck={roomState.game.isCheck}
                onMove={handleMove}
              />
            </div>
            {phase === "playing" && (
              <div className={`text-center py-2 rounded-lg text-sm font-medium ${
                roomState.game.turn === myColor
                  ? "bg-chess-primary/20 text-chess-primary border border-chess-primary/30"
                  : "bg-chess-surface text-chess-muted"
              }`}>
                {roomState.game.turn === myColor ? "Your turn" : `${roomState.game.turn}'s turn`}
                {roomState.game.isCheck && <span className="ml-2 text-red-400 font-bold">CHECK!</span>}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Timers */}
            <Card>
              <div className="space-y-3">
                <div className={`flex items-center justify-between p-3 rounded-lg ${myColor === "black" ? "bg-chess-primary/10 border border-chess-primary/30" : "bg-chess-surface"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-600" />
                    <span className="text-sm font-medium text-chess-text">
                      {roomState.players.black ? "Black" : "Waiting..."}
                    </span>
                  </div>
                  <span className="font-mono text-lg text-chess-text">
                    {formatTime(roomState.game.clocks.blackMs)}
                  </span>
                </div>
                <div className={`flex items-center justify-between p-3 rounded-lg ${myColor === "white" ? "bg-chess-primary/10 border border-chess-primary/30" : "bg-chess-surface"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-white border border-zinc-300" />
                    <span className="text-sm font-medium text-chess-text">
                      {roomState.players.white ? "White" : "Waiting..."}
                    </span>
                  </div>
                  <span className="font-mono text-lg text-chess-text">
                    {formatTime(roomState.game.clocks.whiteMs)}
                  </span>
                </div>
              </div>
            </Card>

            {isSpectator && (
              <Badge variant="info" className="w-full justify-center py-2">
                Spectating
              </Badge>
            )}

            {/* Move History */}
            <Card>
              <h3 className="text-sm font-heading text-chess-muted mb-2">Moves</h3>
              <div className="max-h-48 overflow-y-auto space-y-1 text-sm font-mono">
                {roomState.game.history.length === 0 ? (
                  <p className="text-chess-muted/50 text-xs">No moves yet</p>
                ) : (
                  roomState.game.history.map((move, i) => (
                    <div
                      key={i}
                      className={`px-2 py-1 rounded ${i % 2 === 0 ? "bg-chess-surface" : ""}`}
                    >
                      <span className="text-chess-muted w-6 inline-block">{Math.floor(i / 2) + 1}.</span>
                      <span className="text-chess-text">{move}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Game Result */}
            {phase === "finished" && (
              <Card glow>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-heading text-chess-text">
                    {roomState.game.winner
                      ? `${roomState.game.winner === myColor ? "You Win!" : isSpectator ? `${roomState.game.winner} wins` : "You Lose"}`
                      : "Draw"}
                  </h3>
                  {roomState.game.endReason && (
                    <p className="text-chess-muted text-sm capitalize">{roomState.game.endReason}</p>
                  )}
                </div>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {phase === "playing" && myColor && (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => socket.emit("game:resign", { roomId: roomState.roomId })}
                >
                  Resign
                </Button>
              )}
              <Button variant="ghost" className="w-full" onClick={handleLeave}>
                {phase === "finished" ? "Back to Lobby" : "Leave Game"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
