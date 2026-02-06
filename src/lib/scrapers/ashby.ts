/**
 * Ashby ATS Scraper
 *
 * Fetches job listings from Ashby posting API.
 * API: https://api.ashbyhq.com/posting-api/job-board/{company}
 */

import {
  stripHtml,
  extractSalary,
  retryWithBackoff,
  generateSourceId,
} from './utils';
import type { ScrapedJobData } from './greenhouse';

// ==================== Types ====================

export interface AshbyJob {
  id: string;
  title: string;
  department: string | null;
  team: string | null;
  employmentType: string | null; // "FullTime", "PartTime", "Contract", "Intern"
  location: string | null;
  secondaryLocations: string[];
  publishedAt: string;
  isListed: boolean;
  isRemote: boolean | null;
  address: {
    postalAddress?: {
      addressRegion?: string;
      addressCountry?: string;
      addressLocality?: string;
    };
  } | null;
  jobUrl: string;
  applyUrl: string;
  descriptionHtml: string;
  descriptionPlain: string;
  compensation?: {
    compensationTierSummary?: string;
    summaryComponents?: Array<{
      compensationType: string;
      min: number;
      max: number;
      currencyCode: string;
      interval: string;
    }>;
  };
}

export interface AshbyResponse {
  jobs: AshbyJob[];
  apiVersion: string;
}

// ==================== Constants ====================

const ASHBY_API_BASE = 'https://api.ashbyhq.com/posting-api/job-board';
const RATE_LIMIT_DELAY_MS = 1000; // 1s between requests

// ==================== Scraper Functions ====================

/**
 * Fetch all jobs from an Ashby board
 */
export async function fetchAshbyJobs(
  slug: string,
  companyName: string
): Promise<ScrapedJobData[]> {
  const url = `${ASHBY_API_BASE}/${slug}`;

  const response = await retryWithBackoff(
    async () => {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GenzJobs/1.0 (job aggregator)',
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Ashby board not found: ${slug}`);
        }
        if (res.status === 429) {
          throw new Error('Rate limited by Ashby API');
        }
        throw new Error(`Ashby API error: ${res.status} ${res.statusText}`);
      }

      return res.json() as Promise<AshbyResponse>;
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
    }
  );

  const jobs: ScrapedJobData[] = [];

  for (const job of response.jobs) {
    // Skip unlisted jobs
    if (!job.isListed) continue;

    const scraped = parseAshbyJob(job, slug, companyName);
    if (scraped) {
      jobs.push(scraped);
    }
  }

  return jobs;
}

/**
 * Parse a single Ashby job into our standard format
 */
function parseAshbyJob(
  job: AshbyJob,
  slug: string,
  companyName: string
): ScrapedJobData | null {
  // Use plain description, fall back to stripping HTML
  const description = job.descriptionPlain || stripHtml(job.descriptionHtml);

  // Skip jobs without description
  if (!description || description.length < 50) {
    return null;
  }

  // Build location string
  let location = job.location;
  if (!location && job.address?.postalAddress) {
    const addr = job.address.postalAddress;
    location = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
      .filter(Boolean)
      .join(', ');
  }

  // Extract salary from compensation field or description
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  let salaryCurrency: string | null = null;
  let salaryPeriod: string | null = null;

  if (job.compensation?.summaryComponents?.length) {
    const salaryComp = job.compensation.summaryComponents.find(
      c => c.compensationType === 'Salary' || c.compensationType === 'Wage'
    );
    if (salaryComp) {
      salaryMin = salaryComp.min;
      salaryMax = salaryComp.max;
      salaryCurrency = salaryComp.currencyCode || 'USD';
      salaryPeriod = salaryComp.interval === 'Hourly' ? 'hourly' : 'yearly';
    }
  }

  // Fall back to extracting from description
  if (!salaryMin && !salaryMax) {
    const extracted = extractSalary(description);
    if (extracted) {
      salaryMin = extracted.min;
      salaryMax = extracted.max;
      salaryCurrency = extracted.currency;
      salaryPeriod = extracted.period;
    }
  }

  // Detect remote
  const remote = job.isRemote === true ||
    (location?.toLowerCase().includes('remote') ?? false);

  // Parse job type
  const jobType = parseEmploymentType(job.employmentType);

  return {
    sourceId: generateSourceId('ashby', slug, job.id),
    source: 'ashby',
    title: job.title,
    company: companyName,
    location,
    remote,
    description,
    applyUrl: job.applyUrl || job.jobUrl,
    salaryMin,
    salaryMax,
    salaryCurrency,
    salaryPeriod,
    jobType,
    department: job.department || job.team || null,
    postedAt: new Date(job.publishedAt),
  };
}

/**
 * Parse Ashby employment type into standardized job type
 */
function parseEmploymentType(employmentType: string | null): string | null {
  if (!employmentType) return null;

  const lower = employmentType.toLowerCase();

  if (lower === 'fulltime' || lower === 'full-time' || lower === 'full time') {
    return 'full-time';
  }
  if (lower === 'parttime' || lower === 'part-time' || lower === 'part time') {
    return 'part-time';
  }
  if (lower === 'contract' || lower === 'contractor') {
    return 'contract';
  }
  if (lower === 'intern' || lower === 'internship') {
    return 'internship';
  }

  return null;
}

/**
 * Validate an Ashby board exists
 */
export async function validateAshbyBoard(slug: string): Promise<boolean> {
  try {
    const url = `${ASHBY_API_BASE}/${slug}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'GenzJobs/1.0 (job aggregator)',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get rate limit delay for Ashby
 */
export function getAshbyRateLimitDelay(): number {
  return RATE_LIMIT_DELAY_MS;
}
