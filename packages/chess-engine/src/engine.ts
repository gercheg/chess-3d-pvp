export type Color = "w" | "b";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export type DrawReason =
  | "stalemate"
  | "threefold_repetition"
  | "fifty_move_rule"
  | "insufficient_material";

export interface Piece {
  color: Color;
  type: PieceType;
}

export interface MoveInput {
  from: string;
  to: string;
  promotion?: Exclude<PieceType, "k" | "p">;
}

export interface MoveResult {
  from: string;
  to: string;
  piece: PieceType;
  color: Color;
  captured?: PieceType;
  promotion?: Exclude<PieceType, "k" | "p">;
  flags: string[];
  san: string;
  fen: string;
}

interface InternalMove {
  from: number;
  to: number;
  promotion?: Exclude<PieceType, "k" | "p">;
  flags: string[];
}

interface HistoryEntry {
  move: InternalMove;
  movedPiece: Piece;
  capturedPiece: Piece | null;
  previousCastling: string;
  previousEnPassant: number | null;
  previousHalfmove: number;
  previousFullmove: number;
  san: string;
  fenAfter: string;
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const FILES = "abcdefgh";

const KNIGHT_OFFSETS = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1]
] as const;

const KING_OFFSETS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
] as const;

function opposite(color: Color): Color {
  return color === "w" ? "b" : "w";
}

function squareToIndex(square: string): number {
  if (!/^[a-h][1-8]$/.test(square)) {
    throw new Error(`Invalid square: ${square}`);
  }

  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  return (8 - rank) * 8 + file;
}

function indexToSquare(index: number): string {
  const file = index % 8;
  const rank = 8 - Math.floor(index / 8);
  return `${FILES[file]}${rank}`;
}

function inBounds(rank: number, file: number): boolean {
  return rank >= 0 && rank < 8 && file >= 0 && file < 8;
}

function getRank(index: number): number {
  return Math.floor(index / 8);
}

function getFile(index: number): number {
  return index % 8;
}

