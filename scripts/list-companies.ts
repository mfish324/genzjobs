import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const p = new PrismaClient({ adapter });

async function main() {
  const companies = await p.companyATS.findMany({
    where: { isActive: true },
    orderBy: [{ atsPlatform: 'asc' }, { companyName: 'asc' }],
    select: { atsPlatform: true, companyName: true, slug: true, lastJobCount: true }
  });

  let cur = '';
  for (const c of companies) {
    if (c.atsPlatform !== cur) {
      cur = c.atsPlatform;
      console.log(`\n${cur}:`);
    }
    console.log(`  ("${c.companyName}", "${c.slug}"),  # jobs=${c.lastJobCount ?? 0}`);
  }
  console.log(`\nTotal: ${companies.length}`);
}

main().catch(console.error).finally(() => p.$disconnect());
