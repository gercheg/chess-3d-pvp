import { describe, expect, it } from "vitest";

import { ChessEngine } from "../src/index.js";

function targets(engine: ChessEngine, from: string): string[] {
  return engine
    .getLegalMoves(from)
    .map((move) => move.to)
    .sort();
}

describe("piece movement", () => {
  it("supports white pawn single and double push", () => {
    const engine = new ChessEngine();
    expect(targets(engine, "e2")).toEqual(["e3", "e4"]);
  });

  it("supports black pawn single and double push", () => {
    const engine = new ChessEngine();
    engine.move({ from: "a2", to: "a3" });
    expect(targets(engine, "e7")).toEqual(["e5", "e6"]);
  });

  it("prevents pawn from moving through occupied squares", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/4p3/4P3/4K3 w - - 0 1");
    expect(targets(engine, "e2")).toEqual([]);
  });

  it("allows pawn captures", () => {
    const engine = new ChessEngine("4k3/8/8/8/3p4/4P3/8/4K3 w - - 0 1");
    expect(targets(engine, "e3")).toContain("d4");
  });

  it("rejects illegal backward pawn move", () => {
    const engine = new ChessEngine();
    expect(() => engine.move({ from: "e2", to: "e1" })).toThrowError("Illegal move");
  });

  it("supports knight jumps over blockers", () => {
    const engine = new ChessEngine();
    expect(targets(engine, "g1")).toEqual(["f3", "h3"]);
  });

  it("limits knight moves on board edge", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/8/N3K3 w - - 0 1");
    expect(targets(engine, "a1")).toEqual(["b3", "c2"]);
  });

  it("supports bishop diagonal movement", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/3B4/4K3 w - - 0 1");
    expect(targets(engine, "d2")).toContain("h6");
    expect(targets(engine, "d2")).toContain("a5");
  });

  it("stops bishop at friendly piece", () => {
    const engine = new ChessEngine("4k3/8/8/6P1/8/8/3B4/4K3 w - - 0 1");
    expect(targets(engine, "d2")).not.toContain("h6");
  });

  it("supports rook orthogonal movement", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/4R3/4K3 w - - 0 1");
    expect(targets(engine, "e2")).toContain("e7");
    expect(targets(engine, "e2")).toContain("a2");
  });

  it("prevents rook from moving through blockers", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/4RP2/4K3 w - - 0 1");
    expect(targets(engine, "e2")).not.toContain("h2");
  });

  it("supports queen movement", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1");
    expect(targets(engine, "d2")).toContain("d8");
    expect(targets(engine, "d2")).toContain("h6");
  });

  it("supports king single-step movement", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
    expect(targets(engine, "e1")).toEqual(["d1", "d2", "e2", "f1", "f2"]);
  });

  it("prevents capturing own pieces", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1");
    expect(targets(engine, "e1")).not.toContain("e2");
  });

  it("filters pinned piece moves that expose king", () => {
    const engine = new ChessEngine("k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1");
    expect(targets(engine, "e2")).not.toContain("d2");
    expect(targets(engine, "e2")).toContain("e7");
  });

  it("prevents king from moving into check", () => {
    const engine = new ChessEngine("k3r3/8/8/8/8/8/8/4K3 w - - 0 1");
    expect(targets(engine, "e1")).not.toContain("e2");
  });

  it("supports turn switching", () => {
    const engine = new ChessEngine();
    engine.move({ from: "e2", to: "e4" });
    expect(() => engine.move({ from: "d2", to: "d4" })).toThrowError("Illegal move");
  });

  it("supports undo round-trip", () => {
    const engine = new ChessEngine();
    const initial = engine.getFEN();
    engine.move({ from: "e2", to: "e4" });
    engine.undo();
    expect(engine.getFEN()).toBe(initial);
  });

  it("provides all four promotion options on advance", () => {
    const engine = new ChessEngine("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
    const promotions = engine.getLegalMoves("a7").filter((move) => move.to === "a8");
    expect(promotions).toHaveLength(4);
  });

  it("provides all four promotion options on capture", () => {
    const engine = new ChessEngine("1r2k3/P7/8/8/8/8/8/4K3 w - - 0 1");
    const promotions = engine.getLegalMoves("a7").filter((move) => move.to === "b8");
    expect(promotions).toHaveLength(4);
  });
});

