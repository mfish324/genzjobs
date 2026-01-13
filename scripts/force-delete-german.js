const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
require('dotenv').config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Force delete any job with obvious German patterns regardless of location
const GERMAN_PATTERNS = [
  // German gender notation in titles - ALWAYS German
  { field: 'title', pattern: '(m/w/d)' },
  { field: 'title', pattern: '(w/m/d)' },
  { field: 'title', pattern: '(d/m/w)' },
  { field: 'title', pattern: '(m/f/d)' },
  { field: 'title', pattern: '(all genders)' },
  { field: 'title', pattern: 'Werkstudent' },
  { field: 'title', pattern: 'Praktikum' },
  { field: 'title', pattern: 'Ausbildung' },
  { field: 'title', pattern: '/Woche' },  // "per week" in German
  { field: 'title', pattern: 'ab sofort' },  // "immediately" in German
  // German company suffixes
  { field: 'company', pattern: 'GmbH' },
  { field: 'company', pattern: ' OHG' },
  { field: 'company', pattern: ' e.V.' },
  { field: 'company', pattern: ' KG' },
];

async function forceDeleteGerman() {
  console.log('=== Force Deleting German Jobs ===\n');
  let totalDeleted = 0;

  for (const check of GERMAN_PATTERNS) {
    const where = {
      isActive: true,
      [check.field]: { contains: check.pattern, mode: 'insensitive' }
    };

    const jobs = await prisma.jobListing.findMany({
      where,
      select: { id: true, title: true, company: true, location: true }
    });

    if (jobs.length > 0) {
      console.log(`\n"${check.pattern}" in ${check.field}: Found ${jobs.length} jobs`);
      jobs.slice(0, 3).forEach(j => {
        console.log(`  - ${j.title} | ${j.company} | ${j.location}`);
      });

      const ids = jobs.map(j => j.id);
      const result = await prisma.jobListing.deleteMany({ where: { id: { in: ids } } });
      console.log(`  Deleted: ${result.count}`);
      totalDeleted += result.count;
    }
  }

  console.log(`\n=== Total deleted: ${totalDeleted} ===`);

  const remaining = await prisma.jobListing.count({ where: { isActive: true } });
  console.log(`Remaining active jobs: ${remaining}`);

  await prisma.$disconnect();
}

forceDeleteGerman().catch(console.error);
