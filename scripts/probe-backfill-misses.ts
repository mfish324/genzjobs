/**
 * Probe unresolved ATS rows to understand parsing misses.
 * Read-only.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';

dotenv.config();
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Sample unresolved Ashby
  const ashby = await prisma.jobListing.findMany({
    where: { companyAtsId: null, source: 'ashby' },
    select: { sourceId: true, company: true },
    take: 10,
  });
  console.log('--- Sample unresolved Ashby (sourceId | company) ---');
  for (const r of ashby) console.log(`${r.sourceId} | ${r.company}`);

  // Sample unresolved Workday — should be 0 but let's see slug patterns vs by-name resolutions
  const workdayResolvedByName = await prisma.jobListing.findMany({
    where: { source: 'workday' },
    select: { sourceId: true, company: true },
    take: 10,
  });
  console.log('\n--- Sample Workday rows (sourceId | company) ---');
  for (const r of workdayResolvedByName) console.log(`${r.sourceId} | ${r.company}`);

  // Show all Ashby slugs to see if unresolved sourceIds contain them
  const ashbyCompanies = await prisma.companyATS.findMany({
    where: { atsPlatform: 'ASHBY' },
    select: { slug: true, companyName: true },
  });
  console.log('\n--- Known Ashby slugs ---');
  for (const c of ashbyCompanies) console.log(`${c.slug} | ${c.companyName}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
