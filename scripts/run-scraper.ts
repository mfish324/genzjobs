/**
 * CLI Runner for ATS Scrapers
 *
 * Usage:
 *   npx tsx scripts/run-scraper.ts                       # All platforms
 *   npx tsx scripts/run-scraper.ts --platform GREENHOUSE # Greenhouse only
 *   npx tsx scripts/run-scraper.ts --platform LEVER      # Lever only
 *   npx tsx scripts/run-scraper.ts --company stripe      # Single company
 *   npx tsx scripts/run-scraper.ts --dry-run             # Test without saving
 *   npx tsx scripts/run-scraper.ts --max 5               # Limit to 5 companies
 *   npx tsx scripts/run-scraper.ts --cleanup             # Run cleanup only
 *   npx tsx scripts/run-scraper.ts --cleanup --stale-days 14
 *   npx tsx scripts/run-scraper.ts --stats               # Show stats only
 */

import { PrismaClient, ATSPlatform } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Prisma client for this script
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// We need to dynamically import the scraper modules to avoid circular deps
async function loadScraperModules() {
  // Import using file paths relative to cwd
  const { runATSScraper } = await import('../src/lib/scrapers/index.js');
  const { cleanupStaleJobs, getStaleJobStats } = await import('../src/lib/scrapers/cleanup.js');
  return { runATSScraper, cleanupStaleJobs, getStaleJobStats };
}

// ==================== Argument Parsing ====================

interface CLIOptions {
  platform?: ATSPlatform;
  company?: string;
  dryRun: boolean;
  maxCompanies?: number;
  cleanup: boolean;
  staleDays: number;
  stats: boolean;
  verbose: boolean;
  help: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    dryRun: false,
    cleanup: false,
    staleDays: 7,
    stats: false,
    verbose: true,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--platform' && args[i + 1]) {
      const platform = args[++i].toUpperCase();
      if (platform === 'GREENHOUSE' || platform === 'LEVER' || platform === 'ASHBY' || platform === 'SMARTRECRUITERS') {
        options.platform = platform;
      } else {
        console.error(`Invalid platform: ${platform}. Use GREENHOUSE, LEVER, ASHBY, or SMARTRECRUITERS.`);
        process.exit(1);
      }
    } else if (arg === '--company' && args[i + 1]) {
      options.company = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--max' && args[i + 1]) {
      options.maxCompanies = parseInt(args[++i], 10);
    } else if (arg === '--cleanup') {
      options.cleanup = true;
    } else if (arg === '--stale-days' && args[i + 1]) {
      options.staleDays = parseInt(args[++i], 10);
    } else if (arg === '--stats') {
      options.stats = true;
    } else if (arg === '--quiet' || arg === '-q') {
      options.verbose = false;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
ATS Scraper CLI

Usage:
  npx tsx scripts/run-scraper.ts [options]

Options:
  --platform <PLATFORM>   Scrape only GREENHOUSE or LEVER
  --company <slug>        Scrape a single company by slug
  --dry-run               Test run without saving to database
  --max <number>          Limit to N companies
  --cleanup               Run stale job cleanup
  --stale-days <days>     Days before job is considered stale (default: 7)
  --stats                 Show statistics only, don't scrape
  --quiet, -q             Minimal output
  --help, -h              Show this help message

Examples:
  npx tsx scripts/run-scraper.ts                          # Scrape all companies
  npx tsx scripts/run-scraper.ts --platform GREENHOUSE    # Greenhouse only
  npx tsx scripts/run-scraper.ts --company stripe         # Just Stripe
  npx tsx scripts/run-scraper.ts --dry-run --max 3        # Test with 3 companies
  npx tsx scripts/run-scraper.ts --cleanup --stale-days 14
  npx tsx scripts/run-scraper.ts --stats
`);
}

// ==================== Main ====================

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    return;
  }

  const { runATSScraper, cleanupStaleJobs, getStaleJobStats } = await loadScraperModules();

  // Stats only mode
  if (options.stats) {
    console.log('Fetching statistics...\n');

    // Company counts
    const companyCounts = await prisma.companyATS.groupBy({
      by: ['atsPlatform', 'isActive'],
      _count: true,
    });

    console.log('==================== Companies ====================');
    for (const row of companyCounts) {
      console.log(`${row.atsPlatform} (${row.isActive ? 'active' : 'inactive'}): ${row._count}`);
    }

    // Job counts
    const jobCounts = await prisma.jobListing.groupBy({
      by: ['source', 'isActive'],
      where: {
        source: { in: ['greenhouse', 'lever'] },
      },
      _count: true,
    });

    console.log('\n==================== Jobs ====================');
    for (const row of jobCounts) {
      console.log(`${row.source} (${row.isActive ? 'active' : 'inactive'}): ${row._count}`);
    }

    // Stale job stats
    const staleStats = await getStaleJobStats({ staleDays: options.staleDays });
    console.log('\n==================== Stale Jobs ====================');
    console.log(`Stale threshold: ${options.staleDays} days`);
    console.log(`Total active: ${staleStats.totalActive}`);
    console.log(`Would be marked stale: ${staleStats.staleCount}`);

    return;
  }

  // Cleanup only mode
  if (options.cleanup) {
    console.log('Running stale job cleanup...\n');

    const result = await cleanupStaleJobs({
      staleDays: options.staleDays,
      dryRun: options.dryRun,
      verbose: options.verbose,
    });

    console.log('\n==================== Cleanup Results ====================');
    console.log(`Jobs checked: ${result.jobsChecked}`);
    console.log(`Jobs marked inactive: ${result.jobsMarkedInactive}`);
    console.log(`Dry run: ${result.dryRun}`);
    console.log(`Stale threshold: ${result.staleDays} days`);

    return;
  }

  // Main scraping mode
  console.log('Starting ATS scraper...\n');

  if (options.dryRun) {
    console.log('*** DRY RUN MODE - No changes will be saved ***\n');
  }

  const stats = await runATSScraper({
    platform: options.platform,
    companySlug: options.company,
    dryRun: options.dryRun,
    maxCompanies: options.maxCompanies,
    verbose: options.verbose,
  });

  console.log('\n==================== Results ====================');
  console.log(`Companies processed: ${stats.companiesProcessed}`);
  console.log(`Companies failed: ${stats.companiesFailed}`);
  console.log(`Jobs found: ${stats.jobsFound}`);
  console.log(`Jobs created: ${stats.jobsCreated}`);
  console.log(`Jobs updated: ${stats.jobsUpdated}`);
  console.log(`Duration: ${(stats.duration / 1000).toFixed(1)}s`);

  if (stats.errors.length > 0) {
    console.log('\n==================== Errors ====================');
    for (const error of stats.errors) {
      console.log(`${error.company}: ${error.error}`);
    }
  }

  // Optionally run cleanup after scraping
  if (!options.dryRun && !options.company) {
    console.log('\nRunning post-scrape cleanup...');
    const cleanupResult = await cleanupStaleJobs({
      staleDays: options.staleDays,
      verbose: false,
    });
    console.log(`Marked ${cleanupResult.jobsMarkedInactive} stale jobs as inactive`);
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
