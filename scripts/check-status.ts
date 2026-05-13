import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Last seen by source
  const sources = ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workday', 'workable', 'recruitee'];

  console.log('=== Last Seen by Source ===');
  for (const source of sources) {
    const latest = await prisma.jobListing.findFirst({
      where: { source },
      orderBy: { lastSeenAt: 'desc' },
      select: { lastSeenAt: true }
    });
    const date = latest?.lastSeenAt ? latest.lastSeenAt.toISOString() : 'never';
    console.log(source + ': ' + date);
  }

  // Last scraped companies by platform
  console.log('\n=== Last Scraped by Platform ===');
  for (const platform of ['GREENHOUSE', 'LEVER', 'ASHBY', 'SMARTRECRUITERS', 'WORKDAY', 'WORKABLE', 'RECRUITEE']) {
    const latest = await prisma.companyATS.findFirst({
      where: { atsPlatform: platform as any, lastScrapedAt: { not: null } },
      orderBy: { lastScrapedAt: 'desc' },
      select: { companyName: true, lastScrapedAt: true }
    });
    if (latest) {
      const date = latest.lastScrapedAt ? latest.lastScrapedAt.toISOString() : 'never';
      console.log(platform + ': ' + latest.companyName + ' @ ' + date);
    } else {
      console.log(platform + ': never scraped');
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
