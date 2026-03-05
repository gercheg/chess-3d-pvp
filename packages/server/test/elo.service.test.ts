import { describe, expect, it } from "vitest";

import {
  calculateNewRating,
  getExpectedScore,
  getKFactor,
  INITIAL_RATING,
  MIN_RATING,
  updateRatingsAfterMatch,
  type PlayerRating,
  type RatingRepository,
  type RatingStore,
  type TimeControl
} from "../src/index.js";

class InMemoryRatingRepository implements RatingRepository {
  private readonly ratings = new Map<string, PlayerRating>();
  private failOnUpsertPlayerId: string | null = null;

  setSeed(rating: PlayerRating): void {
    this.ratings.set(this.getKey(rating.playerId, rating.timeControl), { ...rating });
  }

  setFailOnUpsert(playerId: string | null): void {
    this.failOnUpsertPlayerId = playerId;
  }

  getSnapshot(playerId: string, timeControl: TimeControl): PlayerRating | null {
    return this.ratings.get(this.getKey(playerId, timeControl)) ?? null;
  }

  async withTransaction<T>(runInTransaction: (store: RatingStore) => Promise<T>): Promise<T> {
    const staging = new Map<string, PlayerRating>();
    for (const [key, value] of this.ratings.entries()) {
      staging.set(key, { ...value });
    }

    const store: RatingStore = {
      getRating: async (playerId, timeControl) => staging.get(this.getKey(playerId, timeControl)) ?? null,
      upsertRating: async (rating) => {
        if (this.failOnUpsertPlayerId === rating.playerId) {
          throw new Error(`forced failure for ${rating.playerId}`);
        }

        const next = { ...rating };
        staging.set(this.getKey(rating.playerId, rating.timeControl), next);
        return next;
      }
    };

    const result = await runInTransaction(store);
    this.ratings.clear();

    for (const [key, value] of staging.entries()) {
      this.ratings.set(key, value);
    }

    return result;
  }

  private getKey(playerId: string, timeControl: TimeControl): string {
    return `${playerId}:${timeControl}`;
  }
}

describe("Elo math", () => {
  it("computes expected score with standard Elo formula", () => {
    const expected = getExpectedScore(1200, 1400);
    expect(expected).toBeCloseTo(0.240253, 6);
  });

  it("uses K=40 for players under 30 games", () => {
    expect(getKFactor(1200, 29)).toBe(40);
  });

  it("uses K=20 for players with 30 or more games", () => {
    expect(getKFactor(1200, 30)).toBe(20);
  });

  it("uses K=10 for ratings above 2400 regardless of games", () => {
    expect(getKFactor(2401, 3)).toBe(10);
    expect(getKFactor(2450, 100)).toBe(10);
  });

  it("applies minimum rating floor", () => {
    const belowFloor = calculateNewRating(MIN_RATING, 40, 0, 1);
    expect(belowFloor).toBe(MIN_RATING);
  });
});

describe("updateRatingsAfterMatch", () => {
  it("initializes missing ratings at 1200 and updates both players", async () => {
    const repository = new InMemoryRatingRepository();

    const result = await updateRatingsAfterMatch(repository, {
      whitePlayerId: "white-1",
      blackPlayerId: "black-1",
      timeControl: "blitz",
      result: "white_win"
    });

    expect(result.white.before.rating).toBe(INITIAL_RATING);
    expect(result.black.before.rating).toBe(INITIAL_RATING);
    expect(result.white.after.rating).toBe(1220);
    expect(result.black.after.rating).toBe(1180);
    expect(result.white.after.gamesPlayed).toBe(1);
    expect(result.black.after.gamesPlayed).toBe(1);
  });

  it("keeps separate ratings per time control", async () => {
    const repository = new InMemoryRatingRepository();
    repository.setSeed({ playerId: "p1", timeControl: "bullet", rating: 1300, gamesPlayed: 12 });
    repository.setSeed({ playerId: "p2", timeControl: "bullet", rating: 1100, gamesPlayed: 12 });
    repository.setSeed({ playerId: "p1", timeControl: "rapid", rating: 1500, gamesPlayed: 50 });
    repository.setSeed({ playerId: "p2", timeControl: "rapid", rating: 1500, gamesPlayed: 50 });

    await updateRatingsAfterMatch(repository, {
      whitePlayerId: "p1",
      blackPlayerId: "p2",
      timeControl: "bullet",
      result: "draw"
    });

    expect(repository.getSnapshot("p1", "rapid")?.rating).toBe(1500);
    expect(repository.getSnapshot("p2", "rapid")?.rating).toBe(1500);
    expect(repository.getSnapshot("p1", "bullet")?.gamesPlayed).toBe(13);
    expect(repository.getSnapshot("p2", "bullet")?.gamesPlayed).toBe(13);
  });

  it("rolls back both updates when one player write fails", async () => {
    const repository = new InMemoryRatingRepository();
    repository.setSeed({ playerId: "p1", timeControl: "rapid", rating: 1400, gamesPlayed: 45 });
    repository.setSeed({ playerId: "p2", timeControl: "rapid", rating: 1450, gamesPlayed: 45 });
    repository.setFailOnUpsert("p2");

    await expect(
      updateRatingsAfterMatch(repository, {
        whitePlayerId: "p1",
        blackPlayerId: "p2",
        timeControl: "rapid",
        result: "white_win"
      })
    ).rejects.toThrow("forced failure");

    expect(repository.getSnapshot("p1", "rapid")?.rating).toBe(1400);
    expect(repository.getSnapshot("p1", "rapid")?.gamesPlayed).toBe(45);
    expect(repository.getSnapshot("p2", "rapid")?.rating).toBe(1450);
    expect(repository.getSnapshot("p2", "rapid")?.gamesPlayed).toBe(45);
  });

  it("rejects invalid input", async () => {
    const repository = new InMemoryRatingRepository();

    await expect(
      updateRatingsAfterMatch(repository, {
        whitePlayerId: "same",
        blackPlayerId: "same",
        timeControl: "blitz",
        result: "draw"
      })
    ).rejects.toThrow("Players must be different");
  });
});