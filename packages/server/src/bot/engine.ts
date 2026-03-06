import { Chess, type Move } from "chess.js";

/**
 * Chess AI engine with minimax + alpha-beta pruning + piece-square tables.
 * Based on: https://github.com/zeyu2001/chess-ai (Zhang Zeyu, MIT)
 * Adapted from Sunfish piece-square tables.
 */

const WEIGHTS: Record<string, number> = {
  p: 100, n: 280, b: 320, r: 479, q: 929, k: 60000, k_e: 60000,
};

const PST_W: Record<string, number[][]> = {
  p: [
    [100, 100, 100, 100, 105, 100, 100, 100],
    [78,  83,  86,  73, 102,  82,  85,  90],
    [7,   29,  21,  44,  40,  31,  44,   7],
    [-17, 16,  -2,  15,  14,   0,  15, -13],
    [-26,  3,  10,   9,   6,   1,   0, -23],
    [-22,  9,   5, -11, -10,  -2,   3, -19],
    [-31,  8,  -7, -37, -36, -14,   3, -31],
    [0,    0,   0,   0,   0,   0,   0,   0],
  ],
  n: [
    [-66, -53, -75, -75, -10, -55, -58, -70],
    [-3,   -6, 100, -36,   4,  62,  -4, -14],
    [10,   67,   1,  74,  73,  27,  62,  -2],
    [24,   24,  45,  37,  33,  41,  25,  17],
    [-1,    5,  31,  21,  22,  35,   2,   0],
    [-18,  10,  13,  22,  18,  15,  11, -14],
    [-23, -15,   2,   0,   2,   0, -23, -20],
    [-74, -23, -26, -24, -19, -35, -22, -69],
  ],
  b: [
    [-59, -78, -82, -76, -23, -107, -37, -50],
    [-11,  20,  35, -42, -39,  31,   2, -22],
    [-9,   39, -32,  41,  52, -10,  28, -14],
    [25,   17,  20,  34,  26,  25,  15,  10],
    [13,   10,  17,  23,  17,  16,   0,   7],
    [14,   25,  24,  15,   8,  25,  20,  15],
    [19,   20,  11,   6,   7,   6,  20,  16],
    [-7,    2, -15, -12, -14, -15, -10, -10],
  ],
  r: [
    [35,  29,  33,   4,  37,  33,  56,  50],
    [55,  29,  56,  67,  55,  62,  34,  60],
    [19,  35,  28,  33,  45,  27,  25,  15],
    [0,    5,  16,  13,  18,  -4,  -9,  -6],
    [-28, -35, -16, -21, -13, -29, -46, -30],
    [-42, -28, -42, -25, -25, -35, -26, -46],
    [-53, -38, -31, -26, -29, -43, -44, -53],
    [-30, -24, -18,   5,  -2, -18, -31, -32],
  ],
  q: [
    [6,    1,  -8, -104, 69,  24,  88,  26],
    [14,  32,  60,  -10, 20,  76,  57,  24],
    [-2,  43,  32,   60, 72,  63,  43,   2],
    [1,  -16,  22,   17, 25,  20, -13,  -6],
    [-14, -15,  -2,  -5, -1, -10, -20, -22],
    [-30,  -6, -13, -11, -16, -11, -16, -27],
    [-36, -18,   0, -19, -15, -15, -21, -38],
    [-39, -30, -31, -13, -31, -36, -34, -42],
  ],
  k: [
    [4,   54,  47, -99, -99,  60,  83, -62],
    [-32, 10,  55,  56,  56,  55,  10,   3],
    [-62, 12, -57,  44, -67,  28,  37, -31],
    [-55, 50,  11,  -4, -19,  13,   0, -49],
    [-55, -43, -52, -28, -51, -47,  -8, -50],
    [-47, -42, -43, -79, -64, -32, -29, -32],
    [-4,   3, -14, -50, -57, -18,  13,   4],
    [17,  30,  -3, -14,   6,  -1,  40,  18],
  ],
  k_e: [
    [-50, -40, -30, -20, -20, -30, -40, -50],
    [-30, -20, -10,   0,   0, -10, -20, -30],
    [-30, -10,  20,  30,  30,  20, -10, -30],
    [-30, -10,  30,  40,  40,  30, -10, -30],
    [-30, -10,  30,  40,  40,  30, -10, -30],
    [-30, -10,  20,  30,  30,  20, -10, -30],
    [-30, -30,   0,   0,   0,   0, -30, -30],
    [-50, -30, -30, -30, -30, -30, -30, -50],
  ],
};

const PST_B: Record<string, number[][]> = {};
for (const piece of Object.keys(PST_W)) {
  PST_B[piece] = [...PST_W[piece]].reverse();
}

const PST_SELF: Record<string, Record<string, number[][]>> = { w: PST_W, b: PST_B };
const PST_OPPONENT: Record<string, Record<string, number[][]>> = { w: PST_B, b: PST_W };

