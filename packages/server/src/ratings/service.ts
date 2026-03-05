import { calculateNewRating, getActualScores, getExpectedScore, getKFactor, INITIAL_RATING } from "./elo.js";
import type { MatchResult, RatingRepository, TimeControl, UpdateRatingsInput, UpdateRatingsResult } from "./types.js";

const TIME_CONTROLS: readonly TimeControl[] = ["bullet", "blitz", "rapid"];
const RESULTS: readonly MatchResult[] = ["white_win", "draw", "black_win"];

function assertNonEmpty(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must not be empty`);
  }
}

function assertTimeControl(value: string): asserts value is TimeControl {
  if (!TIME_CONTROLS.includes(value as TimeControl)) {
    throw new Error(`Unsupported timeControl: ${value}`);
  }
}

function assertResult(value: string): asserts value is MatchResult {
  if (!RESULTS.includes(value as MatchResult)) {
    throw new Error(`Unsupported match result: ${value}`);
  }
}

export async function updateRatingsAfterMatch(repository: RatingRepository, input: UpdateRatingsInput): Promise<UpdateRatingsResult> {
  assertNonEmpty(input.whitePlayerId, "whitePlayerId");
  assertNonEmpty(input.blackPlayerId, "blackPlayerId");

  if (input.whitePlayerId === input.blackPlayerId) {
    throw new Error("Players must be different");
  }

  assertTimeControl(input.timeControl);
  assertResult(input.result);

  return repository.withTransaction(async (store) => {
    const [existingWhite, existingBlack] = await Promise.all([
      store.getRating(input.whitePlayerId, input.timeControl),
      store.getRating(input.blackPlayerId, input.timeControl)
    ]);

    const whiteBefore =
      existingWhite ??
      {
        playerId: input.whitePlayerId,
        timeControl: input.timeControl,
        rating: INITIAL_RATING,
        gamesPlayed: 0
      };

    const blackBefore =
      existingBlack ??
      {
        playerId: input.blackPlayerId,
        timeControl: input.timeControl,
        rating: INITIAL_RATING,
        gamesPlayed: 0
      };

    const whiteExpected = getExpectedScore(whiteBefore.rating, blackBefore.rating);
    const blackExpected = getExpectedScore(blackBefore.rating, whiteBefore.rating);

    const whiteK = getKFactor(whiteBefore.rating, whiteBefore.gamesPlayed);
    const blackK = getKFactor(blackBefore.rating, blackBefore.gamesPlayed);

    const actualScores = getActualScores(input.result);

    const whiteAfter = {
      ...whiteBefore,
      rating: calculateNewRating(whiteBefore.rating, whiteK, actualScores.white, whiteExpected),
      gamesPlayed: whiteBefore.gamesPlayed + 1
    };

    const blackAfter = {
      ...blackBefore,
      rating: calculateNewRating(blackBefore.rating, blackK, actualScores.black, blackExpected),
      gamesPlayed: blackBefore.gamesPlayed + 1
    };

    await store.upsertRating(whiteAfter);
    await store.upsertRating(blackAfter);

    return {
      white: {
        before: whiteBefore,
        after: whiteAfter,
        expectedScore: whiteExpected,
        actualScore: actualScores.white,
        kFactor: whiteK
      },
      black: {
        before: blackBefore,
        after: blackAfter,
        expectedScore: blackExpected,
        actualScore: actualScores.black,
        kFactor: blackK
      }
    };
  });
}