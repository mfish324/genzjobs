/**
 * Set industryCategory on CompanyATS rows from a Name|Industry text file.
 *
 * Usage:
 *   npx tsx scripts/tag-employer-industry.ts --file path/to/industries.txt
 *
 * Input file format:
 *   Company Name|Industry
 *
 *   Example:
 *     Google|Technology
 *     Stripe|Technology
 *     Capital One|Finance & Banking
 *     # Comments and blank lines are ignored
 *
 * Industry values (case-insensitive; common aliases accepted):
 *   Technology              -> TECHNOLOGY
 *   Finance & Banking       -> FINANCE_AND_BANKING
 *   Healthcare              -> HEALTHCARE
 *   Consulting              -> CONSULTING
 *   Aerospace & Defense     -> AEROSPACE_AND_DEFENSE
 *   Government              -> GOVERNMENT
 *   Retail & E-Commerce     -> RETAIL_AND_ECOMMERCE
 *   Media & Entertainment   -> MEDIA_AND_ENTERTAINMENT
 *   Other                   -> OTHER
 *
 * Name matching is case-insensitive against CompanyATS.companyName.
 * Idempotent — re-running with the same input is safe.
 * Unmatched names are written to scripts/missing-industry-companies.txt
 * for follow-up (no stubs are created).
 */

import { PrismaClient, IndustryCategory } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });


const INDUSTRY_ALIASES: Record<string, IndustryCategory> = {
  // Technology
  'technology': 'TECHNOLOGY',
  'tech': 'TECHNOLOGY',
  // Finance & Banking
  'finance & banking': 'FINANCE_AND_BANKING',
  'finance and banking': 'FINANCE_AND_BANKING',
  'finance': 'FINANCE_AND_BANKING',
  'banking': 'FINANCE_AND_BANKING',
  'financial services': 'FINANCE_AND_BANKING',
  // Healthcare
  'healthcare': 'HEALTHCARE',
  'health care': 'HEALTHCARE',
  'health': 'HEALTHCARE',
  // Consulting
  'consulting': 'CONSULTING',
  // Aerospace & Defense
  'aerospace & defense': 'AEROSPACE_AND_DEFENSE',
  'aerospace and defense': 'AEROSPACE_AND_DEFENSE',
  'defense': 'AEROSPACE_AND_DEFENSE',
  'aerospace': 'AEROSPACE_AND_DEFENSE',
  // Government
  'government': 'GOVERNMENT',
  'gov': 'GOVERNMENT',
  'public sector': 'GOVERNMENT',
  // Retail & E-Commerce
  'retail & e-commerce': 'RETAIL_AND_ECOMMERCE',
  'retail and e-commerce': 'RETAIL_AND_ECOMMERCE',
  'retail and ecommerce': 'RETAIL_AND_ECOMMERCE',
  'retail': 'RETAIL_AND_ECOMMERCE',
  'ecommerce': 'RETAIL_AND_ECOMMERCE',
  'e-commerce': 'RETAIL_AND_ECOMMERCE',
  // Media & Entertainment
  'media & entertainment': 'MEDIA_AND_ENTERTAINMENT',
  'media and entertainment': 'MEDIA_AND_ENTERTAINMENT',
  'media': 'MEDIA_AND_ENTERTAINMENT',
  'entertainment': 'MEDIA_AND_ENTERTAINMENT',
  // Other
  'other': 'OTHER',
};


function normalizeIndustry(raw: string): IndustryCategory | null {
  const key = raw.toLowerCase().trim();
  // Also accept the raw enum form (e.g. user types FINANCE_AND_BANKING directly)
  const enumForm = raw.trim().toUpperCase().replace(/[\s&]+/g, '_').replace(/_+/g, '_');
  if ((Object.values(INDUSTRY_ALIASES) as string[]).includes(enumForm)) {
    return enumForm as IndustryCategory;
  }
  return INDUSTRY_ALIASES[key] ?? null;
}


function parseFileArg(): string {
  const idx = process.argv.indexOf('--file');
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error('Usage: npx tsx scripts/tag-employer-industry.ts --file <path>');
    process.exit(1);
  }
  return process.argv[idx + 1];
}


interface ParsedEntry {
  lineNumber: number;
  name: string;
  industry: IndustryCategory;
}