function evaluateBoard(
  game: Chess,
  move: Move,
  prevSum: number,
  color: "w" | "b"
): number {
  if (game.isCheckmate()) {
    return move.color === color ? 1e10 : -1e10;
  }
  if (game.isDraw() || game.isStalemate()) {
    return 0;
  }

  if (game.isCheck()) {
    prevSum += move.color === color ? 50 : -50;
  }

  const from = [8 - parseInt(move.from[1]), move.from.charCodeAt(0) - 97];
  const to = [8 - parseInt(move.to[1]), move.to.charCodeAt(0) - 97];

  let pieceKey = move.piece;
  if (prevSum < -1500 && move.piece === "k") {
    pieceKey = "k_e" as any;
  }

  if (move.captured) {
    const capturedKey = move.captured;
    if (move.color === color) {
      prevSum += WEIGHTS[capturedKey] + PST_OPPONENT[move.color][capturedKey][to[0]][to[1]];
    } else {
      prevSum -= WEIGHTS[capturedKey] + PST_SELF[move.color][capturedKey][to[0]][to[1]];
    }
  }

  if (move.flags.includes("p")) {
    const promo = move.promotion || "q";
    if (move.color === color) {
      prevSum -= WEIGHTS[pieceKey] + PST_SELF[move.color][pieceKey][from[0]][from[1]];
      prevSum += WEIGHTS[promo] + PST_SELF[move.color][promo][to[0]][to[1]];
    } else {
      prevSum += WEIGHTS[pieceKey] + PST_SELF[move.color][pieceKey][from[0]][from[1]];
      prevSum -= WEIGHTS[promo] + PST_SELF[move.color][promo][to[0]][to[1]];
    }
  } else {
    if (move.color !== color) {
      prevSum += PST_SELF[move.color][pieceKey][from[0]][from[1]];
      prevSum -= PST_SELF[move.color][pieceKey][to[0]][to[1]];
    } else {
      prevSum -= PST_SELF[move.color][pieceKey][from[0]][from[1]];
      prevSum += PST_SELF[move.color][pieceKey][to[0]][to[1]];
    }
  }

  return prevSum;
}

function orderMoves(moves: Move[]): Move[] {
  return moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;

    if (a.captured) scoreA += 10 + WEIGHTS[a.captured] / 100;
    if (b.captured) scoreB += 10 + WEIGHTS[b.captured] / 100;

    if (a.flags.includes("p")) scoreA += 8;
    if (b.flags.includes("p")) scoreB += 8;

    if (a.flags.includes("k") || a.flags.includes("q")) scoreA += 5;
    if (b.flags.includes("k") || b.flags.includes("q")) scoreB += 5;

    if (scoreA === scoreB) return Math.random() - 0.5;
    return scoreB - scoreA;
  });
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  sum: number,
  color: "w" | "b"
): [Move | null, number] {
  const children = orderMoves(game.moves({ verbose: true }));

  if (depth === 0 || children.length === 0) {
    return [null, sum];
  }

  let bestMove: Move | null = null;
  let bestValue = isMaximizing ? -Infinity : Infinity;

  for (const child of children) {
    const moveResult = game.move(child);
    const newSum = evaluateBoard(game, moveResult, sum, color);
    const [, childValue] = minimax(game, depth - 1, alpha, beta, !isMaximizing, newSum, color);
    game.undo();

    if (isMaximizing) {
      if (childValue > bestValue) {
        bestValue = childValue;
        bestMove = moveResult;
      }
      alpha = Math.max(alpha, childValue);
    } else {
      if (childValue < bestValue) {
        bestValue = childValue;
        bestMove = moveResult;
      }
      beta = Math.min(beta, childValue);
    }

    if (alpha >= beta) break;
  }

  return [bestMove, bestValue];
}

export interface BotMove {
  from: string;
  to: string;
  promotion?: string;
  san: string;
}

export function findBestMove(fen: string, depth = 3): BotMove | null {
  const game = new Chess(fen);

  if (game.isGameOver()) return null;

  const color = game.turn();

  let globalSum = 0;
  const board = game.board();
  for (const row of board) {
    for (const cell of row) {
      if (cell) {
        const val = WEIGHTS[cell.type] ?? 0;
        if (cell.color === "b") globalSum += val;
        else globalSum -= val;
      }
    }
  }

  const startSum = color === "b" ? globalSum : -globalSum;

  const [bestMove] = minimax(game, depth, -Infinity, Infinity, true, startSum, color);

  if (!bestMove) {
    const fallback = game.moves({ verbose: true });
    if (fallback.length === 0) return null;
    const rand = fallback[Math.floor(Math.random() * fallback.length)];
    return { from: rand.from, to: rand.to, promotion: rand.promotion, san: rand.san };
  }

  return {
    from: bestMove.from,
    to: bestMove.to,
    promotion: bestMove.promotion,
    san: bestMove.san,
  };
}
