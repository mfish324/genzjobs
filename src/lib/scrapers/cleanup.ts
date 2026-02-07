/**
 * Stale Job Cleanup Module
 *
 * Marks jobs as inactive if they haven't been seen in the source API
 * for a configurable number of days.
 */

import { prisma } from '@/lib/prisma';

// ==================== Types ====================

export interface CleanupOptions {
  staleDays?: number;
  dryRun?: boolean;
  sources?: string[];
  verbose?: boolean;
}

export interface CleanupResult {
  jobsMarkedInactive: number;
  jobsChecked: number;
  dryRun: boolean;
  staleDays: number;
  sources: string[];
}

// ==================== Constants ====================

const DEFAULT_STALE_DAYS = 7;
const ATS_SOURCES = ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workday'];

// ==================== Cleanup Functions ====================

/**
 * Mark jobs as inactive if they haven't been seen in the source API recently
 */
export async function cleanupStaleJobs(options: CleanupOptions = {}): Promise<CleanupResult> {
  const {
    staleDays = DEFAULT_STALE_DAYS,
    dryRun = false,
    sources = ATS_SOURCES,
    verbose = false,
  } = options;

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - staleDays);

  if (verbose) {
    console.log(`Cleaning up jobs not seen since ${cutoffDate.toISOString()}`);
    console.log(`Sources: ${sources.join(', ')}`);
    console.log(`Dry run: ${dryRun}`);
  }

  // Find stale jobs
  const staleJobs = await prisma.jobListing.findMany({
    where: {
      source: { in: sources },
      isActive: true,
      lastSeenAt: {
        lt: cutoffDate,
      },
    },
    select: {
      id: true,
      title: true,
      company: true,
      source: true,
      lastSeenAt: true,
    },
  });

  if (verbose) {
    console.log(`Found ${staleJobs.length} stale jobs`);
    if (staleJobs.length > 0 && staleJobs.length <= 10) {
      for (const job of staleJobs) {
        console.log(`  - ${job.title} at ${job.company} (last seen: ${job.lastSeenAt?.toISOString()})`);
      }
    }
  }

  // Mark jobs as inactive
  if (!dryRun && staleJobs.length > 0) {
    const jobIds = staleJobs.map(j => j.id);

    await prisma.jobListing.updateMany({
      where: {
        id: { in: jobIds },
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    if (verbose) {
      console.log(`Marked ${staleJobs.length} jobs as inactive`);
    }
  }

  return {
    jobsMarkedInactive: dryRun ? 0 : staleJobs.length,
    jobsChecked: staleJobs.length,
    dryRun,
    staleDays,
    sources,
  };
}

/**
 * Reactivate jobs that have been seen again
 * (Called automatically during scraping, but can be run manually)
 */
export async function reactivateSeenJobs(options: { verbose?: boolean } = {}): Promise<number> {
  const { verbose = false } = options;

  // Find inactive jobs that have been seen in the last 24 hours
  const recentCutoff = new Date();
  recentCutoff.setHours(recentCutoff.getHours() - 24);

  const result = await prisma.jobListing.updateMany({
    where: {
      source: { in: ATS_SOURCES },
      isActive: false,
      lastSeenAt: {
        gte: recentCutoff,
      },
    },
    data: {
      isActive: true,
      updatedAt: new Date(),
    },
  });

  if (verbose && result.count > 0) {
    console.log(`Reactivated ${result.count} jobs that were seen again`);
  }

  return result.count;
}

/**
 * Get statistics about stale jobs without modifying them
 */
export async function getStaleJobStats(options: {
  staleDays?: number;
  sources?: string[];
}): Promise<{
  totalActive: number;
  staleCount: number;
  bySource: Record<string, { active: number; stale: number }>;
}> {
  const {
    staleDays = DEFAULT_STALE_DAYS,
    sources = ATS_SOURCES,
  } = options;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - staleDays);

  // Get counts by source
  const bySource: Record<string, { active: number; stale: number }> = {};

  for (const source of sources) {
    const [activeCount, staleCount] = await Promise.all([
      prisma.jobListing.count({
        where: {
          source,
          isActive: true,
        },
      }),
      prisma.jobListing.count({
        where: {
          source,
          isActive: true,
          lastSeenAt: {
            lt: cutoffDate,
          },
        },
      }),
    ]);

    bySource[source] = { active: activeCount, stale: staleCount };
  }

  const totalActive = Object.values(bySource).reduce((sum, s) => sum + s.active, 0);
  const staleCount = Object.values(bySource).reduce((sum, s) => sum + s.stale, 0);

  return {
    totalActive,
    staleCount,
    bySource,
  };
}
