import { PrismaClient } from "@prisma/client";

import { buildSeedUsers } from "../src/db/seed-data.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const users = buildSeedUsers();

  await prisma.$transaction(
    users.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          username: user.username,
          passwordHash: user.passwordHash,
          role: user.role,
          eloRating: user.eloRating
        },
        create: user
      })
    )
  );
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed database", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