function parseFile(filePath: string): { entries: ParsedEntry[]; parseErrors: string[] } {
  const entries: ParsedEntry[] = [];
  const parseErrors: string[] = [];

  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  lines.forEach((rawLine, idx) => {
    const lineNumber = idx + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    const parts = line.split('|');
    if (parts.length !== 2) {
      parseErrors.push(`Line ${lineNumber}: expected "Name|Industry", got "${line}"`);
      return;
    }

    const name = parts[0].trim();
    const industryRaw = parts[1].trim();
    if (!name || !industryRaw) {
      parseErrors.push(`Line ${lineNumber}: empty name or industry in "${line}"`);
      return;
    }

    const industry = normalizeIndustry(industryRaw);
    if (!industry) {
      parseErrors.push(`Line ${lineNumber}: unknown industry "${industryRaw}" (see script header for accepted values)`);
      return;
    }

    entries.push({ lineNumber, name, industry });
  });

  return { entries, parseErrors };
}


async function main() {
  const filePath = parseFileArg();

  if (!fs.existsSync(filePath)) {
    console.error(`Error: file not found: ${filePath}`);
    process.exit(1);
  }

  const { entries, parseErrors } = parseFile(filePath);

  if (parseErrors.length > 0) {
    console.error('Parse errors:');
    parseErrors.forEach(e => console.error(`  ${e}`));
    console.error('\nFix the input file and re-run. No DB changes were made.');
    process.exit(2);
  }

  if (entries.length === 0) {
    console.error('Error: no valid entries parsed from file');
    process.exit(1);
  }

  console.log(`Parsed ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} from ${filePath}`);
  console.log('Setting industryCategory on matching CompanyATS rows...\n');

  let updated = 0;
  let alreadySet = 0;
  const missing: string[] = [];
  const conflicts: string[] = [];

  // Track per-row resolved industry to detect conflicts (same company tagged
  // differently across multiple lines).
  const seen = new Map<string, IndustryCategory>();

  for (const { name, industry, lineNumber } of entries) {
    const key = name.toLowerCase();
    if (seen.has(key) && seen.get(key) !== industry) {
      conflicts.push(`Line ${lineNumber}: "${name}" already tagged ${seen.get(key)}, ignoring ${industry}`);
      continue;
    }
    seen.set(key, industry);

    const matches = await prisma.companyATS.findMany({
      where: { companyName: { equals: name, mode: 'insensitive' } },
      select: { id: true, industryCategory: true },
    });

    if (matches.length === 0) {
      missing.push(name);
      continue;
    }

    const allAlreadySet = matches.every(m => m.industryCategory === industry);

    const result = await prisma.companyATS.updateMany({
      where: { companyName: { equals: name, mode: 'insensitive' } },
      data: { industryCategory: industry },
    });

    if (allAlreadySet) {
      alreadySet += result.count;
      console.log(`  = ${name} -> ${industry} (already set, ${result.count} row${result.count === 1 ? '' : 's'})`);
    } else {
      updated += result.count;
      console.log(`  + ${name} -> ${industry} (${result.count} row${result.count === 1 ? '' : 's'})`);
    }
  }

  console.log(`\n----`);
  console.log(`Updated:      ${updated} row(s)`);
  console.log(`Already set:  ${alreadySet} row(s)`);
  console.log(`Not found:    ${missing.length} name(s)`);
  if (conflicts.length > 0) {
    console.log(`Conflicts:    ${conflicts.length} (resolved by first occurrence; later entries ignored)`);
    conflicts.forEach(c => console.log(`  ! ${c}`));
  }

  if (missing.length > 0) {
    const outPath = path.join(path.dirname(filePath), 'missing-industry-companies.txt');
    const header = [
      `# Companies from ${path.basename(filePath)} not found in CompanyATS.`,
      `# These can't be tagged until they're seeded.`,
      `#`,
      `# To onboard:`,
      `#   1. Edit scripts/seed-companies.ts to add ATS platform + slug for each`,
      `#   2. Run: npx tsx scripts/seed-companies.ts`,
      `#   3. Re-run: npx tsx scripts/tag-employer-industry.ts --file ${path.basename(filePath)}`,
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
