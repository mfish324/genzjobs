/**
 * Workday ATS Scraper
 *
 * Fetches job listings from Workday career sites.
 * API: POST https://{tenant}.{server}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
 */

import {
  stripHtml,
  extractSalary,
  retryWithBackoff,
  generateSourceId,
  delay,
} from './utils';
import type { ScrapedJobData } from './greenhouse';

// ==================== Types ====================

export interface WorkdayJob {
  title: string;
  externalPath: string;
  locationsText: string;
  postedOn: string;
  bulletFields: string[];
}

export interface WorkdayJobsResponse {
  total: number;
  jobPostings: WorkdayJob[];
}

export interface WorkdayJobDetail {
  jobPostingInfo: {
    id: string;
    title: string;
    jobDescription: string;
    location?: string;
    timeType?: string;
    postedOn?: string;
    jobRequisitionId?: string;
    externalUrl?: string;
  };
}

export interface WorkdayConfig {
  tenant: string;
  server: string;  // e.g., "wd12", "wd1", "wd5"
  site: string;    // e.g., "External_Career_Site"
}

// ==================== Constants ====================

const RATE_LIMIT_DELAY_MS = 200; // 0.2s between requests - Workday is fast
const PAGE_SIZE = 20; // Workday default

// ==================== Scraper Functions ====================

/**
 * Parse Workday slug format: "tenant.server.site"
 * Example: "salesforce.wd12.External_Career_Site"
 */
function parseWorkdaySlug(slug: string): WorkdayConfig {
  const parts = slug.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid Workday slug format: ${slug}. Expected: tenant.server.site`);
  }
  return {
    tenant: parts[0],
    server: parts[1],
    site: parts[2],
  };
}

/**
 * Build Workday API base URL
 */
function buildWorkdayUrl(config: WorkdayConfig): string {
  return `https://${config.tenant}.${config.server}.myworkdayjobs.com/wday/cxs/${config.tenant}/${config.site}`;
}

/**
 * Fetch all jobs from a Workday career site
 */
export async function fetchWorkdayJobs(
  slug: string,
  companyName: string
): Promise<ScrapedJobData[]> {
  const config = parseWorkdaySlug(slug);
  const baseUrl = buildWorkdayUrl(config);
  const jobs: ScrapedJobData[] = [];
  let offset = 0;
  let total = 0;

  do {
    const url = `${baseUrl}/jobs`;

    const response = await retryWithBackoff(
      async () => {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'GenzJobs/1.0 (job aggregator)',
          },
          body: JSON.stringify({
            appliedFacets: {},
            limit: PAGE_SIZE,
            offset: offset,
          }),
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`Workday site not found: ${slug}`);
          }
          if (res.status === 429) {
            throw new Error('Rate limited by Workday API');
          }
          throw new Error(`Workday API error: ${res.status} ${res.statusText}`);
        }

        return res.json() as Promise<WorkdayJobsResponse>;
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }
    );

    total = response.total;

    // Process jobs in this batch
    for (const job of response.jobPostings) {
      // Fetch full job details
      const detail = await fetchJobDetail(baseUrl, job.externalPath);

      if (detail) {
        const scraped = parseWorkdayJob(job, detail, slug, companyName, config);
        if (scraped) {
          jobs.push(scraped);
        }
      }

      // Small delay between job detail fetches
      await delay(RATE_LIMIT_DELAY_MS);
    }

    offset += PAGE_SIZE;
  } while (offset < total);

  return jobs;
}

/**
 * Fetch job detail from Workday
 */
async function fetchJobDetail(
  baseUrl: string,
  externalPath: string
): Promise<WorkdayJobDetail | null> {
  try {
    const url = `${baseUrl}${externalPath}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GenzJobs/1.0 (job aggregator)',
      },
    });

    if (!res.ok) return null;

    return await res.json() as WorkdayJobDetail;
  } catch {
    return null;
  }
}

/**
 * Parse a Workday job into our standard format
 */
function parseWorkdayJob(
  listing: WorkdayJob,
  detail: WorkdayJobDetail,
  slug: string,
  companyName: string,
  config: WorkdayConfig
): ScrapedJobData | null {
  const info = detail.jobPostingInfo;

  // Strip HTML from description
  const description = stripHtml(info.jobDescription || '');

  // Skip jobs without description
  if (!description || description.length < 50) {
    return null;
  }

  // Parse location
  const location = listing.locationsText || info.location || null;

  // Detect remote
  const remote = location?.toLowerCase().includes('remote') ?? false;

  // Extract salary from description
  const salaryInfo = extractSalary(description);

  // Parse job type from timeType
  const jobType = parseTimeType(info.timeType);

  // Build apply URL
  const applyUrl = `https://${config.tenant}.${config.server}.myworkdayjobs.com/${config.site}${listing.externalPath}`;

  // Parse posted date
  let postedAt = new Date();
  if (listing.postedOn) {
    if (listing.postedOn.includes('Today')) {
      postedAt = new Date();
    } else if (listing.postedOn.includes('Yesterday')) {
      postedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (listing.postedOn.includes('30+ Days Ago')) {
      postedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // Try to parse "Posted X Days Ago"
      const daysMatch = listing.postedOn.match(/(\d+)\s*Days?\s*Ago/i);
      if (daysMatch) {
        postedAt = new Date(Date.now() - parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000);
      }
    }
  }

  // Extract job ID from bulletFields or externalPath
  const jobId = listing.bulletFields?.[0] ||
    listing.externalPath.split('_').pop() ||
    info.id;

  return {
    sourceId: generateSourceId('workday', config.tenant, jobId),
    source: 'workday',
    title: listing.title,
    company: companyName,
    location,
    remote,
    description,
    applyUrl,
    salaryMin: salaryInfo?.min || null,
    salaryMax: salaryInfo?.max || null,
    salaryCurrency: salaryInfo?.currency || null,
    salaryPeriod: salaryInfo?.period || null,
    jobType,
    department: null, // Would need to parse from description or add facet filtering
    postedAt,
  };
}

/**
 * Parse Workday timeType into standardized job type
 */
function parseTimeType(timeType: string | undefined): string | null {
  if (!timeType) return null;

  const lower = timeType.toLowerCase();

  if (lower.includes('full')) return 'full-time';
  if (lower.includes('part')) return 'part-time';
  if (lower.includes('contract') || lower.includes('temp')) return 'contract';
  if (lower.includes('intern')) return 'internship';

  return null;
}

/**
 * Validate a Workday site exists
 */
export async function validateWorkdaySite(slug: string): Promise<boolean> {
  try {
    const config = parseWorkdaySlug(slug);
    const baseUrl = buildWorkdayUrl(config);

    const response = await fetch(`${baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'GenzJobs/1.0 (job aggregator)',
      },
      body: JSON.stringify({
        appliedFacets: {},
        limit: 1,
        offset: 0,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get rate limit delay for Workday
 */
export function getWorkdayRateLimitDelay(): number {
  return 500; // 0.5s between companies
}
