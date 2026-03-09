/**
 * Seed quest templates into the database.
 * Run with: npx tsx scripts/seed-quests.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

require("dotenv").config({ path: ".env.local" });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const QUESTS = [
  // === DAILY QUESTS ===
  // EASY
  {
    title: "Daily Check-In",
    description: "Log in to GenZJobs today",
    type: "daily",
    difficulty: "EASY",
    action: "login",
    targetCount: 1,
    xpReward: 10,
  },
  {
    title: "Bookmark a Job",
    description: "Save a job you're interested in",
    type: "daily",
    difficulty: "EASY",
    action: "save_jobs",
    targetCount: 1,
    xpReward: 15,
  },
  {
    title: "Spin the Wheel",
    description: "Try your luck with the daily spin",
    type: "daily",
    difficulty: "EASY",
    action: "daily_spin",
    targetCount: 1,
    xpReward: 10,
  },
  // NORMAL
  {
    title: "Job Explorer",
    description: "Apply to 1 job today",
    type: "daily",
    difficulty: "NORMAL",
    action: "apply_jobs",
    targetCount: 1,
    xpReward: 25,
  },
  {
    title: "Save for Later",
    description: "Save 3 jobs to your list",
    type: "daily",
    difficulty: "NORMAL",
    action: "save_jobs",
    targetCount: 3,
    xpReward: 25,
  },
  {
    title: "Skill Sharpener",
    description: "Update your skills on your profile",
    type: "daily",
    difficulty: "NORMAL",
    action: "update_skills",
    targetCount: 1,
    xpReward: 20,
  },
  // HARD
  {
    title: "Application Blitz",
    description: "Apply to 3 jobs in a single day",
    type: "daily",
    difficulty: "HARD",
    action: "apply_jobs",
    targetCount: 3,
    xpReward: 75,
  },
  {
    title: "Networking Pro",
    description: "Attend a community event",
    type: "daily",
    difficulty: "HARD",
    action: "attend_event",
    targetCount: 1,
    xpReward: 50,
  },

  // === WEEKLY QUESTS ===
  {
    title: "Weekly Warrior",
    description: "Apply to 5 jobs this week",
    type: "weekly",
    difficulty: "NORMAL",
    action: "apply_jobs",
    targetCount: 5,
    xpReward: 100,
  },
  {
    title: "Career Builder",
    description: "Apply to 10 jobs this week",
    type: "weekly",
    difficulty: "HARD",
    action: "apply_jobs",
    targetCount: 10,
    xpReward: 250,
  },
  {
    title: "Job Collector",
    description: "Save 10 jobs this week",
    type: "weekly",
    difficulty: "NORMAL",
    action: "save_jobs",
    targetCount: 10,
    xpReward: 75,
  },

  // === MILESTONE QUESTS ===
  {
    title: "First Steps",
    description: "Submit your first job application",
    type: "milestone",
    difficulty: "EASY",
    action: "apply_jobs",
    targetCount: 1,
    xpReward: 50,
  },
  {
    title: "Getting Serious",
    description: "Apply to 25 jobs total",
    type: "milestone",
    difficulty: "NORMAL",
    action: "apply_jobs",
    targetCount: 25,
    xpReward: 200,
  },
  {
    title: "Application Machine",
    description: "Apply to 100 jobs total",
    type: "milestone",
    difficulty: "HARD",
    action: "apply_jobs",
    targetCount: 100,
    xpReward: 500,
  },
  {
    title: "Profile Pro",
    description: "Complete your profile",
    type: "milestone",
    difficulty: "NORMAL",
    action: "complete_profile",
    targetCount: 1,
    xpReward: 100,
  },
];

async function main() {
  console.log("Seeding quests...");

  for (const quest of QUESTS) {
    // Upsert by title to avoid duplicates on re-run
    const existing = await prisma.quest.findFirst({
      where: { title: quest.title, type: quest.type },
    });

    if (existing) {
      await prisma.quest.update({
        where: { id: existing.id },
        data: quest,
      });
      console.log(`  Updated: ${quest.title}`);
    } else {
      await prisma.quest.create({ data: quest });
      console.log(`  Created: ${quest.title}`);
    }
  }

  console.log(`Done. ${QUESTS.length} quests seeded.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
