/**
 * One-time migration script to recalculate all User.level values
 * using the new curved LEVEL_THRESHOLDS system.
 *
 * Run with: npx tsx scripts/migrate-levels.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Inline the threshold logic so we don't need module resolution
const LEVEL_THRESHOLDS = [0, 500, 1200, 2500, 4500, 7500, 12000, 18000, 26000, 40000];

function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

async function main() {
  require("dotenv").config({ path: ".env.local" });

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({
      select: { id: true, xp: true, level: true },
    });

    console.log(`Found ${users.length} users to migrate`);

    let updated = 0;
    for (const user of users) {
      const newLevel = calculateLevel(user.xp);
      if (newLevel !== user.level) {
        await prisma.user.update({
          where: { id: user.id },
          data: { level: newLevel },
        });
        console.log(`  User ${user.id}: ${user.xp} XP, level ${user.level} -> ${newLevel}`);
        updated++;
      }
    }

    console.log(`Done. Updated ${updated}/${users.length} users.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
