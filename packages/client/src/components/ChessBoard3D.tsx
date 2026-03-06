import { useRef, useState, useMemo, useCallback, memo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Text } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { Mesh } from "three";
import { Chess, type Square as ChessSquare } from "chess.js";

interface Props {
  fen?: string;
  interactive?: boolean;
  playerColor?: "white" | "black";
  isCheck?: boolean;
  onMove?: (from: string, to: string) => void;
}

type PieceType = "k" | "q" | "r" | "b" | "n" | "p";
type PieceColor = "w" | "b";

interface PieceData {
  type: PieceType;
  color: PieceColor;
  col: number;
  row: number;
  square: string;
}

const PIECE_SYMBOLS: Record<string, string> = {
  wk: "\u2654", bk: "\u265A",
  wq: "\u2655", bq: "\u265B",
  wr: "\u2656", br: "\u265C",
  wb: "\u2657", bb: "\u265D",
  wn: "\u2658", bn: "\u265E",
  wp: "\u2659", bp: "\u265F",
};

function parseFen(fen: string): PieceData[] {
  const pieces: PieceData[] = [];
  const parts = fen.split(" ");
  const rows = parts[0].split("/");

  for (let r = 0; r < 8; r++) {
    let col = 0;
    for (const ch of rows[r]) {
      if (ch >= "1" && ch <= "8") {
        col += parseInt(ch);
      } else {
        const color: PieceColor = ch === ch.toUpperCase() ? "w" : "b";
        const type = ch.toLowerCase() as PieceType;
        const row = 7 - r;
        pieces.push({
          type,
          color,
          col,
          row,
          square: `${String.fromCharCode(97 + col)}${row + 1}`,
        });
        col++;
      }
    }
  }
  return pieces;
}

function toAlgebraic(col: number, row: number): string {
  return `${String.fromCharCode(97 + col)}${row + 1}`;
}

const LIGHT_COLOR = "#d4c4a8";
const DARK_COLOR = "#5c3d6e";
const SELECTED_COLOR = "#7C3AED";
const LEGAL_COLOR = "#4ade80";
const CHECK_COLOR = "#ef4444";
const LAST_MOVE_COLOR = "#eab30860";

const Square = memo(function Square({
  col,
  row,
  isSelected,
  isLegal,
  isLastMove,
  isCheckSquare,
  onClick,
}: {
  col: number;
  row: number;
  isSelected: boolean;
  isLegal: boolean;
  isLastMove: boolean;
  isCheckSquare: boolean;
  onClick: () => void;
}) {
  const isDark = (col + row) % 2 === 1;
  let color = isDark ? DARK_COLOR : LIGHT_COLOR;
  if (isCheckSquare) color = CHECK_COLOR;
  else if (isSelected) color = SELECTED_COLOR;
  else if (isLastMove) color = "#eab308";

  return (
    <group>
      <mesh
        position={[col - 3.5, 0, row - 3.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); }}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} opacity={isLastMove ? 0.8 : 1} transparent={isLastMove} />
      </mesh>
      {isLegal && (
        <mesh position={[col - 3.5, 0.02, row - 3.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.15, 16]} />
          <meshStandardMaterial color={LEGAL_COLOR} opacity={0.7} transparent />
        </mesh>
      )}
    </group>
  );
});

