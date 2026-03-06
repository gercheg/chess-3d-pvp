/**
 * Quick script to make moves as the player against the bot.
 * Connects to the server, joins the bot's room, and plays moves.
 */
import { io } from "socket.io-client";

const SERVER = process.env.SERVER || "http://localhost:8080";
const ROOM = process.argv[2];

if (!ROOM) {
  console.log("Usage: npx tsx src/bot/player-move.ts <room_id>");
  process.exit(1);
}

const MOVES = [
  { from: "e7", to: "e5" },
  { from: "d7", to: "d5" },
  { from: "g8", to: "f6" },
  { from: "b8", to: "c6" },
  { from: "f8", to: "c5" },
  { from: "e8", to: "g8" },
];

let moveIndex = 0;

const socket = io(SERVER, { transports: ["websocket"] });

socket.on("connect", () => {
  console.log(`[PLAYER] Connected: ${socket.id}`);
  console.log(`[PLAYER] Joining room: ${ROOM}`);
  socket.emit("game:join", { roomId: ROOM });
});

socket.on("game:state", (state: any) => {
  const myColor = state.players.black?.socketId === socket.id ? "black" : 
                   state.players.white?.socketId === socket.id ? "white" : null;

  if (!myColor) return;

  console.log(`[PLAYER] Status: ${state.game.status}, Turn: ${state.game.turn}, My color: ${myColor}`);
  console.log(`[PLAYER] FEN: ${state.game.fen}`);
  console.log(`[PLAYER] Moves: ${state.game.history.join(", ")}`);

  if (state.game.status === "finished") {
    const result = state.game.winner === myColor ? "WON" : state.game.winner ? "LOST" : "DRAW";
    console.log(`[PLAYER] Game ${result} by ${state.game.endReason}`);
    setTimeout(() => process.exit(0), 1000);
    return;
  }

  if (state.game.status === "active" && state.game.turn === myColor) {
    if (moveIndex < MOVES.length) {
      const move = MOVES[moveIndex];
      console.log(`[PLAYER] Making move: ${move.from}-${move.to}`);
      setTimeout(() => {
        socket.emit("game:move", { roomId: ROOM, from: move.from, to: move.to });
        moveIndex++;
      }, 1000);
    } else {
      console.log(`[PLAYER] No more pre-programmed moves. Watching...`);
    }
  }
});

socket.on("game:error", (err: any) => {
  console.error(`[PLAYER] Error: ${err.code} - ${err.message}`);
  if (err.code === "ILLEGAL_MOVE") {
    moveIndex++;
  }
});

socket.on("disconnect", () => {
  console.log(`[PLAYER] Disconnected`);
});