function normalizeSan(token: string): string {
  return token
    .replace(/[!?+#]+$/g, "")
    .replace(/0-0-0/g, "O-O-O")
    .replace(/0-0/g, "O-O")
    .trim();
}

export class ChessEngine {
  private board: Array<Piece | null> = Array.from({ length: 64 }, () => null);

  private turn: Color = "w";

  private castlingRights = "KQkq";

  private enPassantSquare: number | null = null;

  private halfmoveClock = 0;

  private fullmoveNumber = 1;

  private readonly history: HistoryEntry[] = [];

  private readonly repetition = new Map<string, number>();

  constructor(fen = ChessEngine.DEFAULT_FEN) {
    this.loadFEN(fen);
  }

  static get DEFAULT_FEN(): string {
    return START_FEN;
  }

  loadFEN(fen: string): void {
    const parts = fen.trim().split(/\s+/);
    if (parts.length !== 6) {
      throw new Error("FEN must contain 6 space-delimited fields");
    }

    const [placement, activeColor, castling, enPassant, halfmove, fullmove] = parts;
    const ranks = placement.split("/");
    if (ranks.length !== 8) {
      throw new Error("FEN board layout must contain 8 ranks");
    }

    const nextBoard: Array<Piece | null> = Array.from({ length: 64 }, () => null);

    ranks.forEach((rankText, rankIndex) => {
      let file = 0;
      for (const char of rankText) {
        if (/^[1-8]$/.test(char)) {
          file += Number(char);
          continue;
        }

        const lower = char.toLowerCase();
        if (!/[pnbrqk]/.test(lower)) {
          throw new Error(`Invalid FEN piece: ${char}`);
        }

        if (file > 7) {
          throw new Error("Invalid FEN rank length");
        }

        nextBoard[rankIndex * 8 + file] = {
          color: char === lower ? "b" : "w",
          type: lower as PieceType
        };
        file += 1;
      }

      if (file !== 8) {
        throw new Error("Invalid FEN rank length");
      }
    });

    if (activeColor !== "w" && activeColor !== "b") {
      throw new Error("Invalid active color in FEN");
    }

    if (castling !== "-" && !/^[KQkq]+$/.test(castling)) {
      throw new Error("Invalid castling rights in FEN");
    }

    const normalizedCastling = castling === "-" ? "" : Array.from(new Set(castling.split(""))).join("");

    const enPassantIndex = enPassant === "-" ? null : squareToIndex(enPassant);
    const halfmoveNumber = Number(halfmove);
    const fullmoveCount = Number(fullmove);

    if (!Number.isInteger(halfmoveNumber) || halfmoveNumber < 0) {
      throw new Error("Invalid halfmove clock in FEN");
    }

    if (!Number.isInteger(fullmoveCount) || fullmoveCount < 1) {
      throw new Error("Invalid fullmove number in FEN");
    }

    this.board = nextBoard;
    this.turn = activeColor;
    this.castlingRights = normalizedCastling;
    this.enPassantSquare = enPassantIndex;
    this.halfmoveClock = halfmoveNumber;
    this.fullmoveNumber = fullmoveCount;
    this.history.length = 0;
    this.repetition.clear();
    this.incrementRepetition();
  }

  getFEN(): string {
    const ranks: string[] = [];

    for (let rank = 0; rank < 8; rank += 1) {
      let empty = 0;
      let output = "";

      for (let file = 0; file < 8; file += 1) {
        const piece = this.board[rank * 8 + file];
        if (!piece) {
          empty += 1;
          continue;
        }

        if (empty > 0) {
          output += String(empty);
          empty = 0;
        }

        output += piece.color === "w" ? piece.type.toUpperCase() : piece.type;
      }

      if (empty > 0) {
        output += String(empty);
      }

      ranks.push(output);
    }

    const castling = this.castlingRights.length > 0 ? this.castlingRights : "-";
    const enPassant = this.enPassantSquare === null ? "-" : indexToSquare(this.enPassantSquare);

    return `${ranks.join("/")} ${this.turn} ${castling} ${enPassant} ${this.halfmoveClock} ${this.fullmoveNumber}`;
  }

  getTurn(): Color {
    return this.turn;
  }

  getPiece(square: string): Piece | null {
    return this.board[squareToIndex(square)];
  }

  getLegalMoves(fromSquare?: string): MoveResult[] {
    const legal = this.generateLegalMoves(this.turn);
    const fromIndex = fromSquare ? squareToIndex(fromSquare) : null;

    return legal
      .filter((move) => fromIndex === null || move.from === fromIndex)
      .map((move) => {
        const piece = this.board[move.from];
        if (!piece) {
          throw new Error("Move preview requested for empty source");
        }

        return this.buildMoveResult(move, piece, this.generateSAN(move, legal), this.getFEN());
      });
  }

  move(input: MoveInput): MoveResult {
    const from = squareToIndex(input.from);
    const to = squareToIndex(input.to);
    const promotion = input.promotion;

    const legal = this.generateLegalMoves(this.turn);
    const candidate = legal.find((move) => {
      if (move.from !== from || move.to !== to) {
        return false;
      }

      if (move.promotion || promotion) {
        return move.promotion === promotion;
      }

      return true;
    });

    if (!candidate) {
      throw new Error(`Illegal move: ${input.from}${input.to}${promotion ?? ""}`);
    }

    return this.playMove(candidate, legal);
  }

  moveSAN(san: string): MoveResult {
    const normalized = normalizeSan(san);
    const legal = this.generateLegalMoves(this.turn);

    for (const move of legal) {
      const moveSan = normalizeSan(this.generateSAN(move, legal));
      if (moveSan === normalized) {
        return this.playMove(move, legal);
      }
    }

    throw new Error(`Illegal SAN move: ${san}`);
  }

  isCheck(color: Color = this.turn): boolean {
    const king = this.findKing(color);
    return this.isSquareAttacked(king, opposite(color));
  }

  isCheckmate(color: Color = this.turn): boolean {
    if (!this.isCheck(color)) {
      return false;
    }

    return this.generateLegalMoves(color).length === 0;
  }

  isStalemate(color: Color = this.turn): boolean {
    if (this.isCheck(color)) {
      return false;
    }

    return this.generateLegalMoves(color).length === 0;
  }

  isInsufficientMaterial(): boolean {
    const pieces = this.board.filter((piece): piece is Piece => piece !== null);

    if (pieces.every((piece) => piece.type === "k")) {
      return true;
    }

    if (pieces.length === 3) {
      const minor = pieces.find((piece) => piece.type !== "k");
      return minor?.type === "b" || minor?.type === "n";
    }

    if (pieces.length === 4) {
      const bishops = pieces.filter((piece) => piece.type === "b");
      if (bishops.length !== 2) {
        return false;
      }

      const bishopSquares = this.board
        .map((piece, index) => ({ piece, index }))
        .filter((entry) => entry.piece?.type === "b")
        .map((entry) => (getRank(entry.index) + getFile(entry.index)) % 2);

      return bishopSquares[0] === bishopSquares[1];
    }

    return false;
  }

  isDrawByFiftyMoveRule(): boolean {
    return this.halfmoveClock >= 100;
  }

  isDrawByThreefoldRepetition(): boolean {
    const key = this.positionKey();
    return (this.repetition.get(key) ?? 0) >= 3;
  }

  getDrawReason(): DrawReason | null {
    if (this.isStalemate()) {
      return "stalemate";
    }

    if (this.isDrawByThreefoldRepetition()) {
      return "threefold_repetition";
    }

    if (this.isDrawByFiftyMoveRule()) {
      return "fifty_move_rule";
    }

    if (this.isInsufficientMaterial()) {
      return "insufficient_material";
    }

    return null;
  }

  getMoveHistory(): ReadonlyArray<MoveResult> {
    return this.history.map((entry) => this.buildMoveResult(entry.move, entry.movedPiece, entry.san, entry.fenAfter));
  }

  undo(): MoveResult | null {
    const entry = this.history.pop();
    if (!entry) {
      return null;
    }

    const moved = this.board[entry.move.to];
    if (!moved) {
      throw new Error("Cannot undo move: destination square is empty");
    }

    this.board[entry.move.from] = entry.movedPiece;

    if (entry.move.flags.includes("ep")) {
      this.board[entry.move.to] = null;
      const direction = entry.movedPiece.color === "w" ? 1 : -1;
      this.board[entry.move.to + direction * 8] = entry.capturedPiece;
    } else {
      this.board[entry.move.to] = entry.capturedPiece;
    }

    if (entry.move.flags.includes("k")) {
      const rookFrom = entry.movedPiece.color === "w" ? squareToIndex("h1") : squareToIndex("h8");
      const rookTo = entry.movedPiece.color === "w" ? squareToIndex("f1") : squareToIndex("f8");
      this.board[rookFrom] = this.board[rookTo];
      this.board[rookTo] = null;
    }

    if (entry.move.flags.includes("q")) {
      const rookFrom = entry.movedPiece.color === "w" ? squareToIndex("a1") : squareToIndex("a8");
      const rookTo = entry.movedPiece.color === "w" ? squareToIndex("d1") : squareToIndex("d8");
      this.board[rookFrom] = this.board[rookTo];
      this.board[rookTo] = null;
    }

    this.castlingRights = entry.previousCastling;
    this.enPassantSquare = entry.previousEnPassant;
    this.halfmoveClock = entry.previousHalfmove;
    this.fullmoveNumber = entry.previousFullmove;
    this.turn = entry.movedPiece.color;

    return this.buildMoveResult(entry.move, entry.movedPiece, entry.san, this.getFEN());
  }

  toPGN(headers: Record<string, string> = {}, result = "*"): string {
    const pgnHeaders = Object.entries(headers)
      .map(([key, value]) => `[${key} "${value}"]`)
      .join("\n");

    const moves: string[] = [];

    this.history.forEach((entry, index) => {
      if (index % 2 === 0) {
        moves.push(`${Math.floor(index / 2) + 1}.`);
      }

      moves.push(entry.san);
    });

    const body = `${moves.join(" ")} ${result}`.trim();
    return pgnHeaders.length > 0 ? `${pgnHeaders}\n\n${body}` : body;
  }

  loadPGN(pgn: string): void {
    const rawMoves = pgn
      .replace(/\[[^\]]*]/g, " ")
      .replace(/\{[^}]*\}/g, " ")
      .replace(/\([^)]*\)/g, " ")
      .replace(/;.*$/gm, " ")
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .filter((token) => !token.startsWith("["))
      .filter((token) => !/^\d+\.(\.\.)?$/.test(token))
      .filter((token) => token !== "1-0" && token !== "0-1" && token !== "1/2-1/2" && token !== "*");

    for (const token of rawMoves) {
      const clean = token.replace(/\d+\.(\.\.)?/g, "");

      this.moveSAN(clean);
    }
  }

  private positionKey(): string {
    const fen = this.getFEN().split(" ");
    return [fen[0], fen[1], fen[2], fen[3]].join(" ");
  }

  private incrementRepetition(): void {
    const key = this.positionKey();
    this.repetition.set(key, (this.repetition.get(key) ?? 0) + 1);
  }

  private buildMoveResult(move: InternalMove, movedPiece: Piece, san: string, fen: string): MoveResult {
    const captured = move.flags.find((flag) => flag.startsWith("c:"))?.slice(2) as PieceType | undefined;

    return {
      from: indexToSquare(move.from),
      to: indexToSquare(move.to),
      piece: movedPiece.type,
      color: movedPiece.color,
      captured,
      promotion: move.promotion,
      flags: [...move.flags.filter((flag) => !flag.startsWith("c:"))],
      san,
      fen
    };
  }

  private playMove(move: InternalMove, legalMoves: InternalMove[]): MoveResult {
    const movingPiece = this.board[move.from];
    if (!movingPiece) {
      throw new Error("Cannot apply move from empty square");
    }

    const san = this.generateSAN(move, legalMoves);
    this.applyMove(move, san);
    return this.buildMoveResult(move, movingPiece, san, this.getFEN());
  }

  private applyMove(move: InternalMove, san: string): void {
    const movingPiece = this.board[move.from];
    if (!movingPiece) {
      throw new Error("Cannot apply move from empty square");
    }

    const previousCastling = this.castlingRights;
    const previousEnPassant = this.enPassantSquare;
    const previousHalfmove = this.halfmoveClock;
    const previousFullmove = this.fullmoveNumber;

    let capturedPiece: Piece | null = null;

    if (move.flags.includes("ep")) {
      const direction = movingPiece.color === "w" ? 1 : -1;
      const captureIndex = move.to + direction * 8;
      capturedPiece = this.board[captureIndex];
      this.board[captureIndex] = null;
      this.board[move.to] = null;
    } else {
      capturedPiece = this.board[move.to];
    }

    this.board[move.from] = null;
    this.board[move.to] = {
      color: movingPiece.color,
      type: move.promotion ?? movingPiece.type
    };

    if (move.flags.includes("k")) {
      const rookFrom = movingPiece.color === "w" ? squareToIndex("h1") : squareToIndex("h8");
      const rookTo = movingPiece.color === "w" ? squareToIndex("f1") : squareToIndex("f8");
      this.board[rookTo] = this.board[rookFrom];
      this.board[rookFrom] = null;
    }

    if (move.flags.includes("q")) {
      const rookFrom = movingPiece.color === "w" ? squareToIndex("a1") : squareToIndex("a8");
      const rookTo = movingPiece.color === "w" ? squareToIndex("d1") : squareToIndex("d8");
      this.board[rookTo] = this.board[rookFrom];
      this.board[rookFrom] = null;
    }

    this.enPassantSquare = null;

    if (movingPiece.type === "p" && Math.abs(move.to - move.from) === 16) {
      this.enPassantSquare = movingPiece.color === "w" ? move.to + 8 : move.to - 8;
    }

    if (movingPiece.type === "k") {
      this.castlingRights = this.castlingRights.replace(movingPiece.color === "w" ? /[KQ]/g : /[kq]/g, "");
    }

    if (movingPiece.type === "r") {
      const fromSquare = indexToSquare(move.from);
      if (fromSquare === "a1") {
        this.castlingRights = this.castlingRights.replace("Q", "");
      }
      if (fromSquare === "h1") {
        this.castlingRights = this.castlingRights.replace("K", "");
      }
      if (fromSquare === "a8") {
        this.castlingRights = this.castlingRights.replace("q", "");
      }
      if (fromSquare === "h8") {
        this.castlingRights = this.castlingRights.replace("k", "");
      }
    }

    if (capturedPiece?.type === "r") {
      const toSquare = indexToSquare(move.to);
      if (toSquare === "a1") {
        this.castlingRights = this.castlingRights.replace("Q", "");
      }
      if (toSquare === "h1") {
        this.castlingRights = this.castlingRights.replace("K", "");
      }
      if (toSquare === "a8") {
        this.castlingRights = this.castlingRights.replace("q", "");
      }
      if (toSquare === "h8") {
        this.castlingRights = this.castlingRights.replace("k", "");
      }
    }

    if (movingPiece.type === "p" || capturedPiece) {
      this.halfmoveClock = 0;
    } else {
      this.halfmoveClock += 1;
    }

    if (this.turn === "b") {
      this.fullmoveNumber += 1;
    }

    this.turn = opposite(this.turn);
    this.incrementRepetition();

    this.history.push({
      move,
      movedPiece: movingPiece,
      capturedPiece,
      previousCastling,
      previousEnPassant,
      previousHalfmove,
      previousFullmove,
      san,
      fenAfter: this.getFEN()
    });
  }

  private generateSAN(move: InternalMove, legalMoves: InternalMove[]): string {
    const movingPiece = this.board[move.from];
    if (!movingPiece) {
      throw new Error("Cannot generate SAN for empty source square");
    }

    if (move.flags.includes("k")) {
      const suffix = this.computeCheckSuffix(move);
      return `O-O${suffix}`;
    }

    if (move.flags.includes("q")) {
      const suffix = this.computeCheckSuffix(move);
      return `O-O-O${suffix}`;
    }

    const pieceLetter = movingPiece.type === "p" ? "" : movingPiece.type.toUpperCase();
    const capture = move.flags.includes("c") || move.flags.includes("ep") ? "x" : "";

    let disambiguation = "";

    if (movingPiece.type !== "p") {
      const competing = legalMoves.filter((candidate) => {
        if (candidate === move) {
          return false;
        }

        if (candidate.to !== move.to) {
          return false;
        }

        const piece = this.board[candidate.from];
        return piece?.type === movingPiece.type;
      });

      if (competing.length > 0) {
        const sameFile = competing.some((candidate) => getFile(candidate.from) === getFile(move.from));
        const sameRank = competing.some((candidate) => getRank(candidate.from) === getRank(move.from));

        if (!sameFile) {
          disambiguation = FILES[getFile(move.from)];
        } else if (!sameRank) {
          disambiguation = String(8 - getRank(move.from));
        } else {
          disambiguation = `${FILES[getFile(move.from)]}${8 - getRank(move.from)}`;
        }
      }
    }

    if (movingPiece.type === "p" && capture.length > 0) {
      disambiguation = FILES[getFile(move.from)];
    }

    const target = indexToSquare(move.to);
    const promotion = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
    const suffix = this.computeCheckSuffix(move);

    return `${pieceLetter}${disambiguation}${capture}${target}${promotion}${suffix}`;
  }

  private computeCheckSuffix(move: InternalMove): string {
    const reversible = this.clone();
    reversible.applyMove({ ...move, flags: [...move.flags] }, "");

    if (!reversible.isCheck(reversible.turn)) {
      return "";
    }

    if (reversible.generateLegalMoves(reversible.turn).length === 0) {
      return "#";
    }

    return "+";
  }

  private clone(): ChessEngine {
    const copy = new ChessEngine(this.getFEN());
    copy.history.length = 0;
    return copy;
  }

  private findKing(color: Color): number {
    const index = this.board.findIndex((piece) => piece?.type === "k" && piece.color === color);
    if (index < 0) {
      throw new Error(`King not found for color ${color}`);
    }

    return index;
  }

  private isSquareAttacked(target: number, byColor: Color): boolean {
    const targetRank = getRank(target);
    const targetFile = getFile(target);

    const pawnDirection = byColor === "w" ? 1 : -1;
    const pawnSources = [
      [targetRank + pawnDirection, targetFile - 1],
      [targetRank + pawnDirection, targetFile + 1]
    ];

    for (const [rank, file] of pawnSources) {
      if (!inBounds(rank, file)) {
        continue;
      }

      const piece = this.board[rank * 8 + file];
      if (piece?.color === byColor && piece.type === "p") {
        return true;
      }
    }

    for (const [dr, df] of KNIGHT_OFFSETS) {
      const rank = targetRank + dr;
      const file = targetFile + df;
      if (!inBounds(rank, file)) {
        continue;
      }

      const piece = this.board[rank * 8 + file];
      if (piece?.color === byColor && piece.type === "n") {
        return true;
      }
    }

    const rays: Array<{ directions: Array<[number, number]>; types: PieceType[] }> = [
      {
        directions: [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1]
        ],
        types: ["r", "q"]
      },
      {
        directions: [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1]
        ],
        types: ["b", "q"]
      }
    ];

    for (const ray of rays) {
      for (const [dr, df] of ray.directions) {
        let rank = targetRank + dr;
        let file = targetFile + df;

        while (inBounds(rank, file)) {
          const piece = this.board[rank * 8 + file];
          if (!piece) {
            rank += dr;
            file += df;
            continue;
          }

          if (piece.color === byColor && ray.types.includes(piece.type)) {
            return true;
          }

          break;
        }
      }
    }

    for (const [dr, df] of KING_OFFSETS) {
      const rank = targetRank + dr;
      const file = targetFile + df;
      if (!inBounds(rank, file)) {
        continue;
      }

      const piece = this.board[rank * 8 + file];
      if (piece?.color === byColor && piece.type === "k") {
        return true;
      }
    }

    return false;
  }

  private generateLegalMoves(color: Color): InternalMove[] {
    const pseudo = this.generatePseudoMoves(color);
    const legal: InternalMove[] = [];

    for (const move of pseudo) {
      const simulation = this.clone();
      simulation.applyMove({ ...move, flags: [...move.flags] }, "");
      if (!simulation.isCheck(color)) {
        legal.push(move);
      }
    }

    return legal;
  }

  private generatePseudoMoves(color: Color): InternalMove[] {
    const moves: InternalMove[] = [];

    for (let index = 0; index < 64; index += 1) {
      const piece = this.board[index];
      if (!piece || piece.color !== color) {
        continue;
      }

      if (piece.type === "p") {
        this.addPawnMoves(index, piece, moves);
        continue;
      }

      if (piece.type === "n") {
        for (const [dr, df] of KNIGHT_OFFSETS) {
          this.pushStepMove(index, dr, df, piece.color, moves);
        }
        continue;
      }

      if (piece.type === "k") {
        for (const [dr, df] of KING_OFFSETS) {
          this.pushStepMove(index, dr, df, piece.color, moves);
        }

        this.addCastlingMoves(index, piece.color, moves);
        continue;
      }

      const directions: Array<[number, number]> = [];
      if (piece.type === "b" || piece.type === "q") {
        directions.push(
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1]
        );
      }

      if (piece.type === "r" || piece.type === "q") {
        directions.push(
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1]
        );
      }

      for (const [dr, df] of directions) {
        this.pushRayMoves(index, dr, df, piece.color, moves);
      }
    }

    return moves;
  }

  private pushStepMove(from: number, dr: number, df: number, color: Color, moves: InternalMove[]): void {
    const rank = getRank(from) + dr;
    const file = getFile(from) + df;

    if (!inBounds(rank, file)) {
      return;
    }

    const to = rank * 8 + file;
    const target = this.board[to];

    if (target && target.color === color) {
      return;
    }

    if (target?.type === "k") {
      return;
    }

    const flags = target ? ["c", `c:${target.type}`] : [];
    moves.push({ from, to, flags });
  }

  private pushRayMoves(from: number, dr: number, df: number, color: Color, moves: InternalMove[]): void {
    let rank = getRank(from) + dr;
    let file = getFile(from) + df;

    while (inBounds(rank, file)) {
      const to = rank * 8 + file;
      const target = this.board[to];

      if (!target) {
        moves.push({ from, to, flags: [] });
        rank += dr;
        file += df;
        continue;
      }

      if (target.color !== color && target.type !== "k") {
        moves.push({ from, to, flags: ["c", `c:${target.type}`] });
      }

      break;
    }
  }

  private addPawnMoves(from: number, piece: Piece, moves: InternalMove[]): void {
    const direction = piece.color === "w" ? -1 : 1;
    const startRank = piece.color === "w" ? 6 : 1;
    const promotionRank = piece.color === "w" ? 0 : 7;

    const rank = getRank(from);
    const file = getFile(from);

    const oneStepRank = rank + direction;
    if (inBounds(oneStepRank, file)) {
      const oneStep = oneStepRank * 8 + file;
      if (!this.board[oneStep]) {
        if (oneStepRank === promotionRank) {
          for (const promotion of ["q", "r", "b", "n"] as const) {
            moves.push({ from, to: oneStep, promotion, flags: ["p"] });
          }
        } else {
          moves.push({ from, to: oneStep, flags: [] });
        }

        if (rank === startRank) {
          const twoStepRank = rank + direction * 2;
          const twoStep = twoStepRank * 8 + file;
          if (!this.board[twoStep]) {
            moves.push({ from, to: twoStep, flags: [] });
          }
        }
      }
    }

    for (const captureFile of [file - 1, file + 1]) {
      const captureRank = rank + direction;
      if (!inBounds(captureRank, captureFile)) {
        continue;
      }

      const to = captureRank * 8 + captureFile;
      const target = this.board[to];

      if (target && target.color !== piece.color && target.type !== "k") {
        if (captureRank === promotionRank) {
          for (const promotion of ["q", "r", "b", "n"] as const) {
            moves.push({ from, to, promotion, flags: ["c", "p", `c:${target.type}`] });
          }
        } else {
          moves.push({ from, to, flags: ["c", `c:${target.type}`] });
        }
      }

      if (this.enPassantSquare !== null && to === this.enPassantSquare) {
        const capturedIndex = piece.color === "w" ? to + 8 : to - 8;
        const capturedPawn = this.board[capturedIndex];
        if (capturedPawn?.type === "p" && capturedPawn.color !== piece.color) {
          moves.push({ from, to, flags: ["ep", "c", "c:p"] });
        }
      }
    }
  }

  private addCastlingMoves(kingIndex: number, color: Color, moves: InternalMove[]): void {
    const kingSquare = indexToSquare(kingIndex);

    if (color === "w" && kingSquare === "e1") {
      if (
        this.castlingRights.includes("K") &&
        !this.board[squareToIndex("f1")] &&
        !this.board[squareToIndex("g1")] &&
        !this.isSquareAttacked(squareToIndex("e1"), "b") &&
        !this.isSquareAttacked(squareToIndex("f1"), "b") &&
        !this.isSquareAttacked(squareToIndex("g1"), "b")
      ) {
        moves.push({ from: kingIndex, to: squareToIndex("g1"), flags: ["k"] });
      }

      if (
        this.castlingRights.includes("Q") &&
        !this.board[squareToIndex("d1")] &&
        !this.board[squareToIndex("c1")] &&
        !this.board[squareToIndex("b1")] &&
        !this.isSquareAttacked(squareToIndex("e1"), "b") &&
        !this.isSquareAttacked(squareToIndex("d1"), "b") &&
        !this.isSquareAttacked(squareToIndex("c1"), "b")
      ) {
        moves.push({ from: kingIndex, to: squareToIndex("c1"), flags: ["q"] });
      }
    }

    if (color === "b" && kingSquare === "e8") {
      if (
        this.castlingRights.includes("k") &&
        !this.board[squareToIndex("f8")] &&
        !this.board[squareToIndex("g8")] &&
        !this.isSquareAttacked(squareToIndex("e8"), "w") &&
        !this.isSquareAttacked(squareToIndex("f8"), "w") &&
        !this.isSquareAttacked(squareToIndex("g8"), "w")
      ) {
        moves.push({ from: kingIndex, to: squareToIndex("g8"), flags: ["k"] });
      }

      if (
        this.castlingRights.includes("q") &&
        !this.board[squareToIndex("d8")] &&
        !this.board[squareToIndex("c8")] &&
        !this.board[squareToIndex("b8")] &&
        !this.isSquareAttacked(squareToIndex("e8"), "w") &&
        !this.isSquareAttacked(squareToIndex("d8"), "w") &&
        !this.isSquareAttacked(squareToIndex("c8"), "w")
      ) {
        moves.push({ from: kingIndex, to: squareToIndex("c8"), flags: ["q"] });
      }
    }
  }
}