const Piece = memo(function Piece({
  piece,
  isSelected,
  onClick,
}: {
  piece: PieceData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const ref = useRef<Mesh>(null);
  const symbol = PIECE_SYMBOLS[`${piece.color}${piece.type}`];
  const pieceColor = piece.color === "w" ? "#f0e6d0" : "#1a1a2e";
  const emissive = isSelected ? "#7C3AED" : "#000000";
  const emissiveIntensity = isSelected ? 0.8 : 0;

  const heights: Record<PieceType, number> = {
    k: 0.9, q: 0.8, r: 0.6, b: 0.7, n: 0.65, p: 0.5,
  };
  const radii: Record<PieceType, number> = {
    k: 0.28, q: 0.26, r: 0.24, b: 0.22, n: 0.22, p: 0.18,
  };

  const h = heights[piece.type];
  const r = radii[piece.type];

  return (
    <group
      position={[piece.col - 3.5, h / 2, piece.row - 3.5]}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); }}
      ref={ref}
    >
      <mesh>
        <cylinderGeometry args={[r * 0.7, r, h, 16]} />
        <meshStandardMaterial
          color={pieceColor}
          roughness={0.4}
          metalness={0.3}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      <Text
        position={[0, h / 2 + 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.35}
        color={piece.color === "w" ? "#1a1a2e" : "#e2e8f0"}
        anchorX="center"
        anchorY="middle"
      >
        {symbol}
      </Text>
    </group>
  );
});

function BoardFrame() {
  return (
    <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[8.4, 8.4]} />
      <meshStandardMaterial color="#2D2D44" roughness={0.8} />
    </mesh>
  );
}

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function Scene({ fen = DEFAULT_FEN, interactive, playerColor, isCheck, onMove }: Props) {
  const pieces = useMemo(() => parseFen(fen), [fen]);
  const [selected, setSelected] = useState<string | null>(null);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const legalTargets = useMemo(() => {
    if (!selected || !interactive) return new Set<string>();
    const moves = chess.moves({ square: selected as ChessSquare, verbose: true });
    return new Set(moves.map((m) => m.to));
  }, [selected, interactive, chess]);

  const checkSquare = useMemo(() => {
    if (!isCheck) return null;
    const turn = chess.turn();
    const kingPiece = pieces.find((p) => p.type === "k" && p.color === turn);
    return kingPiece?.square ?? null;
  }, [isCheck, chess, pieces]);

  const handleSquareClick = useCallback((col: number, row: number) => {
    if (!interactive) return;
    const sq = toAlgebraic(col, row);

    if (selected) {
      if (legalTargets.has(sq)) {
        onMove?.(selected, sq);
        setSelected(null);
      } else {
        const piece = pieces.find((p) => p.square === sq);
        if (piece && playerColor && piece.color === playerColor[0]) {
          setSelected(sq);
        } else {
          setSelected(null);
        }
      }
    }
  }, [interactive, selected, legalTargets, onMove, pieces, playerColor]);

  const handlePieceClick = useCallback((piece: PieceData) => {
    if (!interactive) return;

    if (selected && legalTargets.has(piece.square)) {
      onMove?.(selected, piece.square);
      setSelected(null);
      return;
    }

    if (playerColor && piece.color !== playerColor[0]) return;

    const turn = chess.turn();
    if (piece.color !== turn) return;

    setSelected(selected === piece.square ? null : piece.square);
  }, [interactive, selected, legalTargets, onMove, playerColor, chess]);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={playerColor === "black" ? [0, 8, -8] : [0, 8, 8]}
        fov={45}
      />
      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={18}
        maxPolarAngle={Math.PI / 2.2}
      />

      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} />
      <pointLight position={[0, 6, 0]} intensity={0.4} color="#7C3AED" />

      <BoardFrame />
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
          const sq = toAlgebraic(col, row);
          return (
            <Square
              key={sq}
              col={col}
              row={row}
              isSelected={selected === sq}
              isLegal={legalTargets.has(sq)}
              isLastMove={false}
              isCheckSquare={checkSquare === sq}
              onClick={() => handleSquareClick(col, row)}
            />
          );
        })
      )}

      {pieces.map((p) => (
        <Piece
          key={`${p.color}${p.type}${p.square}`}
          piece={p}
          isSelected={selected === p.square}
          onClick={() => handlePieceClick(p)}
        />
      ))}
    </>
  );
}

export default function ChessBoard3D({
  fen,
  interactive = false,
  playerColor,
  isCheck,
  onMove,
}: Props) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
      dpr={[1, 2]}
    >
      <Scene fen={fen} interactive={interactive} playerColor={playerColor} isCheck={isCheck} onMove={onMove} />
    </Canvas>
  );
}
