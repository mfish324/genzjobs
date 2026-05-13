import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const stats: any[] = await prisma.$queryRaw`
    SELECT source,
           COUNT(*)::int as total,
           COUNT("companyAtsId")::int as with_fk,
           (COUNT(*) - COUNT("companyAtsId"))::int as null_fk
    FROM job_listings
    WHERE source IN ('greenhouse','lever','ashby','smartrecruiters','workday','workable','recruitee')
    GROUP BY source ORDER BY source
  `;
  console.log('source            | total  | with FK | null FK');
  console.log('------------------+--------+---------+--------');
  for (const r of stats) {
    console.log(`${r.source.padEnd(17)} | ${String(r.total).padStart(6)} | ${String(r.with_fk).padStart(7)} | ${String(r.null_fk).padStart(7)}`);
  }

  // Spot-check: pick one row with an FK and traverse the relation
  const sample = await prisma.jobListing.findFirst({
    where: { companyAtsId: { not: null } },
    select: {
      id: true, title: true, company: true,
      companyAts: { select: { companyName: true, atsPlatform: true, slug: true, priorityTier: true, industryCategory: true } },
    },
  });
  console.log('\nSpot-check traversal:');
  console.log(JSON.stringify(sample, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
