import { PrismaClient, ATSPlatform } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// SmartRecruiters companies - enterprise focus
const smartRecruitersCompanies = [
  { companyName: 'Visa', atsPlatform: 'SMARTRECRUITERS' as ATSPlatform, slug: 'visa' },
  { companyName: 'Bosch', atsPlatform: 'SMARTRECRUITERS' as ATSPlatform, slug: 'boaborschgmbh' },
  { companyName: 'Skechers', atsPlatform: 'SMARTRECRUITERS' as ATSPlatform, slug: 'skechers' },
  { companyName: 'Equinox', atsPlatform: 'SMARTRECRUITERS' as ATSPlatform, slug: 'equinox' },
  { companyName: 'IKEA', atsPlatform: 'SMARTRECRUITERS' as ATSPlatform, slug: 'ikea' },
  { companyName: 'T-Mobile', atsPlatform: 'SMARTRECRUITERS' as ATSPlatform, slug: 'tmobile' },
  { companyName: 'Square', atsPlatform: 'SMARTRECRUITERS' as ATSPlatform, slug: 'square' },
  { companyName: 'Spotify', atsPlatform: 'SMARTRECRUITERS' as ATSPlatform, slug: 'spotify' },
  { companyName: 'Adidas', atsPlatform: 'SMARTRECRUITERS' as ATSPlatform, slug: 'adidasgroup' },
  { companyName: 'LinkedIn', atsPlatform: 'SMARTRECRUITERS' as ATSPlatform, slug: 'linkedin' },
  { companyName: 'Deloitte', atsPlatform: 'SMARTRECRUITERS' as ATSPlatform, slug: 'deloitte' },
  { companyName: 'Publicis Groupe', atsPlatform: 'SMARTRECRUITERS' as ATSPlatform, slug: 'publicisgroupe' },
];

async function main() {
  console.log('Adding SmartRecruiters companies...\n');

  let added = 0;
  for (const company of smartRecruitersCompanies) {
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
      console.log(`  Added: ${company.companyName} (SMARTRECRUITERS/${company.slug})`);
      added++;
    } catch (error) {
      console.error(`  Error adding ${company.companyName}:`, error);
    }
  }

  console.log(`\nAdded ${added} SmartRecruiters companies`);

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
