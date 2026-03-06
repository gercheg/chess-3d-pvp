import { Chess, type Square, type Move } from "chess.js";

export interface MoveInput {
  from: string;
  to: string;
  promotion?: string;
}

export interface MoveResult {
  san: string;
  fen: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isStalemate: boolean;
  isGameOver: boolean;
  turn: "w" | "b";
}

export class ChessEngine {
  private chess: Chess;

  constructor(fen?: string) {
    this.chess = fen ? new Chess(fen) : new Chess();
  }

  get fen(): string {
    return this.chess.fen();
  }

  get turn(): "w" | "b" {
    return this.chess.turn();
  }

  get isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  get isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  get isDraw(): boolean {
    return this.chess.isDraw();
  }

  get isStalemate(): boolean {
    return this.chess.isStalemate();
  }

  get isCheck(): boolean {
    return this.chess.isCheck();
  }

  get history(): string[] {
    return this.chess.history();
  }

  legalMoves(): Move[] {
    return this.chess.moves({ verbose: true });
  }

  tryMove(input: MoveInput): MoveResult | null {
    try {
      const move = this.chess.move({
        from: input.from as Square,
        to: input.to as Square,
        promotion: (input.promotion as "q" | "r" | "b" | "n") ?? "q",
      });
      if (!move) return null;

      return {
        san: move.san,
        fen: this.chess.fen(),
        isCheck: this.chess.isCheck(),
        isCheckmate: this.chess.isCheckmate(),
        isDraw: this.chess.isDraw(),
        isStalemate: this.chess.isStalemate(),
        isGameOver: this.chess.isGameOver(),
        turn: this.chess.turn(),
      };
    } catch {
      return null;
    }
  }

  board(): ReturnType<Chess["board"]> {
    return this.chess.board();
  }
}
