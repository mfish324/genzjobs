import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const disabled = await prisma.companyATS.findMany({
    where: { isActive: false },
    orderBy: [{ atsPlatform: 'asc' }, { companyName: 'asc' }],
  });

  console.log(`Found ${disabled.length} disabled companies:\n`);
  for (const c of disabled) {
    console.log(`  ${c.atsPlatform} | ${c.companyName} (${c.slug}) | failures: ${c.scrapeFailures}`);
  }

  if (disabled.length === 0) {
    console.log('No disabled companies to re-enable.');
    return;
  }

  console.log(`\nRe-enabling ${disabled.length} companies...`);
  const result = await prisma.companyATS.updateMany({
    where: { isActive: false },
    data: { isActive: true, scrapeFailures: 0 },
  });
  console.log(`Done. Updated ${result.count} companies.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
