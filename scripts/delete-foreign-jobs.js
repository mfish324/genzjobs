const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
require('dotenv').config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Location patterns that indicate non-US jobs
const NON_US_LOCATION_PATTERNS = [
  // Germany - major cities
  'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Düsseldorf', 'Stuttgart',
  'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg',
  'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster', 'Karlsruhe',
  'Mannheim', 'Augsburg', 'Wiesbaden', 'Freiburg', 'Heidelberg',
  'Germany', 'Deutschland',
  // UK cities
  'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Bristol',
  'Sheffield', 'Edinburgh', 'Leicester', 'Coventry', 'Bradford', 'Cardiff', 'Belfast',
  'Nottingham', 'Kingston upon Hull', 'Newcastle', 'Southampton', 'Reading',
  'United Kingdom', 'England', 'Scotland', 'Wales',
  // Canada cities
  'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg',
  'Quebec City', 'Hamilton', 'Kitchener', 'Victoria', 'Halifax',
  'Ontario', 'British Columbia', 'Alberta', 'Quebec',
  // India cities
  'Bangalore', 'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune',
  'Kolkata', 'Ahmedabad', 'Jaipur', 'Noida', 'Gurgaon', 'Gurugram',
  // Australia cities
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra',
  // France cities
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Bordeaux',
  // Netherlands cities
  'Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven',
  // Spain cities
  'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Malaga',
  // Italy cities
  'Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence',
  // Poland cities
  'Warsaw', 'Krakow', 'Lodz', 'Wroclaw', 'Poznan', 'Gdansk',
  // Ireland
  'Dublin', 'Cork', 'Limerick', 'Galway',
  // Sweden
  'Stockholm', 'Gothenburg', 'Malmo',
  // Switzerland
  'Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne',
  // Austria
  'Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck',
  // Belgium
  'Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liege',
  // Portugal
  'Lisbon', 'Porto', 'Braga',
  // Other
  'Singapore', 'Tokyo', 'Osaka', 'Shanghai', 'Beijing', 'Shenzhen', 'Hong Kong',
  'São Paulo', 'Rio de Janeiro', 'Mexico City', 'Guadalajara', 'Manila', 'Tel Aviv',
  'Cape Town', 'Johannesburg', 'Dubai', 'Abu Dhabi', 'Seoul', 'Busan',
];

// Company name patterns that indicate non-US companies
const NON_US_COMPANY_PATTERNS = [
  'GmbH',      // German company (Gesellschaft mit beschränkter Haftung)
  'AG ',       // German/Swiss stock company (Aktiengesellschaft)
  ' AG',       // German/Swiss stock company at end
  'e.V.',      // German registered association
  'OHG',       // German general partnership
  'KG ',       // German limited partnership
  ' KG',       // German limited partnership at end
  'Ltd.',      // UK Limited company (check context)
  'Pvt Ltd',   // Indian private limited
  'Pvt. Ltd',  // Indian private limited
  'Pty Ltd',   // Australian company
  'S.A.',      // Spanish/French company
  'S.L.',      // Spanish limited company
  'B.V.',      // Dutch company
  'N.V.',      // Dutch/Belgian company
  'A/S',       // Danish company
  'AB ',       // Swedish company
  ' AB',       // Swedish company at end
  'Oy',        // Finnish company
  'S.p.A.',    // Italian company
  'S.r.l.',    // Italian limited company
];

// Title patterns that indicate German jobs (German language)
const GERMAN_TITLE_PATTERNS = [
  '(m/w/d)',   // German gender notation (männlich/weiblich/divers)
  '(w/m/d)',
  '(d/m/w)',
  '(m/f/d)',
  '(all genders)',
  'Werkstudent',  // German working student
  'Praktikum',    // German internship
  'Ausbildung',   // German apprenticeship
  'Sachbearbeiter', // German clerk
  'Mitarbeiter',  // German employee
  'Entwickler',   // German developer
  'Berater',      // German consultant
  'Ingenieur',    // German engineer
  'Kaufmann',     // German merchant/clerk
  'Kauffrau',
  'Leiter',       // German manager
  'Assistent',    // German assistant
  'Fachkraft',    // German specialist
];

