import type { Board, GameState, Piece, PieceType, Color } from './types';

const backRank: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

function createPiece(type: PieceType, color: Color): Piece {
  return { type, color };
}

export function createInitialBoard(): GameState {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));

  for (let col = 0; col < 8; col++) {
    board[0][col] = createPiece(backRank[col], 'white');
    board[1][col] = createPiece('pawn', 'white');
    board[6][col] = createPiece('pawn', 'black');
    board[7][col] = createPiece(backRank[col], 'black');
  }

  return {
    board,
    turn: 'white',
    castlingRights: {
      whiteKingside: true,
      whiteQueenside: true,
      blackKingside: true,
      blackQueenside: true,
    },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    moveHistory: [],
    status: 'playing',
  };
}
