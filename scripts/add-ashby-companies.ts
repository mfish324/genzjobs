import { PrismaClient, ATSPlatform } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Ashby companies
const ashbyCompanies = [
  { companyName: 'OpenAI', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'openai' },
  { companyName: 'Notion', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'notion' },
  { companyName: 'Ramp', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'ramp' },
  { companyName: 'Linear', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'linear' },
  { companyName: 'Replit', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'replit' },
  { companyName: 'Pinecone', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'pinecone' },
  { companyName: 'Confluent', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'confluent' },
  { companyName: 'Zapier', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'zapier' },
  { companyName: 'Retool', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'retool' },
  // Additional Ashby companies
  { companyName: 'Vercel', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'vercel' },
  { companyName: 'Supabase', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'supabase' },
  { companyName: 'Resend', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'resend' },
  { companyName: 'Codeium', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'codeium' },
  { companyName: 'Cursor', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'anysphere' },
  { companyName: 'Perplexity', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'perplexity' },
  { companyName: 'Warp', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'warp' },
  { companyName: 'Railway', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'railway' },
  { companyName: 'Loom', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'loom' },
  { companyName: 'Clerk', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'clerk' },
  { companyName: 'Temporal', atsPlatform: 'ASHBY' as ATSPlatform, slug: 'temporal' },
];

async function main() {
  console.log('Adding Ashby companies...\n');

  // First remove the incorrect Greenhouse/Lever entries for these companies
  const slugsToRemove = ashbyCompanies.map(c => c.slug);
  const removed = await prisma.companyATS.deleteMany({
    where: {
      slug: { in: [...slugsToRemove, 'retool'] },
      atsPlatform: { in: ['GREENHOUSE', 'LEVER'] }
    }
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} incorrect entries\n`);
  }

  let added = 0;
  for (const company of ashbyCompanies) {
    try {
      await prisma.companyATS.upsert({
        where: {
          atsPlatform_slug: {
            atsPlatform: company.atsPlatform,
            slug: company.slug,
          },
        },
        update: { companyName: company.companyName },
        create: company,
      });
      console.log(`  Added: ${company.companyName} (ASHBY/${company.slug})`);
      added++;
    } catch (error) {
      console.error(`  Error adding ${company.companyName}:`, error);
    }
  }

  console.log(`\nAdded ${added} Ashby companies`);

  // Show totals by platform
  const counts = await prisma.companyATS.groupBy({
    by: ['atsPlatform'],
    _count: true,
  });

  console.log('\n==================== By Platform ====================');
  for (const row of counts) {
    console.log(`${row.atsPlatform}: ${row._count}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