// US cities that might match non-US patterns (to exclude from deletion)
const US_EXCEPTIONS = [
  'berlin, ct', 'berlin, md', 'berlin, nj', 'berlin, wi', 'berlin, nh',
  'manchester, ct', 'manchester, nh', 'manchester, mo',
  'birmingham, al',
  'paris, tx', 'paris, tn', 'paris, il', 'paris, ky',
  'vienna, va', 'vienna, wv',
  'rome, ga', 'rome, ny',
  'milan, mi', 'milan, tn', 'milan, il', 'milan, oh',
  'florence, sc', 'florence, al', 'florence, ky', 'florence, az',
  'dublin, oh', 'dublin, ca', 'dublin, ga',
  'reading, pa',
  'bristol, ct', 'bristol, tn', 'bristol, va', 'bristol, ri',
  'oxford, ms', 'oxford, al', 'oxford, nc', 'oxford, oh',
  'cambridge, ma', 'cambridge, md',
  'hamilton, oh', 'hamilton, nj', 'hamilton, mt',
  'victoria, tx',
  'edinburgh, tx', 'edinburgh, in',
  'valencia, ca',
  'toledo, oh',
  'lancaster, pa', 'lancaster, ca', 'lancaster, oh',
  'lima, oh',
  'indiana', // State, not India
  'delaware', // State
  'maryland', // State (not Madrid)
];

async function isUSJob(job) {
  const location = (job.location || '').toLowerCase();
  const title = (job.title || '').toLowerCase();
  const company = (job.company || '').toLowerCase();

  // Check if it's explicitly a US location
  for (const exc of US_EXCEPTIONS) {
    if (location.includes(exc)) return true;
  }

  // Check for US state codes at end
  const usStatePattern = /, (al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc)(,|\s|$)/i;
  if (usStatePattern.test(location)) return true;

  // If contains ", US" or ends with " US"
  if (location.includes(', us') || location.endsWith(' us') || location.includes('united states')) return true;

  return false;
}

async function deleteForeignJobs() {
  console.log('=== Comprehensive Foreign Job Cleanup ===\n');

  let totalDeleted = 0;

  // 1. Delete by location patterns
  console.log('--- Checking location patterns ---');
  for (const pattern of NON_US_LOCATION_PATTERNS) {
    const jobs = await prisma.jobListing.findMany({
      where: {
        isActive: true,
        location: { contains: pattern, mode: 'insensitive' }
      },
      select: { id: true, title: true, location: true, company: true, country: true }
    });

    if (jobs.length > 0) {
      const toDelete = [];
      for (const job of jobs) {
        if (!(await isUSJob(job))) {
          toDelete.push(job);
        }
      }

      if (toDelete.length > 0) {
        const ids = toDelete.map(j => j.id);
        await prisma.jobListing.deleteMany({ where: { id: { in: ids } } });
        console.log(`"${pattern}": Deleted ${toDelete.length} of ${jobs.length} jobs`);
        totalDeleted += toDelete.length;
      }
    }
  }

  // 2. Delete by company name patterns (GmbH, etc.)
  console.log('\n--- Checking company name patterns ---');
  for (const pattern of NON_US_COMPANY_PATTERNS) {
    const jobs = await prisma.jobListing.findMany({
      where: {
        isActive: true,
        company: { contains: pattern, mode: 'insensitive' }
      },
      select: { id: true, title: true, location: true, company: true }
    });

    if (jobs.length > 0) {
      const toDelete = [];
      for (const job of jobs) {
        if (!(await isUSJob(job))) {
          toDelete.push(job);
        }
      }

      if (toDelete.length > 0) {
        const ids = toDelete.map(j => j.id);
        await prisma.jobListing.deleteMany({ where: { id: { in: ids } } });
        console.log(`"${pattern}": Deleted ${toDelete.length} of ${jobs.length} jobs`);
        totalDeleted += toDelete.length;
      }
    }
  }

  // 3. Delete by German title patterns
  console.log('\n--- Checking German title patterns ---');
  for (const pattern of GERMAN_TITLE_PATTERNS) {
    const jobs = await prisma.jobListing.findMany({
      where: {
        isActive: true,
        title: { contains: pattern, mode: 'insensitive' }
      },
      select: { id: true, title: true, location: true, company: true }
    });

    if (jobs.length > 0) {
      const toDelete = [];
      for (const job of jobs) {
        if (!(await isUSJob(job))) {
          toDelete.push(job);
        }
      }

      if (toDelete.length > 0) {
        const ids = toDelete.map(j => j.id);
        await prisma.jobListing.deleteMany({ where: { id: { in: ids } } });
        console.log(`"${pattern}": Deleted ${toDelete.length} of ${jobs.length} jobs`);
        totalDeleted += toDelete.length;
      }
    }
  }

  console.log(`\n=== Total deleted: ${totalDeleted} ===`);

  // Final count
  const remaining = await prisma.jobListing.count({ where: { isActive: true } });
  console.log(`Remaining active jobs: ${remaining}`);

  await prisma.$disconnect();
}

deleteForeignJobs().catch(console.error);
