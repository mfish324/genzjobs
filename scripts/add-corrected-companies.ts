import { PrismaClient, ATSPlatform } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Corrected slugs from research
const correctedCompanies = [
  // Greenhouse - corrected slugs
  { companyName: 'Retool', atsPlatform: 'GREENHOUSE' as ATSPlatform, slug: 'retool' },
  { companyName: 'Miro', atsPlatform: 'GREENHOUSE' as ATSPlatform, slug: 'realtimeboardglobal' },
  { companyName: 'DoorDash', atsPlatform: 'GREENHOUSE' as ATSPlatform, slug: 'doordashusa' },
  { companyName: 'Cloudflare', atsPlatform: 'GREENHOUSE' as ATSPlatform, slug: 'cloudflare' },
  { companyName: 'Lyft', atsPlatform: 'GREENHOUSE' as ATSPlatform, slug: 'lyft' },
  { companyName: 'Reddit', atsPlatform: 'GREENHOUSE' as ATSPlatform, slug: 'reddit' },
  { companyName: 'Pinterest', atsPlatform: 'GREENHOUSE' as ATSPlatform, slug: 'pinterestjobadvertisements' },
  { companyName: 'HubSpot', atsPlatform: 'GREENHOUSE' as ATSPlatform, slug: 'hubspotjobs' },

  // Lever - corrected
  { companyName: 'Plaid', atsPlatform: 'LEVER' as ATSPlatform, slug: 'plaid' },
];

async function main() {
  console.log('Adding corrected company slugs...\n');

  let added = 0;
  for (const company of correctedCompanies) {
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
      console.log(`  Added: ${company.companyName} (${company.atsPlatform}/${company.slug})`);
      added++;
    } catch (error) {
      console.error(`  Error adding ${company.companyName}:`, error);
    }
  }

  console.log(`\nAdded ${added} companies`);

  const total = await prisma.companyATS.count();
  console.log(`Total companies: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
