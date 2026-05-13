/**
 * Set the priorityTier on CompanyATS rows.
 *
 * Usage:
 *   npx tsx scripts/set-employer-tier.ts --tier 1 --name "Anthropic"
 *   npx tsx scripts/set-employer-tier.ts --tier 2 --names "Anthropic,OpenAI,Stripe"
 *   npx tsx scripts/set-employer-tier.ts --tier 1 --file path/to/list.txt
 *   npx tsx scripts/set-employer-tier.ts --tier 3 --id <CompanyATS.id>
 *
 * Tier semantics:
 *   1 = Priority   (fast scrape cadence, scraped first)
 *   2 = Standard   (current default cadence)
 *   3 = Low        (reduced cadence, scraped last)
 *
 * Name matching is case-insensitive. A name that doesn't match any
 * CompanyATS row is reported but not created (it has no ATS platform/slug,
 * so it can't be scraped). To add new employers, edit and run
 * scripts/seed-companies.ts first.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });


type Args = {
  tier?: string;
  name?: string;
  names?: string;
  file?: string;
  id?: string;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2) as keyof Args;
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        result[key] = value;
        i++;
      }
    }
  }
  return result;
}


function printUsageAndExit(): never {
  console.error('Usage:');
  console.error('  npx tsx scripts/set-employer-tier.ts --tier <1|2|3> --name "<Company Name>"');
  console.error('  npx tsx scripts/set-employer-tier.ts --tier <1|2|3> --names "<A>,<B>,<C>"');
  console.error('  npx tsx scripts/set-employer-tier.ts --tier <1|2|3> --file <path>');
  console.error('  npx tsx scripts/set-employer-tier.ts --tier <1|2|3> --id <CompanyATS.id>');
  process.exit(1);
}


async function main() {
  const args = parseArgs();

  const tier = parseInt(args.tier ?? '', 10);
  if (![1, 2, 3].includes(tier)) {
    console.error('Error: --tier must be 1, 2, or 3');
    printUsageAndExit();
  }

  // Direct ID update — single row, no name matching
  if (args.id) {
    try {
      const row = await prisma.companyATS.update({
        where: { id: args.id },
        data: { priorityTier: tier },
        select: { companyName: true, atsPlatform: true },
      });
      console.log(`Updated ${row.companyName} (${row.atsPlatform}) -> tier ${tier}`);
      return;
    } catch (e: any) {
      console.error(`No CompanyATS row found with id="${args.id}"`);
      process.exit(2);
    }
  }

  // Collect names from --name / --names / --file
  let names: string[] = [];
  if (args.name) {
    names = [args.name];
  } else if (args.names) {
    names = args.names.split(',').map(s => s.trim()).filter(Boolean);
  } else if (args.file) {
    if (!fs.existsSync(args.file)) {
      console.error(`Error: file not found: ${args.file}`);
      process.exit(1);
    }
    names = fs.readFileSync(args.file, 'utf-8')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('#'));
  } else {
    console.error('Error: must provide --name, --names, --file, or --id');
    printUsageAndExit();
  }

  if (names.length === 0) {
    console.error('Error: no company names parsed from input');
    process.exit(1);
  }

  console.log(`Setting priorityTier=${tier} on ${names.length} name(s)...`);

  let updated = 0;
  const missing: string[] = [];

  for (const name of names) {
    const result = await prisma.companyATS.updateMany({
      where: { companyName: { equals: name, mode: 'insensitive' } },
      data: { priorityTier: tier },
    });
    if (result.count > 0) {
      updated += result.count;
      console.log(`  [${tier}] ${name} (${result.count} row${result.count === 1 ? '' : 's'})`);
    } else {
      missing.push(name);
    }
  }

  console.log(`\nUpdated ${updated} CompanyATS row(s) to tier ${tier}`);

  if (missing.length > 0) {
    console.log(`\nNot found in CompanyATS (${missing.length}):`);
    missing.forEach(m => console.log(`  - ${m}`));
    console.log('\nTo add these employers, edit scripts/seed-companies.ts (ATS platform + slug),');
    console.log('then run: npx tsx scripts/seed-companies.ts');
  }
}


main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
