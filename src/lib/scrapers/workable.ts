/**
 * Workable ATS Scraper
 *
 * Fetches job listings from Workable public API.
 * API: https://www.workable.com/api/accounts/{slug}?details=true
 */

import {
  stripHtml,
  extractSalary,
  retryWithBackoff,
  generateSourceId,
} from './utils';
import type { ScrapedJobData } from './greenhouse';

// ==================== Types ====================

export interface WorkableJob {
  title: string;
  shortcode: string;
  code?: string;
  employment_type?: string;
  telecommuting?: boolean;
  department?: string;
  url: string;
  shortlink: string;
  application_url: string;
  published_on: string;
  created_at: string;
  country?: string;
  city?: string;
  state?: string;
  education?: string;
  experience?: string;
  function?: string;
  industry?: string;
  locations?: Array<{
    country: string;
    countryCode: string;
    city?: string;
    region?: string;
    hidden?: boolean;
  }>;
  description?: string;
}

export interface WorkableResponse {
  name: string;
  description?: string;
  jobs: WorkableJob[];
}

// ==================== Constants ====================

const WORKABLE_API_BASE = 'https://www.workable.com/api/accounts';
const RATE_LIMIT_DELAY_MS = 1000; // 1s between requests - be respectful

// ==================== Scraper Functions ====================

/**
 * Fetch all jobs from a Workable company
 */
export async function fetchWorkableJobs(
  slug: string,
  companyName: string
): Promise<ScrapedJobData[]> {
  const url = `${WORKABLE_API_BASE}/${slug}?details=true`;

  const response = await retryWithBackoff(
    async () => {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GenzJobs/1.0 (job aggregator)',
        },
        redirect: 'follow',
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Workable company not found: ${slug}`);
        }
        if (res.status === 429) {
          throw new Error('Rate limited by Workable API');
        }
        throw new Error(`Workable API error: ${res.status} ${res.statusText}`);
      }

      return res.json() as Promise<WorkableResponse>;
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
    }
  );

  const jobs: ScrapedJobData[] = [];

  for (const job of response.jobs) {
    const scraped = parseWorkableJob(job, slug, companyName);
    if (scraped) {
      jobs.push(scraped);
    }
  }

  return jobs;
}

/**
 * Parse a single Workable job into our standard format
 */
function parseWorkableJob(
  job: WorkableJob,
  slug: string,
  companyName: string
): ScrapedJobData | null {
  // Strip HTML from description
  const description = job.description ? stripHtml(job.description) : '';

  // Skip jobs without meaningful description
  if (!description || description.length < 50) {
    return null;
  }

  // Build location string
  const location = buildLocationString(job);

  // Detect remote - telecommuting field is the primary indicator
  const remote = job.telecommuting === true ||
    location?.toLowerCase().includes('remote') ||
    false;

  // Extract salary from description
  const salaryInfo = extractSalary(description);

  // Parse job type
  const jobType = parseEmploymentType(job.employment_type);

  return {
    sourceId: generateSourceId('workable', slug, job.shortcode),
    source: 'workable',
    title: job.title,
    company: companyName,
    location,
    remote,
    description,
    applyUrl: job.application_url || job.url,
    salaryMin: salaryInfo?.min || null,
    salaryMax: salaryInfo?.max || null,
    salaryCurrency: salaryInfo?.currency || null,
    salaryPeriod: salaryInfo?.period || null,
    jobType,
    department: job.department || job.function || null,
    postedAt: new Date(job.published_on),
  };
}

/**
 * Build location string from Workable job data
 */
function buildLocationString(job: WorkableJob): string | null {
  // Try locations array first
  if (job.locations && job.locations.length > 0) {
    const loc = job.locations[0];
    const parts = [loc.city, loc.region, loc.country].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(', ');
    }
  }

  // Fall back to top-level fields
  const parts = [job.city, job.state, job.country].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(', ');
  }

  return null;
}

/**
 * Parse Workable employment type into standardized job type
 */
function parseEmploymentType(employmentType: string | undefined): string | null {
  if (!employmentType) return null;

  const lower = employmentType.toLowerCase();

  if (lower.includes('full-time') || lower.includes('full time')) {
    return 'full-time';
  }
  if (lower.includes('part-time') || lower.includes('part time')) {
    return 'part-time';
  }
  if (lower.includes('contract') || lower.includes('contractor') || lower.includes('temporary')) {
    return 'contract';
  }
  if (lower.includes('intern')) {
    return 'internship';
  }

  return null;
}

/**
 * Map Workable experience level to our classification
 */
export function mapExperienceLevel(experience?: string): string | null {
  if (!experience) return null;

  const lower = experience.toLowerCase();

  if (lower === 'entry level' || lower === 'internship' || lower === 'not applicable') {
    return 'ENTRY';
  }
  if (lower === 'associate' || lower === 'mid level') {
    return 'MID';
  }
  if (lower === 'mid-senior level' || lower === 'senior level') {
    return 'SENIOR';
  }
  if (lower === 'director' || lower === 'executive' || lower === 'vp level') {
    return 'EXECUTIVE';
  }

  return null;
}

/**
 * Validate a Workable company exists
 */
export async function validateWorkableCompany(slug: string): Promise<boolean> {
  try {
    const url = `${WORKABLE_API_BASE}/${slug}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GenzJobs/1.0 (job aggregator)',
      },
      redirect: 'follow',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get rate limit delay for Workable
 */
export function getWorkableRateLimitDelay(): number {
  return RATE_LIMIT_DELAY_MS;
}
