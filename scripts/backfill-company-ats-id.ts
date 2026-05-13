/**
 * Backfill JobListing.companyAtsId from existing sourceId / company columns.
 *
 * Usage:
 *   npx tsx scripts/backfill-company-ats-id.ts            # dry run
 *   npx tsx scripts/backfill-company-ats-id.ts --apply    # write changes
 *
 * Resolution strategy per ATS source:
 *   Greenhouse / Ashby / SmartRecruiters
 *     sourceId format: {source}_{slug}_{externalId}
 *     -> strip source prefix, split on last underscore, match (atsPlatform, slug)
 *   Workday
 *     sourceId format: workday_{tenant}_{externalId}
 *     CompanyATS.slug format: {tenant}.{server}.{site}
 *     -> strip "workday_" prefix, split on last underscore to recover tenant,
 *        match CompanyATS where slug LIKE '{tenant}.%' AND atsPlatform = 'WORKDAY'
 *   Lever / Workable / Recruitee
 *     sourceId carries no slug. Fall back to case-insensitive company-name match.
 *
 * Slug-based matches that miss also fall back to company-name match before
 * being reported as unresolved.
 */

import { PrismaClient, ATSPlatform } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 500;

const SOURCE_TO_PLATFORM: Record<string, ATSPlatform> = {
  greenhouse: 'GREENHOUSE',
  ashby: 'ASHBY',
  smartrecruiters: 'SMARTRECRUITERS',
  workday: 'WORKDAY',
  lever: 'LEVER',
  workable: 'WORKABLE',
  recruitee: 'RECRUITEE',
};

const SLUG_IN_SOURCE_ID = new Set(['greenhouse', 'ashby', 'smartrecruiters']);


type Resolver = (job: { sourceId: string | null; company: string }) => string | null;

function stripLastUnderscoreId(s: string): string | null {
  const idx = s.lastIndexOf('_');
  if (idx <= 0) return null;
  return s.slice(0, idx);
}


async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log('Loading CompanyATS lookup tables...');

  const allCompanies = await prisma.companyATS.findMany({
    select: { id: true, atsPlatform: true, slug: true, companyName: true },
  });

  const bySlug = new Map<string, string>();              // `${platform}|${slug}` -> id
  const byWorkdayTenant = new Map<string, string>();     // `${tenant}` -> id
  const byName = new Map<string, string>();              // `${platform}|${lower(name)}` -> id

  for (const c of allCompanies) {
    bySlug.set(`${c.atsPlatform}|${c.slug}`, c.id);
    byName.set(`${c.atsPlatform}|${c.companyName.toLowerCase()}`, c.id);
    if (c.atsPlatform === 'WORKDAY') {
      const tenant = c.slug.split('.')[0];
      if (tenant) byWorkdayTenant.set(tenant, c.id);
    }
  }

  console.log(`  ${allCompanies.length} CompanyATS rows loaded`);
  console.log(`  ${bySlug.size} slug lookups, ${byWorkdayTenant.size} workday tenants, ${byName.size} name lookups`);

  const sources = Object.keys(SOURCE_TO_PLATFORM);

  const stats: Record<string, { total: number; resolvedBySlug: number; resolvedByName: number; unresolved: number }> = {};
  for (const src of sources) stats[src] = { total: 0, resolvedBySlug: 0, resolvedByName: 0, unresolved: 0 };

  let cursor: string | null = null;
  let totalProcessed = 0;
  let totalUpdated = 0;

  while (true) {
    const batch: Array<{ id: string; source: string; sourceId: string | null; company: string }> = await prisma.jobListing.findMany({
      where: {
        companyAtsId: null,
        source: { in: sources },
      },
      select: { id: true, source: true, sourceId: true, company: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (batch.length === 0) break;

    const updates: Array<{ id: string; companyAtsId: string }> = [];

    for (const row of batch) {
      const platform = SOURCE_TO_PLATFORM[row.source];
      if (!platform) continue;

      stats[row.source].total++;

      let resolvedId: string | null = null;
      let resolution: 'slug' | 'name' | null = null;

      if (row.sourceId) {
        const stripped = row.sourceId.startsWith(`${row.source}_`)
          ? row.sourceId.slice(row.source.length + 1)
          : row.sourceId;

        if (SLUG_IN_SOURCE_ID.has(row.source)) {
          const slug = stripLastUnderscoreId(stripped);
          if (slug) {
            resolvedId = bySlug.get(`${platform}|${slug}`) ?? null;
            if (resolvedId) resolution = 'slug';
          }
        } else if (row.source === 'workday') {
          const tenant = stripLastUnderscoreId(stripped);
          if (tenant) {
            resolvedId = byWorkdayTenant.get(tenant) ?? null;
            if (resolvedId) resolution = 'slug';
          }
        }
      }

      if (!resolvedId && row.company) {
        resolvedId = byName.get(`${platform}|${row.company.toLowerCase()}`) ?? null;
        if (resolvedId) resolution = 'name';
      }

      if (resolvedId) {
        updates.push({ id: row.id, companyAtsId: resolvedId });
        if (resolution === 'slug') stats[row.source].resolvedBySlug++;
        else stats[row.source].resolvedByName++;
      } else {
        stats[row.source].unresolved++;
      }
    }

    if (updates.length > 0 && APPLY) {
      // Group by companyAtsId so we can do one updateMany per group.
      const grouped = new Map<string, string[]>();
      for (const u of updates) {
        const ids = grouped.get(u.companyAtsId) ?? [];
        ids.push(u.id);
        grouped.set(u.companyAtsId, ids);
      }
      for (const [companyAtsId, ids] of grouped) {
        await prisma.jobListing.updateMany({
          where: { id: { in: ids } },
          data: { companyAtsId },
        });
      }
      totalUpdated += updates.length;
    }

    totalProcessed += batch.length;
    cursor = batch[batch.length - 1].id;

    if (totalProcessed % 5000 === 0 || batch.length < BATCH_SIZE) {
      console.log(`  Processed ${totalProcessed}, ${APPLY ? 'updated' : 'would update'} ${APPLY ? totalUpdated : updates.length}+ so far`);
    }

    if (batch.length < BATCH_SIZE) break;
  }

  console.log(`\nProcessed ${totalProcessed} rows.`);
  if (APPLY) console.log(`Updated ${totalUpdated} rows.`);
  else console.log(`Would update (re-run with --apply): ${Object.values(stats).reduce((s, v) => s + v.resolvedBySlug + v.resolvedByName, 0)} rows.`);

  console.log('\nPer-source breakdown:');
  console.log('source            | total  | by-slug | by-name | unresolved');
  console.log('------------------+--------+---------+---------+-----------');
  for (const src of sources) {
    const s = stats[src];
    console.log(
      `${src.padEnd(17)} | ${String(s.total).padStart(6)} | ${String(s.resolvedBySlug).padStart(7)} | ${String(s.resolvedByName).padStart(7)} | ${String(s.unresolved).padStart(10)}`
    );
  }
}


main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
