/**
 * Recruitee ATS Scraper
 *
 * Fetches job listings from Recruitee public API.
 * API: https://{company}.recruitee.com/api/offers
 */

import {
  stripHtml,
  extractSalary,
  retryWithBackoff,
  generateSourceId,
} from './utils';
import type { ScrapedJobData } from './greenhouse';

// ==================== Types ====================

export interface RecruiteeJob {
  id: number;
  title: string;
  city?: string;
  location?: string;
  remote?: boolean;
  hybrid?: boolean;
  on_site?: boolean;
  careers_url: string;
  careers_apply_url: string;
  created_at: string;
  published_at?: string;
  requirements?: string;
  employment_type_code?: string;
  experience_code?: string;
  category_code?: string;
  department?: string;
  min_hours?: number;
  max_hours?: number;
  salary?: {
    min?: number;
    max?: number;
    period?: string;
    currency?: string;
  };
  locations?: Array<{
    id: number;
    name: string;
    city?: string;
    state?: string;
    country?: string;
    country_code?: string;
  }>;
  translations?: {
    en?: {
      title?: string;
      description?: string;
      requirements?: string;
    };
  };
}

export interface RecruiteeResponse {
  offers: RecruiteeJob[];
}

// ==================== Constants ====================

const RATE_LIMIT_DELAY_MS = 1000; // 1s between requests

// ==================== Scraper Functions ====================

/**
 * Fetch all jobs from a Recruitee company
 */
export async function fetchRecruiteeJobs(
  slug: string,
  companyName: string
): Promise<ScrapedJobData[]> {
  const url = `https://${slug}.recruitee.com/api/offers`;

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
          throw new Error(`Recruitee company not found: ${slug}`);
        }
        if (res.status === 429) {
          throw new Error('Rate limited by Recruitee API');
        }
        throw new Error(`Recruitee API error: ${res.status} ${res.statusText}`);
      }

      return res.json() as Promise<RecruiteeResponse>;
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
    }
  );

  const jobs: ScrapedJobData[] = [];

  for (const job of response.offers) {
    const scraped = parseRecruiteeJob(job, slug, companyName);
    if (scraped) {
      jobs.push(scraped);
    }
  }

  return jobs;
}

/**
 * Parse a single Recruitee job into our standard format
 */
function parseRecruiteeJob(
  job: RecruiteeJob,
  slug: string,
  companyName: string
): ScrapedJobData | null {
  // Get description from translations or requirements
  const rawDescription = job.translations?.en?.description || job.requirements || '';
  const description = stripHtml(rawDescription);

  // Skip jobs without meaningful description
  if (!description || description.length < 50) {
    return null;
  }

  // Build location string
  const location = buildLocationString(job);

  // Detect remote
  const remote = job.remote === true ||
    location?.toLowerCase().includes('remote') ||
    false;

  // Extract salary - use structured data if available, otherwise parse from description
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  let salaryCurrency: string | null = null;
  let salaryPeriod: string | null = null;

  if (job.salary?.min || job.salary?.max) {
    salaryMin = job.salary.min || null;
    salaryMax = job.salary.max || null;
    salaryCurrency = job.salary.currency || null;
    salaryPeriod = mapSalaryPeriod(job.salary.period);
  } else {
    const extracted = extractSalary(description);
    if (extracted) {
      salaryMin = extracted.min;
      salaryMax = extracted.max;
      salaryCurrency = extracted.currency;
      salaryPeriod = extracted.period;
    }
  }

  // Parse job type
  const jobType = parseEmploymentType(job.employment_type_code);

  // Parse posted date
  const postedAt = job.published_at
    ? new Date(job.published_at)
    : new Date(job.created_at);

  return {
    sourceId: generateSourceId('recruitee', slug, String(job.id)),
    source: 'recruitee',
    title: job.title,
    company: companyName,
    location,
    remote,
    description,
    applyUrl: job.careers_apply_url || job.careers_url,
    salaryMin,
    salaryMax,
    salaryCurrency,
    salaryPeriod,
    jobType,
    department: job.department || job.category_code || null,
    postedAt,
  };
}

/**
 * Build location string from Recruitee job data
 */
function buildLocationString(job: RecruiteeJob): string | null {
  // Try locations array first
  if (job.locations && job.locations.length > 0) {
    const loc = job.locations[0];
    const parts = [loc.city, loc.state, loc.country].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(', ');
    }
  }

  // Fall back to location field
  if (job.location) {
    return job.location;
  }

  // Fall back to city
  if (job.city) {
    return job.city;
  }

  return null;
}

/**
 * Map Recruitee salary period to our format
 */
function mapSalaryPeriod(period?: string): string | null {
  if (!period) return null;

  const lower = period.toLowerCase();
  if (lower === 'yearly' || lower === 'annual' || lower === 'year') {
    return 'yearly';
  }
  if (lower === 'monthly' || lower === 'month') {
    return 'monthly';
  }
  if (lower === 'hourly' || lower === 'hour') {
    return 'hourly';
  }
  if (lower === 'weekly' || lower === 'week') {
    return 'weekly';
  }

  return null;
}

/**
 * Parse Recruitee employment type into standardized job type
 */
function parseEmploymentType(typeCode?: string): string | null {
  if (!typeCode) return null;

  const lower = typeCode.toLowerCase();

  if (lower.includes('fulltime') || lower.includes('full_time') || lower === 'permanent') {
    return 'full-time';
  }
  if (lower.includes('parttime') || lower.includes('part_time')) {
    return 'part-time';
  }
  if (lower.includes('contract') || lower.includes('contractor') || lower.includes('temporary')) {
    return 'contract';
  }
  if (lower.includes('intern')) {
    return 'internship';
  }
  if (lower.includes('freelance')) {
    return 'contract';
  }

  return null;
}

/**
 * Map Recruitee experience level to our classification
 */
export function mapExperienceLevel(experienceCode?: string): string | null {
  if (!experienceCode) return null;

  const lower = experienceCode.toLowerCase();

  if (lower === 'entry_level' || lower === 'internship' || lower === 'student') {
    return 'ENTRY';
  }
  if (lower === 'mid_level' || lower === 'associate') {
    return 'MID';
  }
  if (lower === 'senior_level' || lower === 'senior') {
    return 'SENIOR';
  }
  if (lower === 'director' || lower === 'executive' || lower === 'manager') {
    return 'EXECUTIVE';
  }

  return null;
}

/**
 * Validate a Recruitee company exists
 */
export async function validateRecruiteeCompany(slug: string): Promise<boolean> {
  try {
    const url = `https://${slug}.recruitee.com/api/offers`;
    const response = await fetch(url, {
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
 * Get rate limit delay for Recruitee
 */
export function getRecruiteeRateLimitDelay(): number {
  return RATE_LIMIT_DELAY_MS;
}
