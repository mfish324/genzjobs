/**
 * Bulk-promote employers to Tier 1 from a text file.
 *
 * Usage:
 *   npx tsx scripts/import-tier1-employers.ts --file path/to/tier1.txt
 *
 * Input file format: one company name per line. Blank lines and lines
 * starting with `#` are ignored. Name matching is case-insensitive.
 *
 * Companies that match an existing CompanyATS row are set to priorityTier=1.
 * Companies that don't match are written to
 * `scripts/missing-tier1-companies.txt` for manual triage — they can't be
 * scraped without an ATS platform + slug, so we don't create stub rows.
 *
 * To onboard missing companies:
 *   1. Edit scripts/seed-companies.ts to add their ATS platform + slug
 *   2. Run: npx tsx scripts/seed-companies.ts
 *   3. Re-run this script with the same input file
 */

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });


function parseFileArg(): string {
  const idx = process.argv.indexOf('--file');
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error('Usage: npx tsx scripts/import-tier1-employers.ts --file <path>');
    process.exit(1);
  }
  return process.argv[idx + 1];
}


async function main() {
  const filePath = parseFileArg();

  if (!fs.existsSync(filePath)) {
    console.error(`Error: file not found: ${filePath}`);
    process.exit(1);
  }

  const names = fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('#'));

  if (names.length === 0) {
    console.error('Error: no company names parsed from file');
    process.exit(1);
  }

  console.log(`Read ${names.length} company name(s) from ${filePath}`);
  console.log('Setting priorityTier=1 on matching CompanyATS rows...\n');

  let updated = 0;
  let alreadyTier1 = 0;
  const missing: string[] = [];

  for (const name of names) {
    // Check if any rows already at tier 1 to give clearer reporting
    const existing = await prisma.companyATS.findMany({
      where: { companyName: { equals: name, mode: 'insensitive' } },
      select: { id: true, priorityTier: true },
    });

    if (existing.length === 0) {
      missing.push(name);
      continue;
    }

    const wasTier1 = existing.every(r => r.priorityTier === 1);

    const result = await prisma.companyATS.updateMany({
      where: { companyName: { equals: name, mode: 'insensitive' } },
      data: { priorityTier: 1 },
    });

    if (wasTier1) {
      alreadyTier1 += result.count;
      console.log(`  = ${name} (already tier 1, ${result.count} row${result.count === 1 ? '' : 's'})`);
    } else {
      updated += result.count;
      console.log(`  + ${name} (${result.count} row${result.count === 1 ? '' : 's'})`);
    }
  }

  console.log(`\n----`);
  console.log(`Promoted to Tier 1: ${updated} row(s)`);
  console.log(`Already Tier 1:     ${alreadyTier1} row(s)`);
  console.log(`Not found:          ${missing.length} name(s)`);

  if (missing.length > 0) {
    const outPath = path.join(path.dirname(filePath), 'missing-tier1-companies.txt');
    const header = [
      `# Companies from ${path.basename(filePath)} not found in CompanyATS.`,
      `# These can't be scraped until we know their ATS platform + slug.`,
      `#`,
      `# To onboard:`,
      `#   1. Edit scripts/seed-companies.ts to add ATS platform + slug for each`,
      `#   2. Run: npx tsx scripts/seed-companies.ts`,
      `#   3. Re-run: npx tsx scripts/import-tier1-employers.ts --file ${path.basename(filePath)}`,
      `#`,
      `# Generated: ${new Date().toISOString()}`,
      ``,
    ].join('\n');
    fs.writeFileSync(outPath, header + missing.join('\n') + '\n');
    console.log(`\nMissing names written to: ${outPath}`);
  }
}


main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
