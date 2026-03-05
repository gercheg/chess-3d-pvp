export type TimeControl = "bullet" | "blitz" | "rapid";

export type MatchResult = "white_win" | "draw" | "black_win";

export interface PlayerRating {
  playerId: string;
  timeControl: TimeControl;
  rating: number;
  gamesPlayed: number;
}

export interface RatingStore {
  getRating(playerId: string, timeControl: TimeControl): Promise<PlayerRating | null>;
  upsertRating(rating: PlayerRating): Promise<PlayerRating>;
}

export interface RatingRepository {
  withTransaction<T>(runInTransaction: (store: RatingStore) => Promise<T>): Promise<T>;
}

export interface UpdateRatingsInput {
  whitePlayerId: string;
  blackPlayerId: string;
  timeControl: TimeControl;
  result: MatchResult;
}

export interface UpdatedPlayerRating {
  before: PlayerRating;
  after: PlayerRating;
  expectedScore: number;
  actualScore: number;
  kFactor: number;
}

export interface UpdateRatingsResult {
  white: UpdatedPlayerRating;
  black: UpdatedPlayerRating;
}