describe("check detection", () => {
  it("detects rook check", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1");
    expect(engine.isCheck()).toBe(true);
  });

  it("detects bishop check", () => {
    const engine = new ChessEngine("4k3/8/8/1B6/8/8/8/4K3 b - - 0 1");
    expect(engine.isCheck()).toBe(true);
  });

  it("detects knight check", () => {
    const engine = new ChessEngine("4k3/8/5N2/8/8/8/8/4K3 b - - 0 1");
    expect(engine.isCheck()).toBe(true);
  });

  it("detects pawn check", () => {
    const engine = new ChessEngine("4k3/3P4/8/8/8/8/8/4K3 b - - 0 1");
    expect(engine.isCheck()).toBe(true);
  });

  it("detects queen check", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/4Q3/4K3 b - - 0 1");
    expect(engine.isCheck()).toBe(true);
  });

  it("returns false when line check is blocked", () => {
    const engine = new ChessEngine("4k3/4p3/8/8/8/8/4R3/4K3 b - - 0 1");
    expect(engine.isCheck()).toBe(false);
  });

  it("allows legal check evasion moves", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1");
    expect(targets(engine, "e8")).toContain("f8");
  });

  it("can clear check by moving king", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1");
    engine.moveSAN("Kf8");
    expect(engine.isCheck()).toBe(false);
  });
});

describe("checkmate patterns", () => {
  it("detects fool's mate", () => {
    const engine = new ChessEngine();
    engine.moveSAN("f3");
    engine.moveSAN("e5");
    engine.moveSAN("g4");
    engine.moveSAN("Qh4#");
    expect(engine.isCheckmate()).toBe(true);
  });

  it("detects scholar's mate", () => {
    const engine = new ChessEngine();
    engine.moveSAN("e4");
    engine.moveSAN("e5");
    engine.moveSAN("Bc4");
    engine.moveSAN("Nc6");
    engine.moveSAN("Qh5");
    engine.moveSAN("Nf6");
    engine.moveSAN("Qxf7#");
    expect(engine.isCheckmate()).toBe(true);
  });

  it("detects back-rank style mate", () => {
    const engine = new ChessEngine("6rk/7R/6K1/8/8/8/8/8 b - - 0 1");
    expect(engine.isCheckmate()).toBe(true);
  });

  it("detects queen-and-king mate net", () => {
    const engine = new ChessEngine("7k/6Qp/5K2/8/8/8/8/8 b - - 0 1");
    expect(engine.isCheckmate()).toBe(true);
  });

  it("detects smothered mate pattern", () => {
    const engine = new ChessEngine("6rk/5Npp/4K3/8/8/8/8/8 b - - 0 1");
    expect(engine.isCheckmate()).toBe(true);
  });
});

