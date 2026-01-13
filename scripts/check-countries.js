const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
require('dotenv').config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function checkJobs() {
  // Count jobs by country
  const countries = await prisma.jobListing.groupBy({
    by: ['country'],
    _count: { country: true },
    where: { isActive: true },
    orderBy: { _count: { country: 'desc' } }
  });

  console.log('Active jobs by country:');
  countries.forEach(c => {
    console.log('  ' + (c.country || 'NULL') + ': ' + c._count.country);
  });

  // Check for jobs with Germany in the location text
  const germanyLocationJobs = await prisma.jobListing.findMany({
    where: {
      isActive: true,
      location: { contains: 'Germany', mode: 'insensitive' }
    },
    select: { id: true, title: true, company: true, location: true, country: true, source: true },
    take: 10
  });

  if (germanyLocationJobs.length > 0) {
    console.log('\nJobs with "Germany" in location text:');
    germanyLocationJobs.forEach(j => console.log('  ' + j.title + ' | Location: ' + j.location + ' | Country: ' + j.country));
  } else {
    console.log('\nNo jobs with "Germany" in location text.');
  }

  // Check for jobs with DE in location
  const deLocationJobs = await prisma.jobListing.findMany({
    where: {
      isActive: true,
      OR: [
        { location: { contains: ', DE', mode: 'insensitive' } },
        { location: { endsWith: ' DE', mode: 'insensitive' } }
      ]
    },
    select: { id: true, title: true, company: true, location: true, country: true, source: true },
    take: 10
  });

  if (deLocationJobs.length > 0) {
    console.log('\nJobs with "DE" in location:');
    deLocationJobs.forEach(j => console.log('  ' + j.title + ' | Location: ' + j.location + ' | Country: ' + j.country));
  }

  // Count non-US jobs
  const nonUS = await prisma.jobListing.count({
    where: {
      isActive: true,
      NOT: { country: 'US' },
      country: { not: null }
    }
  });
  console.log('\nTotal non-US jobs (excluding NULL): ' + nonUS);

  await prisma.$disconnect();
}

checkJobs().catch(console.error);
