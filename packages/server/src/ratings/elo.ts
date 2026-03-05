import type { MatchResult } from "./types.js";

export const INITIAL_RATING = 1200;
export const MIN_RATING = 100;

export function getKFactor(currentRating: number, gamesPlayed: number): number {
  if (currentRating > 2400) {
    return 10;
  }

  if (gamesPlayed < 30) {
    return 40;
  }

  return 20;
}

export function getExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

export function getActualScores(result: MatchResult): { white: number; black: number } {
  switch (result) {
    case "white_win":
      return { white: 1, black: 0 };
    case "black_win":
      return { white: 0, black: 1 };
    case "draw":
      return { white: 0.5, black: 0.5 };
    default: {
      const exhausted: never = result;
      throw new Error(`Unsupported result: ${String(exhausted)}`);
    }
  }
}

export function calculateNewRating(currentRating: number, kFactor: number, actualScore: number, expectedScore: number): number {
  const rawRating = currentRating + kFactor * (actualScore - expectedScore);
  return Math.max(MIN_RATING, Math.round(rawRating));
}