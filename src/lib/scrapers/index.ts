/**
 * ATS Scraper Orchestrator
 *
 * Coordinates scraping across multiple ATS platforms,
 * handles classification, and persists jobs to the database.
 */

import { prisma } from '@/lib/prisma';
import { classifyJobWithCompany } from '@/lib/classification/classifyJob';
import { ATSPlatform } from '@prisma/client';
import { fetchGreenhouseJobs, getGreenhouseRateLimitDelay } from './greenhouse';
import { fetchLeverJobs, getLeverRateLimitDelay } from './lever';
import { fetchAshbyJobs, getAshbyRateLimitDelay } from './ashby';
import { fetchSmartRecruitersJobs, getSmartRecruitersRateLimitDelay } from './smartrecruiters';
import { fetchWorkdayJobs, getWorkdayRateLimitDelay } from './workday';
import { fetchWorkableJobs, getWorkableRateLimitDelay } from './workable';
import { fetchRecruiteeJobs, getRecruiteeRateLimitDelay } from './recruitee';
import { delay } from './utils';
import type { ScrapedJobData } from './greenhouse';

// ==================== Types ====================

export interface ScrapeOptions {
  platform?: ATSPlatform;
  companySlug?: string;
  dryRun?: boolean;
  maxCompanies?: number;
  /** Stop processing new companies after this many ms have elapsed */
  timeBudgetMs?: number;
  verbose?: boolean;
}

export interface ScrapeStats {
  companiesProcessed: number;
  companiesSkipped: number;
  companiesFailed: number;
  jobsFound: number;
  jobsCreated: number;
  jobsUpdated: number;
  errors: Array<{ company: string; error: string }>;
  duration: number;
}

export interface CompanyScrapeResult {
  success: boolean;
  jobCount: number;
  jobsCreated: number;
  jobsUpdated: number;
  error?: string;
}

// ==================== Constants ====================

const MAX_CONSECUTIVE_FAILURES = 5;

// ==================== Main Orchestrator ====================

/**
 * Run the ATS scraper for configured companies
 */
export async function runATSScraper(options: ScrapeOptions = {}): Promise<ScrapeStats> {
  const startTime = Date.now();
  const stats: ScrapeStats = {
    companiesProcessed: 0,
    companiesSkipped: 0,
    companiesFailed: 0,
    jobsFound: 0,
    jobsCreated: 0,
    jobsUpdated: 0,
    errors: [],
    duration: 0,
  };

  // Build query for companies
  const whereClause: Parameters<typeof prisma.companyATS.findMany>[0]['where'] = {
    isActive: true,
  };

  if (options.platform) {
    whereClause.atsPlatform = options.platform;
  }

  if (options.companySlug) {
    whereClause.slug = options.companySlug;
  }

  // Fetch companies to scrape
  const companies = await prisma.companyATS.findMany({
    where: whereClause,
    orderBy: [
      { lastScrapedAt: { sort: 'asc', nulls: 'first' } },
      { createdAt: 'asc' },
    ],
    take: options.maxCompanies,
  });

  if (options.verbose) {
    console.log(`Found ${companies.length} companies to scrape`);
  }

  // Process each company
  for (const company of companies) {
    // Check time budget before starting a new company
    if (options.timeBudgetMs && (Date.now() - startTime) >= options.timeBudgetMs) {
      if (options.verbose) {
        console.log(`Time budget of ${options.timeBudgetMs}ms reached, stopping.`);
      }
      break;
    }

    if (options.verbose) {
      console.log(`\nScraping ${company.companyName} (${company.atsPlatform}/${company.slug})...`);
    }

    try {
      const result = await scrapeCompany(company, options);

      stats.companiesProcessed++;
      stats.jobsFound += result.jobCount;
      stats.jobsCreated += result.jobsCreated;
      stats.jobsUpdated += result.jobsUpdated;

      if (!result.success) {
        stats.companiesFailed++;
        if (result.error) {
          stats.errors.push({ company: company.companyName, error: result.error });
        }
      }

      // Rate limit between companies
      const rateLimitDelay = getRateLimitDelay(company.atsPlatform);
      await delay(rateLimitDelay);
    } catch (error) {
      stats.companiesFailed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      stats.errors.push({ company: company.companyName, error: errorMessage });

      if (options.verbose) {
        console.error(`Error scraping ${company.companyName}:`, errorMessage);
      }
    }
  }

  stats.duration = Date.now() - startTime;

  return stats;
}

/**
 * Scrape a single company
 */
