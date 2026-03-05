import type { Prisma, UserRole } from "@prisma/client";

type SeedUserInput = {
  email: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  eloRating?: number;
};

const defaultUsers: SeedUserInput[] = [
  {
    email: "admin@chess.local",
    username: "admin",
    passwordHash: "$2b$12$VQOHWw2jD6qbx5MZe5eWTejK2qWD.MQfV8vVDbLEWqL6vQXm8g7pa",
    role: "ADMIN",
    eloRating: 1600
  },
  {
    email: "alice@chess.local",
    username: "alice",
    passwordHash: "$2b$12$VQOHWw2jD6qbx5MZe5eWTejK2qWD.MQfV8vVDbLEWqL6vQXm8g7pa",
    role: "USER",
    eloRating: 1200
  },
  {
    email: "bob@chess.local",
    username: "bob",
    passwordHash: "$2b$12$VQOHWw2jD6qbx5MZe5eWTejK2qWD.MQfV8vVDbLEWqL6vQXm8g7pa",
    role: "USER",
    eloRating: 1200
  }
];

function assertValidUserInput(user: SeedUserInput): void {
  if (!user.email.includes("@")) {
    throw new Error(`Seed user email is invalid: ${user.email}`);
  }

  if (user.username.trim().length < 3) {
    throw new Error(`Seed username is invalid: ${user.username}`);
  }

  if (!user.passwordHash || user.passwordHash.length < 20) {
    throw new Error(`Seed password hash is invalid for ${user.email}`);
  }

  if (user.eloRating !== undefined && user.eloRating < 100) {
    throw new Error(`Seed ELO rating is invalid for ${user.email}`);
  }
}

export function buildSeedUsers(users: SeedUserInput[] = defaultUsers): Prisma.UserCreateInput[] {
  const uniqueEmails = new Set<string>();
  const uniqueUsernames = new Set<string>();

  return users.map((user) => {
    assertValidUserInput(user);

    const email = user.email.toLowerCase();
    const username = user.username.trim().toLowerCase();

    if (uniqueEmails.has(email)) {
      throw new Error(`Duplicate seed user email found: ${email}`);
    }

    if (uniqueUsernames.has(username)) {
      throw new Error(`Duplicate seed username found: ${username}`);
    }

    uniqueEmails.add(email);
    uniqueUsernames.add(username);

    return {
      email,
      username,
      passwordHash: user.passwordHash,
      role: user.role,
      eloRating: user.eloRating ?? 1200
    };
  });
}

export { defaultUsers };
