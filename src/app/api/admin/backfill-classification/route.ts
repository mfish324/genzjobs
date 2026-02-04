/**
 * Backfill Classification API
 *
 * POST /api/admin/backfill-classification
 * Query params:
 *   - dryRun=true : Show what would change without writing
 *   - batchSize=100 : Number of jobs per batch (default: 100)
 *   - limit=0 : Max jobs to process (0 = all)
 *
 * Headers:
 *   - x-admin-key: Must match ADMIN_API_KEY env var
 *
 * Returns classification stats and sample results
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { classifyJobWithCompany } from '@/lib/classification';
import { ExperienceLevel } from '@prisma/client';

// Verify admin access
function isAuthorized(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;

  // If no admin key configured, allow in development only
  if (!adminKey) {
    return process.env.NODE_ENV === 'development';
  }

  const providedKey = request.headers.get('x-admin-key');
  return providedKey === adminKey;
}

// Map our string type to Prisma enum
function toPrismaExperienceLevel(level: string): ExperienceLevel {
  switch (level) {
    case 'ENTRY': return ExperienceLevel.ENTRY;
    case 'MID': return ExperienceLevel.MID;
    case 'SENIOR': return ExperienceLevel.SENIOR;
    case 'EXECUTIVE': return ExperienceLevel.EXECUTIVE;
    default: return ExperienceLevel.MID;
  }
}

export async function POST(request: NextRequest) {
  // Check authorization
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide x-admin-key header.' },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const dryRun = searchParams.get('dryRun') === 'true';
  const batchSize = parseInt(searchParams.get('batchSize') || '100');
  const limit = parseInt(searchParams.get('limit') || '0');

  // Stats tracking
  const stats = {
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    byLevel: {
      ENTRY: 0,
      MID: 0,
      SENIOR: 0,
      EXECUTIVE: 0
    },
    lowConfidence: 0, // confidence < 0.5
    dualTagged: 0
  };

  const sampleResults: Array<{
    id: string;
    title: string;
    company: string;
    classification: {
      experienceLevel: string;
      audienceTags: string[];
      confidence: number;
      signals: Record<string, unknown>;
    };
  }> = [];

  const errors: Array<{ id: string; error: string }> = [];

  try {
    // Get total count
    stats.total = await prisma.jobListing.count({
      where: { isActive: true }
    });

    // Process in batches
    let skip = 0;
    const maxToProcess = limit > 0 ? Math.min(limit, stats.total) : stats.total;

    while (stats.processed < maxToProcess) {
      const jobs = await prisma.jobListing.findMany({
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          company: true,
          description: true,
          salaryMin: true,
          salaryMax: true,
          location: true
        },
        skip,
        take: Math.min(batchSize, maxToProcess - stats.processed),
        orderBy: { createdAt: 'asc' }
      });

      if (jobs.length === 0) break;

      for (const job of jobs) {
        try {
          // Classify the job
          const result = classifyJobWithCompany({
            title: job.title,
            description: job.description,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            location: job.location,
            company: job.company
          });

          // Track stats
          stats.byLevel[result.experienceLevel]++;

          if (result.confidence < 0.5) {
            stats.lowConfidence++;
          }

          if (result.audienceTags.length > 1) {
            stats.dualTagged++;
          }

          // Collect samples (first 10 of each level)
          const levelCount = sampleResults.filter(
            s => s.classification.experienceLevel === result.experienceLevel
          ).length;

          if (levelCount < 3) {
            sampleResults.push({
              id: job.id,
              title: job.title,
              company: job.company,
              classification: {
                experienceLevel: result.experienceLevel,
                audienceTags: result.audienceTags,
                confidence: result.confidence,
                signals: result.signals
              }
            });
          }

          // Update database (if not dry run)
          if (!dryRun) {
            await prisma.jobListing.update({
              where: { id: job.id },
              data: {
                experienceLevel: toPrismaExperienceLevel(result.experienceLevel),
                audienceTags: result.audienceTags,
                classificationConfidence: result.confidence
              }
            });
            stats.updated++;
          } else {
            stats.skipped++;
          }

          stats.processed++;
        } catch (err) {
          stats.errors++;
          if (errors.length < 10) {
            errors.push({
              id: job.id,
              error: err instanceof Error ? err.message : 'Unknown error'
            });
          }
        }
      }

      skip += batchSize;

      // Safety check - prevent infinite loops
      if (skip > stats.total + batchSize) break;
    }

    // Calculate percentages
    const percentages = {
      ENTRY: stats.total > 0 ? ((stats.byLevel.ENTRY / stats.processed) * 100).toFixed(1) : '0',
      MID: stats.total > 0 ? ((stats.byLevel.MID / stats.processed) * 100).toFixed(1) : '0',
      SENIOR: stats.total > 0 ? ((stats.byLevel.SENIOR / stats.processed) * 100).toFixed(1) : '0',
      EXECUTIVE: stats.total > 0 ? ((stats.byLevel.EXECUTIVE / stats.processed) * 100).toFixed(1) : '0'
    };

    return NextResponse.json({
      success: true,
      dryRun,
      stats: {
        ...stats,
        percentages
      },
      sampleResults,
      errors: errors.length > 0 ? errors : undefined,
      summary: `
Backfill ${dryRun ? '(DRY RUN)' : ''} complete: ${stats.processed} jobs
- Entry: ${stats.byLevel.ENTRY} (${percentages.ENTRY}%)
- Mid: ${stats.byLevel.MID} (${percentages.MID}%)
- Senior: ${stats.byLevel.SENIOR} (${percentages.SENIOR}%)
- Executive: ${stats.byLevel.EXECUTIVE} (${percentages.EXECUTIVE}%)
- Low confidence: ${stats.lowConfidence} (review needed)
- Dual-tagged: ${stats.dualTagged}
${stats.errors > 0 ? `- Errors: ${stats.errors}` : ''}
      `.trim()
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stats
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status/configuration
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide x-admin-key header.' },
      { status: 401 }
    );
  }

  const totalJobs = await prisma.jobListing.count({ where: { isActive: true } });
  const classifiedJobs = await prisma.jobListing.count({
    where: {
      isActive: true,
      audienceTags: { isEmpty: false }
    }
  });

  return NextResponse.json({
    status: 'ready',
    totalActiveJobs: totalJobs,
    alreadyClassified: classifiedJobs,
    needsClassification: totalJobs - classifiedJobs,
    usage: {
      dryRun: 'POST /api/admin/backfill-classification?dryRun=true',
      run: 'POST /api/admin/backfill-classification',
      withLimit: 'POST /api/admin/backfill-classification?limit=100',
      headers: { 'x-admin-key': 'your-admin-key' }
    }
  });
}