async function scrapeCompany(
  company: { id: string; companyName: string; atsPlatform: ATSPlatform; slug: string; scrapeFailures: number },
  options: ScrapeOptions
): Promise<CompanyScrapeResult> {
  let jobs: ScrapedJobData[] = [];

  try {
    // Fetch jobs based on platform
    switch (company.atsPlatform) {
      case 'GREENHOUSE':
        jobs = await fetchGreenhouseJobs(company.slug, company.companyName);
        break;
      case 'LEVER':
        jobs = await fetchLeverJobs(company.slug, company.companyName);
        break;
      case 'ASHBY':
        jobs = await fetchAshbyJobs(company.slug, company.companyName);
        break;
      case 'SMARTRECRUITERS':
        jobs = await fetchSmartRecruitersJobs(company.slug, company.companyName);
        break;
      case 'WORKDAY':
        jobs = await fetchWorkdayJobs(company.slug, company.companyName);
        break;
      case 'WORKABLE':
        jobs = await fetchWorkableJobs(company.slug, company.companyName);
        break;
      case 'RECRUITEE':
        jobs = await fetchRecruiteeJobs(company.slug, company.companyName);
        break;
      default:
        throw new Error(`Unsupported platform: ${company.atsPlatform}`);
    }

    if (options.verbose) {
      console.log(`  Found ${jobs.length} jobs`);
    }

    // Dry run - just return stats without persisting
    if (options.dryRun) {
      return {
        success: true,
        jobCount: jobs.length,
        jobsCreated: 0,
        jobsUpdated: 0,
      };
    }

    // Persist jobs to database
    const { created, updated } = await persistJobs(jobs, company.companyName);

    // Update company scrape metadata
    await prisma.companyATS.update({
      where: { id: company.id },
      data: {
        lastScrapedAt: new Date(),
        lastJobCount: jobs.length,
        scrapeFailures: 0, // Reset on success
      },
    });

    return {
      success: true,
      jobCount: jobs.length,
      jobsCreated: created,
      jobsUpdated: updated,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Update failure count
    const newFailureCount = company.scrapeFailures + 1;
    const shouldDisable = newFailureCount >= MAX_CONSECUTIVE_FAILURES;

    await prisma.companyATS.update({
      where: { id: company.id },
      data: {
        scrapeFailures: newFailureCount,
        isActive: shouldDisable ? false : undefined,
      },
    });

    return {
      success: false,
      jobCount: 0,
      jobsCreated: 0,
      jobsUpdated: 0,
      error: shouldDisable
        ? `${errorMessage} (disabled after ${MAX_CONSECUTIVE_FAILURES} failures)`
        : errorMessage,
    };
  }
}

/**
 * Persist scraped jobs to the database with classification
 */
async function persistJobs(
  jobs: ScrapedJobData[],
  companyName: string
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const job of jobs) {
    // Classify the job
    const classification = classifyJobWithCompany({
      title: job.title,
      description: job.description,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      company: companyName,
    });

    // Prepare data for upsert
    const jobData = {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      remote: job.remote,
      applyUrl: job.applyUrl,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      salaryPeriod: job.salaryPeriod,
      jobType: job.jobType,
      postedAt: job.postedAt,
      lastSeenAt: new Date(),
      isActive: true,
      // Classification fields
      experienceLevel: classification.experienceLevel,
      audienceTags: classification.audienceTags,
      classificationConfidence: classification.confidence,
    };

    try {
      // Upsert using source + sourceId for deduplication
      const result = await prisma.jobListing.upsert({
        where: {
          source_sourceId: {
            source: job.source,
            sourceId: job.sourceId,
          },
        },
        create: {
          ...jobData,
          source: job.source,
          sourceId: job.sourceId,
        },
        update: {
          ...jobData,
          updatedAt: new Date(),
        },
      });

      // Check if this was a create or update by comparing createdAt and updatedAt
      // If they're within a second of each other, it's a new record
      const wasCreated = Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
      if (wasCreated) {
        created++;
      } else {
        updated++;
      }
    } catch (error) {
      // Log but continue processing other jobs
      console.error(`Error persisting job ${job.sourceId}:`, error);
    }
  }

  return { created, updated };
}

/**
 * Get rate limit delay for a platform
 */
function getRateLimitDelay(platform: ATSPlatform): number {
  switch (platform) {
    case 'GREENHOUSE':
      return getGreenhouseRateLimitDelay();
    case 'LEVER':
      return getLeverRateLimitDelay();
    case 'ASHBY':
      return getAshbyRateLimitDelay();
    case 'SMARTRECRUITERS':
      return getSmartRecruitersRateLimitDelay();
    case 'WORKDAY':
      return getWorkdayRateLimitDelay();
    case 'WORKABLE':
      return getWorkableRateLimitDelay();
    case 'RECRUITEE':
      return getRecruiteeRateLimitDelay();
    default:
      return 2000; // Default 2s
  }
}

// ==================== Exports ====================

export { fetchGreenhouseJobs } from './greenhouse';
export { fetchLeverJobs } from './lever';
export { fetchAshbyJobs } from './ashby';
export { fetchSmartRecruitersJobs } from './smartrecruiters';
export * from './utils';
export * from './cleanup';
