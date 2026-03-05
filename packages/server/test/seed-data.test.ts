import { describe, expect, it } from "vitest";

import { buildSeedUsers, defaultUsers } from "../src/db/seed-data.js";

describe("buildSeedUsers", () => {
  it("builds deterministic users from defaults", () => {
    const users = buildSeedUsers(defaultUsers);

    expect(users).toHaveLength(3);
    expect(users[0]).toMatchObject({
      email: "admin@chess.local",
      username: "admin",
      role: "ADMIN",
      eloRating: 1600
    });
    expect(users[1]).toMatchObject({
      email: "alice@chess.local",
      username: "alice",
      role: "USER",
      eloRating: 1200
    });
  });

  it("throws for duplicate emails", () => {
    expect(() =>
      buildSeedUsers([
        {
          email: "dupe@chess.local",
          username: "alpha",
          passwordHash: "a".repeat(25),
          role: "USER"
        },
        {
          email: "dupe@chess.local",
          username: "beta",
          passwordHash: "b".repeat(25),
          role: "USER"
        }
      ])
    ).toThrowError("Duplicate seed user email found: dupe@chess.local");
  });

  it("throws for invalid email", () => {
    expect(() =>
      buildSeedUsers([
        {
          email: "not-an-email",
          username: "tester",
          passwordHash: "a".repeat(25),
          role: "USER"
        }
      ])
    ).toThrowError("Seed user email is invalid: not-an-email");
  });
});