describe("stalemate", () => {
  it("detects classic queen stalemate", () => {
    const engine = new ChessEngine("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(engine.isStalemate()).toBe(true);
  });

  it("detects corner stalemate pattern", () => {
    const engine = new ChessEngine("k7/8/1QK5/8/8/8/8/8 b - - 0 1");
    expect(engine.isStalemate()).toBe(true);
  });

  it("does not flag stalemate when legal moves exist", () => {
    const engine = new ChessEngine("k7/8/2K5/1Q6/8/8/8/8 b - - 0 1");
    expect(engine.isStalemate()).toBe(false);
  });
});

describe("castling", () => {
  it("allows white king-side castling", () => {
    const engine = new ChessEngine("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    expect(targets(engine, "e1")).toContain("g1");
  });

  it("allows white queen-side castling", () => {
    const engine = new ChessEngine("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    expect(targets(engine, "e1")).toContain("c1");
  });

  it("allows black king-side castling", () => {
    const engine = new ChessEngine("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1");
    expect(targets(engine, "e8")).toContain("g8");
  });

  it("blocks castling through attack", () => {
    const engine = new ChessEngine("r3k2r/5r2/8/8/8/8/8/R3K2R w KQkq - 0 1");
    expect(targets(engine, "e1")).not.toContain("g1");
    expect(targets(engine, "e1")).toContain("c1");
  });

  it("blocks castling while in check", () => {
    const engine = new ChessEngine("k3r3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
    expect(targets(engine, "e1")).not.toContain("g1");
    expect(targets(engine, "e1")).not.toContain("c1");
  });

  it("removes castling rights after rook move", () => {
    const engine = new ChessEngine("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    engine.move({ from: "h1", to: "h2" });
    engine.move({ from: "a8", to: "a7" });
    engine.move({ from: "h2", to: "h1" });
    expect(targets(engine, "e1")).not.toContain("g1");
  });
});

describe("en passant", () => {
  it("supports white en passant capture", () => {
    const engine = new ChessEngine("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
    const move = engine.move({ from: "e5", to: "d6" });
    expect(move.flags).toContain("ep");
    expect(engine.getPiece("d5")).toBeNull();
  });

  it("supports black en passant capture", () => {
    const engine = new ChessEngine("4k3/8/8/8/3Pp3/8/8/4K3 b - d3 0 1");
    const move = engine.move({ from: "e4", to: "d3" });
    expect(move.flags).toContain("ep");
    expect(engine.getPiece("d4")).toBeNull();
  });

  it("expires en passant rights after a non-capturing move", () => {
    const engine = new ChessEngine("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
    engine.move({ from: "e1", to: "d1" });
    expect(engine.getFEN().split(" ")[3]).toBe("-");
  });
});

describe("promotion", () => {
  it("promotes pawn to queen", () => {
    const engine = new ChessEngine("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
    engine.move({ from: "a7", to: "a8", promotion: "q" });
    expect(engine.getPiece("a8")?.type).toBe("q");
  });

  it("promotes pawn to knight", () => {
    const engine = new ChessEngine("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
    engine.move({ from: "a7", to: "a8", promotion: "n" });
    expect(engine.getPiece("a8")?.type).toBe("n");
  });

  it("supports capture promotion", () => {
    const engine = new ChessEngine("1r2k3/P7/8/8/8/8/8/4K3 w - - 0 1");
    const move = engine.move({ from: "a7", to: "b8", promotion: "q" });
    expect(move.captured).toBe("r");
    expect(engine.getPiece("b8")?.type).toBe("q");
  });

  it("requires explicit promotion piece", () => {
    const engine = new ChessEngine("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
    expect(() => engine.move({ from: "a7", to: "a8" })).toThrowError("Illegal move");
  });
});

describe("draws", () => {
  it("detects draw by threefold repetition", () => {
    const engine = new ChessEngine();
    for (let i = 0; i < 2; i += 1) {
      engine.moveSAN("Nf3");
      engine.moveSAN("Nf6");
      engine.moveSAN("Ng1");
      engine.moveSAN("Ng8");
    }

    expect(engine.isDrawByThreefoldRepetition()).toBe(true);
    expect(engine.getDrawReason()).toBe("threefold_repetition");
  });

  it("detects fifty-move rule by halfmove clock", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/8/4K3 w - - 100 1");
    expect(engine.isDrawByFiftyMoveRule()).toBe(true);
    expect(engine.getDrawReason()).toBe("fifty_move_rule");
  });

  it("detects insufficient material king vs king", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
    expect(engine.isInsufficientMaterial()).toBe(true);
    expect(engine.getDrawReason()).toBe("insufficient_material");
  });

  it("detects insufficient material with minor piece", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/8/3NK3 w - - 0 1");
    expect(engine.isInsufficientMaterial()).toBe(true);
  });

  it("does not flag insufficient material for bishop and knight", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/8/2BNK3 w - - 0 1");
    expect(engine.isInsufficientMaterial()).toBe(false);
  });
});

describe("FEN round-trip", () => {
  it("round-trips default FEN", () => {
    const engine = new ChessEngine();
    expect(engine.getFEN()).toBe(ChessEngine.DEFAULT_FEN);
  });

  it("round-trips custom FEN", () => {
    const fen = "r3k2r/8/8/8/8/8/8/R3K2R w Kq - 7 12";
    const engine = new ChessEngine(fen);
    expect(engine.getFEN()).toBe(fen);
  });

  it("round-trips after moves and undo", () => {
    const engine = new ChessEngine();
    const initial = engine.getFEN();
    engine.moveSAN("e4");
    engine.moveSAN("e5");
    engine.undo();
    engine.undo();
    expect(engine.getFEN()).toBe(initial);
  });

  it("rejects malformed FEN fields", () => {
    expect(() => new ChessEngine("invalid")).toThrowError("FEN must contain 6");
    expect(() => new ChessEngine("8/8/8/8/8/8/8/8 x - - 0 1")).toThrowError("Invalid active color");
    expect(() => new ChessEngine("8/8/8/8/8/8/8/8 w Z - 0 1")).toThrowError("Invalid castling rights");
  });
});

describe("PGN", () => {
  it("exports PGN with headers and result", () => {
    const engine = new ChessEngine();
    engine.moveSAN("e4");
    engine.moveSAN("e5");
    const pgn = engine.toPGN({ Event: "Test" }, "1/2-1/2");
    expect(pgn).toContain("[Event \"Test\"]");
    expect(pgn).toContain("1. e4 e5 1/2-1/2");
  });

  it("loads PGN with comments and tags", () => {
    const engine = new ChessEngine();
    engine.loadPGN('[Event "Mini"]\n\n1. e4 {center} e5 2. Nf3 Nc6 3. Bb5 a6 1/2-1/2');
    expect(engine.getMoveHistory()).toHaveLength(6);
    expect(engine.getPiece("a6")?.type).toBe("p");
  });

  it("parses castling notation with zeros", () => {
    const engine = new ChessEngine();
    engine.loadPGN("1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. 0-0 Be7 *");
    expect(engine.getPiece("g1")?.type).toBe("k");
  });
});

describe("famous game replays", () => {
  it("replays fool's mate PGN", () => {
    const engine = new ChessEngine();
    engine.loadPGN("1. f3 e5 2. g4 Qh4# 0-1");
    expect(engine.isCheckmate()).toBe(true);
    expect(engine.getPiece("h4")?.type).toBe("q");
  });

  it("replays opera game finish", () => {
    const engine = new ChessEngine();
    engine.loadPGN(
      "1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0"
    );
    expect(engine.isCheckmate()).toBe(true);
    expect(engine.getPiece("d8")?.type).toBe("r");
  });
});

describe("error handling", () => {
  it("rejects invalid square inputs", () => {
    const engine = new ChessEngine();
    expect(() => engine.getPiece("z9")).toThrowError("Invalid square");
    expect(() => engine.move({ from: "i2", to: "i4" })).toThrowError("Invalid square");
  });

  it("returns null when undo has no history", () => {
    const engine = new ChessEngine();
    expect(engine.undo()).toBeNull();
  });

  it("rejects illegal SAN tokens", () => {
    const engine = new ChessEngine();
    expect(() => engine.moveSAN("Qa9")).toThrowError("Illegal SAN move");
  });
});


describe("coverage guards", () => {
  it("exposes active turn", () => {
    const engine = new ChessEngine();
    expect(engine.getTurn()).toBe("w");
  });

  it("returns null draw reason on a non-draw position", () => {
    const engine = new ChessEngine();
    expect(engine.getDrawReason()).toBeNull();
  });

  it("validates additional malformed FEN paths", () => {
    expect(() => new ChessEngine("8/8/8/8/8/8/8 w - - 0 1")).toThrowError("8 ranks");
    expect(() => new ChessEngine("8/8/8/8/8/8/8/7X w - - 0 1")).toThrowError("Invalid FEN piece");
    expect(() => new ChessEngine("8p/8/8/8/8/8/8/8 w - - 0 1")).toThrowError("Invalid FEN rank length");
    expect(() => new ChessEngine("8/8/8/8/8/8/8/8 w - - -1 1")).toThrowError("Invalid halfmove");
    expect(() => new ChessEngine("8/8/8/8/8/8/8/8 w - - 0 0")).toThrowError("Invalid fullmove");
  });

  it("handles bishop-only insufficient material branch", () => {
    const engine = new ChessEngine("4k3/8/8/8/8/8/8/B1B1K3 w - - 0 1");
    expect(engine.isInsufficientMaterial()).toBe(true);
  });

  it("supports undo for king-side castling", () => {
    const engine = new ChessEngine("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    engine.moveSAN("O-O");
    engine.undo();
    expect(engine.getPiece("e1")?.type).toBe("k");
    expect(engine.getPiece("h1")?.type).toBe("r");
  });

  it("supports undo for queen-side castling", () => {
    const engine = new ChessEngine("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    engine.moveSAN("O-O-O");
    engine.undo();
    expect(engine.getPiece("e1")?.type).toBe("k");
    expect(engine.getPiece("a1")?.type).toBe("r");
  });

  it("exports PGN body without headers", () => {
    const engine = new ChessEngine();
    expect(engine.toPGN()).toBe("*");
  });

  it("covers internal guard branches via private calls", () => {
    const engine = new ChessEngine();
    const internal = engine as unknown as {
      playMove: (...args: unknown[]) => unknown;
      applyMove: (...args: unknown[]) => unknown;
      generateSAN: (...args: unknown[]) => unknown;
      pushStepMove: (...args: unknown[]) => unknown;
      board: Array<{ type: string; color: "w" | "b" } | null>;
    };

    expect(() => internal.playMove({ from: 20, to: 21, flags: [] }, [])).toThrowError("empty square");
    expect(() => internal.applyMove({ from: 20, to: 21, flags: [] }, "")).toThrowError("empty square");
    expect(() => internal.generateSAN({ from: 20, to: 21, flags: [] }, [])).toThrowError("empty source");

    const kingTarget = new ChessEngine("8/8/8/8/8/8/4k3/4K3 w - - 0 1");
    const kingInternal = kingTarget as unknown as {
      pushStepMove: (...args: unknown[]) => void;
      board: Array<{ type: string; color: "w" | "b" } | null>;
    };
    const moves: Array<{ from: number; to: number; flags: string[] }> = [];
    kingInternal.pushStepMove(60, -1, 0, "w", moves);
    expect(moves).toHaveLength(0);
  });

  it("throws when a requested king does not exist", () => {
    const engine = new ChessEngine("8/8/8/8/8/8/8/4K3 w - - 0 1");
    expect(() => engine.isCheck("b")).toThrowError("King not found");
  });

  it("covers SAN full disambiguation branch", () => {
    const engine = new ChessEngine("3Q3k/8/8/8/8/8/8/Q2Q3K w - - 0 1");
    const move = engine.getLegalMoves("d1").find((candidate) => candidate.to === "d4");
    expect(move?.san).toContain("Qd1d4");
  });

  it("throws when undo destination is unexpectedly empty", () => {
    const engine = new ChessEngine();
    engine.moveSAN("e4");

    const corrupted = engine as unknown as {
      board: Array<{ type: string; color: "w" | "b" } | null>;
      undo: () => unknown;
    };

    const index = (8 - 4) * 8 + 4;
    corrupted.board[index] = null;
    expect(() => corrupted.undo()).toThrowError("destination square is empty");
  });
});



it("returns false for stalemate check when side is in check", () => {
  const engine = new ChessEngine("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1");
  expect(engine.isStalemate()).toBe(false);
});

it("prioritizes stalemate in draw reason", () => {
  const engine = new ChessEngine("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  expect(engine.getDrawReason()).toBe("stalemate");
});

it("undo restores en passant captures", () => {
  const engine = new ChessEngine("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
  engine.move({ from: "e5", to: "d6" });
  engine.undo();
  expect(engine.getPiece("e5")?.type).toBe("p");
  expect(engine.getPiece("d5")?.type).toBe("p");
});

it("covers remaining FEN rank-length validation path", () => {
  expect(() => new ChessEngine("7/8/8/8/8/8/8/8 w - - 0 1")).toThrowError("Invalid FEN rank length");
});

it("throws for inconsistent generated legal move source", () => {
  const engine = new ChessEngine();
  const internal = engine as unknown as {
    generateLegalMoves: () => Array<{ from: number; to: number; flags: string[] }>;
    getLegalMoves: () => unknown;
  };

  internal.generateLegalMoves = () => [{ from: 20, to: 28, flags: [] }];
  expect(() => internal.getLegalMoves()).toThrowError("Move preview requested for empty source");
});

it("returns false for checkmate when side is not in check", () => {
  const engine = new ChessEngine();
  expect(engine.isCheckmate()).toBe(false);
});

it("supports undo for black king-side castling", () => {
  const engine = new ChessEngine("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1");
  engine.moveSAN("O-O");
  engine.undo();
  expect(engine.getPiece("e8")?.type).toBe("k");
  expect(engine.getPiece("h8")?.type).toBe("r");
});

it("supports undo for black queen-side castling", () => {
  const engine = new ChessEngine("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1");
  engine.moveSAN("O-O-O");
  engine.undo();
  expect(engine.getPiece("e8")?.type).toBe("k");
  expect(engine.getPiece("a8")?.type).toBe("r");
});

it("undo restores black en passant captures", () => {
  const engine = new ChessEngine("4k3/8/8/8/3Pp3/8/8/4K3 b - d3 0 1");
  engine.move({ from: "e4", to: "d3" });
  engine.undo();
  expect(engine.getPiece("e4")?.type).toBe("p");
  expect(engine.getPiece("d4")?.type).toBe("p");
});

it("returns false for threefold repetition when current key is absent", () => {
  const engine = new ChessEngine();
  const internal = engine as unknown as {
    repetition: Map<string, number>;
    getFEN: () => string;
  };

  const key = internal.getFEN().split(" ").slice(0, 4).join(" ");
  internal.repetition.delete(key);
  expect(engine.isDrawByThreefoldRepetition()).toBe(false);
});
