import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function test() {
  console.log("Testing database connection...");
  try {
    const count = await prisma.jobListing.count({ where: { isActive: true } });
    console.log(`✅ Connected! Found ${count} active jobs`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
