/**
 * Vercel Cron Endpoint for ATS Scraping
 *
 * Runs daily at 6am UTC to scrape Greenhouse and Lever job boards.
 * Protected by CRON_SECRET header.
 *
 * Schedule configured in vercel.json:
 * - path: /api/cron/scrape-ats
 * - schedule: "0 6 * * *" (daily at 6am UTC)
 */

import { NextResponse } from 'next/server';
import { runATSScraper } from '@/lib/scrapers';
import { cleanupStaleJobs } from '@/lib/scrapers/cleanup';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for Vercel Pro

/**
 * GET /api/cron/scrape-ats
 *
 * Vercel cron jobs call this endpoint via GET request.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    );
  }

  // Check authorization header (Vercel sends "Bearer <secret>")
  const expectedAuth = `Bearer ${cronSecret}`;
  if (authHeader !== expectedAuth) {
    console.warn('Unauthorized cron request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    console.log('Starting scheduled ATS scrape...');

    // Run the scraper
    const scrapeStats = await runATSScraper({
      verbose: false,
      // Limit to avoid timeout on Vercel
      maxCompanies: 50,
    });

    console.log(`Scrape complete: ${scrapeStats.jobsFound} jobs found, ${scrapeStats.jobsCreated} created`);

    // Run cleanup
    const cleanupResult = await cleanupStaleJobs({
      staleDays: 7,
      verbose: false,
    });

    console.log(`Cleanup complete: ${cleanupResult.jobsMarkedInactive} jobs marked inactive`);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      scrape: {
        companiesProcessed: scrapeStats.companiesProcessed,
        companiesFailed: scrapeStats.companiesFailed,
        jobsFound: scrapeStats.jobsFound,
        jobsCreated: scrapeStats.jobsCreated,
        jobsUpdated: scrapeStats.jobsUpdated,
        errors: scrapeStats.errors.length,
      },
      cleanup: {
        jobsMarkedInactive: cleanupResult.jobsMarkedInactive,
      },
      duration: `${(duration / 1000).toFixed(1)}s`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('Cron scrape failed:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration: `${(duration / 1000).toFixed(1)}s`,
      },
      { status: 500 }
    );
  }
}
